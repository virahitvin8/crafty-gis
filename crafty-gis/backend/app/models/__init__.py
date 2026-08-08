"""Pydantic models for API request/response schemas."""

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str = "draft"
    created_at: datetime = None
    updated_at: datetime = None


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    project_id: str
    message_type: str  # question, plan_ready, plan_updated, error
    plan: Optional[dict] = None
    conversation_history: Optional[list] = None


class WorkflowTask(BaseModel):
    id: str
    title: str
    description: str
    status: str = "pending"
    progress: float = 0.0
    tool: Optional[str] = None


class WorkflowResponse(BaseModel):
    project_id: str
    tasks: list[WorkflowTask]
    status: str
    progress: float = 0.0


class AnalysisResult(BaseModel):
    project_id: str
    status: str
    output_files: list[dict]
    report_path: Optional[str] = None
    error: Optional[str] = None


class DataSourceInfo(BaseModel):
    name: str
    provider: str
    resolution: Optional[str] = None
    free: bool = True
    api_url: Optional[str] = None


class SystemStatus(BaseModel):
    app_name: str
    version: str
    ollama_connected: bool
    database_connected: bool
    model_available: bool
    available_models: list[str] = []
