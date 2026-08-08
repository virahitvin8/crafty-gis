"""Projects API — manages user projects, sessions, and history."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from pathlib import Path
from app.config import settings
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["Projects"])

# In-memory project store (will be replaced with database)
_projects: dict = {}


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    created_at: str
    updated_at: str


@router.get("/")
async def list_projects():
    """List all projects."""
    return {"projects": list(_projects.values())}


@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    """Create a new project."""
    import uuid
    project_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    proj = {
        "id": project_id,
        "name": project.name,
        "description": project.description or "",
        "status": "draft",
        "created_at": now,
        "updated_at": now,
        "conversations": [],
        "workflows": [],
        "outputs": [],
    }

    # Create project directory
    project_dir = Path(settings.projects_dir) / project_id
    project_dir.mkdir(parents=True, exist_ok=True)

    _projects[project_id] = proj
    logger.info(f"Created project: {project.name} ({project_id})")

    return ProjectResponse(**proj)


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get project details."""
    project = _projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    del _projects[project_id]
    return {"message": "Project deleted"}


@router.get("/{project_id}/history")
async def get_project_history(project_id: str):
    """Get conversation history for a project."""
    project = _projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"conversations": project.get("conversations", [])}


@router.get("/{project_id}/outputs")
async def get_project_outputs(project_id: str):
    """Get output files for a project."""
    project = _projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    outputs_dir = Path(settings.outputs_dir) / project_id
    outputs = []
    if outputs_dir.exists():
        for f in outputs_dir.iterdir():
            if f.is_file():
                outputs.append({
                    "name": f.name,
                    "path": str(f),
                    "size": f.stat().st_size,
                    "format": f.suffix,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })
    return {"outputs": outputs}
