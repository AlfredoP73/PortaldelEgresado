import json
from datetime import datetime, date, time as dt_time, timezone
from decimal import Decimal
from typing import List, Dict, Any, Tuple
from sqlalchemy import create_engine, MetaData, inspect, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql
from fastapi import HTTPException, status

from app.database import db_instance
from app.auth import models
from app.auth.services.auth_service import log_audit_action

PORTAL_DATABASES = ["auth_db", "graduates_db", "companies_db", "matchmaking_db"]


def _format_sql_value(val: Any) -> str:
    """Convierte un valor de Python a su representación literal segura en SQL de PostgreSQL."""
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date, dt_time)):
        iso = val.isoformat(sep=" ") if isinstance(val, datetime) else val.isoformat()
        return f"'{iso}'"
    if isinstance(val, (dict, list)):
        raw_json = json.dumps(val, ensure_ascii=False).replace("'", "''")
        return f"'{raw_json}'::jsonb"
    if isinstance(val, (bytes, bytearray, memoryview)):
        hex_data = bytes(val).hex()
        return f"'\\x{hex_data}'::bytea"

    s = str(val)
    if "\\" in s or "\n" in s or "\r" in s:
        escaped = (
            s.replace("\\", "\\\\")
            .replace("'", "''")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
        )
        return f"E'{escaped}'"
    return f"'{s.replace(chr(39), chr(39) * 2)}'"


def _discover_databases(base_engine) -> List[str]:
    """Descubre las bases de datos del portal disponibles en la instancia PostgreSQL."""
    current_db = make_url(db_instance.database_url).database
    try:
        with base_engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT datname FROM pg_database "
                    "WHERE datistemplate = false AND datname NOT IN ('postgres', 'rdsadmin') "
                    "ORDER BY datname"
                )
            ).fetchall()
            available = {r[0] for r in rows}
    except Exception:
        available = {current_db} if current_db else set()

    ordered = [db for db in PORTAL_DATABASES if db in available]
    if current_db and current_db not in ordered:
        ordered.insert(0, current_db)
    for db in sorted(available):
        if db not in ordered:
            ordered.append(db)

    return ordered or ([current_db] if current_db else ["auth_db"])


def get_databases_overview(admin_user: models.User, db_session) -> Dict[str, Any]:
    """Obtiene el resumen de bases de datos, tablas, relaciones y conteo de registros para la vista de Admin."""
    if admin_user.role_id != 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el administrador puede consultar la estructura de base de datos")

    base_url = make_url(db_instance.database_url)
    databases = _discover_databases(db_instance.engine)

    db_summaries = []
    total_tables = 0
    total_rows = 0
    total_relations = 0
    total_size_bytes = 0

    for db_name in databases:
        target_url = base_url.set(database=db_name)
        eng = create_engine(target_url, connect_args={"connect_timeout": 5})
        try:
            with eng.connect() as conn:
                size_bytes = conn.execute(
                    text("SELECT pg_database_size(current_database())")
                ).scalar() or 0

                inspector = inspect(eng)
                table_names = inspector.get_table_names(schema="public")
                tables_info = []
                db_rows = 0
                db_fks = 0

                for t_name in sorted(table_names):
                    row_count = conn.execute(
                        text(f'SELECT COUNT(*) FROM "{t_name}"')
                    ).scalar() or 0
                    fks = inspector.get_foreign_keys(t_name, schema="public")
                    cols = inspector.get_columns(t_name, schema="public")

                    db_rows += row_count
                    db_fks += len(fks)
                    tables_info.append({
                        "name": t_name,
                        "columns": len(cols),
                        "foreign_keys": len(fks),
                        "rows": row_count,
                    })

                total_tables += len(table_names)
                total_rows += db_rows
                total_relations += db_fks
                total_size_bytes += size_bytes

                db_summaries.append({
                    "database": db_name,
                    "size_bytes": size_bytes,
                    "size_pretty": f"{round(size_bytes / (1024 * 1024), 2)} MB",
                    "tables_count": len(table_names),
                    "relations_count": db_fks,
                    "rows_count": db_rows,
                    "tables": tables_info,
                })
        except Exception as e:
            db_summaries.append({
                "database": db_name,
                "size_bytes": 0,
                "size_pretty": "N/A",
                "tables_count": 0,
                "relations_count": 0,
                "rows_count": 0,
                "tables": [],
                "error": str(e),
            })
        finally:
            eng.dispose()

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "total_databases": len(db_summaries),
        "total_tables": total_tables,
        "total_relations": total_relations,
        "total_rows": total_rows,
        "total_size_pretty": f"{round(total_size_bytes / (1024 * 1024), 2)} MB",
        "databases": db_summaries,
    }


