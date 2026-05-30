from typing import List, Dict, Any, Optional
from app.core.models import (
    InvestigationState, AnalysisType, OutputFormat, DataSource,
    GISProject, WorkflowTask
)
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)

class WorkflowPlanner:
    """
    Converts investigated user intent into executable workflow plans.
    Creates detailed task lists for GIS analysis workflows.
    """

    def __init__(self):
        self.workflow_templates = self._load_workflow_templates()

    def _load_workflow_templates(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Load predefined workflow templates for different analysis types.
        In production, these could be loaded from a database or configuration files.
        """
        return {
            AnalysisType.LULC_CLASSIFICATION.value: [
                {
                    "name": "Define Study Area Boundary",
                    "description": "Obtain or create boundary shapefile for the analysis area",
                    "tool": "boundary_definition",
                    "estimated_duration_minutes": 5
                },
                {
                    "name": "Acquire Satellite Imagery",
                    "description": "Download appropriate satellite imagery for the time period and area",
                    "tool": "data_acquisition",
                    "estimated_duration_minutes": 15
                },
                {
                    "name": "Preprocess Imagery",
                    "description": "Perform atmospheric correction, cloud masking, and band composition",
                    "tool": "preprocessing",
                    "estimated_duration_minutes": 10
                },
                {
                    "name": "Generate Training Samples",
                    "description": "Create training datasets for supervised classification",
                    "tool": "training_sample_generation",
                    "estimated_duration_minutes": 20
                },
                {
                    "name": "Perform Land Use/Land Cover Classification",
                    "description": "Run supervised classification algorithm (Random Forest, SVM, etc.)",
                    "tool": "classification",
                    "estimated_duration_minutes": 30
                },
                {
                    "name": "Accuracy Assessment",
                    "description": "Validate classification results using ground truth or reference data",
                    "tool": "accuracy_assessment",
                    "estimated_duration_minutes": 15
                },
                {
                    "name": "Generate Classification Map",
                    "description": "Create visual representation of classified land cover classes",
                    "tool": "map_generation",
                    "estimated_duration_minutes": 10
                },
                {
                    "name": "Calculate Area Statistics",
                    "description": "Compute area coverage for each land cover class",
                    "tool": "statistics_calculation",
                    "estimated_duration_minutes": 10
                },
                {
                    "name": "Generate Report",
                    "description": "Create detailed PDF report with maps, tables, and interpretation",
                    "tool": "report_generation",
                    "estimated_duration_minutes": 20
                }
            ],
            AnalysisType.CHANGE_DETECTION.value: [
                {
                    "name": "Define Study Area Boundary",
                    "description": "Obtain or create boundary shapefile for the analysis area",
                    "tool": "boundary_definition",
                    "estimated_duration_minutes": 5
                },
                {
                    "name": "Acquire Multi-temporal Imagery",
                    "description": "Download satellite imagery for multiple time periods",
                    "tool": "data_acquisition",
                    "estimated_duration_minutes": 20
                },
                {
                    "name": "Preprocess Imagery",
                    "description": "Perform atmospheric correction and normalization for change detection",
                    "tool": "preprocessing",
                    "estimated_duration_minutes": 15
                },
                {
                    "name": "Perform Change Detection Analysis",
                    "description": "Run change detection algorithm (image differencing, PCA, etc.)",
                    "tool": "change_detection",
                    "estimated_duration_minutes": 25
                },
                {
                    "name": "Generate Change Map",
                    "description": "Create visualization showing areas of change and no-change",
                    "tool": "map_generation",
                    "estimated_duration_minutes": 10
                },
                {
                    "name": "Quantify Change Amounts",
                    "description": "Calculate area and percentage of change for each category",
                    "tool": "change_quantification",
                    "estimated_duration_minutes": 15
                },
                {
                    "name": "Generate Report",
                    "description": "Create detailed report showing change analysis results",
                    "tool": "report_generation",
                    "estimated_duration_minutes": 20
                }
            ],
            AnalysisType.VEGETATION_HEALTH.value: [
                {
                    "name": "Define Study Area Boundary",
                    "description": "Obtain or create boundary shapefile for the analysis area",
                    "tool": "boundary_definition",
                    "estimated_duration_minutes": 5
                },
                {
                    "name": "Acquire Vegetation Index Imagery",
                    "description": "Download imagery suitable for vegetation index calculation",
                    "tool": "data_acquisition",
                    "estimated_duration_minutes": 15
                },
                {
                    "name": "Preprocess Imagery",
                    "description": "Perform atmospheric correction and calibration",
                    "tool": "preprocessing",
                    "estimated_duration_minutes": 10
                },
                {
                    "name": "Calculate Vegetation Indices",
                    "description": "Compute NDVI, EVI, SAVI, or other vegetation indices",
                    "tool": "vegetation_index_calculation",
                    "estimated_duration_minutes": 15
                },
                {
                    "name": "Generate Vegetation Health Map",
                    "description": "Create spatial visualization of vegetation health patterns",
                    "tool": "map_generation",
                    "estimated_duration_minutes": 10
                },
                {
                    "name": "Analyze Vegetation Trends",
                    "description": "Temporal analysis of vegetation index values over time",
                    "tool": "trend_analysis",
                    "estimated_duration_minutes": 20
                },
                {
                    "name": "Generate Report",
                    "description": "Create report showing vegetation health assessment results",
                    "tool": "report_generation",
                    "estimated_duration_minutes": 15
                }
            ]
        }

    async def create_workflow_plan(
        self,
        investigation_state: InvestigationState,
        project: GISProject
    ) -> List[WorkflowTask]:
        """
        Create a detailed workflow plan based on investigation results.
        """
        try:
            # Determine analysis type from investigation or project
            analysis_type = None
            if investigation_state.extracted_parameters:
                analysis_type = investigation_state.extracted_parameters.get("analysis_type")
            elif project.analysis_type:
                analysis_type = project.analysis_type.value if hasattr(project.analysis_type, 'value') else str(project.analysis_type)

            # Default to LULC classification if not specified
            if not analysis_type:
                analysis_type = AnalysisType.LULC_CLASSIFICATION.value

            # Get workflow template for the analysis type
            template_tasks = self.workflow_templates.get(
                analysis_type,
                self.workflow_templates[AnalysisType.LULC_CLASSIFICATION.value]
            )

            # Customize template based on investigation findings
            customized_tasks = await self._customize_workflow_template(
                template_tasks, investigation_state, project
            )

            # Convert to WorkflowTask objects
            workflow_tasks = []
            for i, task_dict in enumerate(customized_tasks):
                task = WorkflowTask(
                    project_id=project.id,
                    name=task_dict["name"],
                    description=task_dict.get("description"),
                    tool_used=task_dict.get("tool"),
                    parameters=task_dict.get("parameters", {}),
                    dependencies=task_dict.get("dependencies", [])
                )
                workflow_tasks.append(task)

            # Update project with workflow plan
            project.workflow_plan = [task.dict() for task in workflow_tasks]
            project.total_tasks = len(workflow_tasks)

            logger.info(f"Created workflow plan with {len(workflow_tasks)} tasks for project {project.id}")
            return workflow_tasks

        except Exception as e:
            logger.error(f"Error creating workflow plan: {str(e)}")
            raise

    async def _customize_workflow_template(
        self,
        template_tasks: List[Dict[str, Any]],
        investigation_state: InvestigationState,
        project: GISProject
    ) -> List[Dict[str, Any]]:
        """
        Customize workflow template based on specific investigation findings.
        """
        customized = []
        known_info = investigation_state.known_information or {}
        extracted_params = investigation_state.extracted_parameters or {}

        for task in template_tasks:
            customized_task = task.copy()

            # Adjust parameters based on investigation findings
            if "parameters" not in customized_task:
                customized_task["parameters"] = {}

            # Customize based on geographic scope
            if "geographic_scope" in known_info:
                customized_task["parameters"]["study_area"] = known_info["geographic_scope"]

            # Customize based on time period
            if "time_period" in known_info:
                customized_task["parameters"]["time_range"] = known_info["time_period"]

            # Customize based on data preferences
            if "data_preferences" in known_info:
                customized_task["parameters"]["data_sources"] = known_info["data_preferences"]

            # Customize based on output format preferences
            if "output_format" in known_info:
                customized_task["parameters"]["output_formats"] = known_info["output_format"]

            # Customize based on quality requirements
            if "quality_requirements" in known_info:
                customized_task["parameters"]["quality_level"] = known_info["quality_requirements"]

            # Add any extracted parameters
            customized_task["parameters"].update(extracted_params)

            customized.append(customized_task)

        return customized

    def estimate_total_duration(self, workflow_tasks: List[WorkflowTask]) -> int:
        """
        Estimate total workflow duration in minutes.
        """
        # In a more sophisticated implementation, this would sum task estimates
        # For now, return a rough estimate based on task count
        base_time_per_task = 15  # minutes
        return len(workflow_tasks) * base_time_per_task

    async def adjust_workflow_plan(
        self,
        current_tasks: List[WorkflowTask],
        adjustment_instructions: str,
        project: GISProject
    ) -> List[WorkflowTask]:
        """
        Adjust existing workflow plan based on user instructions during processing.
        """
        # This would implement logic to modify the workflow based on user feedback
        # For now, we'll log the adjustment request and return current tasks
        logger.info(f"Received workflow adjustment request: {adjustment_instructions}")

        # In a full implementation, this would:
        # 1. Parse adjustment instructions to determine what needs to change
        # 2. Modifying existing tasks (adding, removing, changing parameters)
        # 3. Inserting new tasks where appropriate
        # 4. Updating dependencies accordingly

        return current_tasks


# Singleton instance
workflow_planner = WorkflowPlanner()