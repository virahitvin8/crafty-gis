import asyncio
import logging
from typing import List, Dict, Any, Optional
from app.core.models import WorkflowTask, GISProject
from app.core.config import settings
from app.core.adapters import (
    qgis_adapter, saga_adapter, grass_adapter, fragstats_adapter,
    gdal_adapter, data_acquisition_adapter
)
from app.core.services import processing_service, report_generator_service

logger = logging.getLogger(__name__)

class WorkflowExecutor:
    """
    Executes workflow tasks by coordinating with various geospatial tools and services.
    """

    def __init__(self):
        self.task_handlers = {
            "boundary_definition": self._handle_boundary_definition,
            "data_acquisition": self._handle_data_acquisition,
            "preprocessing": self._handle_preprocessing,
            "training_sample_generation": self._handle_training_sample_generation,
            "classification": self._handle_classification,
            "change_detection": self._handle_change_detection,
            "vegetation_index_calculation": self._handle_vegetation_index_calculation,
            "trend_analysis": self._handle_trend_analysis,
            "accuracy_assessment": self._handle_accuracy_assessment,
            "map_generation": self._handle_map_generation,
            "statistics_calculation": self._handle_statistics_calculation,
            "change_quantification": self._handle_change_quantification,
            "report_generation": self._handle_report_generation,
        }

    async def execute_task(self, task: WorkflowTask, project: GISProject) -> WorkflowTask:
        """
        Execute a single workflow task.
        """
        logger.info(f"Executing task: {task.name} (ID: {task.id})")

        # Update task status
        task.status = "running"
        task.started_at = asyncio.get_event_loop().time()

        try:
            # Get the appropriate handler for this task type
            handler = self.task_handlers.get(task.tool_used)
            if not handler:
                raise ValueError(f"No handler found for tool: {task.tool_used}")

            # Execute the task
            result = await handler(task, project)

            # Update task with results
            task.result_data = result
            task.status = "completed"
            task.progress = 100.0
            task.completed_at = asyncio.get_event_loop().time()

            logger.info(f"Task completed: {task.name}")
            return task

        except Exception as e:
            logger.error(f"Task failed: {task.name} - Error: {str(e)}")
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = asyncio.get_event_loop().time()
            raise

    async def execute_workflow(
        self,
        workflow_tasks: List[WorkflowTask],
        project: GISProject
    ) -> List[WorkflowTask]:
        """
        Execute a complete workflow, respecting task dependencies.
        """
        logger.info(f"Starting workflow execution for project {project.id}")

        # Create a copy of tasks to modify
        tasks = {task.id: task for task in workflow_tasks}
        completed_task_ids = set()

        # Execute tasks in dependency order
        while len(completed_task_ids) < len(tasks):
            # Find tasks that are ready to execute (dependencies met)
            ready_tasks = []
            for task_id, task in tasks.items():
                if task_id in completed_task_ids:
                    continue

                # Check if all dependencies are completed
                dependencies_met = all(
                    dep_id in completed_task_ids
                    for dep_id in task.dependencies
                )

                if dependencies_met and task.status == "pending":
                    ready_tasks.append(task)

            if not ready_tasks:
                # Check for failed tasks or deadlock
                failed_tasks = [t for t in tasks.values() if t.status == "failed"]
                if failed_tasks:
                    raise Exception(f"Workflow execution halted due to failed tasks: {[t.name for t in failed_tasks]}")
                else:
                    raise Exception("Workflow execution stalled - no ready tasks found")

            # Execute ready tasks (could be parallelized in future)
            for task in ready_tasks:
                try:
                    await self.execute_task(task, project)
                    completed_task_ids.add(task.id)
                except Exception as e:
                    logger.error(f"Failed to execute task {task.name}: {str(e)}")
                    # Depending on requirements, we might continue or halt
                    # For now, we'll halt on first failure
                    raise

        logger.info(f"Workflow execution completed for project {project.id}")
        return list(tasks.values())

    # Task Handler Implementations
    async def _handle_boundary_definition(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle boundary definition task."""
        params = task.parameters

        # Use data acquisition to get boundary from OSM or user upload
        if "study_area" in params:
            # Process user-provided boundary
            boundary_result = await data_acquisition_adapter.get_boundary_from_description(
                params["study_area"]
            )
        else:
            # Try to get from project geographic scope
            boundary_result = await data_acquisition_adapter.get_boundary_from_description(
                project.geographic_scope or "study area"
            )

        return {
            "boundary_file": boundary_result.get("file_path"),
            "boundary_wkt": boundary_result.get("wkt"),
            "crs": boundary_result.get("crs", "EPSG:4326")
        }

    async def _handle_data_acquisition(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle data acquisition task."""
        params = task.parameters

        # Determine what data to acquire based on analysis type and parameters
        data_sources = params.get("data_sources", ["sentinel_2"])
        time_range = params.get("time_range", project.time_period)
        study_area = params.get("study_area", project.geographic_scope)

        acquired_data = {}

        for source in data_sources:
            try:
                if source == "sentinel_2":
                    data = await data_acquisition_adapter.download_sentinel_2(
                        area_of_interest=study_area,
                        time_range=time_range,
                        max_cloud_cover=params.get("max_cloud_cover", 20)
                    )
                elif source == "landsat_8":
                    data = await data_acquisition_adapter.download_landsat_8(
                        area_of_interest=study_area,
                        time_range=time_range
                    )
                elif source == "modis":
                    data = await data_acquisition_adapter.download_modis(
                        area_of_interest=study_area,
                        time_range=time_range,
                        product_type=params.get("modis_product", "MOD09Q1")
                    )
                # Add other data sources as needed

                acquired_data[source] = data

            except Exception as e:
                logger.warning(f"Failed to acquire data from {source}: {str(e)}")
                # Continue with other sources

        return {
            "acquired_data": acquired_data,
            "sources_used": list(acquired_data.keys()),
            "total_files": sum(len(v.get("files", [])) for v in acquired_data.values() if isinstance(v, dict))
        }

    async def _handle_preprocessing(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle image preprocessing task."""
        # Get data from previous task
        data_acq_result = None
        for dep_id in task.dependencies:
            if dep_id in task.result_data.get("depends_on", {}):
                # In a real implementation, we'd look up the actual result
                pass

        # For now, simulate preprocessing
        preprocessing_result = await processing_service.preprocess_imagery(
            input_data={},  # Would come from previous task
            operations=task.parameters.get("operations", [
                "atmospheric_correction",
                "cloud_masking",
                "band_composition"
            ]),
            output_format=task.parameters.get("output_format", "GeoTIFF")
        )

        return preprocessing_result

    async def _handle_training_sample_generation(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle training sample generation for classification."""
        # This would typically involve creating training polygons or points
        # For classification algorithms
        return await processing_service.generate_training_samples(
            boundary_file=task.result_data.get("boundary_file"),
            num_samples_per_class=task.parameters.get("samples_per_class", 50),
            classes=task.parameters.get("land_cover_classes", [
                "forest", "agriculture", "urban", "water", "barren"
            ])
        )

    async def _handle_classification(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle image classification task."""
        # Use QGIS or other tools for classification
        classification_result = await qgis_adapter.perform_classification(
            input_raster=task.result_data.get("preprocessed_raster"),
            training_samples=task.result_data.get("training_samples"),
            algorithm=task.parameters.get("algorithm", "Random Forest"),
            num_classes=task.parameters.get("num_classes", 5),
            output_format=task.parameters.get("output_format", "GeoTIFF")
        )

        return classification_result

    async def _handle_change_detection(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle change detection task."""
        # Use GRASS GIS or other tools for change detection
        change_result = await grass_adapter.perform_change_detection(
            before_raster=task.result_data.get("before_raster"),
            after_raster=task.result_data.get("after_raster"),
            method=task.parameters.get("method", "post_classification_comparison"),
            sensitivity=task.parameters.get("sensitivity", 0.1)
        )

        return change_result

    async def _handle_vegetation_index_calculation(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle vegetation index calculation."""
        vi_result = await processing_service.calculate_vegetation_indices(
            input_raster=task.result_data.get("preprocessed_raster"),
            indices=task.parameters.get("indices", ["NDVI", "EVI", "SAVI"]),
            output_format=task.parameters.get("output_format", "GeoTIFF")
        )

        return vi_result

    async def _handle_trend_analysis(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle temporal trend analysis."""
        trend_result = await processing_service.analyze_temporal_trends(
            time_series_raster=task.result_data.get("vi_raster_stack"),
            analysis_type=task.parameters.get("trend_type", "linear"),
            output_format=task.parameters.get("output_format", "GeoTIFF")
        )

        return trend_result

    async def _handle_accuracy_assessment(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle accuracy assessment."""
        acc_result = await processing_service.assess_accuracy(
            classified_raster=task.result_data.get("classified_raster"),
            reference_data=task.result_data.get("reference_data"),
            method=task.parameters.get("method", "confusion_matrix")
        )

        return acc_result

    async def _handle_map_generation(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle map generation task."""
        map_result = await processing_service.generate_map(
            input_raster=task.result_data.get("classified_raster") or
                    task.result_data.get("change_raster") or
                    task.result_data.get("vi_raster"),
            colormap=task.parameters.get("colormap", "viridis"),
            include_legend=task.parameters.get("include_legend", True),
            include_scale_bar=task.parameters.get("include_scale_bar", True),
            include_north_arrow=task.parameters.get("include_north_arrow", True),
            output_format=task.parameters.get("output_format", ["PNG", "GeoTIFF"]),
            title=task.parameters.get("title", "Analysis Result")
        )

        return map_result

    async def _handle_statistics_calculation(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle area statistics calculation."""
        stats_result = await processing_service.calculate_area_statistics(
            raster_file=task.result_data.get("classified_raster"),
            zone_file=task.result_data.get("boundary_file"),
            classes=task.parameters.get("classes", []),
            output_format=task.parameters.get("output_format", "Excel")
        )

        return stats_result

    async def _handle_change_quantification(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle change quantification."""
        change_stats = await processing_service.quantify_changes(
            change_raster=task.result_data.get("change_raster"),
            boundary_file=task.result_data.get("boundary_file"),
            change_classes=task.parameters.get("change_types", ["gain", "loss", "no_change"])
        )

        return change_stats

    async def _handle_report_generation(
        self, task: WorkflowTask, project: GISProject
    ) -> Dict[str, Any]:
        """Handle report generation task."""
        # Collect all results from previous tasks
        all_results = {}
        for dep_id in task.dependencies:
            # In real implementation, we'd look up actual results
            pass

        report_result = await report_generator_service.generate_comprehensive_report(
            project_info=project.dict(),
            analysis_results={},  # Would be populated from task results
            maps=task.result_data.get("generated_maps", []),
            statistics=task.result_data.get("statistics", {}),
            formats=task.parameters.get("formats", ["PDF", "Word"]),
            title=task.parameters.get("title", "CRAFTY GIS Analysis Report")
        )

        return report_result


# Singleton instance
workflow_executor = WorkflowExecutor()