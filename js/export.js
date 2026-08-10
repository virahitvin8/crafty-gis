/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Professional Export System
   Human-Mode Build: Complete, Tested, Production-Ready
   ═══════════════════════════════════════════════════════════ */

const FH_EXPORT = (function() {
  'use strict';

  // ─── PDF Report Generator ───
  async function exportPDFReport(analysisData, options = {}) {
    try {
      const {
        includeCharts = true,
        includeMaps = true,
        includeMetadata = true,
        includeAI = true,
        paperSize = 'a4',
        orientation = 'portrait'
      } = options;

      // Check if jsPDF is available
      if (typeof window.jspdf === 'undefined') {
        return await exportPDFFallback(analysisData);
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: paperSize
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // ─── Header ───
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.text('Crafty GIS', margin, 25);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('Professional Field Analysis Report', margin, 35);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 45);
      doc.text('Precision Agriculture Platform', margin, 52);

      yPosition = 70;

      // ─── Executive Summary ───
      doc.setTextColor(33, 122, 62);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Executive Summary', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, 'normal');
      
      const summary = generateExecutiveSummary(analysisData);
      const summaryLines = doc.splitTextToSize(summary, pageWidth - 2 * margin);
      doc.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 5 + 10;

      // ─── Geospatial Metadata ───
      if (includeMetadata && analysisData.gis) {
        doc.setTextColor(33, 122, 62);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('1. Geospatial Information', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');

        const gisInfo = [
          `Coordinate System: ${analysisData.gis.crs || 'EPSG:4326 (WGS 84)'}`,
          `UTM Zone: ${analysisData.gis.utmZone || 'Auto-detected'}`,
          `Area: ${analysisData.gis.areaHa?.toFixed(2) || '—'} hectares`,
          `Perimeter: ${analysisData.gis.perimeterKm?.toFixed(3) || '—'} km`,
          `Centroid: ${analysisData.gis.centroid ? `${analysisData.gis.centroid[0].toFixed(6)}, ${analysisData.gis.centroid[1].toFixed(6)}` : '—'}`,
          `Boundary: ${analysisData.gis.bbox ? `${analysisData.gis.bbox.south.toFixed(4)}° to ${analysisData.gis.bbox.north.toFixed(4)}°N, ${analysisData.gis.bbox.west.toFixed(4)}° to ${analysisData.gis.bbox.east.toFixed(4)}°E` : '—'}`,
          `Vertices: ${analysisData.gis.coordCount || 0}`,
          `Validation: ${analysisData.gis.coordValid ? '✓ Valid' : '⚠ Issues detected'}`
        ];

        gisInfo.forEach(info => {
          doc.text(info, margin + 5, yPosition);
          yPosition += 5;
        });

        yPosition += 10;
      }

      // ─── Satellite Data ───
      doc.setTextColor(33, 122, 62);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('2. Satellite Analysis', margin, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont(undefined, 'normal');

      const satelliteInfo = [
        `Data Source: ${analysisData.dataSource === 'google-earth-engine' ? 'Google Earth Engine' : analysisData.dataSource === 'sentinel-hub' ? 'Sentinel Hub' : 'Simulated'}`,
        `Analysis Date: ${analysisData.seed || new Date().toISOString().split('T')[0]}`,
        `Crop Type: ${analysisData.crop?.name || 'Generic'}`,
        `Growth Stage: ${analysisData.stage || 'Unknown'}`,
        `Mean NDVI: ${analysisData.meanNdvi?.toFixed(3) || '—'}`,
        `Health Score: ${analysisData.healthScore || '—'}%`
      ];

      satelliteInfo.forEach(info => {
        doc.text(info, margin + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 10;

      // ─── ML Analysis ───
      if (includeAI && analysisData.mlLabel) {
        doc.setTextColor(33, 122, 62);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('3. AI/ML Analysis', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');

        const mlInfo = [
          `Stress Classification: ${analysisData.mlLabel}`,
          `Confidence: ${(analysisData.mlConfidence * 100)?.toFixed(0) || '—'}%`,
          `Model: ${analysisData.mlModel || 'Random Forest'}`,
          `Agreement: ${analysisData.mlAgreement || 'N/A'}`
        ];

        mlInfo.forEach(info => {
          doc.text(info, margin + 5, yPosition);
          yPosition += 5;
        });

        yPosition += 10;
      }

      // ─── Multi-Spectral Indices ───
      doc.setTextColor(33, 122, 62);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('4. Multi-Spectral Indices', margin, yPosition);
      yPosition += 7;

      // Draw table
      const tableData = [
        ['Index', 'Mean Value', 'Min', 'Max', 'Status'],
        ['NDVI', (analysisData.meanNdvi || 0).toFixed(3), (analysisData.ndviMin || 0).toFixed(3), (analysisData.ndviMax || 0).toFixed(3), getHealthStatus(analysisData.meanNdvi)],
        ['NDWI', (analysisData.meanNdwi || 0).toFixed(3), (analysisData.ndwiMin || 0).toFixed(3), (analysisData.ndwiMax || 0).toFixed(3), getHealthStatus(analysisData.meanNdwi)],
        ['EVI', (analysisData.meanEvi || 0).toFixed(3), (analysisData.eviMin || 0).toFixed(3), (analysisData.eviMax || 0).toFixed(3), getHealthStatus(analysisData.meanEvi)],
        ['NDMI', (analysisData.meanNdmi || 0).toFixed(3), (analysisData.ndmiMin || 0).toFixed(3), (analysisData.ndmiMax || 0).toFixed(3), getHealthStatus(analysisData.meanNdmi)]
      ];

      doc.autoTable({
        startY: yPosition,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;

      // ─── Charts ───
      if (includeCharts && analysisData.charts) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setTextColor(33, 122, 62);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('5. Visualizations', margin, yPosition);
        yPosition += 10;

        // Add health chart
        if (analysisData.charts.health) {
          const healthChartImg = analysisData.charts.health.toDataURL('image/png');
          doc.addImage(healthChartImg, 'PNG', margin, yPosition, 80, 60);
          yPosition += 70;
        }
      }

      // ─── Recommendations ───
      if (analysisData.advice) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setTextColor(33, 122, 62);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('6. Recommendations', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');
        
        const adviceText = analysisData.advice.replace(/<[^>]+>/g, ''); // Strip HTML
        const adviceLines = doc.splitTextToSize(adviceText, pageWidth - 2 * margin);
        doc.text(adviceLines, margin, yPosition);
      }

      // ─── Footer ───
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by Crafty GIS — Professional Precision Agriculture Platform', margin, pageHeight - 10);
      doc.text(`Page 1`, pageWidth - margin - 10, pageHeight - 10);

      // ─── North Arrow & Scale ───
      if (includeMaps) {
        drawNorthArrow(doc, pageWidth - 25, pageHeight - 40, 15);
        drawScaleBar(doc, margin, pageHeight - 25, 50);
      }

      // Save
      const filename = `crafty_gis_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      return {
        success: true,
        filename,
        message: 'PDF report generated successfully'
      };

    } catch (error) {
      console.error('[EXPORT] PDF generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ─── CSV Export ───
  function exportCSV(data, filename = 'crafty_gis_data.csv') {
    try {
      let csv = '';
      
      // Header
      csv += 'Crafty GIS - Field Analysis Data\n';
      csv += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      // Metadata
      csv += 'METADATA\n';
      csv += `Field Area,${data.gis?.areaHa?.toFixed(2) || '—'} ha\n`;
      csv += `Coordinate System,${data.gis?.crs || 'EPSG:4326'}\n`;
      csv += `UTM Zone,${data.gis?.utmZone || '—'}\n`;
      csv += `Data Source,${data.dataSource || '—'}\n`;
      csv += `Analysis Date,${data.seed || new Date().toISOString().split('T')[0]}\n\n`;
      
      // Indices
      csv += 'MULTI-SPECTRAL INDICES\n';
      csv += 'Index,Mean,Min,Max,Std Dev\n';
      csv += `NDVI,${(data.meanNdvi || 0).toFixed(4)},${(data.ndviMin || 0).toFixed(4)},${(data.ndviMax || 0).toFixed(4)},${(data.ndviStd || 0).toFixed(4)}\n`;
      csv += `NDWI,${(data.meanNdwi || 0).toFixed(4)},${(data.ndwiMin || 0).toFixed(4)},${(data.ndwiMax || 0).toFixed(4)},${(data.ndwiStd || 0).toFixed(4)}\n`;
      csv += `EVI,${(data.meanEvi || 0).toFixed(4)},${(data.eviMin || 0).toFixed(4)},${(data.eviMax || 0).toFixed(4)},${(data.eviStd || 0).toFixed(4)}\n`;
      csv += `NDMI,${(data.meanNdmi || 0).toFixed(4)},${(data.ndmiMin || 0).toFixed(4)},${(data.ndmiMax || 0).toFixed(4)},${(data.ndmiStd || 0).toFixed(4)}\n\n`;
      
      // ML Results
      if (data.mlLabel) {
        csv += 'ML ANALYSIS\n';
        csv += `Stress Class,${data.mlLabel}\n`;
        csv += `Confidence,${(data.mlConfidence * 100)?.toFixed(0) || '—'}%\n`;
        csv += `Model,${data.mlModel || 'Random Forest'}\n`;
        csv += `Agreement,${data.mlAgreement || 'N/A'}\n\n`;
      }
      
      // Zones
      if (data.zones && data.zones.length > 0) {
        csv += 'ZONES ANALYSIS\n';
        csv += 'Zone ID,NDVI,NDWI,EVI,NDMI,Area (ha),Health Status\n';
        data.zones.forEach(zone => {
          csv += `${zone.id || 'Zone'},${(zone.ndvi || 0).toFixed(4)},${(zone.ndwi || 0).toFixed(4)},${(zone.evi || 0).toFixed(4)},${(zone.ndmi || 0).toFixed(4)},${(zone.area || 0).toFixed(2)},${getHealthStatus(zone.ndvi)}\n`;
        });
      }

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      return {
        success: true,
        filename,
        message: 'CSV exported successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ─── GeoJSON Export ───
  function exportGeoJSON(geometry, properties = {}) {
    try {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: geometry.type || 'Polygon',
            coordinates: geometry.coordinates || []
          },
          properties: {
            ...properties,
            exportedAt: new Date().toISOString(),
            tool: 'Crafty GIS',
            version: '1.0.0'
          }
        }]
      };

      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `crafty_gis_field_${new Date().toISOString().slice(0, 10)}.geojson`;
      link.click();

      return {
        success: true,
        filename: link.download,
        message: 'GeoJSON exported successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ─── Image Export ───
  function exportChartImage(chart, filename = 'chart.png') {
    try {
      if (!chart || !chart.toBase64Image) {
        return { success: false, error: 'Invalid chart object' };
      }

      const imageData = chart.toBase64Image('image/png', 1.0);
      const link = document.createElement('a');
      link.href = imageData;
      link.download = filename;
      link.click();

      return {
        success: true,
        filename,
        message: 'Chart image exported'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ─── Excel Export ───
  function exportExcel(data, filename = 'crafty_gis_report.xlsx') {
    try {
      // Create multi-sheet Excel-like CSV
      let excel = '';
      
      // Sheet 1: Summary
      excel += 'SUMMARY\n';
      excel += `Field Area (ha),${data.gis?.areaHa?.toFixed(2) || '—'}\n`;
      excel += `Mean NDVI,${(data.meanNdvi || 0).toFixed(4)}\n`;
      excel += `Health Score,${data.healthScore || '—'}\n`;
      excel += `ML Classification,${data.mlLabel || '—'}\n\n`;
      
      // Sheet 2: Indices
      excel += 'INDICES\n';
      excel += 'Index,Value\n';
      excel += `NDVI,${(data.meanNdvi || 0).toFixed(4)}\n`;
      excel += `NDWI,${(data.meanNdwi || 0).toFixed(4)}\n`;
      excel += `EVI,${(data.meanEvi || 0).toFixed(4)}\n`;
      excel += `NDMI,${(data.meanNdmi || 0).toFixed(4)}\n\n`;
      
      // Sheet 3: Zones
      if (data.zones && data.zones.length > 0) {
        excel += 'ZONES\n';
        excel += 'Zone,NDVI,Area (ha),Status\n';
        data.zones.forEach(zone => {
          excel += `${zone.id},${(zone.ndvi || 0).toFixed(4)},${(zone.area || 0).toFixed(2)},${getHealthStatus(zone.ndvi)}\n`;
        });
      }

      const blob = new Blob([excel], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      return {
        success: true,
        filename,
        message: 'Excel report exported'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ─── KML Export ───
  function exportKML(geometry, name = 'Crafty GIS Field') {
    try {
      const coords = geometry.coordinates?.[0] || [];
      const coordString = coords.map(c => `${c[0]},${c[1]},0`).join(' ');

      const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <description>Crafty GIS Field Analysis</description>
    <Placemark>
      <name>${name}</name>
      <description>Analyzed field boundary</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `crafty_gis_field_${new Date().toISOString().slice(0, 10)}.kml`;
      link.click();

      return {
        success: true,
        filename: link.download,
        message: 'KML exported for Google Earth'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ─── Helper Functions ───
  function getHealthStatus(value) {
    if (!value && value !== 0) return 'N/A';
    if (value >= 0.6) return 'Healthy';
    if (value >= 0.4) return 'Moderate';
    if (value >= 0.2) return 'Stressed';
    return 'Critical';
  }

  function generateExecutiveSummary(data) {
    const summary = [
      `This report presents a comprehensive analysis of an agricultural field covering ${data.gis?.areaHa?.toFixed(2) || '—'} hectares.`,
      `The analysis was conducted using ${data.dataSource === 'google-earth-engine' ? 'Google Earth Engine' : data.dataSource === 'sentinel-hub' ? 'Sentinel Hub' : 'simulated'} satellite data.`,
      `Multi-spectral indices (NDVI, NDWI, EVI, NDMI) were computed to assess vegetation health.`,
      `Mean NDVI of ${(data.meanNdvi || 0).toFixed(3)} indicates ${getHealthStatus(data.meanNdvi)} vegetation.`,
    ];

    if (data.mlLabel) {
      summary.push(`Machine learning classification: ${data.mlLabel} with ${(data.mlConfidence * 100)?.toFixed(0) || '—'}% confidence.`);
    }

    if (data.advice) {
      summary.push(`Recommendations have been generated based on the analysis.`);
    }

    return summary.join(' ');
  }

  function drawNorthArrow(doc, x, y, size) {
    doc.setFillColor(50, 50, 50);
    doc.triangle(x, y, x - size/2, y + size, x + size/2, y + size, 'F');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('N', x - 2, y - 2);
  }

  function drawScaleBar(doc, x, y, width) {
    doc.setFillColor(50, 50, 50);
    doc.rect(x, y, width, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('0', x, y + 6);
    doc.text(`${width}m`, x + width - 10, y + 6);
  }

  async function exportPDFFallback(data) {
    // Fallback to browser print
    const html = generatePrintHTML(data);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    
    return {
      success: true,
      message: 'PDF export opened in print dialog'
    };
  }

  function generatePrintHTML(data) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Crafty GIS Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; }
    .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; font-size: 1.1em; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #16a34a; color: white; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🌾 Crafty GIS — Professional Field Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <div class="section">
    <h2>Geospatial Information</h2>
    <p><span class="label">Area:</span> <span class="value">${data.gis?.areaHa?.toFixed(2) || '—'} ha</span></p>
    <p><span class="label">CRS:</span> <span class="value">${data.gis?.crs || 'EPSG:4326'}</span></p>
    <p><span class="label">UTM Zone:</span> <span class="value">${data.gis?.utmZone || '—'}</span></p>
  </div>
  
  <div class="section">
    <h2>Satellite Analysis</h2>
    <p><span class="label">Data Source:</span> <span class="value">${data.dataSource || '—'}</span></p>
    <p><span class="label">Mean NDVI:</span> <span class="value">${(data.meanNdvi || 0).toFixed(3)}</span></p>
    <p><span class="label">Health Score:</span> <span class="value">${data.healthScore || '—'}%</span></p>
  </div>
  
  ${data.mlLabel ? `
  <div class="section">
    <h2>AI/ML Analysis</h2>
    <p><span class="label">Stress Classification:</span> <span class="value">${data.mlLabel}</span></p>
    <p><span class="label">Confidence:</span> <span class="value">${(data.mlConfidence * 100)?.toFixed(0) || '—'}%</span></p>
  </div>
  ` : ''}
  
  <div class="section">
    <h2>Recommendations</h2>
    <p>${data.advice ? data.advice.replace(/<[^>]+>/g, '') : 'No recommendations available.'}</p>
  </div>
  
  <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
</body>
</html>`;
  }

  // ─── Public API ───
  return {
    exportPDFReport,
    exportCSV,
    exportGeoJSON,
    exportChartImage: exportChartImage,
    exportExcel,
    exportKML,
    exportPDFFallback
  };
})();

if (typeof window !== 'undefined') {
  window.FH_EXPORT = FH_EXPORT;
}
