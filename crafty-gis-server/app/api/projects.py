"""
CRAFTY GIS — Projects API
CRUD operations for projects with analysis tracking and output association.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["projects"])

# In-memory storage (replace with DB in production)
projects_db: Dict[str, Dict[str, Any]] = {}


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    location: str = ""
    tags: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    location: str
    created_at: str
    updated_at: str
    status: str
    tags: List[str]
    analyses_count: int = 0
    outputs_count: int = 0


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(request: ProjectCreate):
    """Create a new project."""
    project_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()
    
    projects_db[project_id] = {
        "id": project_id,
        "name": request.name,
        "description": request.description,
        "location": request.location,
        "created_at": now,
        "updated_at": now,
        "status": "active",
        "tags": request.tags,
        "analyses": [],
        "outputs": [],
    }
    
    logger.info(f"Created project: {project_id} - {request.name}")
    return ProjectResponse(
        id=project_id,
        name=request.name,
        description=request.description,
        location=request.location,
        created_at=now,
        updated_at=now,
        status="active",
        tags=request.tags,
    )


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all projects with optional filtering."""
    projects_list = list(projects_db.values())
    
    if status:
        projects_list = [p for p in projects_list if p["status"] == status]
    
    if search:
        search_lower = search.lower()
        projects_list = [
            p for p in projects_list
            if search_lower in p["name"].lower() or search_lower in p["description"].lower()
        ]
    
    # Sort by updated_at descending
    projects_list.sort(key=lambda p: p.get("updated_at", ""), reverse=True)
    
    total = len(projects_list)
    projects_list = projects_list[skip:skip + limit]
    
    return ProjectListResponse(
        projects=[
            ProjectResponse(
                id=p["id"],
                name=p["name"],
                description=p.get("description", ""),
                location=p.get("location", ""),
                created_at=p.get("created_at", ""),
                updated_at=p.get("updated_at", ""),
                status=p.get("status", "active"),
                tags=p.get("tags", []),
                analyses_count=len(p.get("analyses", [])),
                outputs_count=len(p.get("outputs", [])),
            )
            for p in projects_list
        ],
        total=total,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get project details."""
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return ProjectResponse(
        id=project["id"],
        name=project["name"],
        description=project.get("description", ""),
        location=project.get("location", ""),
        created_at=project.get("created_at", ""),
        updated_at=project.get("updated_at", ""),
        status=project.get("status", "active"),
        tags=project.get("tags", []),
        analyses_count=len(project.get("analyses", [])),
        outputs_count=len(project.get("outputs", [])),
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, request: ProjectUpdate):
    """Update project details."""
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            project[key] = value
    
    project["updated_at"] = datetime.utcnow().isoformat()
    
    return ProjectResponse(
        id=project["id"],
        name=project["name"],
        description=project.get("description", ""),
        location=project.get("location", ""),
        created_at=project.get("created_at", ""),
        updated_at=project.get("updated_at", ""),
        status=project.get("status", "active"),
        tags=project.get("tags", []),
        analyses_count=len(project.get("analyses", [])),
        outputs_count=len(project.get("outputs", [])),
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str):
    """Delete a project."""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    del projects_db[project_id]
    logger.info(f"Deleted project: {project_id}")


@router.get("/{project_id}/analyses")
async def get_project_analyses(project_id: str):
    """Get all analyses for a project."""
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"analyses": project.get("analyses", [])}


@router.get("/{project_id}/outputs")
async def get_project_outputs(project_id: str):
    """Get all outputs for a project."""
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"outputs": project.get("outputs", [])}


@router.post("/{project_id}/analyses")
async def add_analysis_to_project(project_id: str, analysis_data: Dict[str, Any]):
    """Add an analysis record to a project."""
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    analysis_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()
    
    analysis = {
        "id": analysis_id,
        "project_id": project_id,
        "created_at": now,
        **analysis_data,
    }
    
    project.setdefault("analyses", []).append(analysis)
    project["updated_at"] = now
    
    return {"analysis": analysis}
