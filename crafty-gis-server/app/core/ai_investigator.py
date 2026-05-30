"""CRAFTY GIS — AI Investigator: Hybrid Chat + Structured Wizard.

This module implements the core AI investigation system that:
1. Engages the user in natural conversation to understand their problem
2. Systematically extracts structured parameters through targeted questions
3. Generates a complete analysis plan with tasks
4. Handles mid-workflow interruptions and adjustments
5. Supports both free-form chat and structured wizard questionnaire modes
"""

import json
import logging
import re
from typing import Optional
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)

INVESTIGATOR_SYSTEM_PROMPT = """You are the AI Consultant for CRAFTY GIS — an intelligent geospatial problem-solving platform.

YOUR ROLE:
You receive problems from users in GIS, remote sensing, and agriculture. Your job is to:
1. Ask targeted questions ONE AT A TIME to understand exactly what they need
2. Translate their intent into a structured analysis plan
3. NEVER assume — always clarify before proceeding

COMMUNICATION STYLE:
- Warm, professional, and conversational
- Use simple language — adapt to the user's technical level
- Ask ONE question at a time — don't overwhelm the user
- Confirm your understanding before moving to the next question

QUESTION CATEGORIES (explore in order):
1. Problem Definition — What exactly do they want to know or solve?
2. Geographic Scope — Where is the study area? (country, state, district, coordinates)
3. Time Period — What time range? (single date, annual, monthly, historical)
4. Analysis Type — What kind of processing? (classification, change detection, vegetation, terrain)
5. Output Format — How should results be delivered? (map, report, raw data, all)
6. Data Sources — Their own data or find automatically?
7. Quality Level — Research, professional, or quick estimate?
8. Technical Comfort — Adjust language accordingly

After gathering sufficient information, output a structured plan as JSON wrapped in [PLAN]...[/PLAN] tags.

FORMAT EXAMPLE:
[PLAN]
{
  "analysis_type": "vegetation_health",
  "location": "Saharanpur, Uttar Pradesh, India",
  "time_period": "2020-2024",
  "outputs": ["classified_map", "report", "statistics"],
  "data_sources": ["sentinel-2"],
  "accuracy": "research",
  "description": "NDVI analysis for crop health monitoring in Saharanpur district"
}
[/PLAN]
"""

WIZARD_SYSTEM_PROMPT = """You are the CRAFTY GIS Wizard — a structured questionnaire system for geospatial analysis.

You are guiding the user through a systematic parameter collection process. You have a form to fill out with the following fields:

FIELD 1: PROBLEM_DEFINITION - What the user wants to solve or know
FIELD 2: GEOGRAPHIC_SCOPE - Location (country/state/district/coordinates)  
FIELD 3: TIME_PERIOD - Date range or specific time
FIELD 4: ANALYSIS_TYPE - Type of analysis needed
FIELD 5: OUTPUT_FORMAT - How results should be delivered
FIELD 6: DATA_PREFERENCE - Use own data or auto-download
FIELD 7: ACCURACY_LEVEL - Research/professional/quick estimate
FIELD 8: TECHNICAL_LEVEL - Adjust language complexity

Progress tracking format:
[WIZARD_PROGRESS]
{
  "completed_fields": ["PROBLEM_DEFINITION"],
  "current_field": "GEOGRAPHIC_SCOPE",
  "remaining_fields": ["TIME_PERIOD", "ANALYSIS_TYPE", "OUTPUT_FORMAT", "DATA_PREFERENCE", "ACCURACY_LEVEL", "TECHNICAL_LEVEL"],
  "collected_data": {
    "problem_definition": "What the user said about their problem"
  }
}
[/WIZARD_PROGRESS]

Ask only about the CURRENT field. When answered, validate the answer, then move to the next field.
Output the progress after each user response.

When all fields are complete, output [PLAN]...[/PLAN] with the complete structured plan.
"""

HYBRID_SYSTEM_PROMPT = """You are the CRAFTY GIS Hybrid Intelligence System — combining natural conversation with structured data collection.

YOUR DUAL MODE APPROACH:
1. CHAT MODE: Engage naturally, ask follow-ups, explore the user's problem freely
2. WIZARD MODE: When you have enough information, systematically fill the structured form

The user can switch between modes freely. If they give a natural language answer, respond naturally.
If they seem unsure or the problem is complex, use wizard mode to guide them step by step.

QUESTION FIELDS TO COLLECT:
- PROBLEM_DEFINITION: What they want to solve
- GEOGRAPHIC_SCOPE: Where
- TIME_PERIOD: When
- ANALYSIS_TYPE: What kind
- OUTPUT_FORMAT: How to deliver
- DATA_PREFERENCE: Their data or auto-find
- ACCURACY_LEVEL: Quality needed
- TECHNICAL_LEVEL: Language complexity

Track progress with [WIZARD_PROGRESS] tags.
When complete, output [PLAN]...[/PLAN] with the structured plan.
"""


