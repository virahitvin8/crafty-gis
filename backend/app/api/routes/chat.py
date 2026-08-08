from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.core.ai.investigator import gis_investigator, InvestigationState
from app.core.models import ChatMessage, ChatResponse
import uuid

router = APIRouter()

# In-memory storage for demo purposes - replace with database in production
conversation_store: Dict[str, List[Dict[str, str]]] = {}

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    investigation_state: Optional[Dict[str, Any]] = None
    ready_to_proceed: bool = False

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint for interacting with the GIS investigator AI.
    """
    # Generate or use existing conversation ID
    conversation_id = request.conversation_id or str(uuid.uuid4())

    # Get or initialize conversation history
    if conversation_id not in conversation_store:
        conversation_store[conversation_id] = []

    # Add user message to history
    conversation_store[conversation_id].append({
        "role": "user",
        "content": request.message
    })

    try:
        # Investigate user intent
        investigation_result = await gis_investigator.investigate_user_intent(
            conversation_store[conversation_id]
        )

        # Generate AI response based on investigation state
        ai_response = await _generate_ai_response(
            request.message,
            conversation_store[conversation_id],
            investigation_result
        )

        # Add AI response to history
        conversation_store[conversation_id].append({
            "role": "assistant",
            "content": ai_response
        })

        return ChatResponse(
            response=ai_response,
            conversation_id=conversation_id,
            investigation_state=investigation_result,
            ready_to_proceed=investigation_result.get("ready_to_proceed", False)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

async def _generate_ai_response(
    user_message: str,
    conversation_history: List[Dict[str, str]],
    investigation_result: Dict[str, Any]
) -> str:
    """
    Generate an appropriate AI response based on the investigation state.
    """
    if investigation_result.get("ready_to_proceed", False):
        # User has provided enough information - confirm and show plan
        plan_summary = investigation_result.get("plan_summary",
            "I have enough information to proceed with your GIS analysis.")

        known_info = investigation_result.get("known_information", {})

        response_parts = [
            plan_summary,
            "",
            "Here's what I understand about your request:"
        ]

        # Format known information nicely
        for category, info in known_info.items():
            formatted_category = category.replace("_", " ").title()
            response_parts.append(f"• {formatted_category}: {info}")

        response_parts.extend([
            "",
            "Shall I proceed with generating the implementation plan and starting the analysis?",
            "You can also provide additional details or adjustments if needed."
        ])

        return "\n".join(response_parts)

    else:
        # Need more information - ask clarifying questions
        suggested_questions = investigation_result.get("suggested_questions", [])

        if suggested_questions:
            response_parts = [
                "To better understand your GIS analysis needs, I have a few questions:",
                ""
            ]

            for i, question in enumerate(suggested_questions, 1):
                response_parts.append(f"{i}. {question}")

            response_parts.extend([
                "",
                "Please answer these questions to help me create the most accurate analysis plan for you."
            ])

            return "\n".join(response_parts)
        else:
            # Fallback generic response
            return ("I'm here to help you with your GIS analysis needs. "
                   "Could you tell me more about what specific problem you're trying to solve "
                   "and what geographic area you're interested in?")

@router.get("/history/{conversation_id}")
async def get_conversation_history(conversation_id: str):
    """
    Retrieve conversation history for a given conversation ID.
    """
    if conversation_id not in conversation_store:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation_id": conversation_id,
        "history": conversation_store[conversation_id]
    }

@router.delete("/history/{conversation_id}")
async def clear_conversation_history(conversation_id: str):
    """
    Clear conversation history for a given conversation ID.
    """
    if conversation_id in conversation_store:
        del conversation_store[conversation_id]
        return {"message": "Conversation history cleared"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")