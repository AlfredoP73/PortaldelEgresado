"""
Empaquetador del Application Source Bundle (.zip) para AWS Elastic Beanstalk (Docker Compose).
100% Python Standard Library (sin dependencias externas).
Garantiza rutas POSIX ('/') y saltos de línea LF ('\\n') para Amazon Linux 2023.
"""
import os
import sys
import time
import zipfile
from pathlib import Path

TEXT_EXTENSIONS = {
    ".py", ".sql", ".yml", ".yaml", ".conf", ".template", ".txt",
    ".sh", ".html", ".css", ".js", ".json", ".md", ".svg", ".xml",
}

EXCLUDE_DIRS = {
    "__pycache__", ".pytest_cache", ".git", ".venv", "venv",
    "node_modules", "uploads", ".mypy_cache",
}


def is_text_file(path: Path) -> bool:
    if path.name.startswith("Dockerfile"):
        return True
    return path.suffix.lower() in TEXT_EXTENSIONS


def add_bytes_to_zip(zf: zipfile.ZipFile, arcname: str, data: bytes, mode: int = 0o100644):
    arcname_posix = arcname.replace("\\", "/").lstrip("/")
    info = zipfile.ZipInfo(filename=arcname_posix, date_time=time.localtime()[:6])
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3  # Unix
    info.external_attr = (mode & 0xFFFF) << 16
    zf.writestr(info, data)


def add_file_to_zip(zf: zipfile.ZipFile, src_path: Path, arcname: str, executable: bool = False):
    raw = src_path.read_bytes()
    if is_text_file(src_path):
        raw = raw.replace(b"\r\n", b"\n")
    mode = 0o100755 if executable else 0o100644
    add_bytes_to_zip(zf, arcname, raw, mode=mode)


def add_dir_to_zip(zf: zipfile.ZipFile, src_dir: Path, arc_prefix: str):
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        root_path = Path(root)
        for fname in files:
            if fname.endswith((".pyc", ".pyo")):
                continue
            fpath = root_path / fname
            rel = fpath.relative_to(src_dir).as_posix()
            arcname = f"{arc_prefix.rstrip('/')}/{rel}"
            add_file_to_zip(zf, fpath, arcname)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    out_dir = repo_root / "aws" / ".build_beanstalk"
    out_dir.mkdir(parents=True, exist_ok=True)
    bundle_path = out_dir / "portal-beanstalk-bundle.zip"

    compose_file = repo_root / "aws" / "beanstalk" / "docker-compose.yml"
    frontend_dist = repo_root / "frontend" / "dist"
    if not compose_file.exists():
        print(f"[ERROR] No existe {compose_file}", file=sys.stderr)
        sys.exit(1)
    if not frontend_dist.exists():
        print(f"[ERROR] No existe {frontend_dist}. Ejecuta 'npm run build' primero.", file=sys.stderr)
        sys.exit(1)

    prebuild_hook = (
        "#!/bin/bash\n"
        "set -e\n"
        "echo '[Portal Beanstalk] Pre-compilando imagen base compartida portal-backend:latest...'\n"
        "cd /var/app/staging\n"
        "docker build -t portal-backend:latest -f backend/Dockerfile.beanstalk backend/\n"
        "echo '[Portal Beanstalk] Imagen base portal-backend:latest lista.'\n"
    ).encode("utf-8")

    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        # 1. docker-compose.yml en la raíz del bundle
        add_file_to_zip(zf, compose_file, "docker-compose.yml")

        # 2. Hook .platform/hooks/prebuild para compilar una sola vez portal-backend:latest
        add_bytes_to_zip(zf, ".platform/hooks/prebuild/01_build_base.sh", prebuild_hook, mode=0o100755)

        # 3. Backend completo (código, init.sql, Dockerfile.beanstalk, requirements.beanstalk.txt)
        add_dir_to_zip(zf, repo_root / "backend", "backend")

        # 4. Nginx API Gateway
        add_dir_to_zip(zf, repo_root / "nginx", "nginx")

        # 5. Frontend pre-compilado (dist + Dockerfile.beanstalk + nginx.conf.template)
        add_dir_to_zip(zf, frontend_dist, "frontend/dist")
        add_file_to_zip(zf, repo_root / "frontend" / "Dockerfile.beanstalk", "frontend/Dockerfile.beanstalk")
        add_file_to_zip(zf, repo_root / "frontend" / "nginx.conf.template", "frontend/nginx.conf.template")

    size_kb = bundle_path.stat().st_size / 1024.0
    print(f"OK|{bundle_path}|{size_kb:.1f} KB")


if __name__ == "__main__":
    main()

