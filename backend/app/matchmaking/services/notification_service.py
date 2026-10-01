from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.matchmaking.models import MatchNotification


import httpx

def get_notifications(db: Session, graduate_id: int, solo_no_leidas: bool = False) -> list[dict]:
    """Lista notificaciones de afinidad enriquecidas con título de vacante y empresa."""
    query = db.query(MatchNotification).filter(MatchNotification.graduate_id == graduate_id)
    if solo_no_leidas:
        query = query.filter(MatchNotification.is_read == False)
    
    notifs = query.order_by(MatchNotification.sent_at.desc()).all()
    
    results = []
    # Collect job offer IDs to fetch them
    for n in notifs:
        job_title = "Vacante Desconocida"
        company_name = "Empresa Desconocida"
        try:
            import os
            COMPANIES_URL = os.getenv("COMPANIES_URL", "http://companies:8000")
            resp = httpx.get(f"{COMPANIES_URL}/api/internal/matchmaking/jobs/{n.job_offer_id}", timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                job_title = data.get("title", job_title)
                company_name = data.get("company_name", company_name)
        except Exception:
            pass

        results.append({
            "id": n.id,
            "graduate_id": n.graduate_id,
            "job_offer_id": n.job_offer_id,
            "score": float(n.score),
            "is_read": n.is_read,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "job_title": job_title,
            "company_name": company_name
        })
    return results


def get_notification(db: Session, notification_id: int) -> Optional[MatchNotification]:
    return db.query(MatchNotification).filter(MatchNotification.id == notification_id).first()


def marcar_como_leida(db: Session, notification_id: int) -> Optional[MatchNotification]:
    notif = db.query(MatchNotification).filter(MatchNotification.id == notification_id).first()
    if not notif:
        return None
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
