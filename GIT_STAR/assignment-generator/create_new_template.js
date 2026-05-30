const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, TableOfContents,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// ── Configuration ──
const FONT = 'Times New Roman';
const PAGE_W = 11906; // A4 width
const PAGE_H = 16838; // A4 height
const MARGIN = 1080;  // ~0.75 inch
const CONTENT_W = PAGE_W - MARGIN * 2;

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Helper Functions ──
function sp(n) { 
  return new Paragraph({ 
    children: [new TextRun({ text: '', size: n * 2 })] 
  }); 
}

function centerPara(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, ...opts })],
    alignment: AlignmentType.CENTER,
    spacing: { before: opts.before || 60, after: opts.after || 60 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 22, ...opts })],
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
    spacing: { before: 40, after: 40 },
  });
}

function h(text, level, opts = {}) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, font: FONT, bold: true, ...opts })],
    spacing: { before: 200, after: 120 },
  });
}

function formulaBox(text) {
  const border = { style: BorderStyle.SINGLE, size: 8, color: '2C3E7A' };
  return new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 20, bold: true, color: '1a1a4e' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    indent: { left: 400, right: 400 },
    border: { top: border, bottom: border, left: border, right: border },
    shading: { fill: 'EEF0FF', type: ShadingType.CLEAR },
  });
}

function noteBox(text) {
  return new Paragraph({
    children: [new TextRun({ text: '* ' + text, font: FONT, size: 20, italics: true, color: '5a3e00' })],
    spacing: { before: 80, after: 80 },
    indent: { left: 400, right: 400 },
    shading: { fill: 'FFFBEB', type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.THICK, size: 12, color: 'F59E0B' } }
  });
}

function makeTable(headers, rows, colWidths) {
  const headerCells = headers.map((h, i) => new TableCell({
    width: { size: colWidths[i], type: WidthType.DXA },
    shading: { fill: '2C3E7A', type: ShadingType.CLEAR },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text: h, font: FONT, size: 20, bold: true, color: 'FFFFFF' })],
      alignment: AlignmentType.CENTER,
    })],
  }));

  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.DXA },
      borders: { 
        top: { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A' },
      },
      shading: { fill: 'F8F9FF', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: cell, font: FONT, size: 20 })],
        alignment: AlignmentType.LEFT,
      })],
    })),
  }));

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headerCells }),
      ...dataRows
    ],
  });
}

