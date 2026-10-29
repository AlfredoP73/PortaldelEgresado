from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.utils.auth_utils import get_current_user
from app.core import ai_client
from app.database import get_db
from app.graduates.services import ai_copilot_service


router = APIRouter(
    prefix="/api/modulo1/ai",
    tags=["Copiloto IA del Egresado"],
    dependencies=[Depends(get_current_user)],
)


class AnalyzeRequest(BaseModel):
    target_role: Optional[str] = None


class RewriteRequest(BaseModel):
    field: str = Field(default="summary", description="summary | experience | project | headline | cover_letter")
    text: str
    context: Optional[Dict[str, Any]] = None


class ChatMessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: Optional[List[ChatMessageItem]] = None
    message: Optional[str] = None
    session_id: Optional[int] = None


class CreateSessionRequest(BaseModel):
    title: Optional[str] = None


@router.get("/status")
def get_ai_status():
    return {
        "enabled": ai_client.is_enabled(),
        "model": ai_client.model_name(False) if ai_client.is_enabled() else None,
    }


@router.post("/coach/analyze")
def analyze_profile(
    body: Optional[AnalyzeRequest] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    target_role = body.target_role if body else None
    return ai_copilot_service.analyze_graduate_profile(db, current_user["id"], target_role=target_role)


@router.post("/coach/rewrite")
def rewrite_text(
    body: RewriteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ai_copilot_service.rewrite_profile_text(
        db=db,
        graduate_id=current_user["id"],
        field=body.field,
        text=body.text,
        context=body.context,
    )


@router.get("/coach/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ai_copilot_service.list_coach_sessions(db, current_user["id"])


@router.post("/coach/sessions")
def create_session(
    body: Optional[CreateSessionRequest] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    title = body.title if body else None
    return ai_copilot_service.create_coach_session(db, current_user["id"], title=title)


@router.get("/coach/sessions/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ai_copilot_service.get_coach_session(db, current_user["id"], session_id)


@router.delete("/coach/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ai_copilot_service.delete_coach_session(db, current_user["id"], session_id)


@router.post("/coach/chat")
def chat_coach(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    msgs = [{"role": m.role, "content": m.content} for m in (body.messages or [])]
    if not msgs and body.message:
        msgs = [{"role": "user", "content": body.message}]
    return ai_copilot_service.chat_with_coach(
        db=db,
        graduate_id=current_user["id"],
        messages=msgs,
        session_id=body.session_id,
    )
