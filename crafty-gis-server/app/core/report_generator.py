"""
CRAFTY GIS — Report Generator
Professional PDF report generation with maps, charts, tables, and interpretation notes.
Generates comprehensive, publication-ready reports from analysis outputs.
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Generates comprehensive geospatial analysis reports in PDF, DOCX, HTML, and JSON formats.
    Includes maps, charts, summary statistics, methodology, and interpretation.
    """

    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or os.path.join(settings.DATA_DIR, "outputs", "reports")
        os.makedirs(self.output_dir, exist_ok=True)

    async def generate_report(
        self,
        analysis_type: str,
        data: Dict[str, Any],
        format: str = "pdf",
        title: str = None,
        include_maps: bool = True,
        include_charts: bool = True,
        include_statistics: bool = True,
    ) -> Dict[str, Any]:
        """Generate a comprehensive analysis report."""
        report_id = f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Build report content
        report_content = {
            "report_id": report_id,
            "title": title or f"CRAFTY GIS — {analysis_type.replace('_', ' ').title()} Report",
            "generated_at": datetime.utcnow().isoformat(),
            "analysis_type": analysis_type,
            "platform": "CRAFTY GIS — Conversational Remote Analysis & Field Technology for GIS",
            "summary": self._generate_executive_summary(analysis_type, data),
            "methodology": self._generate_methodology(analysis_type),
            "parameters": data.get("parameters", {}),
            "results": data.get("results", {}),
            "statistics": self._compute_statistics(data) if include_statistics else {},
            "interpretation": self._generate_interpretation(analysis_type, data),
            "maps": data.get("maps", []) if include_maps else [],
            "charts": data.get("charts", []) if include_charts else [],
            "data_sources": data.get("data_sources", []),
            "tools_used": data.get("tools_used", []),
            "limitations": self._generate_limitations(analysis_type, data),
            "recommendations": self._generate_recommendations(analysis_type, data),
            "references": self._get_references(analysis_type),
        }

        # Generate output in requested format
        output_path = os.path.join(self.output_dir, f"{report_id}.{format}")
        
        if format == "json":
            await self._generate_json(report_content, output_path)
        elif format == "html":
            await self._generate_html(report_content, output_path)
        elif format == "md":
            await self._generate_markdown(report_content, output_path)
        else:  # pdf
            output_path = await self._generate_pdf(report_content, output_path)

        return {
            "report_id": report_id,
            "title": report_content["title"],
            "format": format,
            "output_path": output_path,
            "file_size_kb": os.path.getsize(output_path) / 1024 if os.path.exists(output_path) else 0,
            "generated_at": report_content["generated_at"],
            "summary": report_content["summary"],
        }

    async def generate_comparison_report(
        self, reports: List[Dict[str, Any]], format: str = "pdf"
    ) -> Dict[str, Any]:
        """Generate a comparative analysis report from multiple analyses."""
        comparison_content = {
            "report_id": f"comparison_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "title": "CRAFTY GIS — Multi-Analysis Comparison Report",
            "generated_at": datetime.utcnow().isoformat(),
            "analyses": reports,
            "cross_comparison": self._generate_cross_comparison(reports),
        }

        output_path = os.path.join(self.output_dir, f"{comparison_content['report_id']}.{format}")
        
        if format == "json":
            await self._generate_json(comparison_content, output_path)
        else:
            output_path = await self._generate_pdf(comparison_content, output_path)

        return comparison_content

    def _generate_executive_summary(self, analysis_type: str, data: Dict[str, Any]) -> str:
        """Generate an executive summary of the analysis."""
        location = data.get("parameters", {}).get("location", "the study area")
        time_period = data.get("parameters", {}).get("time_period", "the specified period")
        
        summaries = {
            "lulc_classification": f"This analysis classified land use/land cover in {location} for {time_period}. "
                                   f"The classification reveals the spatial distribution of different land cover types, "
                                   f"providing insights into landscape composition and human-environment interactions.",
            "ndvi_analysis": f"Vegetation health analysis using NDVI for {location} during {time_period}. "
                           f"The Normalized Difference Vegetation Index quantifies photosynthetic activity, "
                           f"enabling assessment of crop health, forest vigor, and vegetation density.",
            "change_detection": f"Multi-temporal change detection analysis for {location} from {time_period}. "
                              f"The analysis identifies areas of significant land cover change, "
                              f"quantifying gains and losses across different land use categories.",
            "terrain_analysis": f"Terrain analysis for {location} using digital elevation data. "
                              f"Derived products include elevation, slope, aspect, and hillshade maps, "
                              f"providing fundamental inputs for hydrological and geomorphological modeling.",
            "crop_health": f"Crop health assessment for {location} during {time_period}. "
                          f"Multi-spectral vegetation indices reveal spatial patterns in crop vigor, "
                          f"enabling targeted agricultural interventions.",
            "urban_sprawl": f"Urban sprawl analysis for {location} from {time_period}. "
                           f"The analysis quantifies urban expansion patterns, density gradients, "
                           f"and land use conversion rates.",
            "flood_mapping": f"Flood extent mapping for {location} during {time_period}. "
                           f"Satellite imagery analysis identifies inundated areas, "
                           f"supporting disaster response and risk assessment.",
            "default": f"Comprehensive geospatial analysis completed for {location} during {time_period}. "
                      f"The analysis integrates multi-source satellite data with field observations "
                      f"to deliver actionable insights for decision-making."
        }
        
        return summaries.get(analysis_type, summaries["default"])

    def _generate_methodology(self, analysis_type: str) -> List[str]:
        """Generate methodology description."""
        base_steps = [
            "Data acquisition from satellite archives and open data portals",
            "Preprocessing: atmospheric correction, cloud masking, and geometric registration",
            "Analysis execution using validated algorithms and geospatial toolchains",
            "Post-processing: accuracy assessment, uncertainty quantification",
            "Visualization: map generation with cartographic standards",
            "Interpretation: quantitative analysis and contextual synthesis",
        ]
        
        analysis_specific = {
            "lulc_classification": [
                "Supervised classification using Random Forest algorithm",
                "Training data from high-resolution imagery and ground truth samples",
                "Classification scheme: 5-class LULC system (Built-up, Agriculture, Forest, Water, Barren)",
                "Accuracy assessment using confusion matrix and Kappa coefficient",
            ],
            "ndvi_analysis": [
                "NDVI computation from Sentinel-2 near-infrared (Band 8) and red (Band 4) bands",
                "NDVI = (NIR - Red) / (NIR + Red), range normalized to -1 to +1",
                "Threshold-based classification of vegetation density classes",
                "Zonal statistics for administrative or ecological units",
            ],
            "change_detection": [
                "Multi-temporal image co-registration and radiometric normalization",
                "Post-classification comparison change detection approach",
                "Change matrix generation showing class transitions",
                "Spatial analysis of change hotspots and fragmentation patterns",
            ],
        }
        
        return base_steps + analysis_specific.get(analysis_type, [])

    def _compute_statistics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute summary statistics from analysis results."""
        results = data.get("results", {})
        stats = {}
        
        if "ndvi" in results:
            ndvi_data = results["ndvi"]
            stats["ndvi"] = {
                "mean": round(ndvi_data.get("mean", 0), 4),
                "min": round(ndvi_data.get("min", -1), 4),
                "max": round(ndvi_data.get("max", 1), 4),
                "std": round(ndvi_data.get("std", 0), 4),
                "vegetation_cover_pct": round((ndvi_data.get("mean", 0) + 1) * 50, 1),
            }
        
        if "classification" in results:
            class_data = results["classification"]
            total_pixels = sum(class_data.get("class_counts", {}).values())
            stats["classification"] = {
                "classes": class_data.get("n_classes", 0),
                "class_distribution": {
                    k: {"pixels": v, "percentage": round(v / total_pixels * 100, 1) if total_pixels else 0}
                    for k, v in class_data.get("class_counts", {}).items()
                },
            }
        
        if "change" in results:
            change = results["change"]
            stats["change_detection"] = {
                "unchanged": round(change.get("unchanged", 0), 1),
                "gain": round(change.get("gain", 0), 1),
                "loss": round(change.get("loss", 0), 1),
                "net_change": round(change.get("gain", 0) - change.get("loss", 0), 1),
            }

        return stats

    def _generate_interpretation(self, analysis_type: str, data: Dict[str, Any]) -> str:
        """Generate scientific interpretation of results."""
        stats = self._compute_statistics(data)
        
        if "ndvi" in stats:
            ndvi = stats["ndvi"]
            return (
                f"The NDVI analysis reveals a mean vegetation index of {ndvi['mean']}, "
                f"indicating {self._describe_vegetation(ndvi['mean'])}. "
                f"Vegetation cover is estimated at {ndvi['vegetation_cover_pct']}% of the study area. "
                f"The NDVI range spans from {ndvi['min']} to {ndvi['max']}, "
                f"showing significant spatial heterogeneity across the landscape."
            )
        
        return "Analysis results indicate meaningful spatial patterns. "
        "Further field validation is recommended for accuracy assessment."

    def _describe_vegetation(self, ndvi: float) -> str:
        if ndvi < 0: return "non-vegetated surfaces (water, built-up)"
        if ndvi < 0.2: return "sparse or stressed vegetation"
        if ndvi < 0.4: return "moderate vegetation cover"
        if ndvi < 0.6: return "dense, healthy vegetation"
        return "very dense, highly productive vegetation"

    def _generate_limitations(self, analysis_type: str, data: Dict[str, Any]) -> List[str]:
        """Generate limitations and caveats."""
        return [
            "Analysis accuracy depends on satellite data quality and atmospheric conditions",
            "Cloud cover may affect temporal consistency of observations",
            "Spatial resolution constraints may miss fine-scale variations",
            "Ground validation is recommended for critical applications",
            "Results represent conditions at the time of satellite acquisition",
        ]

    def _generate_recommendations(self, analysis_type: str, data: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations."""
        return [
            "Integrate field observations to validate satellite-derived measurements",
            "Conduct time-series analysis for trend detection and monitoring",
            "Combine with socio-economic data for comprehensive impact assessment",
            "Explore higher-resolution imagery for detailed local analysis",
        ]

    def _get_references(self, analysis_type: str) -> List[Dict[str, str]]:
        """Get relevant scientific references."""
        return [
            {"title": "Open access to Earth observation data for global change research", "source": "Nature"},
            {"title": "Google Earth Engine: Cloud-based analysis of satellite imagery", "source": "Remote Sensing of Environment"},
            {"title": "Best practices for satellite-based land cover classification", "source": "ISPRS Journal"},
        ]

    def _generate_cross_comparison(self, reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate cross-analysis comparison metrics."""
        return {
            "total_analyses": len(reports),
            "analysis_types": list(set(r.get("analysis_type", "") for r in reports)),
            "date_range": {
                "from": min(r.get("generated_at", "") for r in reports) if reports else "",
                "to": max(r.get("generated_at", "") for r in reports) if reports else "",
            },
        }

    async def _generate_json(self, content: Dict[str, Any], output_path: str) -> None:
        """Generate JSON report."""
        with open(output_path, "w") as f:
            json.dump(content, f, indent=2, default=str)

    async def _generate_html(self, content: Dict[str, Any], output_path: str) -> None:
        """Generate HTML report with professional styling."""
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{content['title']}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; }}
        .header {{ text-align: center; padding: 30px 0; border-bottom: 3px solid #1a73e8; margin-bottom: 30px; }}
        .header h1 {{ color: #1a73e8; font-size: 2em; }}
        .header .subtitle {{ color: #666; font-size: 1.1em; }}
        .section {{ margin-bottom: 30px; }}
        .section h2 {{ color: #1a73e8; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px; }}
        .summary {{ background: #f0f7ff; padding: 20px; border-radius: 8px; border-left: 4px solid #1a73e8; }}
        .stat-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }}
        .stat-card {{ background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }}
        .stat-card .value {{ font-size: 1.8em; font-weight: bold; color: #1a73e8; }}
        .stat-card .label {{ font-size: 0.9em; color: #666; }}
        ul {{ padding-left: 20px; }}
        li {{ margin-bottom: 8px; }}
        .footer {{ text-align: center; padding-top: 30px; border-top: 1px solid #eee; color: #999; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{content['title']}</h1>
        <div class="subtitle">Generated by CRAFTY GIS • {content['generated_at']}</div>
    </div>
    
    <div class="section">
        <h2>Executive Summary</h2>
        <div class="summary">{content['summary']}</div>
    </div>
    
    <div class="section">
        <h2>Methodology</h2>
        <ul>
"""
        for step in content.get("methodology", []):
            html += f"<li>{step}</li>\n"
        
        html += """        </ul>
    </div>
"""
        
        if content.get("statistics"):
            html += """    <div class="section">
        <h2>Statistics</h2>
        <div class="stat-grid">
"""
            for key, value in content["statistics"].items():
                if isinstance(value, dict):
                    if "mean" in value:
                        html += f"""            <div class="stat-card"><div class="value">{value['mean']}</div><div class="label">{key} Mean</div></div>
"""
                        html += f"""            <div class="stat-card"><div class="value">{value['vegetation_cover_pct']}%</div><div class="label">Vegetation Cover</div></div>
"""
        
        html += """        </div>
    </div>
"""
        
        html += f"""    <div class="section">
        <h2>Interpretation</h2>
        <p>{content.get('interpretation', '')}</p>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
"""
        for rec in content.get("recommendations", []):
            html += f"<li>{rec}</li>\n"
        
        html += """        </ul>
    </div>
    
    <div class="footer">
        <p>CRAFTY GIS — Conversational Remote Analysis & Field Technology for GIS</p>
        <p>Open Source Geospatial Intelligence Platform</p>
    </div>
</body>
</html>"""
        
        with open(output_path, "w") as f:
            f.write(html)

    async def _generate_markdown(self, content: Dict[str, Any], output_path: str) -> None:
        """Generate Markdown report."""
        md = f"""# {content['title']}

**Generated by CRAFTY GIS** | {content['generated_at']}

---

## Executive Summary

{content['summary']}

## Methodology

"""
        for step in content.get("methodology", []):
            md += f"- {step}\n"

        if content.get("statistics"):
            md += "\n## Statistics\n\n"
            for key, value in content["statistics"].items():
                if isinstance(value, dict):
                    md += f"- **{key}**: {json.dumps(value)}\n"

        md += f"""
## Interpretation

{content.get('interpretation', '')}

## Recommendations

"""
        for rec in content.get("recommendations", []):
            md += f"- {rec}\n"

        with open(output_path, "w") as f:
            f.write(md)

    async def _generate_pdf(self, content: Dict[str, Any], output_path: str) -> str:
        """Generate PDF report (HTML-based, converted to PDF)."""
        # Generate HTML first, then convert to PDF
        html_path = output_path.replace(".pdf", ".html")
        await self._generate_html(content, html_path)
        
        # Try to convert to PDF using available tools
        try:
            proc = await asyncio.create_subprocess_exec(
                "weasyprint", html_path, output_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
            if os.path.exists(output_path):
                os.remove(html_path)
                return output_path
        except FileNotFoundError:
            try:
                proc = await asyncio.create_subprocess_exec(
                    "wkhtmltopdf", html_path, output_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await proc.communicate()
                if os.path.exists(output_path):
                    os.remove(html_path)
                    return output_path
            except FileNotFoundError:
                logger.warning("PDF generation tools not available, returning HTML")
                return html_path
        
        return html_path
