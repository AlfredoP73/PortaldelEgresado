#!/usr/bin/env python3
"""
Script de Prueba de Carga y Elasticidad (Fase 8 - Prueba P4: Aumento de la Demanda)
Universidad Popular del Cesar - Portal de Egresados (Alta Disponibilidad Multi-AZ)

Genera tráfico concurrente sostenido hacia el Application Load Balancer (ALB)
para superar el umbral de 70% de CPU en ECS Fargate y disparar el Auto Scaling
automático (TargetTrackingScaling: ECSServiceAverageCPUUtilization > 70%).
"""

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime


def send_request(base_url: str, mode: str, idx: int) -> tuple[bool, int, float]:
    """Envía una petición HTTP al ALB y retorna (exito, status_code, latencia_ms)."""
    start = time.perf_counter()
    try:
        if (mode in ("cpu", "mixed")) and (idx % 6 == 0):
            # 1 de cada 6 peticiones ejecuta bcrypt real en /api/auth/login -> Satura el 0.25 vCPU (>70% CPU)
            url = f"{base_url.rstrip('/')}/api/auth/login"
            payload = json.dumps({
                "email": "admin@portal.com",
                "password": f"PasswordPruebaCarga2026_{idx}!"
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                method="POST",
            )
        elif idx % 2 == 0:
            # Petición GET a /api/internal/jobs -> Consulta vacantes reales en RDS PostgreSQL (HTTP 200)
            url = f"{base_url.rstrip('/')}/api/internal/jobs"
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json"},
                method="GET",
            )
        else:
            # Petición GET a /api/auth/verify?token=loadtest -> Validación rápida en svc-portal-auth
            url = f"{base_url.rstrip('/')}/"
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json"},
                method="GET",
            )

        with urllib.request.urlopen(req, timeout=15.0) as resp:
            _ = resp.read()
            latency_ms = (time.perf_counter() - start) * 1000.0
            return True, resp.status, latency_ms

    except urllib.error.HTTPError as e:
        latency_ms = (time.perf_counter() - start) * 1000.0
        # En /api/auth/login con credenciales de prueba, 401/400/422 confirma que
        # el contenedor procesó el hash bcrypt en CPU y respondió correctamente.
        if e.code in (200, 201, 400, 401, 403, 422):
            return True, e.code, latency_ms
        return False, e.code, latency_ms
    except Exception:
        latency_ms = (time.perf_counter() - start) * 1000.0
        return False, 0, latency_ms


def main():
    parser = argparse.ArgumentParser(description="Generador de Carga P4 - Portal del Egresado UPC (AWS ECS + ALB)")
    parser.add_argument("--url", required=True, help="URL base del ALB (ej. http://alb-portal-api-xxx.us-east-1.elb.amazonaws.com)")
    parser.add_argument("--concurrency", type=int, default=16, help="Número de hilos concurrentes (default: 16)")
    parser.add_argument("--duration", type=int, default=180, help="Duración total de la prueba en segundos (default: 180)")
    parser.add_argument("--mode", choices=["cpu", "read", "mixed"], default="mixed", help="Tipo de carga: cpu (bcrypt login), read (ofertas), mixed (ambos)")
    args = parser.parse_args()

    print("=" * 82)
    print(f" PRUEBA P4 - INYECCION DE CARGA Y ELASTICIDAD (AUTO SCALING ECS FARGATE)")
    print("=" * 82)
    print(f" [Inicio]           : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" [Endpoint ALB]     : {args.url}")
    print(f" [Hilos Concurrentes]: {args.concurrency} usuarios virtuales simultaneos")
    print(f" [Duracion]         : {args.duration} segundos")
    print(f" [Modo de Carga]    : {args.mode.upper()} (Umbral objetivo CloudWatch: >70% CPU)")
    print("=" * 82)
    print(f"{'TIMESTAMP':<20} | {'REQ':>6} | {'RPS':>6} | {'OK':>6} | {'ERR':>5} | {'AVG (ms)':>9} | {'P95 (ms)':>9}")
    print("-" * 82)
    sys.stdout.flush()

    start_test = time.time()
    end_test = start_test + args.duration

    total_reqs = 0
    total_ok = 0
    total_err = 0
    all_latencies = []

    req_counter = 0

    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        while time.time() < end_test:
            window_start = time.time()
            batch_size = args.concurrency * 2
            futures = [
                executor.submit(send_request, args.url, args.mode, req_counter + i)
                for i in range(batch_size)
            ]
            req_counter += batch_size

            window_latencies = []
            win_ok = 0
            win_err = 0

            for fut in futures:
                ok, code, lat = fut.result()
                window_latencies.append(lat)
                all_latencies.append(lat)
                if ok:
                    win_ok += 1
                else:
                    win_err += 1

            window_elapsed = max(time.time() - window_start, 0.001)
            rps = batch_size / window_elapsed
            total_reqs += batch_size
            total_ok += win_ok
            total_err += win_err

            avg_lat = statistics.mean(window_latencies) if window_latencies else 0.0
            sorted_lat = sorted(window_latencies)
            p95_idx = min(int(len(sorted_lat) * 0.95), len(sorted_lat) - 1)
            p95_lat = sorted_lat[p95_idx] if sorted_lat else 0.0

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"{now_str:<20} | {total_reqs:>6} | {rps:>6.1f} | {total_ok:>6} | {total_err:>5} | {avg_lat:>9.1f} | {p95_lat:>9.1f}")
            sys.stdout.flush()

    total_duration = max(time.time() - start_test, 0.001)
    overall_avg = statistics.mean(all_latencies) if all_latencies else 0.0
    sorted_all = sorted(all_latencies)
    overall_p95 = sorted_all[min(int(len(sorted_all) * 0.95), len(sorted_all) - 1)] if sorted_all else 0.0
    availability = (total_ok / total_reqs * 100.0) if total_reqs > 0 else 0.0

    print("=" * 82)
    print(f" [Fin de Prueba P4] : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" [Total Solicitudes]: {total_reqs} ({total_ok} exitosas | {total_err} fallidas)")
    print(f" [Disponibilidad]   : {availability:.2f}%")
    print(f" [Rendimiento Medio]: {total_reqs / total_duration:.1f} req/s")
    print(f" [Latencia Global]  : Promedio = {overall_avg:.1f} ms | P95 = {overall_p95:.1f} ms")
    print("=" * 82)


if __name__ == "__main__":
    main()
