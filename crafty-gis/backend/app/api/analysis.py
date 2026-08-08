"""Analysis API — runs analysis workflows and manages execution."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.workflow_engine import WorkflowEngine
from app.core.ai_investigator import AIInvestigator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

# Global references
workflow_engine: Optional[WorkflowEngine] = None
investigator: Optional[AIInvestigator] = None


class AnalysisRequest(BaseModel):
    project_id: str
    plan: dict
    execute: bool = False


class AnalysisResponse(BaseModel):
    workflow_id: str
    tasks: list
    status: str
    message: str


@router.post("/start", response_model=AnalysisResponse)
async def start_analysis(request: AnalysisRequest):
    """Start or preview an analysis workflow based on the plan."""
    if not workflow_engine:
        raise HTTPException(status_code=503, detail="Workflow Engine not initialized")

    try:
        tasks = await workflow_engine.generate_workflow(
            request.project_id, request.plan
        )

        workflow_id = f"wf_{request.project_id[:8]}"

        if request.execute:
            # Execute the workflow
            result = await workflow_engine.execute_workflow(request.project_id)
            status = result.get("status", "running")
            message = f"Workflow execution {status}"
        else:
            status = "planned"
            message = "Workflow plan generated. Execute to start processing."

        return AnalysisResponse(
            workflow_id=workflow_id,
            tasks=tasks,
            status=status,
            message=message,
        )

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflow/{project_id}")
async def get_workflow(project_id: str):
    """Get current workflow status."""
    if not workflow_engine:
        raise HTTPException(status_code=503, detail="Workflow Engine not initialized")

    workflow = await workflow_engine.get_workflow(project_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="No active workflow found")
    return workflow


@router.post("/workflow/{project_id}/execute")
async def execute_workflow(project_id: str):
    """Execute the current workflow plan."""
    if not workflow_engine:
        raise HTTPException(status_code=503, detail="Workflow Engine not initialized")

    result = await workflow_engine.execute_workflow(project_id)
    return result


@router.post("/workflow/{project_id}/add-task")
async def add_workflow_task(project_id: str, task: dict):
    """Add a new task to an existing workflow (during interruption)."""
    if not workflow_engine:
        raise HTTPException(status_code=503, detail="Workflow Engine not initialized")

    tasks = await workflow_engine.add_task(project_id, task)
    return {"tasks": tasks, "message": "Task added successfully"}
