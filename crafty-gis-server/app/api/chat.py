"""
CRAFTY GIS — Chat API
Hybrid AI conversation endpoint supporting both free-form chat and structured wizard flows.
Includes AI investigation, mid-workflow interruption, and plan regeneration.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.core.ai_investigator import AIInvestigator
from app.core.workflow_engine import WorkflowEngine
from app.services.groq_service import HybridAIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# In-memory stores (replace with DB in production)
sessions: Dict[str, Dict[str, Any]] = {}
workflows: Dict[str, Any] = {}
_ai_service = HybridAIService()
investigator = AIInvestigator(_ai_service)


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    project_id: Optional[str] = None
    message: str
    message_type: str = "chat"  # chat, wizard_answer, interruption


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    message_type: str = "chat"
    suggestions: List[str] = []
    workflow_update: Optional[Dict[str, Any]] = None
    investigation_complete: bool = False
    intent: Optional[Dict[str, Any]] = None


class SessionCreate(BaseModel):
    project_id: Optional[str] = None


class SessionInfo(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]] = []
    status: str = "active"


@router.post("/session", response_model=SessionInfo)
async def create_session(request: SessionCreate):
    """Create a new chat session."""
    session_id = str(uuid.uuid4())[:8]
    sessions[session_id] = {
        "id": session_id,
        "project_id": request.project_id,
        "messages": [],
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
        "investigation_state": "idle",
        "workflow_id": None,
    }
    logger.info(f"Created session: {session_id}")
    return SessionInfo(
        session_id=session_id,
        messages=[],
        status="active",
    )


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """Send a message and get AI response (hybrid chat + wizard)."""
    session_id = request.session_id or str(uuid.uuid4())[:8]
    
    if session_id not in sessions:
        sessions[session_id] = {
            "id": session_id,
            "project_id": request.project_id,
            "messages": [],
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "investigation_state": "idle",
            "workflow_id": None,
        }
    
    session = sessions[session_id]
    
    # Store user message
    session["messages"].append({
        "role": "user",
        "content": request.message,
        "message_type": request.message_type,
        "timestamp": datetime.utcnow().isoformat(),
    })
    
    # Handle mid-workflow interruption
    if request.message_type == "interruption" and session.get("workflow_id"):
        return await _handle_interruption(session, request)
    
    # Handle wizard answers
    if request.message_type == "wizard_answer":
        return await _handle_wizard_answer(session, request)
    
    # Regular chat / start investigation
    return await _handle_chat_message(session, request, session_id)


async def _handle_chat_message(session: Dict, request: ChatRequest, session_id: str) -> ChatResponse:
    """Handle a regular chat message - route to AI investigation."""
    message = request.message
    
    # Check if investigation is in progress or complete
    inv_state = session.get("investigation_state", "idle")
    
    if inv_state == "idle":
        # Start investigation
        session["investigation_state"] = "investigating"
        result = await investigator.start_investigation(session_id, message)

        if result.get("type") == "plan_ready":
            # Investigation complete - generate workflow plan
            session["investigation_state"] = "complete"
            plan = result.get("plan", {})
            session["intent"] = plan

            reply = f"""✅ **Investigation Complete!** I understand your request.

📋 **Summary:** {plan.get('description', 'Analysis ready')}

🎯 **Analysis Type:** {plan.get('analysis_type', 'General')}
📍 **Location:** {plan.get('location', 'Specified area')}
📅 **Time Period:** {plan.get('time_period', 'Current')}

Would you like me to proceed with the analysis? Or do you have any adjustments?"""

            return ChatResponse(
                session_id=session_id,
                reply=reply,
                message_type="investigation_complete",
                suggestions=[
                    "Proceed with analysis",
                    "Adjust parameters",
                    "Add more details",
                ],
                investigation_complete=True,
                intent=plan,
            )
        else:
            # More questions needed
            wizard_progress = result.get("wizard_progress", {})
            session["context"] = wizard_progress.get("collected_data", {})

            reply = result.get("message", "")

            if wizard_progress:
                # Structured wizard mode with multiple questions
                completed = wizard_progress.get("completed_fields", [])
                current = wizard_progress.get("current_field", "")
                total = len(completed) + len(wizard_progress.get("remaining_fields", [])) + (1 if current else 0)
                done = len(completed) + (1 if current and current not in completed else 0)
                progress_text = f"Progress: {done}/{total} fields collected"

                reply = f"""📋 **Structured Investigation**

I need a few details to understand exactly what you need. Let me guide you through this step by step.

**{reply}**

{progress_text}"""

                return ChatResponse(
                    session_id=session_id,
                    reply=reply,
                    message_type="wizard_question",
                    suggestions=[],
                    investigation_complete=False,
                )

            return ChatResponse(
                session_id=session_id,
                reply=f"🤔 **I'd like to understand better:**\n\n{reply}",
                message_type="investigation_question",
                suggestions=[],
            )
    
    elif inv_state == "investigating":
        # Continue investigation with user's answer
        result = await investigator.start_investigation(session_id, message)

        wizard_progress = result.get("wizard_progress", {})
        session["context"] = wizard_progress.get("collected_data", {})

        if result.get("type") == "plan_ready":
            session["investigation_state"] = "complete"
            plan = result.get("plan", {})
            session["intent"] = plan

            reply = f"""✅ **Investigation Complete!**

