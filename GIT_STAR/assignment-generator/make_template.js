const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TableOfContents,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, ImageRun, TabStopType, TabStopPosition,
  UnderlineType
} = require('docx');
const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────
const FONT = 'Times New Roman';
const FONT_MONO = 'Courier New';
const PAGE_W = 11906; // A4 width DXA
const PAGE_H = 16838; // A4 height DXA
const MARGIN = 1080;  // ~0.75 inch
const CONTENT_W = PAGE_W - MARGIN * 2; // 9746

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const thBorder = { style: BorderStyle.SINGLE, size: 6, color: 'FFFFFF' };
const thBorders = { top: thBorder, bottom: thBorder, left: thBorder, right: thBorder };

function sp(n) { return new Paragraph({ children: [new TextRun({ text: '', size: n * 2 })] }); }

function h(text, level, opts = {}) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, font: FONT, bold: true, ...opts })],
    spacing: { before: 200, after: 120 },
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

function formulaBox(text) {
  const border = { style: BorderStyle.SINGLE, size: 8, color: '2C3E7A' };
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_MONO, size: 20, bold: true, color: '1a1a4e' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    indent: { left: 400, right: 400 },
    border: {
      top: border, bottom: border, left: border, right: border
    },
    shading: { fill: 'EEF0FF', type: ShadingType.CLEAR },
  });
}

function noteBox(text) {
  return new Paragraph({
    children: [new TextRun({ text: '📌 Note: ' + text, font: FONT, size: 20, italics: true, color: '5a3e00' })],
    spacing: { before: 80, after: 80 },
    indent: { left: 400, right: 400 },
    shading: { fill: 'FFFBEB', type: ShadingType.CLEAR },
    border: {
      left: { style: BorderStyle.THICK, size: 12, color: 'F59E0B' },
    }
  });
}

function gisBox(label, text) {
  return [
    new Paragraph({
      children: [new TextRun({ text: '🌍 GIS/RS Example — ' + label, font: FONT, size: 19, bold: true, color: '16532a' })],
      spacing: { before: 80, after: 40 },
      indent: { left: 360, right: 360 },
      shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.THICK, size: 12, color: '22C55E' } }
    }),
    new Paragraph({
      children: [new TextRun({ text, font: FONT, size: 20, color: '1a3a2a' })],
      spacing: { before: 0, after: 80 },
      indent: { left: 360, right: 360 },
      shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.THICK, size: 12, color: '22C55E' } },
      alignment: AlignmentType.JUSTIFIED,
    }),
  ];
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          borders: thBorders,
          shading: { fill: '2C3E7A', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, font: FONT, size: 20, bold: true, color: 'FFFFFF' })]
          })]
        }))
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((cell, ci) => new TableCell({
          width: { size: colWidths[ci], type: WidthType.DXA },
          borders: cellBorders,
          shading: { fill: ri % 2 === 0 ? 'F5F6FF' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: cell, font: FONT, size: 20 })]
          })]
        }))
      }))
    ]
  });
}

// ── Cover page helper paragraphs ──────────────────────────────────────────────
function centeredRun(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, font: FONT, ...opts })],
    spacing: { before: opts.before || 0, after: opts.after || 0 },
  });
}

