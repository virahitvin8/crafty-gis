"""Automated Report Generator — generates professional PDF reports from analysis outputs."""

import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
from app.config import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, ListFlowable, ListItem,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generates professional PDF reports for CRAFTY GIS analysis results."""

    def __init__(self):
        self.outputs_dir = Path(settings.outputs_dir)
        self.outputs_dir.mkdir(parents=True, exist_ok=True)
        self.styles = self._setup_styles()

    def _setup_styles(self):
        """Set up report styles."""
        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            "CoverTitle", fontName="Helvetica-Bold", fontSize=28,
            alignment=TA_CENTER, spaceAfter=20, textColor=colors.HexColor("#1a5276"),
        ))
        styles.add(ParagraphStyle(
            "CoverSubtitle", fontName="Helvetica", fontSize=14,
            alignment=TA_CENTER, spaceAfter=40, textColor=colors.HexColor("#2c3e50"),
        ))
        styles.add(ParagraphStyle(
            "SectionTitle", fontName="Helvetica-Bold", fontSize=18,
            spaceAfter=12, spaceBefore=20, textColor=colors.HexColor("#1a5276"),
        ))
        styles.add(ParagraphStyle(
            "SubSectionTitle", fontName="Helvetica-Bold", fontSize=14,
            spaceAfter=8, spaceBefore=12, textColor=colors.HexColor("#2c3e50"),
        ))
        styles.add(ParagraphStyle(
            "BodyText2", fontName="Helvetica", fontSize=10,
            alignment=TA_JUSTIFY, spaceAfter=8, leading=14,
        ))
        styles.add(ParagraphStyle(
            "Caption", fontName="Helvetica-Oblique", fontSize=9,
            alignment=TA_CENTER, spaceAfter=10, textColor=colors.HexColor("#7f8c8d"),
        ))
        styles.add(ParagraphStyle(
            "MethodologyStep", fontName="Helvetica", fontSize=10,
            spaceAfter=6, leftIndent=20, leading=14,
        ))
        return styles

    async def generate_report(
        self,
        project_name: str,
        analysis_params: dict,
        workflow_tasks: list[dict],
        output_files: list[dict],
        map_images: list[Path],
        stats_data: Optional[dict] = None,
    ) -> Path:
        """Generate a complete PDF analysis report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = self.outputs_dir / f"report_{project_name}_{timestamp}.pdf"

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            leftMargin=2.5 * cm,
            rightMargin=2.5 * cm,
            topMargin=2.5 * cm,
            bottomMargin=2.5 * cm,
        )

        story = []
        self._build_cover_page(story, project_name, analysis_params)
        self._build_executive_summary(story, analysis_params)
        self._build_methodology(story, workflow_tasks)
        self._build_results_section(story, map_images, stats_data)
        self._build_outputs_table(story, output_files)
        self._build_conclusion(story)
        self._build_appendix(story, analysis_params)

        doc.build(story)
        logger.info(f"Report generated: {output_path}")
        return output_path

    def _build_cover_page(self, story: list, project_name: str, params: dict):
        """Build the cover page."""
        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph("CRAFTY GIS", self.styles["CoverTitle"]))
        story.append(Paragraph(
            "Conversational Remote Analysis &amp; Field Technology for GIS",
            self.styles["CoverSubtitle"]
        ))
        story.append(Spacer(1, 0.5 * inch))

        # Analysis info table
        info_data = [
            ["Project:", project_name],
            ["Analysis Type:", params.get("analysis_type", "Custom").replace("_", " ").title()],
            ["Location:", params.get("location", "Not specified")],
            ["Time Period:", params.get("time_period", "Not specified")],
            ["Date Generated:", datetime.now().strftime("%B %d, %Y")],
        ]
        info_table = Table(info_data, colWidths=[2 * inch, 4 * inch])
        info_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#1a5276")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(info_table)
        story.append(PageBreak())

    def _build_executive_summary(self, story: list, params: dict):
        """Build executive summary section."""
        story.append(Paragraph("1. Executive Summary", self.styles["SectionTitle"]))
        story.append(Paragraph(
            f"This report presents the results of an automated geospatial analysis performed by "
            f"CRAFTY GIS. The analysis was requested to address the following problem:",
            self.styles["BodyText2"]
        ))
        story.append(Paragraph(
            f"<b>Problem Statement:</b> {params.get('description', 'No description provided.')}",
            self.styles["BodyText2"]
        ))
        story.append(Spacer(1, 0.2 * inch))
        story.append(Paragraph(
            "CRAFTY GIS automatically downloaded the required data, selected the appropriate "
            "processing algorithms, executed the analysis through industry-standard GIS tools, "
            "and compiled the results into this report. The entire process was performed with "
            "minimal manual intervention, demonstrating the power of AI-driven geospatial analysis.",
            self.styles["BodyText2"]
        ))

    def _build_methodology(self, story: list, tasks: list[dict]):
        """Build methodology section with step-by-step workflow."""
        story.append(Paragraph("2. Methodology", self.styles["SectionTitle"]))
        story.append(Paragraph(
            "The analysis was performed through the following automated workflow steps:",
            self.styles["BodyText2"]
        ))
        story.append(Spacer(1, 0.1 * inch))

        for i, task in enumerate(tasks, 1):
            status_icon = "&#10003;" if task.get("status") == "completed" else "&#9898;"
            step_text = f"<b>Step {i}:</b> {task['title']} — {task.get('description', '')}"
            story.append(Paragraph(f"{status_icon} {step_text}", self.styles["MethodologyStep"]))

    def _build_results_section(
        self, story: list, map_images: list[Path], stats_data: Optional[dict]
    ):
        """Build results section with maps and statistics."""
        story.append(Paragraph("3. Results &amp; Analysis", self.styles["SectionTitle"]))

        if map_images:
            story.append(Paragraph("3.1 Generated Maps", self.styles["SubSectionTitle"]))
            for map_path in map_images:
                if map_path.exists():
                    try:
                        img = Image(str(map_path), width=6 * inch, height=4 * inch)
                        story.append(img)
                        story.append(Paragraph(
                            f"<i>Figure: {map_path.stem.replace('_', ' ').title()}</i>",
                            self.styles["Caption"]
                        ))
                    except Exception:
                        pass

        if stats_data:
            story.append(Paragraph("3.2 Statistical Summary", self.styles["SubSectionTitle"]))
            if isinstance(stats_data, dict):
                table_data = [["Metric", "Value"]]
                for key, value in stats_data.items():
                    table_data.append([
                        key.replace("_", " ").title(),
                        str(value) if not isinstance(value, (int, float)) else f"{value:,.2f}"
                    ])
                stat_table = Table(table_data, colWidths=[3 * inch, 3 * inch])
                stat_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a5276")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f6fa")]),
                ]))
                story.append(stat_table)

    def _build_outputs_table(self, story: list, output_files: list[dict]):
        """Build outputs reference table."""
        story.append(Paragraph("4. Output Files", self.styles["SectionTitle"]))
        story.append(Paragraph(
            "The following files were generated and are available for download:",
            self.styles["BodyText2"]
        ))

        if output_files:
            table_data = [["File Name", "Format", "Type", "Size"]]
            for f in output_files:
                table_data.append([
                    f.get("name", "Unknown"),
                    f.get("format", "-"),
                    f.get("type", "-"),
                    f.get("size", "-"),
                ])

            output_table = Table(table_data, colWidths=[2.5 * inch, 1 * inch, 1.5 * inch, 1 * inch])
            output_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a5276")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f6fa")]),
            ]))
            story.append(output_table)

    def _build_conclusion(self, story: list):
        """Build conclusion section."""
        story.append(Paragraph("5. Conclusion", self.styles["SectionTitle"]))
        story.append(Paragraph(
            "This analysis was generated automatically by CRAFTY GIS — an AI-powered geospatial "
            "problem-solving platform. The results demonstrate how automated workflows can make "
            "complex GIS analysis accessible to users of all technical backgrounds.",
            self.styles["BodyText2"]
        ))
        story.append(Paragraph(
            "<b>Disclaimer:</b> This report was generated automatically. Results should be "
            "reviewed and validated before use in critical decision-making.",
            self.styles["BodyText2"]
        ))

    def _build_appendix(self, story: list, params: dict):
        """Build appendix with technical details."""
        story.append(PageBreak())
        story.append(Paragraph("Appendix: Analysis Parameters", self.styles["SectionTitle"]))

        if params:
            param_data = [["Parameter", "Value"]]
            for key, value in params.items():
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value)
                param_data.append([
                    key.replace("_", " ").title(),
                    str(value),
                ])

            param_table = Table(param_data, colWidths=[2.5 * inch, 3.5 * inch])
            param_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a5276")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f6fa")]),
            ]))
            story.append(param_table)
