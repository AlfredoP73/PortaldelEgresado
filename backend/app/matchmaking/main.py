from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import threading
import pika
import json
import os
import time
from contextlib import asynccontextmanager
from app.database import SessionLocal
from app.matchmaking.services import matching_service

from app.matchmaking.controllers import (
    criteria_controller,
    match_controller,
    notification_controller,
    ws_controller,
)

def start_rabbitmq_consumer():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    while True:
        try:
            params = pika.URLParameters(rabbitmq_url)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue='matchmaking_queue', durable=True)

            def callback(ch, method, properties, body):
                data = json.loads(body)
                db = SessionLocal()
                try:
                    if "graduate_id" in data:
                        matching_service.recalcular_por_egresado(db, data["graduate_id"])
                    if "job_offer_id" in data:
                        matching_service.recalcular_por_vacante(db, data["job_offer_id"])
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    print(f"Error processing message: {e}")
                    # In a real app we might nack or retry.
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                finally:
                    db.close()

            channel.basic_consume(queue='matchmaking_queue', on_message_callback=callback)
            print("Matchmaking worker started consuming from RabbitMQ...")
            channel.start_consuming()
        except pika.exceptions.AMQPConnectionError:
            print("Waiting for RabbitMQ to start...")
            time.sleep(5)
        except Exception as e:
            print(f"RabbitMQ consumer error: {e}")
            time.sleep(5)

def start_sqs_consumer():
    import boto3
    queue_url = os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip()
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    sqs = boto3.client("sqs", region_name=region)
    print(f"Matchmaking worker started consuming from Amazon SQS: {queue_url}")
    while True:
        try:
            resp = sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20,
            )
            for msg in resp.get("Messages", []):
                db = SessionLocal()
                try:
                    data = json.loads(msg["Body"])
                    if "graduate_id" in data:
                        matching_service.recalcular_por_egresado(db, data["graduate_id"])
                    if "job_offer_id" in data:
                        matching_service.recalcular_por_vacante(db, data["job_offer_id"])
                    sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=msg["ReceiptHandle"])
                except Exception as e:
                    print(f"Error processing SQS message: {e}")
                finally:
                    db.close()
        except Exception as e:
            print(f"SQS consumer error: {e}")
            time.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # En AWS Lambda, los eventos SQS invocan directamente matchmaking_handler (Event Source Mapping),
    # por lo que no se levantan hilos consumidores infinitos en segundo plano.
    if not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        if os.getenv("SQS_MATCHMAKING_QUEUE_URL", "").strip():
            thread = threading.Thread(target=start_sqs_consumer, daemon=True)
            thread.start()
        else:
            thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
            thread.start()
    yield

app = FastAPI(
    title="Microservicio de Matchmaking - Portal del Egresado",
    description=(
        "Motor de compatibilidad egresado-vacante (Módulo 3): calcula el "
        "porcentaje de afinidad, gestiona los criterios/ponderaciones del "
        "algoritmo y dispara alertas de alta compatibilidad."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno en Matchmaking", "error": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

app.include_router(match_controller.router)
app.include_router(criteria_controller.router)
app.include_router(notification_controller.router)
app.include_router(ws_controller.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "matchmaking"}
