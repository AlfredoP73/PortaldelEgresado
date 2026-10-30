"""
Empaquetador Nativo Serverless (0% Docker Desktop) para AWS Lambda Python 3.11 (x86_64).

Construye dos artefactos ZIP 100% compatibles con Amazon Linux 2 (permisos POSIX 0644/0755 y rutas '/'):
  1. aws/.build_lambda/portal-deps-layer.zip -> AWS Lambda Layer compartido (/opt/python)
  2. aws/.build_lambda/portal-app-code.zip   -> Código de los 6 handlers + microservicios + init.sql (/var/task)

Omite boto3/botocore porque el runtime nativo AWS Lambda Python 3.11 ya los incluye preinstalados.
"""

import hashlib
import os
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path

# Límite estricto de AWS Lambda (código descomprimido + todas las capas descomprimidas): 250 MB (262,144,000 bytes)
AWS_LAMBDA_MAX_UNZIPPED_BYTES = 250 * 1024 * 1024

# Paquetes con ruedas binarias Linux x86_64 o pure-python wheel en PyPI
WHEEL_PACKAGES = [
    "mangum==0.17.0",
    "fastapi==0.104.1",
    "sqlalchemy==2.0.23",
    "psycopg2-binary==2.9.9",
    "pydantic==2.5.2",
    "pydantic-settings==2.1.0",
    "python-dotenv==1.2.1",
    "python-jose[cryptography]==3.3.0",
    "bcrypt==4.0.1",
    "passlib==1.7.4",
    "email-validator==2.1.1",
    "httpx==0.26.0",
    "pika==1.3.2",
    "pypdf==4.2.0",
    "pdfplumber==0.11.0",
    "firebase-admin==6.5.0",
]

# Paquetes 100% Pure-Python que en PyPI pueden publicarse como sdist (.tar.gz) sin wheel
PURE_PYTHON_FALLBACK_PACKAGES = [
    "python-multipart==0.0.6",
    "circuitbreaker==2.0.0",
]

REQUIRED_TOP_IMPORTS = [
    "mangum",
    "fastapi",
    "sqlalchemy",
    "psycopg2",
    "pydantic",
    "pydantic_settings",
    "dotenv",
    "jose",
    "bcrypt",
    "passlib",
    "multipart",
    "email_validator",
    "httpx",
    "pika",
    "circuitbreaker",
    "pypdf",
    "pdfplumber",
    "firebase_admin",
]


def _clean_tree(target_dir: Path) -> None:
    """Elimina cachés, esquemas estáticos innecesarios (107 MB discovery_cache) y binarios CLI para optimizar Cold Start."""
    # 1. Eliminar documentos estáticos offline de googleapiclient (106.8 MB no usados por FCM HTTP v1)
    discovery_docs = target_dir / "googleapiclient" / "discovery_cache" / "documents"
    if discovery_docs.is_dir():
        shutil.rmtree(discovery_docs, ignore_errors=True)

    # 2. Eliminar ejecutables CLI en python/bin (innecesarios en runtime AWS Lambda)
    bin_dir = target_dir / "bin"
    if bin_dir.is_dir():
        shutil.rmtree(bin_dir, ignore_errors=True)

    for root, dirs, files in os.walk(target_dir, topdown=False):
        root_path = Path(root)
        for fn in files:
            low = fn.lower()
            if low.endswith((".pyc", ".pyo", ".c", ".h", ".a")):
                (root_path / fn).unlink(missing_ok=True)
        for dn in dirs:
            if dn in ("__pycache__", "tests", "test"):
                shutil.rmtree(root_path / dn, ignore_errors=True)


def _assert_linux_only_binaries(python_dir: Path) -> int:
    """Garantiza que NO exista ningún binario Windows (.pyd/.dll) y cuenta los .so ELF de Linux."""
    win_binaries = []
    linux_so_count = 0
    for root, _, files in os.walk(python_dir):
        for fn in files:
            low = fn.lower()
            if low.endswith((".pyd", ".dll")):
                win_binaries.append(str(Path(root) / fn))
            elif low.endswith(".so") or ".so." in low:
                linux_so_count += 1
    if win_binaries:
        raise RuntimeError(
            "Se detectaron binarios de Windows incompatibles con AWS Lambda Linux:\n  "
            + "\n  ".join(win_binaries[:10])
        )
    return linux_so_count


