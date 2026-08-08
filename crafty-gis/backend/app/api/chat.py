"""
Chat API — handles the AI conversation, investigation, and interruption flow.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.ai_investigator import AIInvestigator
from app.core.workflow_engine import WorkflowEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    project_id: str
    message_type: str  # "question", "plan_ready", "plan_updated", "error"
    plan: Optional[dict] = None


class InterruptRequest(BaseModel):
    project_id: str
    new_instruction: str


# Service references — injected from main.py lifespan
investigator: Optional[AIInvestigator] = None
workflow_engine: Optional[WorkflowEngine] = None


@router.post("/send", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """Send a message to the AI investigator and get a response."""
    if investigator is None:
        raise HTTPException(status_code=503, detail="AI Investigator not initialized")

    try:
        result = await investigator.start_investigation(
            request.project_id or "new",
            request.message,
        )

        project_id = result.get("conversation_id", request.project_id or "new")
        message_type = result.get("type", "question")
        response_text = result.get("message", "")
        plan = result.get("plan")

        # If plan is ready, also generate the workflow
        if plan and message_type == "plan_ready" and workflow_engine:
            tasks = await workflow_engine.generate_workflow(project_id, plan)
            plan["tasks"] = tasks

        return ChatResponse(
            response=response_text,
            project_id=project_id,
            message_type=message_type,
            plan=plan,
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interrupt", response_model=ChatResponse)
async def interrupt_analysis(request: InterruptRequest):
    """Handle a mid-workflow interruption/adjustment."""
    if investigator is None:
        raise HTTPException(status_code=503, detail="AI Investigator not initialized")

    try:
        result = await investigator.handle_interruption(
            request.project_id, request.new_instruction
        )
        message_type = result.get("type", "question")
        response_text = result.get("message", "")
        plan = result.get("plan")

        if plan and workflow_engine:
            tasks = await workflow_engine.generate_workflow(request.project_id, plan)
            plan["tasks"] = tasks

        return ChatResponse(
            response=response_text,
            project_id=request.project_id,
            message_type=message_type,
            plan=plan,
        )

    except Exception as e:
        logger.error(f"Interrupt error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
