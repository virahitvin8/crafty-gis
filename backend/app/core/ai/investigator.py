import anthropic
import json
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.models import InvestigationState, AnalysisType, OutputFormat

class GISInvestigator:
    """
    AI-powered investigator that extracts user intent for GIS analysis projects.
    Acts as a consultant asking targeted questions to understand user needs.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.system_prompt = """You are the AI Consultant for CRAFTY GIS (Conversational Remote Analysis & Field Technology for GIS).
        You are an intelligent autonomous geospatial problem-solver.
        Your job is to talk to the user in plain language (no GIS jargon like LULC, DEM, etc. unless the user uses it first).
        You must act as a consultant to extract the following information before performing an analysis:
        1. Problem Definition (What do they want to solve?)
        2. Geographic Scope (Which area?)
        3. Time Period
        4. Analysis Type
        5. Output Format
        6. Data Preferences
        7. Accuracy/Quality Requirements
        8. Software Preferences

        Ask one or two clarifying questions at a time. Do not overwhelm the user.
        If you have all the information, summarize the plan and tell them you are ready to begin processing.
        Always maintain a helpful, professional tone."""

        # Question templates for different categories
        self.question_templates = {
            "problem_definition": [
                "What specific problem or question are you trying to address with this GIS analysis?",
                "What decision or insight are you hoping to gain from this analysis?",
                "What prompted you to seek this geospatial analysis?"
            ],
            "geographic_scope": [
                "Which geographic area are you interested in? (e.g., country, state, district, city, specific coordinates)",
                "How large is the study area you have in mind?",
                "Do you have boundary files or should I obtain them from OpenStreetMap?"
            ],
            "time_period": [
                "What time period are you interested in analyzing?",
                "Are you looking at current conditions, historical changes, or future projections?",
                "What specific dates or date ranges should I consider?"
            ],
            "analysis_type": [
                "What type of analysis do you need? (e.g., land use/land cover change, vegetation health, terrain analysis, flood mapping, etc.)",
                "Do you need classification, change detection, suitability analysis, or something else?",
                "What specific outputs are you expecting from this analysis?"
            ],
            "output_format": [
                "What format would you prefer for the results? (e.g., PDF report, maps, raw data files, presentation)",
                "Who will be using these results and how will they consume them?",
                "Do you need print-ready maps, web-friendly visualizations, or GIS-ready data files?"
            ],
            "data_preferences": [
                "Do you have your own data to use, or should I acquire the necessary satellite imagery and datasets?",
                "Are there specific satellite sources you prefer (Landsat, Sentinel, MODIS, etc.)?",
                "What level of spatial resolution do you need for your analysis?"
            ],
            "quality_requirements": [
                "What is the intended use of this analysis? (academic research, government report, business proposal, personal use)",
                "What level of accuracy or detail is required for your purposes?",
                "Are there any specific standards or methodologies you need me to follow?"
            ],
            "software_preferences": [
                "Do you have access to specific GIS software (ArcGIS, QGIS, etc.) that you prefer I use?",
                "Are you open to using open-source tools like QGIS, SAGA GIS, or GRASS GIS for processing?",
                "Do you need the analysis to be reproducible or compatible with specific software?"
            ]
        }

    async def investigate_user_intent(self, conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze conversation history and determine what information is still needed.
        Returns a structured investigation state with questions to ask or confirmation to proceed.
        """
        # Build context from conversation
        context = self._build_conversation_context(conversation_history)

        # Use AI to analyze what we know and what we need
        investigation_prompt = f"""
        Based on the conversation history below, analyze what information has been gathered
        for a GIS analysis project and what key information is still missing.

        Conversation History:
        {context}

        Extract and organize the following information if available:
        1. Problem Definition
        2. Geographic Scope (area, boundaries)
        3. Time Period (dates, temporal range)
        4. Analysis Type (specific GIS analysis needed)
        5. Output Format Desired
        6. Data Preferences/Sources
        7. Quality/Accuracy Requirements
        8. Software Preferences/Constraints

        For each category, indicate what is known and what is still needed.
        If sufficient information is available to proceed, provide a summary of the understood requirements.
        If more information is needed, suggest 1-2 specific, plain-language questions to ask the user.

        Respond in JSON format with:
        {{
            "known_information": {{category: "extracted_info"}},
            "missing_information": [list of category names still needed],
            "suggested_questions": [1-2 plain language questions to ask],
            "ready_to_proceed": boolean,
            "plan_summary": "brief summary if ready to proceed"
        }}
        """

        try:
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.3,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": investigation_prompt}
                ]
            )

            # Parse AI response
            result = json.loads(message.content[0].text)
            return result

        except Exception as e:
            # Fallback to rule-based investigation
            return self._rule_based_investigation(conversation_history)

    def _build_conversation_context(self, conversation_history: List[Dict[str, str]]) -> str:
        """Build a readable context from conversation history."""
        if not conversation_history:
            return "No conversation history available."

        context_lines = []
        for msg in conversation_history:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            context_lines.append(f"{role.title()}: {content}")

        return "\n".join(context_lines)

    def _rule_based_investigation(self, conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Fallback rule-based investigation when AI fails."""
        # Simple keyword matching for demonstration
        known_info = {}
        missing_categories = []

        # This would be expanded with actual NLP/entity extraction in production
        full_text = " ".join([msg.get("content", "").lower() for msg in conversation_history])

        # Check for geographic indicators
        if any(indicator in full_text for indicator in ["district", "state", "country", "city", "area", "region"]):
            known_info["geographic_scope"] = "Some geographic information mentioned"
        else:
            missing_categories.append("geographic_scope")

        # Check for time indicators
        if any(indicator in full_text for indicator in ["year", "date", "time", "period", "2020", "2021", "2022", "2023", "2024"]):
            known_info["time_period"] = "Some temporal information mentioned"
        else:
            missing_categories.append("time_period")

        # Check for analysis type indicators
        if any(indicator in full_text for indicator in ["land use", "vegetation", "forest", "water", "urban", "change", "analysis"]):
            known_info["analysis_type"] = "Some analysis type mentioned"
        else:
            missing_categories.append("analysis_type")

        # Determine if we have enough to proceed
        ready_to_proceed = len(missing_categories) <= 2  # Arbitrary threshold

        suggested_questions = []
        if not ready_to_proceed and missing_categories:
            # Generate questions for first 2 missing categories
            for category in missing_categories[:2]:
                if category in self.question_templates:
                    suggested_questions.append(self.question_templates[category][0])

        return {
            "known_information": known_info,
            "missing_information": missing_categories,
            "suggested_questions": suggested_questions,
            "ready_to_proceed": ready_to_proceed,
            "plan_summary": "Based on our conversation, I understand your needs and am ready to proceed with the analysis." if ready_to_proceed else None
        }


# Singleton instance
gis_investigator = GISInvestigator()