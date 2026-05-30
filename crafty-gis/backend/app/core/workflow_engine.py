"""
Workflow Engine — generates and executes the analysis workflow plan.

Takes the structured plan from the AI Investigator and converts it into
executable task steps, manages execution, and handles interruptions.
"""

import json
import logging
import asyncio
from typing import Optional
from datetime import datetime
from pathlib import Path
from app.config import settings
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)

WORKFLOW_GENERATION_PROMPT = """You are the Workflow Planner for CRAFTY GIS. Based on the user's analysis request below, generate a detailed step-by-step implementation plan.

Each step must include:
- title: Clear task name
- description: What this step does in detail
- tool: Which GIS tool to use (gdal, qgis, saga, grass, python, fragstats)
- estimated_time: Time estimate in minutes
- inputs: What data/files this step needs
- outputs: What this step produces

Return the plan as a JSON array ONLY, wrapped in [WORKFLOW]...[/WORKFLOW] tags.

Example:
[WORKFLOW]
[
  {
    "title": "Download Sentinel-2 imagery",
    "description": "Download Sentinel-2 satellite imagery for the study area",
    "tool": "python",
    "estimated_time": 15,
    "inputs": ["study_area_boundary", "date_range"],
    "outputs": ["sentinel2_scenes"]
  }
]
[/WORKFLOW]"""


class WorkflowEngine:
    """Manages workflow generation, execution, and monitoring."""

    def __init__(self, ollama_service: OllamaService):
        self.ollama = ollama_service
        self.active_workflows: dict[str, dict] = {}

    async def generate_workflow(self, project_id: str, analysis_params: dict) -> list[dict]:
        """Generate a workflow plan from analysis parameters."""
        messages = [
            {"role": "system", "content": WORKFLOW_GENERATION_PROMPT},
            {"role": "user", "content": json.dumps(analysis_params, indent=2)},
        ]

        response = await self.ollama.chat(messages)
        tasks = self._extract_tasks(response)

        if not tasks:
            tasks = self._get_default_workflow(analysis_params)

        # Assign task IDs and order
        for i, task in enumerate(tasks):
            task["id"] = f"task_{i+1:03d}"
            task["order"] = i + 1
            task["status"] = "pending"
            task["progress"] = 0.0

        workflow = {
            "project_id": project_id,
            "tasks": tasks,
            "total_tasks": len(tasks),
            "completed_tasks": 0,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
        }

        self.active_workflows[project_id] = workflow
        return tasks

    async def execute_workflow(
        self, project_id: str,
        progress_callback: Optional[callable] = None
    ) -> dict:
        """Execute a workflow task by task."""
        workflow = self.active_workflows.get(project_id)
        if not workflow:
            return {"error": "Workflow not found"}

        workflow["status"] = "running"

        for task in workflow["tasks"]:
            if task["status"] == "completed":
                continue

            task["status"] = "running"
            task["started_at"] = datetime.utcnow().isoformat()
            await self._update_progress(project_id, progress_callback)

            try:
                # Execute the task based on tool type
                result = await self._execute_task(task)
                task["status"] = "completed"
                task["progress"] = 100.0
                task["result"] = result
                task["completed_at"] = datetime.utcnow().isoformat()
                workflow["completed_tasks"] += 1

            except Exception as e:
                logger.error(f"Task {task['id']} failed: {e}")
                task["status"] = "failed"
                task["error"] = str(e)
                workflow["status"] = "failed"
                break

            await self._update_progress(project_id, progress_callback)

        if workflow["status"] == "running":
            workflow["status"] = "completed"

        return workflow

    async def add_task(self, project_id: str, new_task: dict) -> list[dict]:
        """Insert a new task into an existing workflow (for interruptions)."""
        workflow = self.active_workflows.get(project_id)
        if not workflow:
            return []

        new_task["id"] = f"task_{len(workflow['tasks']) + 1:03d}"
        new_task["order"] = len(workflow["tasks"]) + 1
        new_task["status"] = "pending"
        new_task["progress"] = 0.0
        workflow["tasks"].append(new_task)
        workflow["total_tasks"] = len(workflow["tasks"])
        return workflow["tasks"]

    async def get_workflow(self, project_id: str) -> Optional[dict]:
        """Get the current workflow state."""
        return self.active_workflows.get(project_id)

    def _extract_tasks(self, response: str) -> list[dict]:
        """Extract task list from AI response."""
        import re
        match = re.search(r'\[WORKFLOW\](.*?)\[/WORKFLOW\]', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                logger.warning("Failed to parse workflow JSON")
        return []

    def _get_default_workflow(self, params: dict) -> list[dict]:
        """Fallback workflow template for common analysis types."""
        analysis_type = params.get("analysis_type", "custom")
        templates = {
            "land_use_land_cover": [
                {"title": "Define study area boundary", "description": "Get boundary from OSM or user upload", "tool": "python"},
                {"title": "Download satellite imagery", "description": "Download Sentinel-2 or Landsat imagery", "tool": "python"},
                {"title": "Preprocess imagery", "description": "Atmospheric correction, cloud masking", "tool": "gdal"},
                {"title": "Run LULC classification", "description": "Classify land cover types", "tool": "qgis"},
                {"title": "Generate maps and statistics", "description": "Create classified map and area calculations", "tool": "python"},
                {"title": "Generate PDF report", "description": "Compile final report with all outputs", "tool": "python"},
            ],
            "vegetation_health": [
                {"title": "Define study area boundary", "description": "Get study area boundary", "tool": "python"},
                {"title": "Download satellite imagery", "description": "Download Sentinel-2 imagery", "tool": "python"},
                {"title": "Calculate NDVI", "description": "Compute Normalized Difference Vegetation Index", "tool": "gdal"},
                {"title": "Generate vegetation health map", "description": "Classify NDVI into health categories", "tool": "python"},
                {"title": "Generate report", "description": "Create vegetation analysis report", "tool": "python"},
            ],
        }
        raw_tasks = templates.get(analysis_type, templates["land_use_land_cover"])
        return [dict(t) for t in raw_tasks]

    async def _execute_task(self, task: dict) -> dict:
        """Execute a single task. Placeholder for actual tool execution."""
        await asyncio.sleep(1)  # Simulate processing
        return {"status": "completed", "message": f"Executed {task['title']}"}

    async def _update_progress(self, project_id: str, callback: Optional[callable]):
        """Notify progress callback."""
        if callback:
            await callback(self.active_workflows.get(project_id))