def _assert_required_imports_present(python_dir: Path) -> None:
    missing = []
    for mod in REQUIRED_TOP_IMPORTS:
        pkg_dir = python_dir / mod
        py_file = python_dir / f"{mod}.py"
        so_matches = list(python_dir.glob(f"{mod}*.so"))
        if not (pkg_dir.exists() or py_file.exists() or so_matches):
            missing.append(mod)
    if missing:
        raise RuntimeError(f"Faltan módulos requeridos en el Lambda Layer: {missing}")


def _write_posix_zip(source_dir: Path, zip_path: Path) -> tuple[int, int]:
    """
    Crea un archivo ZIP con rutas POSIX ('/') y permisos UNIX 0644/0755 obligatorios para sbx_user1051 en AWS Lambda.
    Devuelve (uncompressed_bytes, compressed_bytes).
    """
    if zip_path.exists():
        zip_path.unlink()

    uncompressed_total = 0
    fixed_time = (2026, 1, 1, 0, 0, 0)

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(source_dir):
            dirs.sort()
            files.sort()
            root_path = Path(root)
            for fn in files:
                if fn.endswith((".pyc", ".pyo")):
                    continue
                full_path = root_path / fn
                rel_posix = full_path.relative_to(source_dir).as_posix()
                data = full_path.read_bytes()
                uncompressed_total += len(data)

                info = zipfile.ZipInfo(filename=rel_posix, date_time=fixed_time)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.create_system = 3  # UNIX
                # Permiso archivo regular rw-r--r-- (0100644) o rwxr-xr-x si es .so
                mode = 0o100755 if (".so" in fn) else 0o100644
                info.external_attr = mode << 16
                zf.writestr(info, data)

    return uncompressed_total, zip_path.stat().st_size


def build_layer(build_root: Path, force: bool = False) -> tuple[Path, int, int]:
    layer_zip = build_root / "portal-deps-layer.zip"
    hash_file = build_root / "portal-deps-layer.sha256"
    meta_file = build_root / "portal-deps-layer.size"

    spec_signature = "\n".join(WHEEL_PACKAGES + PURE_PYTHON_FALLBACK_PACKAGES + ["py3.11-manylinux2014_x86_64-v1"])
    expected_hash = hashlib.sha256(spec_signature.encode("utf-8")).hexdigest()

    if not force and layer_zip.exists() and hash_file.exists() and meta_file.exists():
        if hash_file.read_text(encoding="utf-8").strip() == expected_hash:
            unzipped_bytes = int(meta_file.read_text(encoding="utf-8").strip())
            zipped_bytes = layer_zip.stat().st_size
            print(
                f"  -> [Cache OK] Lambda Layer reutilizado: {layer_zip.name} "
                f"({zipped_bytes / (1024*1024):.1f} MB zip / {unzipped_bytes / (1024*1024):.1f} MB descomprimido)"
            )
            return layer_zip, unzipped_bytes, zipped_bytes

    staging_dir = build_root / "_staging_layer"
    python_dir = staging_dir / "python"
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    python_dir.mkdir(parents=True, exist_ok=True)

    print("  -> Descargando ruedas oficiales Amazon Linux x86_64 (manylinux2014_x86_64, Python 3.11) sin Docker...")
    cmd_wheels = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--quiet",
        "--disable-pip-version-check",
        "--no-warn-conflicts",
        "--platform",
        "manylinux2014_x86_64",
        "--platform",
        "manylinux_2_17_x86_64",
        "--platform",
        "linux_x86_64",
        "--implementation",
        "cp",
        "--python-version",
        "3.11",
        "--abi",
        "cp311",
        "--only-binary=:all:",
        "--target",
        str(python_dir),
        *WHEEL_PACKAGES,
    ]
    subprocess.run(cmd_wheels, check=True)

    # Instalar paquetes pure-python que pueden venir en .tar.gz
    for pkg in PURE_PYTHON_FALLBACK_PACKAGES:
        # Primero intentar como wheel binario; si PyPI solo ofrece .tar.gz pure-python, instalar con --no-deps
        try_wheel = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--quiet",
            "--disable-pip-version-check",
            "--no-cache-dir",
            "--platform",
            "manylinux2014_x86_64",
            "--implementation",
            "cp",
            "--python-version",
            "3.11",
            "--only-binary=:all:",
            "--target",
            str(python_dir),
            pkg,
        ]
        res = subprocess.run(try_wheel, capture_output=True, text=True)
        if res.returncode != 0:
            # Pure-python sdist fallback (ej. python-multipart==0.0.6 / circuitbreaker==2.0.0)
            cmd_pure = [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--quiet",
                "--disable-pip-version-check",
                "--no-cache-dir",
                "--no-compile",
                "--no-deps",
                "--target",
                str(python_dir),
                pkg,
            ]
            subprocess.run(cmd_pure, check=True)

    # Si six no vino para python-multipart==0.0.6, asegurar six (wheel universal py2.py3-none-any)
    if not (python_dir / "six.py").exists():
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--quiet",
                "--disable-pip-version-check",
                "--no-cache-dir",
                "--only-binary=:all:",
                "--target",
                str(python_dir),
                "six>=1.16.0",
            ],
            check=True,
        )

    _clean_tree(python_dir)
    so_count = _assert_linux_only_binaries(python_dir)
    _assert_required_imports_present(python_dir)

    print(f"  -> Verificados {so_count} binarios nativos ELF Linux (.so) y 0 binarios Windows (.pyd/.dll).")
    print("  -> Comprimiendo portal-deps-layer.zip con permisos POSIX UNIX...")
    unzipped_bytes, zipped_bytes = _write_posix_zip(staging_dir, layer_zip)
    shutil.rmtree(staging_dir, ignore_errors=True)

    hash_file.write_text(expected_hash, encoding="utf-8")
    meta_file.write_text(str(unzipped_bytes), encoding="utf-8")
    return layer_zip, unzipped_bytes, zipped_bytes


