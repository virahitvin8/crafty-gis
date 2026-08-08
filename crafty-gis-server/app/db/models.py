"""
CRAFTY GIS — Database Models
SQLAlchemy ORM models for projects, analyses, sessions, outputs, and activity history.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Text, DateTime, Float, Integer, Boolean, JSON, ForeignKey, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Project(Base):
    """User project containing analyses and outputs."""
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    location = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    status = Column(String(50), default="active")
    tags = Column(JSON, default=list)
    metadata_json = Column(JSON, default=dict)

    analyses = relationship("Analysis", back_populates="project", cascade="all, delete-orphan")
    outputs = relationship("Output", back_populates="project", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location": self.location,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "status": self.status,
            "tags": self.tags or [],
            "analyses_count": len(self.analyses) if self.analyses else 0,
        }


class Analysis(Base):
    """Individual analysis run within a project."""
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    analysis_type = Column(String(100), nullable=False)
    title = Column(String(255), default="")
    description = Column(Text, default="")
    status = Column(String(50), default="pending")  # pending, investigating, running, completed, failed
    workflow_id = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
    user_input = Column(Text, default="")
    parameters = Column(JSON, default=dict)
    results_summary = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    project = relationship("Project", back_populates="analyses")
    outputs = relationship("Output", back_populates="analysis", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="analysis", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "analysis_type": self.analysis_type,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "workflow_id": self.workflow_id,
            "session_id": self.session_id,
            "user_input": self.user_input,
            "parameters": self.parameters or {},
            "results_summary": self.results_summary or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
        }


class Output(Base):
    """Generated output files from analyses."""
    __tablename__ = "outputs"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    analysis_id = Column(String, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # shapefile, geotiff, pdf, png, csv, etc.
    file_path = Column(String(1000), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    description = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_downloadable = Column(Boolean, default=True)

    project = relationship("Project", back_populates="outputs")
    analysis = relationship("Analysis", back_populates="outputs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "analysis_id": self.analysis_id,
            "name": self.name,
            "file_type": self.file_type,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "file_size_display": self._format_size(self.file_size_bytes),
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_downloadable": self.is_downloadable,
        }

    @staticmethod
    def _format_size(bytes: int) -> str:
        if bytes < 1024: return f"{bytes} B"
        if bytes < 1024**2: return f"{bytes/1024:.1f} KB"
        if bytes < 1024**3: return f"{bytes/1024**2:.1f} MB"
        return f"{bytes/1024**3:.1f} GB"


class Activity(Base):
    """Activity log entry for audit trail and history."""
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    action = Column(String(100), nullable=False)
    description = Column(Text, default="")
    details = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("Analysis", back_populates="activities")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "analysis_id": self.analysis_id,
            "project_id": self.project_id,
            "action": self.action,
            "description": self.description,
            "details": self.details or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChatMessage(Base):
    """Chat message for the AI conversation."""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String(100), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="chat")  # chat, wizard_question, wizard_answer, system
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "project_id": self.project_id,
            "role": self.role,
            "content": self.content,
            "message_type": self.message_type,
            "metadata": self.metadata_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DataSource(Base):
    """Tracked external data sources and downloaded datasets."""
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)  # satellite, vector, raster, climate
    dataset_id = Column(String(500), nullable=True)
    location = Column(String(500), default="")
    date_range = Column(String(100), default="")
    file_path = Column(String(1000), nullable=True)
    metadata_json = Column(JSON, default=dict)
    downloaded_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "dataset_id": self.dataset_id,
            "location": self.location,
            "date_range": self.date_range,
            "file_path": self.file_path,
            "metadata": self.metadata_json or {},
            "downloaded_at": self.downloaded_at.isoformat() if self.downloaded_at else None,
        }
