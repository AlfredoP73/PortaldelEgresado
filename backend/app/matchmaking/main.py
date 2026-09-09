from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

@asynccontextmanager
async def lifespan(app: FastAPI):
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(match_controller.router)
app.include_router(criteria_controller.router)
app.include_router(notification_controller.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "matchmaking"}
