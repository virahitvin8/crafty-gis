"""
AI Investigator — the brain of CRAFTY GIS.

This module handles the intelligent conversation system that:
1. Receives the user's initial problem statement
2. Asks targeted clarifying questions one at a time
3. Parses all answers into a structured analysis request
4. Generates a complete implementation plan with tasks
5. Handles mid-workflow interruptions and adjustments
"""

import json
import logging
from typing import Optional
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)

# System prompt that defines the AI's personality and role
INVESTIGATOR_SYSTEM_PROMPT = """You are the AI Investigation System for CRAFTY GIS — an intelligent geospatial problem-solving platform.

Your role:
1. You receive problems from users in GIS, remote sensing, and agriculture
2. You ask targeted questions ONE AT A TIME to understand exactly what they need
3. You translate their intent into a structured analysis plan
4. You NEVER assume — always clarify before proceeding

Communication style:
- Be warm, professional, and conversational
- Use simple language — adapt to the user's technical level
- Never use jargon unless the user shows they understand it
- Ask ONE question at a time — don't overwhelm the user
- Confirm your understanding before moving to the next question

Question categories you should explore (in order):
1. Problem Definition — What exactly do they want to know?
2. Geographic Scope — Where is the study area?
3. Time Period — What time range?
4. Analysis Type — What kind of processing?
5. Output Format — How should results be delivered?
6. Data Sources — Their own data or find automatically?
7. Quality Level — Research, professional, or quick estimate?
8. Technical Comfort — Adjust language accordingly

After you have enough information, output a JSON block with the structured plan.
Format: [PLAN]{\\"analysis_type\\": \\"...\\", \\"location\\": \\"...\\", \\"time_period\\": \\"...\\", \\"outputs\\": [\\"...\\"], \\"data_sources\\": [\\"...\\"], \\"accuracy\\": \\"...\\", \\"description\\": \\"...\\"}[/PLAN]"""


class InvestigationState:
    """Tracks the current state of an investigation conversation."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.conversation_history: list[dict] = []
        self.extracted_params: dict = {}
        self.questions_asked: int = 0
        self.plan_generated: bool = False
        self.question_categories_covered: set = set()

    def add_message(self, role: str, content: str):
        self.conversation_history.append({"role": role, "content": content})

    def get_context(self) -> list[dict]:
        return self.conversation_history[-20:]  # Last 20 messages for context


class AIInvestigator:
    """Orchestrates the AI-driven investigation process."""

    def __init__(self, ollama_service: OllamaService):
        self.ollama = ollama_service
        self.active_sessions: dict[str, InvestigationState] = {}

    async def start_investigation(self, project_id: str, user_message: str) -> dict:
        """Start a new investigation or continue an existing one."""
        if project_id not in self.active_sessions:
            state = InvestigationState(project_id)
            state.add_message("user", user_message)
            self.active_sessions[project_id] = state
        else:
            state = self.active_sessions[project_id]
            state.add_message("user", user_message)

        # Get AI response
        response = await self._get_ai_response(state)

        # Check if AI included a plan
        plan = self._extract_plan(response)

        if plan:
            state.plan_generated = True
            state.extracted_params = plan
            state.add_message("assistant", self._clean_response(response))
            return {
                "type": "plan_ready",
                "message": self._clean_response(response),
                "plan": plan,
                "conversation_id": project_id,
            }
        else:
            state.add_message("assistant", response)
            return {
                "type": "question",
                "message": response,
                "plan": None,
                "conversation_id": project_id,
            }

    async def handle_interruption(self, project_id: str, new_instruction: str) -> dict:
        """Handle a mid-workflow interruption from the user."""
        state = self.active_sessions.get(project_id)
        if not state:
            return {"error": "No active session found"}

        state.add_message("user", f"[INTERRUPTION - Update my plan]: {new_instruction}")

        # Ask AI to revise the plan
        revision_prompt = (
            "The user wants to change their analysis plan. "
            f"Here is the new request: {new_instruction}\n\n"
            "Please update the plan accordingly. Output the revised plan in [PLAN]...[/PLAN] format."
        )
        state.add_message("system", revision_prompt)

        response = await self._get_ai_response(state)
        plan = self._extract_plan(response)

        if plan:
            state.extracted_params = plan
            state.add_message("assistant", self._clean_response(response))
            return {
                "type": "plan_updated",
                "message": self._clean_response(response),
                "plan": plan,
            }
        else:
            state.add_message("assistant", response)
            return {
                "type": "question",
                "message": response,
                "plan": None,
            }

    async def get_plan(self, project_id: str) -> Optional[dict]:
        """Get the extracted plan for a project."""
        state = self.active_sessions.get(project_id)
        if state and state.plan_generated:
            return state.extracted_params
        return None

    async def _get_ai_response(self, state: InvestigationState) -> str:
        """Get a response from the local LLM."""
        messages = [
            {"role": "system", "content": INVESTIGATOR_SYSTEM_PROMPT},
        ]
        messages.extend(state.get_context())
        return await self.ollama.chat(messages)

    def _extract_plan(self, response: str) -> Optional[dict]:
        """Extract structured plan from AI response if present."""
        import re
        match = re.search(r'\[PLAN\](.*?)\[/PLAN\]', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse plan JSON: {match.group(1)}")
                return None
        return None

    def _clean_response(self, response: str) -> str:
        """Remove plan JSON from the response for user display."""
        import re
        cleaned = re.sub(r'\[PLAN\].*?\[/PLAN\]', '', response, flags=re.DOTALL)
        return cleaned.strip()