def generate_full_postgres_dump(
    admin_user: models.User,
    db_session,
    scope: str = "all",
    include_drop: bool = True,
    include_data: bool = True,
    client_ip: str = "unknown",
) -> Tuple[str, Dict[str, Any]]:
    """
    Genera un volcado (dump) SQL completo de PostgreSQL incluyendo:
    - Creación de bases de datos
    - Tablas (DDL completo con tipos de datos, valores por defecto, restricciones NOT NULL y UNIQUE)
    - Llaves primarias y foráneas (Relaciones e integridad referencial)
    - Índices y secuencias
    - Todos los registros (INSERT INTO) ordenados topológicamente por dependencias
    """
    if admin_user.role_id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado. Solo un Administrador puede generar un volcado de la base de datos.",
        )

    base_url = make_url(db_instance.database_url)
    all_dbs = _discover_databases(db_instance.engine)

    if scope and scope != "all":
        if scope not in all_dbs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La base de datos '{scope}' no existe en el servidor PostgreSQL.",
            )
        target_dbs = [scope]
    else:
        target_dbs = all_dbs

    now_utc = datetime.now(timezone.utc)
    pg_dialect = postgresql.dialect()

    try:
        with db_instance.engine.connect() as conn:
            pg_version = conn.execute(text("SELECT version()")).scalar() or "PostgreSQL"
    except Exception:
        pg_version = "PostgreSQL"

    lines: List[str] = [
        "-- =============================================================================",
        "-- PORTAL DEL EGRESADO UPC - POSTGRESQL FULL DATABASE DUMP",
        "-- =============================================================================",
        f"-- Fecha de generación (UTC) : {now_utc.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"-- Generado por (Admin)      : {admin_user.email} (ID: {admin_user.id})",
        f"-- Motor de Base de Datos    : {pg_version}",
        f"-- Bases de datos incluidas  : {', '.join(target_dbs)}",
        f"-- Incluye estructura (DDL)  : Sí (Tablas, PKs, FKs, Índices, Secuencias)",
        f"-- Incluye registros (DML)   : {'Sí' if include_data else 'No (Solo esquema)'}",
        "-- =============================================================================",
        "",
        "SET statement_timeout = 0;",
        "SET lock_timeout = 0;",
        "SET idle_in_transaction_session_timeout = 0;",
        "SET client_encoding = 'UTF8';",
        "SET standard_conforming_strings = on;",
        "SET check_function_bodies = false;",
        "SET xmloption = content;",
        "SET client_min_messages = warning;",
        "SET row_security = off;",
        "",
    ]

    exported_tables = 0
    exported_rows = 0
    exported_fks = 0

    for db_name in target_dbs:
        target_url = base_url.set(database=db_name)
        eng = create_engine(target_url, connect_args={"connect_timeout": 8})

        lines.extend([
            "",
            "-- =============================================================================",
            f"-- BASE DE DATOS: {db_name}",
            "-- =============================================================================",
            f"-- CREATE DATABASE {db_name};",
            f"\\connect {db_name}",
            "",
        ])

        try:
            metadata = MetaData()
            metadata.reflect(bind=eng, schema=None)
            sorted_tables = list(metadata.sorted_tables)

            if include_drop and sorted_tables:
                lines.append("-- Limpieza de tablas previas (orden inverso de dependencias)")
                for tbl in reversed(sorted_tables):
                    lines.append(f'DROP TABLE IF EXISTS "{tbl.name}" CASCADE;')
                lines.append("")

            with eng.connect() as conn:
                for tbl in sorted_tables:
                    exported_tables += 1
                    fk_count = len(tbl.foreign_keys)
                    exported_fks += fk_count

                    lines.append("-- -----------------------------------------------------------------------------")
                    lines.append(f"-- Tabla: {db_name}.{tbl.name} ({len(tbl.columns)} columnas, {fk_count} llaves foráneas)")
                    lines.append("-- -----------------------------------------------------------------------------")

                    # Generar CREATE TABLE con tipos, PKs, FKs y restricciones
                    create_ddl = str(CreateTable(tbl, if_not_exists=True).compile(dialect=pg_dialect)).strip()
                    # Reemplazar secuencias internas de reflexión por SERIAL cuando aplica
                    lines.append(f"{create_ddl};")
                    lines.append("")

                    # Generar índices adicionales de la tabla
                    for idx in tbl.indexes:
                        idx_ddl = str(CreateIndex(idx, if_not_exists=True).compile(dialect=pg_dialect)).strip()
                        lines.append(f"{idx_ddl};")
                    if tbl.indexes:
                        lines.append("")

                    # Volcado de registros (INSERT INTO)
                    if include_data:
                        rows = conn.execute(tbl.select()).fetchall()
                        col_names = [f'"{c.name}"' for c in tbl.columns]
                        col_list_str = ", ".join(col_names)

                        if rows:
                            lines.append(f"-- Registros de {tbl.name} ({len(rows)} filas)")
                            for row in rows:
                                vals_str = ", ".join(_format_sql_value(v) for v in row)
                                lines.append(f'INSERT INTO "{tbl.name}" ({col_list_str}) VALUES ({vals_str});')
                                exported_rows += 1
                            lines.append("")

                        # Sincronizar secuencias de columnas autoincrementales (SERIAL / IDENTITY)
                        for col in tbl.primary_key.columns:
                            col_type_str = str(col.type).upper()
                            if "INT" in col_type_str:
                                lines.append(
                                    f"SELECT pg_catalog.setval("
                                    f"pg_get_serial_sequence('\"{tbl.name}\"', '{col.name}'), "
                                    f"COALESCE((SELECT MAX(\"{col.name}\") FROM \"{tbl.name}\"), 1), "
                                    f"(SELECT MAX(\"{col.name}\") IS NOT NULL FROM \"{tbl.name}\")"
                                    f");"
                                )
                        lines.append("")

        except Exception as e:
            lines.append(f"-- [ADVERTENCIA] Error al exportar la base de datos {db_name}: {e}")
            lines.append("")
        finally:
            eng.dispose()

    lines.extend([
        "-- =============================================================================",
        f"-- FIN DEL VOLCADO POSTGRESQL ({exported_tables} tablas, {exported_fks} relaciones, {exported_rows} registros)",
        "-- =============================================================================",
        "",
    ])

    sql_dump = "\n".join(lines)

    stats = {
        "databases": target_dbs,
        "tables": exported_tables,
        "relations": exported_fks,
        "rows": exported_rows,
        "include_data": include_data,
        "include_drop": include_drop,
        "generated_at": now_utc.isoformat(),
    }

    try:
        log_audit_action(
            db_session,
            user_id=admin_user.id,
            action="DATABASE_DUMP_EXPORT",
            details=stats,
            ip_address=client_ip,
        )
    except Exception:
        pass

    return sql_dump, stats

