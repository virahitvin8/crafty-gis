from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class AnalysisType(str, Enum):
    LULC_CLASSIFICATION = "land_use_land_cover_classification"
    CHANGE_DETECTION = "change_detection_analysis"
    VEGETATION_HEALTH = "vegetation_health_assessment"
    TERRAIN_ANALYSIS = "terrain_analysis"
    FLOOD_MAPPING = "flood_mapping_and_analysis"
    SOIL_MOISTURE = "soil_moisture_analysis"
    URBAN_GROWTH = "urban_growth_mapping"
    WATER_BODY_MAPPING = "water_body_mapping_and_monitoring"
    CROP_HEALTH = "crop_health_monitoring"
    BIODIVERSITY_ASSESSMENT = "biodiversity_habitat_assessment"
    CUSTOM = "custom_analysis"

class OutputFormat(str, Enum):
    PDF_REPORT = "pdf_report"
    MAP_PNG = "map_png"
    MAP_GEOTIFF = "map_geotiff"
    SHAPEFILE = "shapefile"
    GEOPACKAGE = "geopackage"
    EXCEL_TABLE = "excel_table"
    CSV_TABLE = "csv_table"
    WORD_DOCUMENT = "word_document"
    PRESENTATION = "presentation"

class DataSource(str, Enum):
    SENTINEL_2 = "sentinel_2"
    SENTINEL_1 = "sentinel_1"
    LANDSAT_8 = "landsat_8"
    LANDSAT_9 = "landsat_9"
    MODIS = "modis"
    SRTM = "srtm"
    ASTER = "aster"
    OPENSTREETMAP = "openstreetmap"
    USER_UPLOAD = "user_upload"
    WORLDPOP = "worldpop"
    CHIRPS = "chirps"
    ERA5 = "era5"

class InvestigationState(BaseModel):
    known_information: Dict[str, Any] = Field(default_factory=dict)
    missing_information: List[str] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)
    ready_to_proceed: bool = False
    plan_summary: Optional[str] = None
    extracted_parameters: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    content: str = Field(..., description="Content of the message")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI's response message")
    conversation_id: str = Field(..., description="Unique identifier for the conversation")
    investigation_state: Optional[InvestigationState] = None
    ready_to_proceed: bool = Field(default=False, description="Whether sufficient information is available to proceed")

class GISProject(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., description="Project title or description")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    status: str = Field(default="created", description="Project status: created, planning, processing, completed, failed")

    # Investigation results
    problem_definition: Optional[str] = None
    geographic_scope: Optional[Dict[str, Any]] = None
    time_period: Optional[Dict[str, Any]] = None
    analysis_type: Optional[AnalysisType] = None
    output_format: Optional[List[OutputFormat]] = None
    data_preferences: Optional[Dict[str, Any]] = None
    quality_requirements: Optional[str] = None
    software_preferences: Optional[Dict[str, Any]] = None

    # Processing information
    workflow_plan: Optional[List[Dict[str, Any]]] = None
    current_task_index: int = Field(default=0)
    total_tasks: int = Field(default=0)
    completed_tasks: List[str] = Field(default_factory=list)
    failed_tasks: List[str] = Field(default_factory=list)

    # Results
    output_files: Optional[List[Dict[str, Any]]] = None
    generated_reports: Optional[List[Dict[str, Any]]] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WorkflowTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str = Field(..., description="Human-readable task name")
    description: Optional[str] = None
    status: str = Field(default="pending", description="Task status: pending, running, completed, failed")
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result_data: Optional[Dict[str, Any]] = None

    # Task-specific parameters
    tool_used: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    dependencies: List[str] = Field(default_factory=list)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Import uuid for default factories
import uuid