// ── Build Document ──
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, font: FONT },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 28, bold: true, font: FONT },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    children: [
      // ────────────────────────────────────────────────────────────────
      // COVER PAGE (Updated Format)
      // ────────────────────────────────────────────────────────────────
      
      sp(4),
      centerPara('SAM HIGGINBOTTOM UNIVERSITY OF AGRICULTURE, TECHNOLOGY AND SCIENCES', 
        { size: 26, bold: true, before: 100, after: 60 }),
      
      centerPara('SHUATS, Prayagraj - 211007, Uttar Pradesh, India', 
        { size: 22, before: 60, after: 100 }),
      
      sp(2),
      centerPara('M.Sc. GIS & REMOTE SENSING (SEMESTER-II)', 
        { size: 24, bold: true, before: 100, after: 60 }),
      
      sp(1),
      centerPara('Course: MAS 744 — Geospatial Statistics- II', 
        { size: 22, before: 60, after: 100 }),
      
      sp(3),
      centerPara('SPATIAL AUTOCORRELATION & POINT PATTERN ANALYSIS', 
        { size: 28, bold: true, before: 200, after: 200 }),
      
      sp(4),
      
      // Submission table
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W / 2, CONTENT_W / 2],
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: CONTENT_W / 2, type: WidthType.DXA },
                borders: noBorders,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'SUBMITTED BY:', font: FONT, size: 22, bold: true })],
                    spacing: { before: 0, after: 80 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'N. Akshit Vinay', font: FONT, size: 22 })],
                    spacing: { before: 40, after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'PID: 25MSRSGIS001', font: FONT, size: 22 })],
                    spacing: { before: 40, after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'Program: M.Sc. GIS & Remote Sensing', font: FONT, size: 22 })],
                    spacing: { before: 40, after: 40 },
                  }),
                ],
              }),
              new TableCell({
                width: { size: CONTENT_W / 2, type: WidthType.DXA },
                borders: noBorders,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'SUBMITTED TO:', font: FONT, size: 22, bold: true })],
                    spacing: { before: 0, after: 80 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'Mis. Arpita Esther', font: FONT, size: 22 })],
                    spacing: { before: 40, after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: 'Dept. of Mathematics & Statistics', font: FONT, size: 22 })],
                    spacing: { before: 40, after: 40 },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      
      new Paragraph({ children: [new PageBreak()] }),
      
      // ────────────────────────────────────────────────────────────────
      // TABLE OF CONTENTS (Quick Reference removed)
      // ────────────────────────────────────────────────────────────────
      
      new Paragraph({
        children: [new TextRun({ text: 'Table of Contents', font: FONT, size: 28, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }),
      
      new TableOfContents('Summary', {
        hyperlink: true,
        headingStyleRange: '1-2',
      }),
      
      new Paragraph({ children: [new PageBreak()] }),
      
      // ────────────────────────────────────────────────────────────────
      // CHAPTER 1: SPATIAL AUTOCORRELATION
      // ────────────────────────────────────────────────────────────────
      
      h('SPATIAL AUTOCORRELATION', HeadingLevel.HEADING_1),
      
      h('1.1 What is Spatial Autocorrelation?', HeadingLevel.HEADING_2),
      
      bullet('It measures whether similar values cluster together in space.'),
      bullet('Tobler\'s First Law: "Everything is related to everything else, but near things are more related than distant things."'),
      bullet('Example: Disease hotspots — high prevalence areas tend to be near other high prevalence areas.'),
      
      sp(1),
      
      h('1.2 The Dataset: 10×10 Grid', HeadingLevel.HEADING_2),
      
      bullet('Study Area: 100 grid cells (10 rows × 10 columns)'),
      bullet('Variable: Disease prevalence (%)'),
      bullet('Pattern: One hotspot centered at cell (3,3) with values decreasing outward'),
      bullet('Why this pattern?: Simulated using a Gaussian (bell curve) decay from the center + random noise'),
      
      sp(1),
      body('Key Data Points to Remember:', { bold: true }),
      bullet('Hotspot center (3,3): 81.65%'),
      bullet('Corner cell (0,0): 28.40%'),
      bullet('Mean prevalence across all cells: ~13.91%'),
      
      sp(1),
      body('Figure 1: Simulated disease prevalence on a 10x10 grid with a clear hotspot centered at (3,3).', { italics: true }),
      
      sp(2),
      
      h('1.3 Spatial Weights Matrix (W)', HeadingLevel.HEADING_2),
      
      bullet('A table showing which cells are "neighbors" of each other'),
      bullet('Queen Contiguity Rule: Two cells are neighbors if they share an edge OR a corner (up to 8 neighbors)'),
      
      sp(1),
      body('Types of Cells:', { bold: true }),
      sp(1),
      
      makeTable(
        ['Cell Location', 'Number of Neighbors', 'Example'],
        [
          ['Interior cells', '8', 'Cell (4,4)'],
          ['Edge cells (not corners)', '5', 'Cell (0,4)'],
          ['Corner cells', '3', 'Cell (0,0)'],
        ],
        [CONTENT_W * 0.4, CONTENT_W * 0.3, CONTENT_W * 0.3]
      ),
      
      sp(1),
      body('Important Number to Remember:', { bold: true }),
      bullet('S₀ = 684: total neighbor connections in the entire grid'),
      body('This number is used in ALL global statistics.'),
      
      sp(1),
      body('Row-Standardization:', { bold: true }),
      bullet('Rule: Each neighbor gets equal weight = 1 ÷ (number of neighbors)'),
      bullet('Interior cell: weight = 1/8 = 0.125'),
      bullet('Corner cell: weight = 1/3 = 0.333'),
      
      noteBox('Corner cells have fewer neighbors, so each neighbor matters more. This creates "edge effects."'),
      
      sp(2),
      
      h('1.4 Global Moran\'s I', HeadingLevel.HEADING_2),
      
      body('Whether the entire map shows clustering, dispersion, or randomness.'),
      
      sp(1),
      body('Formula (simplified):', { bold: true }),
      formulaBox('I = (N/S₀) · Σᵢ Σⱼ wᵢⱼ(xᵢ - x̄)(xⱼ - x̄) / Σᵢ(xᵢ - x̄)²'),
      
      sp(1),
      body('In Plain:', { bold: true }),
      bullet('Numerator: how much neighbors vary together'),
      bullet('Denominator: total variation in the data'),
      bullet('If neighbors are similar: Positive I (clustering)'),
      bullet('If neighbors are different: Negative I (dispersion)'),
      
      sp(1),
      body('Results from Assignment:', { bold: true }),
      sp(1),
      
      makeTable(
        ['Statistic', 'Value', 'Meaning'],
        [
          ['Observed I', '0.360', 'Positive clustering'],
          ['Expected I', '-0.010', 'Value if random'],
          ['Z-score', '7.13', 'Highly significant'],
          ['p-value', '1.03 × 10⁻¹²', 'Reject randomness'],
        ],
        [CONTENT_W * 0.35, CONTENT_W * 0.3, CONTENT_W * 0.35]
      ),
      
      noteBox('Z > 1.96 means significant at 95% confidence. Our Z = 7.13 is extremely significant!'),
      
      sp(1),
      body('Moran Scatterplot:', { bold: true }),
      bullet('X-axis: Prevalence at each cell (standardized)'),
      bullet('Y-axis: Average prevalence of neighbors'),
      bullet('Slope of the line: Moran\'s I value (~0.36)'),
      bullet('Most points in: upper-right (high-high) and lower-left (low-low) = clustering'),
      
      sp(1),
      body('Figure 2: Moran scatterplot showing positive spatial autocorrelation (clustering).', { italics: true }),
      
      sp(2),
      
      h('1.5 Global Geary\'s C', HeadingLevel.HEADING_2),
      
      body('Global Geary\'s C states: Another way to measure spatial autocorrelation, but focuses on differences between neighbors (not deviations from mean).'),
      
      sp(1),
      body('Formula:', { bold: true }),
      formulaBox('C = (N-1)/(2·S₀) · Σᵢ Σⱼ wᵢⱼ(xᵢ - xⱼ)² / Σᵢ(xᵢ - x̄)²'),
      
      sp(1),
      body('Key Difference from Moran\'s I:', { bold: true }),
      sp(1),
      
      makeTable(
        ['Feature', 'Moran\'s I', 'Geary\'s C'],
        [
          ['Focus', 'Deviations from mean', 'Differences between neighbors'],
          ['Range', '-1 to +1', '0 to 2'],
          ['Expected under randomness', '-1/(N-1) ≈ -0.01', '1.0'],
          ['Positive autocorrelation', 'I > Expected', 'C < 1.0'],
          ['Negative autocorrelation', 'I < Expected', 'C > 1.0'],
        ],
        [CONTENT_W * 0.4, CONTENT_W * 0.3, CONTENT_W * 0.3]
      ),
      
      sp(1),
      body('Results from Assignment:', { bold: true }),
      sp(1),
      
      makeTable(
        ['Statistic', 'Value', 'Meaning'],
        [
          ['Observed C', '0.670', '< 1.0 = positive clustering'],
          ['Expected C', '1.000', 'Random baseline'],
          ['Z-score', '-6.35', 'Highly significant'],
          ['p-value', '1.12 × 10⁻¹⁰', 'Strong clustering'],
        ],
        [CONTENT_W * 0.35, CONTENT_W * 0.3, CONTENT_W * 0.35]
      ),
      
      noteBox('C < 1 always means clustering. C > 1 means dispersion. The further from 1, the stronger the pattern.'),
      
      sp(2),
      
      h('1.6 Local Indicators of Spatial Association (LISA)', HeadingLevel.HEADING_2),
      
      body('LISA tells: Global statistics give one number for the whole map. LISA tells you which specific cells are part of clusters.'),
      
      sp(1),
      body('Local Moran\'s I Formula:', { bold: true }),
      formulaBox('Iᵢ = zᵢ/m₂ · Σⱼ wᵢⱼ·zⱼ'),
      
      sp(1),
      body('Where:', { bold: true, italics: true }),
      bullet('z_i = x_i - x̄ (deviation from mean)'),
      bullet('m_2 = variance'),
      bullet('Σw_ij·z_j = spatial lag (average of neighbors)'),
      
      sp(1),
      body('Four Cluster Types (QUADRANTS):', { bold: true }),
      sp(1),
      
      makeTable(
        ['Type', 'Name', 'Meaning', 'Example in Data'],
        [
          ['HH', 'High-High', 'High value surrounded by high values', 'Hotspot center (3,3)'],
          ['LL', 'Low-Low', 'Low value surrounded by low values', 'Grid corners/edges'],
          ['HL', 'High-Low', 'High value surrounded by low values', 'Outlier'],
          ['LH', 'Low-High', 'Low value surrounded by high values', 'Outlier'],
        ],
        [CONTENT_W * 0.15, CONTENT_W * 0.25, CONTENT_W * 0.35, CONTENT_W * 0.25]
      ),
      
      sp(1),
      body('Example Calculation for Cell (3,3):', { bold: true }),
      bullet('Value = 81.65%, Mean: 13.91%'),
      bullet('z_i: 81.65 - 13.91 = 67.74'),
      bullet('Neighbors range: 55% to 75%'),
      bullet('Spatial lag: ≈ 52.40'),
      bullet('I_i: (67.74 / 335.80) × 52.40 = 10.57 → HH Cluster'),
      
      noteBox('LISA uses FDR (False Discovery Rate) correction because testing 100 cells creates many chances for false positives.'),
      
      sp(1),
      body('Figure 3: LISA Cluster map highlighting the High-High hotspot and Low-Low coldspots.', { italics: true }),
      
      new Paragraph({ children: [new PageBreak()] }),
      
      // ────────────────────────────────────────────────────────────────
      // CHAPTER 2: POINT PATTERN ANALYSIS
      // ────────────────────────────────────────────────────────────────
      
      h('CHAPTER 2: POINT PATTERN ANALYSIS', HeadingLevel.HEADING_1),
      
      h('2.1 Getis-Ord Gi* Hotspot Detection', HeadingLevel.HEADING_2),
      
      body('What is Gi*?', { bold: true }),
      bullet('Identifies hotspots (clusters of high values) and coldspots (clusters of low values)'),
      bullet('Key difference from LISA: Gi* includes the cell itself (w_ii = 1), so it finds pure hotspots, NOT outliers'),
      
      sp(1),
      formulaBox('Gi* = [Σⱼ wᵢⱼxⱼ - X̄ Σⱼ wᵢⱼ] / S√[NΣⱼwᵢⱼ² - (Σⱼwᵢⱼ)²] / (N-1)'),
      
      sp(1),
      body('Z-Score Interpretation:', { bold: true }),
      sp(1),
      
      makeTable(
        ['Gi* Z-Score', 'Meaning', 'Confidence'],
        [
          ['> +1.96', 'Hotspot', '95%'],
          ['> +2.58', 'Strong Hotspot', '99%'],
          ['< -1.96', 'Coldspot', '95%'],
          ['< -2.58', 'Strong Coldspot', '99%'],
        ],
        [CONTENT_W * 0.35, CONTENT_W * 0.35, CONTENT_W * 0.3]
      ),
      
      sp(1),
      body('Example for Cell (3,3):', { bold: true }),
      bullet('Local sum: ≈ 538.5%'),
      bullet('Expected sum: 13.91 × 9 = 125.2%'),
      bullet('Gi*: +7.74 → Extremely significant hotspot (99.9% confidence)'),
      
      sp(1),
      body('Example for Cell (0,0):', { bold: true }),
      bullet('Gi*: ≈ -2.48 → Significant coldspot'),
      
      sp(2),
      
      h('2.2 Point Pattern Types', HeadingLevel.HEADING_2),
      
      body('Three basic patterns for discrete points:'),
      sp(1),
      
      makeTable(
        ['Pattern', 'Description', 'Cause', 'NNI Value'],
        [
          ['Clustered', 'Points grouped together', 'Shared resource, attraction', '< 1'],
          ['Random', 'No pattern', 'Independent events', '= 1'],
          ['Regular', 'Evenly spaced', 'Competition, repulsion', '> 1'],
        ],
        [CONTENT_W * 0.25, CONTENT_W * 0.3, CONTENT_W * 0.3, CONTENT_W * 0.15]
      ),
      
      sp(2),
      
      h('2.3 Nearest Neighbour Index (NNI)', HeadingLevel.HEADING_2),
      
      body('Formula:', { bold: true }),
      formulaBox('NNI = d_obs / d_exp'),
      
      sp(1),
      body('Where:', { bold: true, italics: true }),
      bullet('d_obs = average distance to nearest neighbor'),
      bullet('d_exp = expected distance if random'),
      bullet('ρ = n/A = point density'),
      bullet('n = 80 points'),
      bullet('A = 100 units²'),
      
      sp(1),
      body('Calculation Steps:', { bold: true }),
      bullet('1. Density: ρ = 80/100 = 0.8'),
      bullet('2. Expected distance: d_exp = 0.5 / √0.8 = 0.559'),
      bullet('3. Observed distance: d_obs = 0.312'),
      bullet('4. NNI: 0.312 / 0.559 = 0.558'),
      bullet('5. Z-score: ≈ -7.56'),
      
      sp(1),
      body('Conclusion: NNI < 1 → Significantly clustered pattern.', { bold: true }),
      
      noteBox('NNI is a "first-order" statistic — it only looks at the closest neighbor. Use Ripley\'s K for multiple scales.'),
      
      sp(2),
      
      h('2.4 Kernel Density Estimation (KDE)', HeadingLevel.HEADING_2),
      
      body('Purpose: Converts discrete points into a smooth, continuous surface showing where points are concentrated.', { bold: true }),
      
      sp(1),
      body('Gaussian KDE Formula:', { bold: true }),
      formulaBox('f(x) = 1/(n·h) Σᵢ K((x-xᵢ)/h)'),
      
      sp(1),
      body('Key Parameter (Bandwidth h):', { bold: true }),
      bullet('Small h: sharp peaks (shows detail but noisy)'),
      bullet('Large h: smooth surface (hides local patterns)'),
      bullet('This study: uses h = 1.5 units'),
      
      sp(1),
      body('Result: Density surface peaks at the bottom-left hotspot, matching the prevalence cluster.', { bold: true }),
      
      sp(1),
      body('Figure 4: Kernel Density Estimation surface showing continuous hotspot concentration.', { italics: true }),
      
      sp(2),
      
      h('2.5 Ripley\'s K and Besag\'s L-Function', HeadingLevel.HEADING_2),
      
      body('NNI only checks one distance. Ripley\'s K checks all distances (multi-scale analysis).'),
      
      sp(1),
      body('Formulas:', { bold: true }),
      formulaBox('K(r) = A/n² · Σᵢ Σⱼ≠ᵢ wᵢⱼ·I(dᵢⱼ≤r)'),
      sp(1),
      formulaBox('L(r) = √[K(r)/π] - r'),
      
      sp(1),
      body('Interpretation of L(r):', { bold: true }),
      sp(1),
      
      makeTable(
        ['L(r) Value', 'Meaning'],
        [
          ['L(r) = 0', 'Complete Spatial Randomness'],
          ['L(r) > 0', 'Clustering at distance r'],
          ['L(r) < 0', 'Dispersion at distance r'],
        ],
        [CONTENT_W * 0.4, CONTENT_W * 0.6]
      ),
      
      sp(1),
      body('Results from Assignment:', { bold: true }),
      bullet('At r = 1.0: L(r) = +0.42 → Significant small-scale clustering'),
      bullet('At r = 2.5: L(r) = +1.28 (peak) → Main clustering scale'),
      bullet('At r > 4.0: Still above envelope → Global clustering pattern'),
      
      noteBox('The peak at r = 2.5 tells us the hotspot is about 2.5 units wide. Edge correction (w_ij) is needed because circles near boundaries are cut off.'),
      
      sp(1),
      body('Figure 5: Besag\'s L(r) function showing significant multi-scale clustering peaking at r = 2.5', { italics: true }),
      
      new Paragraph({ children: [new PageBreak()] }),
      
      // ────────────────────────────────────────────────────────────────
      // KEY DEFINITIONS (replaces Quick Reference)
      // ────────────────────────────────────────────────────────────────
      
      h('KEY DEFINITIONS', HeadingLevel.HEADING_1),
      
      sp(1),
      
      makeTable(
        ['Term', 'Simple Definition'],
        [
          ['Spatial Autocorrelation', 'Correlation of a variable with itself across space'],
          ['Queen Contiguity', 'Neighbors share edge OR corner (up to 8)'],
          ['Rook Contiguity', 'Neighbors share only edge (up to 4)'],
          ['Spatial Lag', 'Weighted average of neighbor values'],
          ['Row-Standardization', 'Dividing weights so each row sums to 1'],
          ['Hotspot', 'Statistically significant cluster of high values'],
          ['Coldspot', 'Statistically significant cluster of low values'],
          ['LISA', 'Local Indicator of Spatial Association'],
          ['FDR Correction', 'Adjusts p-values for multiple testing'],
        ],
        [CONTENT_W * 0.4, CONTENT_W * 0.6]
      ),
    ],
  }],
});

// ── Save ──
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('demo_assign.docx', buffer);
  console.log('✅ Created demo_assign.docx');
});