def build_app_code(repo_root: Path, build_root: Path) -> tuple[Path, int, int]:
    app_zip = build_root / "portal-app-code.zip"
    staging_app = build_root / "_staging_app"
    if staging_app.exists():
        shutil.rmtree(staging_app)
    staging_app.mkdir(parents=True, exist_ok=True)

    backend_dir = repo_root / "backend"
    src_app = backend_dir / "app"
    src_sql = backend_dir / "init.sql"

    if not src_app.is_dir():
        raise FileNotFoundError(f"No existe {src_app}")
    if not src_sql.is_file():
        raise FileNotFoundError(f"No existe {src_sql}")

    shutil.copytree(
        src_app,
        staging_app / "app",
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", ".pytest_cache"),
    )
    shutil.copy2(src_sql, staging_app / "init.sql")

    unzipped_bytes, zipped_bytes = _write_posix_zip(staging_app, app_zip)
    shutil.rmtree(staging_app, ignore_errors=True)
    return app_zip, unzipped_bytes, zipped_bytes


def main() -> int:
    t0 = time.time()
    force_layer = "--force-layer" in sys.argv
    aws_dir = Path(__file__).resolve().parent
    repo_root = aws_dir.parent
    build_root = aws_dir / ".build_lambda"
    build_root.mkdir(parents=True, exist_ok=True)

    layer_zip, layer_unzipped, layer_zipped = build_layer(build_root, force=force_layer)
    app_zip, app_unzipped, app_zipped = build_app_code(repo_root, build_root)

    total_unzipped = layer_unzipped + app_unzipped
    pct_quota = (total_unzipped / AWS_LAMBDA_MAX_UNZIPPED_BYTES) * 100.0

    print(
        f"  -> Paquete de Código : {app_zip.name} "
        f"({app_zipped / 1024:.0f} KB zip / {app_unzipped / (1024*1024):.2f} MB descomprimido)"
    )
    print(
        f"  -> Capa Dependencias : {layer_zip.name} "
        f"({layer_zipped / (1024*1024):.1f} MB zip / {layer_unzipped / (1024*1024):.1f} MB descomprimido)"
    )
    print(
        f"  -> Total en Lambda   : {total_unzipped / (1024*1024):.1f} MB / 250.0 MB ({pct_quota:.1f}% de cuota AWS Lambda) "
        f"en {time.time() - t0:.1f}s"
    )

    if total_unzipped >= AWS_LAMBDA_MAX_UNZIPPED_BYTES:
        raise RuntimeError(
            f"El tamaño descomprimido total ({total_unzipped} bytes) supera el límite de 250 MB de AWS Lambda."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

