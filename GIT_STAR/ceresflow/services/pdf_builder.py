from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import os
from datetime import datetime

def build_pdf_report(location_name, bbox_info, utm_info, agronomy_data, output_path):
    """
    Assembles a professional, print-ready PDF report of the land analysis 
    using ReportLab.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(output_path, pagesize=letter,
                            rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom Styles for Premium Look
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1b3d2f'),
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#2e624c'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=6
    )
    
    bold_body_style = ParagraphStyle(
        'ReportBoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    story = []
    
    # Title
    story.append(Paragraph("🌾 CeresFlow Land Analysis Report", title_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style))
    story.append(Spacer(1, 10))
    
    # 1. Location Metadata Table
    metadata_data = [
        [Paragraph("<b>Target Location:</b>", body_style), Paragraph(location_name, body_style)],
        [Paragraph("<b>Center Coordinates:</b>", body_style), Paragraph(f"{bbox_info['center_lat']:.5f}, {bbox_info['center_lon']:.5f}", body_style)],
        [Paragraph("<b>Projected UTM Zone:</b>", body_style), Paragraph(f"{utm_info['zone_name']} ({utm_info['epsg']})", body_style)],
        [Paragraph("<b>Bounding Box limits:</b>", body_style), Paragraph(f"Lats: {bbox_info['min_lat']:.5f} to {bbox_info['max_lat']:.5f} | Lons: {bbox_info['min_lon']:.5f} to {bbox_info['max_lon']:.5f}", body_style)]
    ]
    t_meta = Table(metadata_data, colWidths=[150, 350])
    t_meta.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BDC3C7')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#ECF0F1')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))
    
    # 2. Key Metrics Summary Table
    metrics = agronomy_data["metrics"]
    metrics_data = [
        [Paragraph("<b>Index / Feature</b>", bold_body_style), Paragraph("<b>Average Value</b>", bold_body_style), Paragraph("<b>Target Range</b>", bold_body_style)],
        [Paragraph("Crop Health (NDVI)", body_style), Paragraph(f"{metrics['ndvi_mean']:.3f}", body_style), Paragraph("0.0 (Bare) to 1.0 (Dense)", body_style)],
        [Paragraph("Moisture Index (NDWI)", body_style), Paragraph(f"{metrics['ndwi_mean']:.3f}", body_style), Paragraph("-1.0 (Dry) to 1.0 (Wet)", body_style)],
        [Paragraph("Mean Slope (Degrees)", body_style), Paragraph(f"{metrics['slope_mean']:.1f}°", body_style), Paragraph("0° to 90°", body_style)],
        [Paragraph("Maximum Slope (Degrees)", body_style), Paragraph(f"{metrics['slope_max']:.1f}°", body_style), Paragraph("Risk threshold: > 15°", body_style)]
    ]
    
    if "soil_mean" in metrics and metrics["soil_mean"] != 0.0:
        metrics_data.append([Paragraph("Soil Clay Index (SOCI)", body_style), Paragraph(f"{metrics['soil_mean']:.2f}", body_style), Paragraph("-1.0 (Sandy) to 1.0 (Clay)", body_style)])
    if "lst_mean" in metrics and metrics["lst_mean"] != 28.0:
        metrics_data.append([Paragraph("Land Surface Temp (LST)", body_style), Paragraph(f"{metrics['lst_mean']:.1f}°C", body_style), Paragraph("Ambient surface temperature proxy", body_style)])
    if "ccf_mean" in metrics and metrics["ccf_mean"] != 0.0:
        metrics_data.append([Paragraph("Canopy Cover Fraction (CCF)", body_style), Paragraph(f"{metrics['ccf_mean']*100:.1f}%", body_style), Paragraph("0% to 100% field coverage", body_style)])

    t_metrics = Table(metrics_data, colWidths=[180, 160, 160])
    t_metrics.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BDC3C7')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2e624c')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    # Quick text color fix for header row
    for col in range(3):
        metrics_data[0][col].style.textColor = colors.white
        
    story.append(Paragraph("📊 Summary Land Metrics", section_style))
    story.append(t_metrics)
    story.append(Spacer(1, 15))
    
    # 3. Agronomy Recommendations (For Farmers)
    story.append(Paragraph("💡 Farmer Recommendations & Interpretations", section_style))
    
    h_data = agronomy_data["health"]
    w_data = agronomy_data["water"]
    s_data = agronomy_data["slope"]
    
    rec_data = [
        [Paragraph("<b>Crop Health Status:</b>", body_style), Paragraph(f"<b>{h_data['status']}</b><br/>{h_data['desc']}<br/><i>Action: {h_data['action']}</i>", body_style)],
        [Paragraph("<b>Water/Moisture Status:</b>", body_style), Paragraph(f"<b>{w_data['status']}</b><br/>{w_data['desc']}<br/><i>Action: {w_data['action']}</i>", body_style)],
        [Paragraph("<b>Terrain Erosion Status:</b>", body_style), Paragraph(f"<b>{s_data['status']}</b><br/>{s_data['desc']}<br/><i>Action: {s_data['action']}</i>", body_style)]
    ]
    
    if "soil" in agronomy_data:
        soil_d = agronomy_data["soil"]
        rec_data.append([Paragraph("<b>Soil Structure:</b>", body_style), Paragraph(f"<b>{soil_d['status']}</b><br/>{soil_d['desc']}<br/><i>Action: {soil_d['action']}</i>", body_style)])
    if "thermal" in agronomy_data:
        thermal_d = agronomy_data["thermal"]
        rec_data.append([Paragraph("<b>Thermal Stress:</b>", body_style), Paragraph(f"<b>{thermal_d['status']}</b><br/>{thermal_d['desc']}<br/><i>Action: {thermal_d['action']}</i>", body_style)])
    if "canopy" in agronomy_data:
        canopy_d = agronomy_data["canopy"]
        rec_data.append([Paragraph("<b>Canopy Spacing:</b>", body_style), Paragraph(f"<b>{canopy_d['status']}</b><br/>{canopy_d['desc']}<br/><i>Action: {canopy_d['action']}</i>", body_style)])
        
    t_rec = Table(rec_data, colWidths=[150, 350])
    t_rec.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BDC3C7')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F9EBEA'))
    ]))
    story.append(t_rec)
    story.append(Spacer(1, 15))
    
    # 4. Procedure Audit & Scientific Verification (Immune System)
    story.append(Paragraph("🛡️ Scientific Procedure & Audit Log", section_style))
    audit_text = (
        "This report was compiled automatically using Sentinel-2 bottom-of-atmosphere (Level-2A) spectral channels "
        "and SRTM Digital Elevation Models. <br/>"
        "<b>Mathematical Formula Definitions:</b><br/>"
        "• <i>NDVI (Normalized Difference Vegetation Index):</i> calculated as (B08 - B04) / (B08 + B04), measuring leaf chlorophyll density.<br/>"
        "• <i>NDWI (Normalized Difference Water Index):</i> calculated as (B03 - B08) / (B03 + B08), measuring foliage moisture.<br/>"
        "• <i>SOCI (Soil Clay Index):</i> calculated as (Red - Green) / (Red + Green) to proxy mineral fraction.<br/>"
        "• <i>LST (Land Surface Temp):</i> calculated as 38.0 - 18.0*NDVI - 0.0065*DEM anomaly temperature model.<br/>"
        "• <i>CCF (Canopy Cover Fraction):</i> calculated by scaling NDVI from bare earth (0.15) to full canopy (0.80).<br/>"
        "• <i>Slope Calculation:</i> Horn's 3x3 kernel convolution algorithm was used to calculate rise over run in local UTM coordinates.<br/>"
        "• <i>Contour Lines:</i> Topographic contour lines generated at 10m height intervals using bilinear raster grid interpolation."
    )
    story.append(Paragraph(audit_text, body_style))
    story.append(Spacer(1, 15))
    
    # Build Document
    doc.build(story)
    return output_path