📋 **Summary:** {plan.get('description', 'Analysis ready')}

Would you like me to proceed?"""

            return ChatResponse(
                session_id=session_id,
                reply=reply,
                message_type="investigation_complete",
                suggestions=["Proceed with analysis", "Adjust parameters"],
                investigation_complete=True,
                intent=plan,
            )

        message_type = "wizard_question" if wizard_progress else "investigation_question"
        return ChatResponse(
            session_id=session_id,
            reply=result.get("message", ""),
            message_type=message_type,
            suggestions=[],
        )
    
    else:
        # Investigation complete - handle follow-up
        reply = "Your investigation is complete. Would you like to proceed with the analysis or start a new request?"
        return ChatResponse(
            session_id=session_id,
            reply=reply,
            suggestions=["Proceed with analysis", "Start new request", "View summary"],
        )


async def _handle_wizard_answer(session: Dict, request: ChatRequest) -> ChatResponse:
    """Handle a structured wizard answer."""
    result = await investigator.start_investigation(
        session.get("id", ""),
        request.message,
    )

    wizard_progress = result.get("wizard_progress", {})
    session["context"] = wizard_progress.get("collected_data", {})

    if result.get("type") == "plan_ready":
        session["investigation_state"] = "complete"
        plan = result.get("plan", {})
        session["intent"] = plan

        return ChatResponse(
            session_id=session.get("id", ""),
            reply=f"✅ **Investigation Complete!**\n\n{plan.get('description', 'Analysis ready')}",
            message_type="investigation_complete",
            suggestions=["Proceed with analysis", "Adjust parameters"],
            investigation_complete=True,
            intent=plan,
        )

    return ChatResponse(
        session_id=session.get("id", ""),
        reply=result.get("message", ""),
        message_type="wizard_question",
        suggestions=[],
    )


async def _handle_interruption(session: Dict, request: ChatRequest) -> ChatResponse:
    """Handle mid-workflow interruption and plan regeneration."""
    workflow_id = session.get("workflow_id")
    workflow_engine = WorkflowEngine()
    
    # Regenerate plan with new input
    workflow = await workflow_engine.regenerate_plan(workflow_id, request.message)
    session["workflow_id"] = workflow.id
    
    reply = f"""🔄 **Plan Updated!**

I've adjusted the analysis based on your new requirements. Here's the updated plan:

{workflow.current_plan}

**Tasks in plan:** {len(workflow.tasks)}
**Pending tasks:** {len([t for t in workflow.tasks if t.status.value == 'pending'])}
**Completed:** {len([t for t in workflow.tasks if t.status.value == 'completed'])}

Should I continue with the updated plan?"""
    
    return ChatResponse(
        session_id=session.get("id", ""),
        reply=reply,
        message_type="plan_updated",
        suggestions=["Continue execution", "Make more adjustments", "View task list"],
        workflow_update=workflow.to_dict(),
    )


@router.get("/session/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get session history."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionInfo(
        session_id=session_id,
        messages=session.get("messages", []),
        status=session.get("status", "active"),
    )


@router.get("/session/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Get all messages in a session."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"messages": session.get("messages", [])}


@router.post("/session/{session_id}/execute")
async def execute_analysis(session_id: str):
    """Execute the analysis after investigation is complete."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.get("investigation_state") != "complete":
        raise HTTPException(status_code=400, detail="Investigation not complete")
    
    # Create and execute workflow
    workflow_engine = WorkflowEngine()
    intent = session.get("intent", {})
    
    workflow = await workflow_engine.create_workflow(
        project_id=session.get("project_id", "default"),
        session_id=session_id,
        user_input=intent.get("summary", "Execute analysis"),
        context=intent,
    )
    
    session["workflow_id"] = workflow.id
    
    return {
        "message": "Analysis execution started",
        "workflow_id": workflow.id,
        "workflow": workflow.to_dict(),
    }


@router.post("/session/{session_id}/interrupt")
async def interrupt_analysis(session_id: str, request: ChatRequest):
    """Interrupt a running analysis."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    workflow_engine = WorkflowEngine()
    workflow_id = session.get("workflow_id")
    
    if not workflow_id:
        raise HTTPException(status_code=400, detail="No active workflow")
    
    interrupted = await workflow_engine.interrupt_workflow(workflow_id)
    
    if not interrupted:
        raise HTTPException(status_code=400, detail="Workflow not running or already interrupted")
    
    return {
        "message": "Analysis interrupted. You can now provide additional instructions.",
        "workflow_id": workflow_id,
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CRAFTY GIS Chat API",
        "active_sessions": len(sessions),
        "timestamp": datetime.utcnow().isoformat(),
    }