// ── Logo image ────────────────────────────────────────────────────────────────
const logoData = fs.readFileSync(path.join(__dirname, 'shuats_logo.png'));

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '\u25C6',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    }]
  },
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: '2C3E7A' },
        paragraph: {
          spacing: { before: 280, after: 140 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2C3E7A', space: 4 } }
        }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: '1a3a6a' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: '34495e' },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 }
      },
    ]
  },

  // ── SECTION 1: Cover Page ────────────────────────────────────────────────
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
        }
      },
      children: [
        // University logo
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 100 },
          children: [new ImageRun({
            type: 'jpg',
            data: logoData,
            transformation: { width: 90, height: 94 },
            altText: { title: 'SHUATS Logo', description: 'SHUATS Logo', name: 'shuats_logo' }
          })]
        }),

        centeredRun('SAM HIGGINBOTTOM UNIVERSITY OF AGRICULTURE,', { size: 22, bold: true, color: '1a1a4e', after: 0 }),
        centeredRun('TECHNOLOGY AND SCIENCES', { size: 22, bold: true, color: '1a1a4e', after: 0 }),
        centeredRun('SHUATS, Prayagraj - 211007, Uttar Pradesh, India', { size: 20, color: '1a1a4e', after: 80 }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2C3E7A', space: 4 } },
          children: [new TextRun({ text: '', font: FONT })]
        }),
        sp(6),

        centeredRun('M.Sc. GIS & REMOTE SENSING (SEMESTER-II)', { size: 22, bold: true, color: '2C3E7A', after: 80 }),

        centeredRun('Course: MAS 744 \u2014 Geospatial Statistics- II', { size: 22, bold: true, color: '1a1a4e', after: 80 }),

        // Big assignment title
        centeredRun('SPATIAL AUTOCORRELATION', { size: 32, bold: true, color: '2C3E7A', before: 120, after: 0 }),
        centeredRun('& POINT PATTERN ANALYSIS', { size: 32, bold: true, color: '2C3E7A', before: 0, after: 160 }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 160 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '9ca3af', space: 4 } },
          children: [new TextRun({ text: '', font: FONT })]
        }),

        // Submitted by / to table
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [CONTENT_W / 2, CONTENT_W / 2],
          rows: [
            new TableRow({
              children: [
                // SUBMITTED BY
                new TableCell({
                  borders: noBorders,
                  width: { size: CONTENT_W / 2, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'SUBMITTED BY:', font: FONT, size: 22, bold: true, underline: { type: UnderlineType.SINGLE }, color: '2C3E7A' })], spacing: { before: 0, after: 80 } }),
                    new Paragraph({ children: [new TextRun({ text: 'N. Akshit Vinay', font: FONT, size: 22, bold: true })], spacing: { before: 0, after: 40 } }),
                    new Paragraph({ children: [new TextRun({ text: 'PID: 25MSRSGIS001', font: FONT, size: 22 })], spacing: { before: 0, after: 40 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Program: M.Sc. GIS & Remote Sensing', font: FONT, size: 22 })], spacing: { before: 0, after: 40 } }),
                  ]
                }),
                // SUBMITTED TO
                new TableCell({
                  borders: noBorders,
                  width: { size: CONTENT_W / 2, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'SUBMITTED TO:', font: FONT, size: 22, bold: true, underline: { type: UnderlineType.SINGLE }, color: '2C3E7A' })], spacing: { before: 0, after: 80 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Ms. Arpita Esther', font: FONT, size: 22, bold: true })], spacing: { before: 0, after: 40 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Dept. of Mathematics & Statistics', font: FONT, size: 22 })], spacing: { before: 0, after: 40 } }),
                  ]
                }),
              ]
            })
          ]
        }),

        sp(8),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          border: { top: { style: BorderStyle.SINGLE, size: 8, color: '2C3E7A', space: 4 } },
          children: [new TextRun({ text: '', font: FONT })]
        }),
      ]
    },

    // ── SECTION 2: TOC + Content (with headers/footers) ──────────────────────
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: 1080, right: MARGIN, bottom: 1080, left: MARGIN }
        }
      },

      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'MAS 744 \u2014 Geospatial Statistics- II', font: FONT, size: 18, color: '2C3E7A', bold: true }),
                new TextRun({ text: '    \u00B7    SHUATS, Prayagraj', font: FONT, size: 18, color: '6b6b9a' }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A', space: 2 } },
              spacing: { before: 0, after: 80 },
            })
          ]
        })
      },

      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'N. Akshit Vinay  \u00B7  25MSRSGIS001', font: FONT, size: 18, color: '6b6b9a' }),
                new TextRun({ text: '\t', font: FONT }),
                new TextRun({ text: 'Spatial Autocorrelation & Point Pattern Analysis', font: FONT, size: 18, italics: true, color: '6b6b9a' }),
                new TextRun({ text: '\t', font: FONT }),
                new TextRun({ text: 'Page ', font: FONT, size: 18, color: '6b6b9a' }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '2C3E7A', bold: true }),
              ],
              tabStops: [
                { type: TabStopType.CENTER, position: CONTENT_W / 2 },
                { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
              ],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: '2C3E7A', space: 2 } },
              spacing: { before: 80, after: 0 },
            })
          ]
        })
      },

      children: [
        // ── TABLE OF CONTENTS ───────────────────────────────────────────────
        new TableOfContents('TABLE OF CONTENTS', {
          hyperlink: true,
          headingStyleRange: '1-3',
          stylesWithLevels: [
            { styleName: 'Heading 1', level: 1 },
            { styleName: 'Heading 2', level: 2 },
            { styleName: 'Heading 3', level: 3 },
          ]
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════════
        // TOPIC 1
        // ══════════════════════════════════════════════════════════════════════
        h('TOPIC 1: SPATIAL AUTOCORRELATION, MORAN\'S I & GETIS-ORD Gi*', HeadingLevel.HEADING_1),

        h('1.1  Spatial Autocorrelation', HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body('Spatial Autocorrelation is a measure that tells us whether geographic features (like villages, rainfall stations, or land cover patches) that are close to each other are more similar or more different compared to features that are far apart. In simple words, it answers: Are nearby things similar to each other?'),
        body('This concept is based on the First Law of Geography by Waldo Tobler (1970):'),
        noteBox('"Everything is related to everything else, but near things are more related than distant things." \u2014 Waldo Tobler, 1970'),
        sp(4),

        h('Types of Spatial Autocorrelation', HeadingLevel.HEADING_3),
        makeTable(
          ['Type', 'Meaning & Explanation'],
          [
            ['Positive Autocorrelation', 'Similar values found near each other. Example: High rainfall areas surrounded by other high rainfall areas. Most common pattern in nature.'],
            ['No Autocorrelation (Random)', 'Values scattered randomly with no spatial pattern. Example: Random distribution of soil sample values with no grouping.'],
            ['Negative Autocorrelation', 'Dissimilar values next to each other (checkerboard). Example: High crop yield areas surrounded by low yield areas due to soil variation.'],
          ],
          [3500, 6246]
        ),
        sp(6),

        h('Why is Spatial Autocorrelation Important in GIS?', HeadingLevel.HEADING_3),
        bullet('It tells us whether a spatial pattern is random or structured.'),
        bullet('It helps choose the right statistical method for analysis.'),
        bullet('Standard statistics assume data independence; ignoring spatial dependence gives wrong results.'),
        bullet('It is the foundation for hotspot analysis, cluster detection, and spatial regression.'),
        sp(4),
        ...gisBox('Remote Sensing Application', 'When mapping Land Surface Temperature (LST) using MODIS or Landsat satellite data, nearby pixels tend to have similar temperatures — a classic example of Positive Spatial Autocorrelation. Urban Heat Islands show strong positive autocorrelation: hot pixels cluster with other hot pixels.'),
        sp(6),

        // 1.2
        h('1.2  Moran\'s I \u2014 The Core Measure of Spatial Autocorrelation', HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body('Moran\'s I is the most widely used statistical measure to quantify spatial autocorrelation. It was developed by Patrick Alfred Pierce Moran in 1950. It gives a single number summarising whether values are clustered, dispersed, or random \u2014 think of it as a "correlation coefficient for space."'),

        h('Formula of Moran\'s I', HeadingLevel.HEADING_3),
        formulaBox('I = (N / W) \u00D7 [ \u03A3i \u03A3j wij (xi \u2013 x\u0305)(xj \u2013 x\u0305) ] / [ \u03A3i (xi \u2013 x\u0305)\u00B2 ]'),
        sp(4),

        h('Explanation of Each Part', HeadingLevel.HEADING_3),
        makeTable(
          ['Symbol', 'Meaning'],
          [
            ['I', "Moran\u2019s I value (the result / output)"],
            ['N', 'Total number of spatial units or locations (districts, pixels, polygons, etc.)'],
            ['W', 'Sum of all spatial weights (wij) across all pairs of locations'],
            ['wij', 'Spatial weight between location i and j (1 = neighbors, 0 = not)'],
            ['xi', 'Value of the variable at location i (e.g., NDVI, rainfall, temperature)'],
            ['xj', 'Value of the variable at location j (the neighboring location)'],
            ['x\u0305 (x-bar)', 'Mean (average) value of the variable across all locations'],
            ['(xi\u2013x\u0305)(xj\u2013x\u0305)', 'Numerator: measures how neighboring locations deviate from the mean together'],
            ['\u03A3i (xi\u2013x\u0305)\u00B2', 'Denominator: total variance of values, used to normalize the result'],
          ],
          [2400, 7346]
        ),
        sp(6),

        h("How to Interpret Moran\u2019s I Value", HeadingLevel.HEADING_3),
        makeTable(
          ["Moran\u2019s I Value", 'Interpretation', 'GIS/RS Example'],
          [
            ['Close to +1', 'Strong Positive Autocorrelation (Clustering)', 'NDVI values cluster \u2014 forests near forests; bare land near bare land'],
            ['Close to 0', 'No Autocorrelation (Random Pattern)', 'Randomly distributed soil pH values in a field with no spatial pattern'],
            ['Close to \u22121', 'Strong Negative Autocorrelation (Dispersion)', 'Checkerboard of high/low crop yield in a mixed agriculture zone'],
          ],
          [2200, 4000, 3546]
        ),
        sp(6),

        h("Steps to Calculate Moran\u2019s I", HeadingLevel.HEADING_3),
        bullet('Collect spatial data for your study area (e.g., rainfall values for 10 districts).'),
        bullet('Calculate the mean (x\u0305) of all values.'),
        bullet('Create a Spatial Weights Matrix (W): define which locations are neighbors (wij = 1).'),
        bullet('Calculate the deviations (xi \u2013 x\u0305) for each location.'),
        bullet('Multiply deviations of each pair of neighbors and sum them (numerator).'),
        bullet('Calculate total variance (denominator).'),
        bullet('Apply the Moran\u2019s I formula to get the result.'),
        bullet('Test statistical significance using Z-score and p-value.'),
        sp(4),

        h("Statistical Testing of Moran\u2019s I", HeadingLevel.HEADING_3),
        formulaBox('Z-score = (I \u2013 E[I]) / \u221AVar[I]'),
        makeTable(
          ['Term', 'Meaning'],
          [
            ['E[I]', 'Expected value of Moran\u2019s I under randomness = \u22121/(N\u22121)'],
            ['Var[I]', 'Variance of Moran\u2019s I under the null hypothesis'],
            ['p-value < 0.05', 'The pattern is statistically significant (not random)'],
            ['p-value > 0.05', 'Cannot confirm the pattern; it may be random'],
          ],
          [3000, 6746]
        ),
        sp(4),
        noteBox("Moran\u2019s I is a GLOBAL statistic. It gives one value for the entire study area. It tells you THAT clustering exists but NOT WHERE it exists. For local-level detection, use Getis-Ord Gi*."),
        sp(4),
        ...gisBox('NDVI Cluster Analysis Using Moran\u2019s I', 'A researcher uses Landsat 8 imagery to calculate NDVI for 50 sub-districts. After computing Moran\u2019s I = +0.78 with p-value < 0.01, there is strong, statistically significant positive spatial autocorrelation \u2014 districts with high NDVI cluster together (dense forest zones) and low-NDVI districts also cluster (degraded/urban areas). This result guides conservation planning.'),
        sp(6),

        // 1.3
        h('1.3  Getis-Ord Gi* \u2014 Local Hotspot Analysis', HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body('The Getis-Ord Gi* statistic (pronounced "Gee-I-Star") is a LOCAL spatial statistic that identifies specific locations which are statistically significant hotspots or coldspots. Unlike Moran\u2019s I, Gi* gives a separate result (Z-score and p-value) for EVERY SINGLE location. It was developed by Getis and Ord in 1992 and is widely used in crime mapping, public health, disaster management, and environmental studies.'),

        h('Formula of Getis-Ord Gi*', HeadingLevel.HEADING_3),
        formulaBox('Gi* = [ \u03A3j wij xj \u2013 x\u0305 \u03A3j wij ] / [ S \u221A{ (N \u03A3j wij\u00B2 \u2013 (\u03A3j wij)\u00B2) / (N\u20131) } ]'),
        sp(4),

        makeTable(
          ['Symbol', 'Meaning'],
          [
            ['Gi*', 'The Gi* score for each individual location i (output value)'],
            ['wij', 'Spatial weight between location i and j (1 = neighbor, 0 = not)'],
            ['xj', 'Value of the attribute at neighboring location j'],
            ['x\u0305 (x-bar)', 'Global mean of the attribute across all locations'],
            ['N', 'Total number of spatial units in the study area'],
            ['S', 'Standard deviation of the attribute values'],
            ['\u03A3j wij', 'Sum of all spatial weights for location i (number of neighbors)'],
            ['\u03A3j wij\u00B2', 'Sum of squared spatial weights for location i'],
          ],
          [2400, 7346]
        ),
        sp(6),

        h('How to Interpret Gi* Results', HeadingLevel.HEADING_3),
        makeTable(
          ['Gi* Z-score', 'Type', 'What It Means'],
          [
            ['High Positive Z + p < 0.05', 'HOTSPOT', 'Location and its neighbors all have unusually HIGH values. Significant cluster of high values.'],
            ['High Negative Z + p < 0.05', 'COLDSPOT', 'Location and its neighbors all have unusually LOW values. Significant cluster of low values.'],
            ['Z near 0 + p > 0.05', 'NOT SIGNIFICANT', 'Pattern at this location is random. Cannot be called a hotspot or coldspot.'],
          ],
          [2800, 2000, 4946]
        ),
        sp(6),

        h('Confidence Levels in Gi* Mapping', HeadingLevel.HEADING_3),
        makeTable(
          ['Confidence Level', 'What It Means'],
          [
            ['99% (p < 0.01)', 'Very strong evidence of hotspot/coldspot. Only 1% chance the pattern is random.'],
            ['95% (p < 0.05)', 'Standard scientific threshold. Strong evidence. 5% chance of false detection.'],
            ['90% (p < 0.10)', 'Moderate evidence. Used in exploratory analysis only.'],
            ['Not Significant (p > 0.10)', 'Grey on map. No meaningful spatial pattern. Do NOT report as a cluster.'],
          ],
          [3500, 6246]
        ),
        sp(6),

        h("Key Difference: Moran\u2019s I vs. Gi*", HeadingLevel.HEADING_3),
        makeTable(
          ['Feature', "Moran\u2019s I", 'Gi*'],
          [
            ['Scale', 'GLOBAL \u2014 one result for whole area', 'LOCAL \u2014 result per location'],
            ['Output', 'Single index value', 'Z-score and p-value per location'],
            ['Purpose', 'Detects IF clustering exists', 'Detects WHERE hotspots/coldspots are'],
            ['Use in GIS', 'First-level check for spatial pattern', 'Detailed hotspot mapping for decision-making'],
          ],
          [2500, 3600, 3646]
        ),
        sp(6),
        ...gisBox('Flood Risk Hotspot Detection', 'A GIS analyst applies Gi* to rainfall data from 200 weather stations across a river basin. Results show a cluster of extremely high rainfall (hotspot) in the northern hilly zone at 99% confidence and a coldspot in the southern plains. Disaster management teams pre-position rescue resources in the northern zone before flooding occurs \u2014 saving lives through data-driven response.'),
        sp(6),
        ...gisBox('Land Surface Temperature Hotspot Mapping', 'Using MODIS satellite data, researchers apply Gi* to LST values per pixel. Statistically significant hotspots (red zones) appear over dense concrete areas (city centres, industrial zones), and coldspots (blue zones) over parks and water bodies. This Urban Heat Island mapping supports city planners in designing green corridors.'),
        sp(6),

        h('Summary of Topic 1 \u2014 Key Points', HeadingLevel.HEADING_2),
        bullet("Spatial autocorrelation measures similarity between neighboring locations based on Tobler\u2019s First Law."),
        bullet('Positive autocorrelation = clustering; Negative = dispersion; Zero = random.'),
        bullet("Moran\u2019s I is a GLOBAL statistic ranging from \u22121 to +1. High positive value = strong clustering."),
        bullet('The formula uses N (count), W (weights), deviations from mean, and total variance.'),
        bullet('Statistical significance is checked using Z-score and p-value (p < 0.05 = significant).'),
        bullet('Gi* is a LOCAL statistic that identifies exact hotspot and coldspot locations.'),
        bullet('Gi* gives a Z-score per location; high positive Z = hotspot, high negative Z = coldspot.'),
        bullet('Confidence levels: 90%, 95%, 99% \u2014 the higher, the stronger the evidence.'),
        bullet('In ArcGIS Pro or QGIS, Spatial Autocorrelation and Hotspot Analysis tools implement these methods directly.'),
        sp(6),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════════
        // TOPIC 2
        // ══════════════════════════════════════════════════════════════════════
        h('TOPIC 2: POINT PATTERN ANALYSIS & HOTSPOT DETECTION', HeadingLevel.HEADING_1),

        h('2.1  Point Pattern Analysis', HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body('Point Pattern Analysis (PPA) is a set of statistical methods used to examine the spatial distribution of discrete point locations. It studies whether a set of points (disease cases, tree locations, crime events, earthquake epicenters) are arranged in a RANDOM, CLUSTERED, or DISPERSED pattern across a geographic area.'),
        body('In PPA, the point location itself is the data \u2014 we only care about WHERE the points are, not what attribute values are attached to them.'),
        sp(4),

        h('Three Types of Spatial Point Patterns', HeadingLevel.HEADING_3),
        makeTable(
          ['Pattern Type', 'Description', 'Real-World GIS Example'],
          [
            ['Random', 'Points scattered with no specific order. No point attracts or repels another. The null hypothesis (CSR \u2014 Complete Spatial Randomness).', 'Random placement of lightning strike locations across flat terrain.'],
            ['Clustered', 'Points group together in specific areas, suggesting an underlying process or driver. Most common pattern in nature and human geography.', 'Disease cases clustering near a contaminated water source; fire hotspots in dry forest regions.'],
            ['Dispersed (Regular)', 'Points more evenly spaced than random. They actively avoid each other. Suggests competition or deliberate planning.', 'Mobile phone towers placed at regular distances; well locations deliberately spaced in a field.'],
          ],
          [2000, 4000, 3746]
        ),
        sp(4),

        noteBox('If analysis shows significant departure from CSR, it means the spatial pattern is NOT random and a real geographic process is causing the clustering or dispersion.'),
        sp(6),

        h('2.2  Method 1: Nearest Neighbour Analysis (NNA)', HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body('Nearest Neighbour Analysis (NNA) is the simplest and most widely used method for point pattern analysis. It measures the average distance from each point to its nearest neighboring point and compares this to the expected distance if the points were randomly distributed (CSR).'),

        h('Formula: Nearest Neighbour Ratio (NNR)', HeadingLevel.HEADING_3),
        formulaBox('NNR = d(obs) / d(exp)    where    d(exp) = 0.5 / \u221A(n/A)'),
        sp(4),

        makeTable(
          ['Symbol', 'Meaning'],
          [
            ['NNR', 'Nearest Neighbour Ratio \u2014 final result indicating pattern type'],
            ['d(obs)', 'Observed mean nearest-neighbour distance'],
            ['d(exp)', 'Expected mean nearest-neighbour distance under CSR'],
            ['n', 'Total number of points in the study area'],
            ['A', 'Total area of the study region (same units as distance)'],
            ['0.5', 'Constant used in the theoretical CSR calculation'],
          ],
          [2400, 7346]
        ),
        sp(6),

        h('Interpretation of NNR', HeadingLevel.HEADING_3),
        makeTable(
          ['NNR Value', 'Pattern', 'Meaning'],
          [
            ['NNR < 1', 'CLUSTERED', 'Observed distances are SHORTER than expected. Points are closer together than random.'],
            ['NNR = 1', 'RANDOM (CSR)', 'Observed distances match expected. No spatial structure detected.'],
            ['NNR > 1', 'DISPERSED', 'Observed distances are LONGER than expected. Points more spread out than random.'],
            ['NNR = 2.15 (max)', 'PERFECTLY DISPERSED', 'Maximum theoretical value. Perfect hexagonal spacing like ideal cell tower placement.'],
          ],
          [2200, 2000, 5546]
        ),
        sp(4),

        h('Statistical Significance Test for NNR', HeadingLevel.HEADING_3),
        formulaBox('Z = (d(obs) \u2013 d(exp)) / SE     where SE = 0.26136 / \u221A(n\u00B2/A)'),
        bullet('If |Z| > 1.96 and p-value < 0.05, the pattern is statistically significant.'),
        bullet('With small sample sizes, always check significance before concluding.'),
        sp(4),

        h('Limitations of NNA', HeadingLevel.HEADING_3),
        bullet('NNA only measures the pattern at ONE scale (single nearest neighbor). It misses multi-scale patterns.'),
        bullet("It only uses each point\u2019s NEAREST neighbor, ignoring all other neighbors."),
        bullet('Sensitive to the boundary of the study area (edge effects).'),
        bullet('Cannot detect if something is clustered at small scale but dispersed at a larger scale.'),
        sp(4),

        ...gisBox('Tree Location Analysis using NNA', 'A forest ecologist maps GPS locations of 500 trees using field survey. NNA in QGIS gives NNR = 0.42, Z = \u22128.7, p < 0.001 \u2014 trees are SIGNIFICANTLY CLUSTERED. This is explained by seed dispersal patterns where parent trees drop seeds nearby, creating natural clusters. This information guides forest management decisions.'),
        sp(6),

        h("2.3  Method 2: Ripley\u2019s K Function", HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body("Ripley\u2019s K function is an advanced multi-scale point pattern analysis method. Instead of only looking at the nearest neighbor distance, it counts how many points fall within successively larger circle radii around each point. This allows detection of clustering or dispersion at MULTIPLE spatial scales simultaneously. Developed by Brian Ripley in 1976."),

        h("Formula of Ripley\u2019s K Function", HeadingLevel.HEADING_3),
        formulaBox('K(r) = (A / n\u00B2) \u00D7 \u03A3i \u03A3j (1 / wij) \u00D7 I(dij < r)     for i \u2260 j'),
        sp(4),

        makeTable(
          ['Symbol', 'Meaning'],
          [
            ['K(r)', 'K function value at distance r (output: pattern at radius r)'],
            ['A', 'Total area of the study region'],
            ['n', 'Total number of points'],
            ['n\u00B2', 'All possible pairs of points in the dataset'],
            ['wij', 'Edge correction weight (corrects for boundary effects)'],
            ['I(dij < r)', 'Indicator function: equals 1 if distance between i and j is less than r; 0 otherwise'],
            ['r', 'The radius distance being tested (varies from small to large)'],
            ['dij', 'Distance between point i and point j'],
          ],
          [2400, 7346]
        ),
        sp(6),

        h('The L Function \u2014 Standardized Version of K', HeadingLevel.HEADING_3),
        formulaBox('L(r) = \u221A[K(r) / \u03C0] \u2013 r'),
        makeTable(
          ['L(r) Value', 'Pattern Interpretation'],
          [
            ['L(r) > 0 (above CSR envelope)', 'CLUSTERING at that distance scale. More points than expected within radius r.'],
            ['L(r) = 0 (on CSR line)', 'RANDOM pattern at that scale. Same number of points as expected under CSR.'],
            ['L(r) < 0 (below CSR envelope)', 'DISPERSION at that scale. Fewer points than expected within radius r.'],
          ],
          [4000, 5746]
        ),
        sp(4),

        h("Advantage of Ripley\u2019s K over NNA", HeadingLevel.HEADING_3),
        makeTable(
          ['Feature', 'NNA', "Ripley\u2019s K"],
          [
            ['Scale Analysis', 'ONE scale only (nearest neighbor)', 'MULTIPLE scales from 0 to max distance'],
            ['Pattern Detail', 'Single ratio (NNR)', 'Full curve showing how pattern changes with distance'],
            ['Detection Power', 'Misses multi-scale patterns', 'Detects clustering at local scale AND dispersion at regional scale simultaneously'],
            ['Complexity', 'Simple to calculate manually', 'Requires GIS software (QGIS, ArcGIS, R)'],
          ],
          [2500, 3500, 3746]
        ),
        sp(4),

        ...gisBox("Malaria Case Distribution using Ripley\u2019s K", 'A public health researcher maps 300 malaria case GPS locations. Ripley\u2019s K in ArcGIS Pro shows the L-function rises above the CSR envelope at 0\u20132 km, then drops back to CSR at 5 km. Malaria cases are CLUSTERED at village scale but randomly distributed at larger scales. This means health interventions should focus at the village cluster level, not the entire district.'),
        sp(6),

        h('2.4  Hotspot Detection \u2014 Kernel Density Estimation (KDE)', HeadingLevel.HEADING_2),
        h('Definition', HeadingLevel.HEADING_3),
        body('Kernel Density Estimation (KDE) is a hotspot detection method that creates a continuous smooth surface (raster) from point data, showing where points are most densely concentrated. KDE spreads the influence of each point outward as a smooth kernel (usually bell-shaped) and sums contributions at every location to create a density map. Widely used in crime analysis, wildlife ecology, accident mapping, and disease surveillance.'),

        h('Formula of KDE', HeadingLevel.HEADING_3),
        formulaBox('f(x) = (1 / n\u00D7h) \u00D7 \u03A3 K((x \u2013 xi) / h)'),
        sp(4),

        makeTable(
          ['Symbol', 'Meaning'],
          [
            ['f(x)', 'Estimated density value at location x (the hotspot surface value)'],
            ['n', 'Total number of points in the dataset'],
            ['h', 'Bandwidth (search radius) \u2014 controls how far influence of each point spreads'],
            ['K(\u22C5)', 'Kernel function \u2014 mathematical shape of how influence decreases with distance (Gaussian/normal bell curve)'],
            ['xi', 'Location of the ith data point'],
            ['x \u2013 xi', 'Distance from point xi to the estimation location x'],
            ['\u03A3', 'Sum across all n points'],
          ],
          [2400, 7346]
        ),
        sp(4),

        h('The Role of Bandwidth (h)', HeadingLevel.HEADING_3),
        makeTable(
          ['Bandwidth Setting', 'Effect on Output'],
          [
            ['Small Bandwidth (h small)', 'Very localised, bumpy surface. Captures fine details and small clusters. Risk of over-fitting.'],
            ['Large Bandwidth (h large)', 'Very smooth, generalised surface. Shows broad regional patterns. Risk of over-smoothing.'],
            ['Optimal Bandwidth', "Balance between detail and smoothness. Often selected using cross-validation or Silverman\u2019s rule of thumb."],
          ],
          [3500, 6246]
        ),
        sp(4),
        noteBox('There is no single correct bandwidth. Try multiple values and compare results. The optimal bandwidth depends on data density, study area size, and research question.'),
        sp(6),

        h('Comparison of Hotspot Detection Methods', HeadingLevel.HEADING_3),
        makeTable(
          ['Feature', 'Gi* (Getis-Ord)', 'KDE', 'NNA'],
          [
            ['Output Type', 'Z-scores + p-values per location', 'Continuous density raster surface', 'Single NNR ratio + Z-score'],
            ['Statistical Test', 'Yes (statistically rigorous)', 'No (visual/exploratory)', 'Yes (Z-score based)'],
            ['Input Data', 'Polygon/point attributes', 'Point locations only', 'Point locations only'],
            ['Best Use', 'Crime, disease, disaster cluster detection', 'Visual hotspot mapping, wildlife, accident density', 'Quick test for clustering vs. random'],
            ['GIS Tool', 'ArcGIS Hotspot Analysis', 'ArcGIS/QGIS Kernel Density tool', 'ArcGIS/QGIS NNA tool'],
          ],
          [2000, 2600, 2600, 2546]
        ),
        sp(6),

        ...gisBox('Crime Hotspot Mapping using KDE', 'A police department applies KDE to 1,200 theft GPS locations in ArcGIS Pro with a 500-meter bandwidth. The density raster shows three clear hotspot zones near commercial markets and bus stands. After 3 months of targeted intervention, theft incidents in hotspot zones reduced by 35%.'),
        sp(6),

        h('2.5  Complete Workflow: Point Pattern Analysis in GIS', HeadingLevel.HEADING_2),
        bullet('Collect Point Data: GPS survey (Survey123, QField), digitising from maps, or extracting from satellite imagery.'),
        bullet('Load into GIS: Import CSV/shapefile of point locations into ArcGIS Pro or QGIS.'),
        bullet('Define Study Area: Set the boundary polygon for the analysis region.'),
        bullet('Conduct NNA: Run Nearest Neighbour Analysis to get NNR and check pattern type.'),
        bullet("Apply Ripley\u2019s K: Multi-scale analysis to see at which distances clustering occurs."),
        bullet('Run KDE: Apply Kernel Density to create a visual density surface showing hotspot zones.'),
        bullet('Apply Gi* Analysis: For statistically rigorous hotspot detection with confidence levels.'),
        bullet('Validate Results: Check output against ground truth, field knowledge, and other spatial layers.'),
        bullet('Map & Report: Create hotspot maps with proper legend, scale bar, north arrow, and interpretation.'),
        sp(6),

        h('Summary of Topic 2 \u2014 Key Points', HeadingLevel.HEADING_2),
        bullet('Point Pattern Analysis examines if point distributions are Random, Clustered, or Dispersed.'),
        bullet('The null hypothesis is CSR \u2014 Complete Spatial Randomness (Poisson process).'),
        bullet('NNA measures average nearest-neighbour distance and computes NNR = d(obs)/d(exp).'),
        bullet('NNR < 1 = Clustered; NNR = 1 = Random; NNR > 1 = Dispersed.'),
        bullet('Always test NNR with Z-score and p-value for statistical significance.'),
        bullet("Ripley\u2019s K is multi-scale; L(r) > 0 = clustering, L(r) < 0 = dispersion at distance r."),
        bullet('KDE creates a smooth density surface. Bandwidth (h) is the critical parameter.'),
        bullet('Gi* gives statistically tested hotspots/coldspots per location with confidence levels.'),
        bullet("GIS practice workflow: NNA \u2192 Ripley\u2019s K \u2192 KDE \u2192 Gi* for decision-making."),
        sp(8),

        new Paragraph({ children: [new PageBreak()] }),

        // ══════════════════════════════════════════════════════════════════════
        // QUICK REFERENCE FORMULAS
        // ══════════════════════════════════════════════════════════════════════
        h('QUICK REFERENCE: All Formulas at a Glance', HeadingLevel.HEADING_1),
        makeTable(
          ['Method', 'Formula', 'Key Output'],
          [
            ["Moran\u2019s I", "I = (N/W) \u00D7 [\u03A3\u03A3 wij(xi-x\u0305)(xj-x\u0305)] / [\u03A3(xi-x\u0305)\u00B2]", 'Global index: \u22121 to +1'],
            ['Gi* (Z-score)', 'Gi* = [\u03A3wij xj \u2013 x\u0305\u03A3wij] / [S\u221A{(N\u03A3wij\u00B2\u2013(\u03A3wij)\u00B2)/(N-1)}]', 'Local Z-score per location'],
            ['NNR (NNA)', 'NNR = d(obs)/d(exp)   d(exp) = 0.5/\u221A(n/A)', 'Ratio: <1 cluster, >1 dispersed'],
            ["Ripley\u2019s L", 'L(r) = \u221A[K(r)/\u03C0] \u2013 r', 'Curve: >0 cluster, <0 dispersed'],
            ['KDE', 'f(x) = (1/n\u00D7h) \u00D7 \u03A3K((x-xi)/h)', 'Density raster surface'],
            ['Z (Moran\u2019s I)', 'Z = (I \u2013 E[I]) / \u221AVar[I]', 'Significance test score'],
            ['Z (NNA)', 'Z = (d(obs) \u2013 d(exp)) / SE   SE = 0.26136/\u221A(n\u00B2/A)', 'Significance test score'],
          ],
          [2400, 5400, 1946]
        ),
        sp(8),

        // End of assignment
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 8, color: '2C3E7A', space: 6 },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: '2C3E7A', space: 6 },
          },
          children: [
            new TextRun({ text: '\u2014\u2014\u2014  ', font: FONT, size: 22, color: '9ca3af' }),
            new TextRun({ text: 'End of Assignment', font: FONT, size: 22, bold: true, italics: true, color: '2C3E7A' }),
            new TextRun({ text: '  \u2014\u2014\u2014', font: FONT, size: 22, color: '9ca3af' }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({ text: 'MAS 744 \u2014 Geospatial Statistics- II  \u00B7  SHUATS, Prayagraj  \u00B7  2026', font: FONT, size: 18, color: '6b6b9a', italics: true })
          ]
        }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(path.join(__dirname, 'demo_assign.docx'), buffer);
  console.log('demo_assign.docx created successfully');
}).catch(err => {
  console.error('Error creating docx:', err);
  process.exit(1);
});
