"""
CRAFTY GIS — Workflow Engine
AI-powered task generation & orchestration with mid-workflow interruption support.
Translates user intent into executable geospatial workflows across multiple tools.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from app.config import settings
from app.core.ai_investigator import AIInvestigator

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    INTERRUPTED = "interrupted"


class TaskType(str, Enum):
    DATA_DOWNLOAD = "data_download"
    DATA_PREPROCESSING = "data_preprocessing"
    RASTER_ANALYSIS = "raster_analysis"
    VECTOR_ANALYSIS = "vector_analysis"
    TERRAIN_ANALYSIS = "terrain_analysis"
    CLASSIFICATION = "classification"
    CHANGE_DETECTION = "change_detection"
    VEGETATION_INDEX = "vegetation_index"
    HYDROLOGICAL_MODELING = "hydrological_modeling"
    LANDSCAPE_METRICS = "landscape_metrics"
    REPORT_GENERATION = "report_generation"
    MAP_CREATION = "map_creation"
    EXPORT = "export"


class Task:
    """Represents a single executable step in the workflow."""

    def __init__(
        self,
        task_type: TaskType,
        title: str,
        description: str,
        tool: str,
        params: Dict[str, Any],
        depends_on: List[str] = None,
    ):
        self.id = str(uuid.uuid4())[:8]
        self.task_type = task_type
        self.title = title
        self.description = description
        self.tool = tool
        self.params = params
        self.depends_on = depends_on or []
        self.status = TaskStatus.PENDING
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error: Optional[str] = None
        self.output: Dict[str, Any] = {}
        self.progress: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "task_type": self.task_type.value,
            "title": self.title,
            "description": self.description,
            "tool": self.tool,
            "params": self.params,
            "depends_on": self.depends_on,
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "progress": self.progress,
        }


class Workflow:
    """Orchestrates a complete analysis workflow from investigation to delivery."""

    def __init__(self, project_id: str, session_id: str):
        self.id = str(uuid.uuid4())[:8]
        self.project_id = project_id
        self.session_id = session_id
        self.tasks: List[Task] = []
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.current_plan: str = ""
        self.is_running = False
        self.is_interrupted = False
        self.user_intent: Dict[str, Any] = {}

    def add_task(self, task: Task) -> None:
        self.tasks.append(task)
        self.updated_at = datetime.utcnow()

    def clear_tasks(self) -> None:
        self.tasks.clear()
        self.updated_at = datetime.utcnow()

    def get_task(self, task_id: str) -> Optional[Task]:
        for t in self.tasks:
            if t.id == task_id:
                return t
        return None

    def get_pending_tasks(self) -> List[Task]:
        """Get tasks whose dependencies are all completed."""
        ready = []
        for task in self.tasks:
            if task.status != TaskStatus.PENDING:
                continue
            deps_met = all(
                any(
                    t.id == dep_id and t.status == TaskStatus.COMPLETED
                    for t in self.tasks
                )
                for dep_id in task.depends_on
            )
            if deps_met:
                ready.append(task)
        return ready

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "session_id": self.session_id,
            "tasks": [t.to_dict() for t in self.tasks],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "current_plan": self.current_plan,
            "is_running": self.is_running,
            "is_interrupted": self.is_interrupted,
            "user_intent": self.user_intent,
        }


class WorkflowEngine:
    """
    The core orchestration engine.
    - Takes user intent from AIInvestigator
    - Generates a complete task-based workflow
    - Executes tasks respecting dependencies
    - Supports mid-run interruption and plan regeneration
    """

    def __init__(self, ollama_service=None):
        self.ollama_service = ollama_service
        self.active_workflows: Dict[str, Workflow] = {}
        self.investigator = AIInvestigator(ollama_service)

    async def create_workflow(
        self, project_id: str, session_id: str, user_input: str, context: Dict[str, Any] = None
    ) -> Workflow:
        """Create a new workflow from user input, generating tasks via AI."""
        workflow = Workflow(project_id, session_id)
        self.active_workflows[workflow.id] = workflow

        # Generate the workflow plan using the AI investigator
        plan = await self._generate_workflow_plan(user_input, context or {})
        workflow.current_plan = plan["plan_text"]
        workflow.user_intent = plan["intent"]

        # Convert plan into structured tasks
        tasks = self._plan_to_tasks(plan)
        for task in tasks:
            workflow.add_task(task)

        return workflow

    async def _generate_workflow_plan(
        self, user_input: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use AI to generate a detailed workflow plan from user input."""
        if self.ollama_service:
            prompt = f"""
You are CRAFTY GIS, an expert geospatial analysis orchestrator. 
Generate a detailed implementation plan for this user request:

USER REQUEST: {user_input}

CONTEXT:
{json.dumps(context, indent=2)}

Available analysis types:
- LULC Classification (using Sentinel-2, Landsat)
- Vegetation Indices (NDVI, EVI, SAVI, NDWI)
- Terrain Analysis (DEM, slope, aspect, hydrology)
- Change Detection (multi-temporal analysis)
- Crop Health Assessment
- Land Surface Temperature Analysis
- Soil Moisture Estimation
- Urban Sprawl Analysis
- Forest Cover Change Detection
- Watershed Delineation & Hydrological Modeling
- Landscape Metrics & Fragmentation Analysis
- Climate Data Analysis (rainfall, temperature trends)
- Flood Mapping & Risk Assessment
- Biomass & Carbon Stock Estimation

Available tools: QGIS, SAGA GIS, GRASS GIS, GDAL, GeoPandas, Rasterio, Fragstats, Python
Available data sources: Sentinel-1, Sentinel-2, Landsat, MODIS, SRTM, CHIRPS, ERA5, OpenStreetMap

Return a JSON with:
1. "intent": extracted intent parameters (analysis_type, geographic_area, time_period, output_format, accuracy_level, software_preference)
2. "plan_text": a detailed step-by-step plan description
3. "tasks": array of task objects with:
   - task_type: one of the TaskType values
   - title: short title
   - description: what this step does
   - tool: which tool to use
   - params: dict of parameters
   - depends_on: list of task indices this depends on (0-indexed)
"""
            response = await self.ollama_service.chat(prompt, system="You are CRAFTY GIS workflow planner. Return ONLY valid JSON.")
            try:
                plan = json.loads(response)
                return plan
            except json.JSONDecodeError:
                logger.warning("AI returned non-JSON plan, using fallback")
                return self._fallback_plan(user_input, context)
        return self._fallback_plan(user_input, context)

    def _fallback_plan(self, user_input: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback plan generation when AI is unavailable."""
        return {
            "intent": {
                "analysis_type": "general",
                "geographic_area": context.get("location", "specified area"),
                "time_period": "current",
                "output_format": "map+report",
                "accuracy_level": "standard",
                "software_preference": "python",
            },
            "plan_text": f"Analysis plan for: {user_input}\n1. Download relevant satellite data\n2. Preprocess and clean data\n3. Run primary analysis\n4. Generate maps and visualizations\n5. Create comprehensive report",
            "tasks": [
                {
                    "task_type": "data_download",
                    "title": "Download Satellite Data",
                    "description": f"Download satellite imagery for {context.get('location', 'study area')}",
                    "tool": "sentinel_hub",
                    "params": {"source": "sentinel-2", "bands": ["B2", "B3", "B4", "B8"]},
                    "depends_on": [],
                },
                {
                    "task_type": "data_preprocessing",
                    "title": "Preprocess Imagery",
                    "description": "Atmospheric correction, cloud masking, and resampling",
                    "tool": "gdal",
                    "params": {"operations": ["atmospheric_correction", "cloud_mask", "resample"]},
                    "depends_on": [0],
                },
                {
                    "task_type": "classification",
                    "title": "Run Classification",
                    "description": "Perform land use/land cover classification",
                    "tool": "python",
                    "params": {"method": "random_forest", "classes": 5},
                    "depends_on": [1],
                },
                {
                    "task_type": "map_creation",
                    "title": "Generate Maps",
                    "description": "Create classification maps with legends",
                    "tool": "python",
                    "params": {"format": "png", "dpi": 300},
                    "depends_on": [2],
                },
                {
                    "task_type": "report_generation",
                    "title": "Generate Report",
                    "description": "Create comprehensive analysis report",
                    "tool": "python",
                    "params": {"format": "pdf", "include_maps": True},
                    "depends_on": [2, 3],
                },
            ],
        }

    def _plan_to_tasks(self, plan: Dict[str, Any]) -> List[Task]:
        """Convert AI-generated plan into Task objects."""
        tasks = []
        for i, task_data in enumerate(plan.get("tasks", [])):
            task = Task(
                task_type=TaskType(task_data.get("task_type", "data_download")),
                title=task_data.get("title", f"Step {i+1}"),
                description=task_data.get("description", ""),
                tool=task_data.get("tool", "python"),
                params=task_data.get("params", {}),
                depends_on=[tasks[d].id for d in task_data.get("depends_on", []) if d < len(tasks)],
            )
            tasks.append(task)
        return tasks

    async def execute_workflow(self, workflow_id: str, status_callback=None) -> Dict[str, Any]:
        """Execute a workflow, running tasks in dependency order with interruption support."""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        workflow.is_running = True
        workflow.is_interrupted = False

        while True:
            if workflow.is_interrupted:
                logger.info(f"Workflow {workflow_id} interrupted")
                break

            ready_tasks = workflow.get_pending_tasks()
            if not ready_tasks:
                # Check if any tasks are still running
                running = [t for t in workflow.tasks if t.status == TaskStatus.RUNNING]
                pending = [t for t in workflow.tasks if t.status == TaskStatus.PENDING]
                if not running and not pending:
                    break
                if running:
                    await asyncio.sleep(0.5)
                    continue
                # Tasks pending but not ready means dependency issue
                if pending:
                    logger.warning(f"Stalled tasks in workflow {workflow_id}: {[t.title for t in pending]}")
                    for t in pending:
                        t.status = TaskStatus.FAILED
                        t.error = "Dependencies could not be met"
                break

            # Execute ready tasks in parallel
            tasks_to_run = ready_tasks[:3]  # Max 3 parallel tasks
            coroutines = []
            for task in tasks_to_run:
                coroutines.append(self._execute_task(workflow, task, status_callback))

            await asyncio.gather(*coroutines)

        workflow.is_running = False
        return workflow.to_dict()

    async def _execute_task(self, workflow: Workflow, task: Task, status_callback=None) -> None:
        """Execute a single task."""
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()
        if status_callback:
            await status_callback(workflow.to_dict())

        try:
            logger.info(f"Executing task: {task.title} ({task.task_type.value}) via {task.tool}")

            # Simulate progress (in production, actual tool execution)
            for i in range(5):
                if workflow.is_interrupted:
                    task.status = TaskStatus.INTERRUPTED
                    return
                await asyncio.sleep(0.5)
                task.progress = (i + 1) * 20

            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.output = {"status": "completed", "result_path": f"/output/{task.id}"}
            logger.info(f"Task completed: {task.title}")

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.utcnow()
            logger.error(f"Task failed: {task.title}: {e}")

        if status_callback:
            await status_callback(workflow.to_dict())

    async def interrupt_workflow(self, workflow_id: str) -> bool:
        """Interrupt a running workflow."""
        workflow = self.active_workflows.get(workflow_id)
        if workflow and workflow.is_running:
            workflow.is_interrupted = True
            return True
        return False

    async def regenerate_plan(
        self, workflow_id: str, new_input: str, context: Dict[str, Any] = None
    ) -> Workflow:
        """Regenerate workflow plan with new user input (mid-workflow adjustment)."""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Mark incomplete tasks as skipped
        for task in workflow.tasks:
            if task.status in [TaskStatus.PENDING, TaskStatus.RUNNING]:
                task.status = TaskStatus.SKIPPED

        # Generate new plan incorporating existing context + new input
        merged_context = {**workflow.user_intent, **(context or {}), "new_input": new_input}
        plan = await self._generate_workflow_plan(new_input, merged_context)
        workflow.current_plan = plan["plan_text"]
        workflow.is_interrupted = False

        # Add new tasks
        new_tasks = self._plan_to_tasks(plan)
        for task in new_tasks:
            workflow.add_task(task)

        return workflow

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        return self.active_workflows.get(workflow_id)

    def get_all_workflows(self) -> List[Workflow]:
        return list(self.active_workflows.values())