class InvestigationState:
    """Tracks the current state of an investigation conversation."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.conversation_history: list[dict] = []
        self.extracted_params: dict = {}
        self.questions_asked: int = 0
        self.plan_generated: bool = False
        self.question_categories_covered: set = set()
        self.wizard_progress: dict = {
            "completed_fields": [],
            "current_field": "PROBLEM_DEFINITION",
            "remaining_fields": [
                "GEOGRAPHIC_SCOPE", "TIME_PERIOD", "ANALYSIS_TYPE",
                "OUTPUT_FORMAT", "DATA_PREFERENCE", "ACCURACY_LEVEL", "TECHNICAL_LEVEL"
            ],
            "collected_data": {},
        }

    def add_message(self, role: str, content: str):
        self.conversation_history.append({"role": role, "content": content})

    def get_context(self) -> list[dict]:
        return self.conversation_history[-30:]


class AIInvestigator:
    """Orchestrates the AI-driven investigation process with hybrid chat + wizard."""

    def __init__(self, ollama_service: OllamaService):
        self.ollama = ollama_service
        self.active_sessions: dict[str, InvestigationState] = {}

    async def start_investigation(self, project_id: str, user_message: str) -> dict:
        """Start or continue an investigation."""
        if project_id not in self.active_sessions:
            state = InvestigationState(project_id)
            state.add_message("user", user_message)
            self.active_sessions[project_id] = state
        else:
            state = self.active_sessions[project_id]
            state.add_message("user", user_message)

        # Check if wizard mode should be suggested
        response = await self._get_hybrid_response(state)

        # Check for wizard progress or plan
        wizard_progress = self._extract_wizard_progress(response)
        plan = self._extract_plan(response)

        if plan:
            state.plan_generated = True
            state.extracted_params = plan
            state.add_message("assistant", self._clean_response(response))
            return {
                "type": "plan_ready",
                "message": self._clean_response(response),
                "plan": plan,
                "wizard_progress": state.wizard_progress,
                "conversation_id": project_id,
            }

        if wizard_progress:
            state.wizard_progress = wizard_progress

        state.add_message("assistant", response)
        return {
            "type": "question",
            "message": response,
            "plan": None,
            "wizard_progress": wizard_progress if wizard_progress else state.wizard_progress,
            "conversation_id": project_id,
        }

    async def handle_interruption(self, project_id: str, new_instruction: str) -> dict:
        """Handle a mid-workflow interruption/adjustment from the user."""
        state = self.active_sessions.get(project_id)
        if not state:
            return {"error": "No active session found"}

        state.add_message("user", f"[INTERRUPTION - Update my plan]: {new_instruction}")

        revision_prompt = (
            "The user wants to change their analysis plan. "
            f"New request: {new_instruction}\n\n"
            "Please update the plan accordingly. Output the revised plan in [PLAN]...[/PLAN] format."
        )
        state.add_message("system", revision_prompt)

        response = await self._get_hybrid_response(state)
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

    async def get_wizard_progress(self, project_id: str) -> Optional[dict]:
        """Get wizard progress for a project."""
        state = self.active_sessions.get(project_id)
        if state:
            return state.wizard_progress
        return None

    async def switch_to_wizard_mode(self, project_id: str) -> dict:
        """Explicitly switch to structured wizard mode."""
        state = self.active_sessions.get(project_id)
        if not state:
            return {"error": "No active session"}

        state.add_message("system", "Switch to WIZARD MODE. Guide me through the structured questionnaire step by step.")
        response = await self.ollama.chat([
            {"role": "system", "content": WIZARD_SYSTEM_PROMPT},
            *state.get_context(),
        ])

        state.add_message("assistant", response)
        wizard_progress = self._extract_wizard_progress(response)
        if wizard_progress:
            state.wizard_progress = wizard_progress

        return {
            "type": "wizard_question",
            "message": response,
            "wizard_progress": wizard_progress or state.wizard_progress,
        }

    async def _get_hybrid_response(self, state: InvestigationState) -> str:
        """Get AI response using the hybrid chat + wizard approach."""
        messages = [
            {"role": "system", "content": HYBRID_SYSTEM_PROMPT},
        ]
        messages.extend(state.get_context())
        return await self.ollama.chat(messages)

    def _extract_plan(self, response: str) -> Optional[dict]:
        """Extract structured plan from AI response if present."""
        match = re.search(r'\[PLAN\](.*?)\[/PLAN\]', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse plan JSON")
                return None
        return None

    def _extract_wizard_progress(self, response: str) -> Optional[dict]:
        """Extract wizard progress JSON from AI response."""
        match = re.search(r'\[WIZARD_PROGRESS\](.*?)\[/WIZARD_PROGRESS\]', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse wizard progress")
                return None
        return None

    def _clean_response(self, response: str) -> str:
        """Remove internal tags from the response for user display."""
        cleaned = re.sub(r'\[PLAN\].*?\[/PLAN\]', '', response, flags=re.DOTALL)
        cleaned = re.sub(r'\[WIZARD_PROGRESS\].*?\[/WIZARD_PROGRESS\]', '', cleaned, flags=re.DOTALL)
        return cleaned.strip()
