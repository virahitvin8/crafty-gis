using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;
using M = DocumentFormat.OpenXml.Math;

namespace SpatialAssignmentBuilder
{
    class Program
    {
        // Color palette - Premium Academic
        static string Navy = "0D233A";       // Deeper Navy
        static string Blue = "1D4E89";       // Richer Blue
        static string Green = "1B603D";      // Deeper Green
        static string Purple = "4A2A7A";     // Deeper Purple
        static string Dark = "111827";       // Deep Charcoal for body text
        static string Mid = "4B5563";        // Gray for captions/subtitles
        static string Light = "D1D5DB";      // Light gray for borders
        static string Border = "E5E7EB";     // Table border color
        static string TableHeaderBg = "F3F4F6"; // Soft gray-blue background
        static string CalloutBg = "EFF6FF";  // Light blue for callouts

        // Academic Annotation Colors
        static string Red = "9B2C2C";         // Crimson Red for definitions and hypotheses
        static string DeepBlue = "2B6CB0";    // Deep Blue for math notation and variables
        static string RoyalPurple = "6B46C1";  // Royal Purple for geographic theories
        static string ForestGreen = "2F855A";  // Forest Green for empirical results and stats
        static string BurntOrange = "C05621";  // Burnt Orange for limitations and edge effects

        // A4 Dimensions in Twips
        const int A4W = 11906;
        const int A4H = 16838;
        // A4 Dimensions in EMU for full-page graphics
        const long A4WE = 7560000L;
        const long A4HE = 10692000L;

        static int bookmarkId = 0;

        static void Main(string[] args)
        {
            string currentDir = Directory.GetCurrentDirectory();
            string rootDir = currentDir;
            if (!Directory.Exists(Path.Combine(currentDir, "assignment_images")) && Directory.Exists(Path.Combine(currentDir, "..", "assignment_images")))
            {
                rootDir = Path.GetFullPath(Path.Combine(currentDir, ".."));
            }
            string outputPath = args.Length > 0 ? args[0] : Path.Combine(rootDir, "Spatial_Autocorrelation_Assignment.docx");
            string studentName = args.Length > 1 ? args[1] : "N. Akshit Vinay";
            string studentPid = args.Length > 2 ? args[2] : "25MSRSGIS001";
            string studentRollNo = args.Length > 3 ? args[3] : "";
            string imagesDir = Path.Combine(rootDir, "assignment_images");

            Console.WriteLine($"Building document to: {outputPath}");

            using (var doc = WordprocessingDocument.Create(outputPath, WordprocessingDocumentType.Document))
            {
                var mainPart = doc.AddMainDocumentPart();
                mainPart.Document = new Document(new Body());
                var body = mainPart.Document.Body!;

                // Initialize document parts
                AddStyles(mainPart);
                AddNumbering(mainPart);

                uint docPrId = 10;

                // Add Cover Page (Section 1)
                AddCoverPage(body, mainPart, imagesDir, ref docPrId, studentName, studentPid, studentRollNo);

                // Add TOC Page (Section 2)
                AddTocPage(body);

                // Add Interactive Workflow Navigator (Section 3)
                AddInteractiveWorkflowNavigator(body);

                // Add Content (Section 4)
                AddContentSections(doc, body, mainPart, imagesDir, ref docPrId);

                // Force update TOC field codes on document open
                SetUpdateFieldsOnOpen(mainPart);

                doc.Save();
            }

            Console.WriteLine("Document generation complete!");
        }

        // ========================================================================
        // Document Part Setup
        // ========================================================================
        static void AddStyles(MainDocumentPart mainPart)
        {
            var stylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
            stylesPart.Styles = new Styles();

            // Normal Style (Body text)
            stylesPart.Styles.Append(new Style(
                new StyleName { Val = "Normal" },
                new StyleParagraphProperties(
                    new SpacingBetweenLines { After = "120", Line = "280", LineRule = LineSpacingRuleValues.Auto }),
                new StyleRunProperties(
                    new RunFonts { Ascii = "Times New Roman", HighAnsi = "Times New Roman" },
                    new Color { Val = Dark },
                    new FontSize { Val = "22" }) // 11pt
            ) { Type = StyleValues.Paragraph, StyleId = "Normal", Default = true });

            // Headings
            stylesPart.Styles.Append(CreateHeadingStyle("Heading1", "heading 1", 0, "32", Navy, "400", "120"));
            stylesPart.Styles.Append(CreateHeadingStyle("Heading2", "heading 2", 1, "26", Blue, "240", "80"));
            stylesPart.Styles.Append(CreateHeadingStyle("Heading3", "heading 3", 2, "22", Purple, "160", "60"));
            
            // Caption Style
            stylesPart.Styles.Append(new Style(
                new StyleName { Val = "Caption" }, new BasedOn { Val = "Normal" },
                new StyleParagraphProperties(
                    new SpacingBetweenLines { Before = "80", After = "240" },
                    new Justification { Val = JustificationValues.Center }),
                new StyleRunProperties(
                    new Italic(),
                    new Color { Val = Mid },
                    new FontSize { Val = "19" }) // 9.5pt
            ) { Type = StyleValues.Paragraph, StyleId = "Caption" });

            // TOC Styles
            stylesPart.Styles.Append(CreateTocStyle("TOC1", "toc 1", true, "0", "180"));
            stylesPart.Styles.Append(CreateTocStyle("TOC2", "toc 2", false, "360", "40"));
            stylesPart.Styles.Append(CreateTocStyle("TOC3", "toc 3", false, "720", "20"));
        }

        static Style CreateHeadingStyle(string id, string name, int level, string fontSize, string color, string spaceBefore, string spaceAfter)
        {
            return new Style(
                new StyleName { Val = name }, new BasedOn { Val = "Normal" },
                new StyleParagraphProperties(
                    new KeepNext(), new KeepLines(),
                    new SpacingBetweenLines { Before = spaceBefore, After = spaceAfter },
                    new OutlineLevel { Val = level }),
                new StyleRunProperties(
                    new RunFonts { Ascii = "Times New Roman", HighAnsi = "Times New Roman" },
                    new Bold(),
                    new Color { Val = color },
                    new FontSize { Val = fontSize })
            ) { Type = StyleValues.Paragraph, StyleId = id };
        }

        static Style CreateTocStyle(string id, string name, bool bold, string indent, string before)
        {
            var rpr = new StyleRunProperties();
            if (bold) rpr.Append(new Bold());
            rpr.Append(new Color { Val = bold ? Navy : Dark });
            return new Style(
                new StyleName { Val = name }, new BasedOn { Val = "Normal" },
                new StyleParagraphProperties(
                    new Tabs(new TabStop { Val = TabStopValues.Right, Leader = TabStopLeaderCharValues.Dot, Position = 9350 }),
                    new SpacingBetweenLines { Before = before, After = "40" },
                    new Indentation { Left = indent }),
                rpr
            ) { Type = StyleValues.Paragraph, StyleId = id };
        }

        static void AddNumbering(MainDocumentPart mainPart)
        {
            var numberingPart = mainPart.AddNewPart<NumberingDefinitionsPart>();
            numberingPart.Numbering = new Numbering(
                new AbstractNum(
                    new Level(
                        new NumberingFormat { Val = NumberFormatValues.Decimal },
                        new LevelText { Val = "%1." },
                        new LevelJustification { Val = LevelJustificationValues.Left },
                        new ParagraphProperties(new Indentation { Left = "540", Hanging = "360" })
                    ) { LevelIndex = 0 }
                ) { AbstractNumberId = 1 },
                new NumberingInstance(new AbstractNumId { Val = 1 }) { NumberID = 1 }
            );
        }

        static void SetUpdateFieldsOnOpen(MainDocumentPart mainPart)
        {
            var settingsPart = mainPart.DocumentSettingsPart ?? mainPart.AddNewPart<DocumentSettingsPart>();
            settingsPart.Settings = new Settings(new UpdateFieldsOnOpen { Val = true }, new DisplayBackgroundShape());
        }

        // ========================================================================
        // Cover Page Builder
        // ========================================================================
        static void AddCoverPage(Body body, MainDocumentPart mainPart, string imagesDir, ref uint docPrId, string studentName = "N. Akshit Vinay", string studentPid = "25MSRSGIS001", string studentRollNo = "")
        {
            // Center-aligned, formal layout on white background

            // University Header
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { Before = "360", After = "40" }
                ),
                CreateRun("SAM HIGGINBOTTOM UNIVERSITY OF AGRICULTURE, TECHNOLOGY AND SCIENCES", Navy, bold: true)
            ));

            body.Append(new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { Before = "0", After = "40" }
                ),
                CreateRun("Department of Mathematics and Statistics", Dark, bold: false)
            ));

            body.Append(new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { Before = "0", After = "720" }
                ),
                CreateRun("SHUATS, Prayagraj - 211007, Uttar Pradesh, India", Mid, bold: false)
            ));

            // Centered Logo
            string logoPath = Path.Combine(imagesDir, "..", "shuats_logo.png");
            if (!File.Exists(logoPath))
                logoPath = Path.Combine(Directory.GetCurrentDirectory(), "shuats_logo.png");
            if (!File.Exists(logoPath))
                logoPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "shuats_logo.png");

            if (File.Exists(logoPath))
            {
                AddInlineImage(body, mainPart, logoPath, "SHUATS Logo", ref docPrId, 4); // 4cm wide
            }
            else
            {
                Console.Error.WriteLine("WARNING: shuats_logo.png not found!");
            }

            // Space before Title
            body.Append(new Paragraph(new ParagraphProperties(new SpacingBetweenLines { Before = "1200" }), new Run()));

            // Course Details
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { After = "120" }
                ),
                CreateRun("M.Sc. GIS & REMOTE SENSING (SEMESTER-II)", Blue, bold: true)
            ));

            body.Append(new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { After = "720" }
                ),
                CreateRun("Course: Advanced Spatial Statistics & GIS Analysis", Mid, bold: false)
            ));

            // Main Title
            var pTitle = new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { After = "120" }
                ),
                CreateRun("SPATIAL AUTOCORRELATION &\nPOINT PATTERN ANALYSIS", Navy, bold: true)
            );
            var rTitle = (Run)pTitle.Elements<Run>().First();
            rTitle.RunProperties!.FontSize = new FontSize { Val = "44" };
            body.Append(pTitle);

            body.Append(new Paragraph(
                new ParagraphProperties(
                    new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { After = "2160" } // push details down
                ),
                CreateRun("A Comprehensive Academic Assignment on Grid-Based & Continuous Point Process Modeling", ForestGreen, bold: false, italic: true)
            ));

            // Student/Faculty Details Table (2-column, borderless)
            var tblDetails = new Table();
            tblDetails.Append(new TableProperties(
                new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct },
                new TableBorders(
                    new TopBorder { Val = BorderValues.Nil },
                    new LeftBorder { Val = BorderValues.Nil },
                    new BottomBorder { Val = BorderValues.Nil },
                    new RightBorder { Val = BorderValues.Nil },
                    new InsideHorizontalBorder { Val = BorderValues.Nil },
                    new InsideVerticalBorder { Val = BorderValues.Nil })));

            tblDetails.Append(new TableGrid(
                new GridColumn { Width = "5000" },
                new GridColumn { Width = "5000" }
            ));

            var row = new TableRow();

            // Left Cell (Submitted By)
            var cellLeft = new TableCell();
            cellLeft.Append(new TableCellProperties(new TableCellWidth { Width = "5000", Type = TableWidthUnitValues.Pct }));
            cellLeft.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Left }), CreateRun("SUBMITTED BY:", Navy, bold: true)));
            cellLeft.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Left }), CreateRun($"Name: {studentName}", Dark)));
            cellLeft.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Left }), CreateRun($"PID: {studentPid}", Dark)));
            if (!string.IsNullOrEmpty(studentRollNo)) {
                cellLeft.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Left }), CreateRun($"Roll No: {studentRollNo}", Dark)));
            }
            cellLeft.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Left }), CreateRun("Program: M.Sc. GIS & Remote Sensing", Dark)));
            row.Append(cellLeft);

            // Right Cell (Submitted To)
            var cellRight = new TableCell();
            cellRight.Append(new TableCellProperties(new TableCellWidth { Width = "5000", Type = TableWidthUnitValues.Pct }));
            cellRight.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Right }), CreateRun("SUBMITTED TO:", Navy, bold: true)));
            cellRight.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Right }), CreateRun("Instructor: Mrs. Arpita Esther", Dark)));
            cellRight.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Right }), CreateRun("Assistant Professor", Dark)));
            cellRight.Append(new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Right }), CreateRun("Dept. of Mathematics & Statistics", Dark)));
            row.Append(cellRight);

            tblDetails.Append(row);
            body.Append(tblDetails);

            // Section Break to TOC Page
            body.Append(new Paragraph(new ParagraphProperties(new SectionProperties(
                new SectionType { Val = SectionMarkValues.NextPage },
                new PageSize { Width = (UInt32Value)(uint)A4W, Height = (UInt32Value)(uint)A4H },
                new PageMargin { Top = 1440, Right = 1440, Bottom = 1440, Left = 1440, Header = 720, Footer = 720 },
                new TitlePage()))));
        }

        // =========================================================================
        // TOC & Navigation Builder
        // ========================================================================
        static void AddTocPage(Body body)
        {
            body.Append(CreateHeading1("Table of Contents", "_TocPageHeader"));

            body.Append(new Paragraph(
                new ParagraphProperties(new SpacingBetweenLines { After = "240" }),
                new Run(
                    new RunProperties(new Italic(), new Color { Val = Mid }, new FontSize { Val = "20" }),
                    new Text("Right-click below and select 'Update Field' to refresh page numbers dynamically."))));

            // Begin TOC field code block
            body.Append(new Paragraph(
                new Run(new FieldChar { FieldCharType = FieldCharValues.Begin }),
                new Run(new FieldCode(" TOC \\o \"1-3\" \\h \\z \\u ") { Space = SpaceProcessingModeValues.Preserve }),
                new Run(new FieldChar { FieldCharType = FieldCharValues.Separate })));

            // Dynamic TOC Placeholders matching actual sections 1:1
            string[,] tocItems = {
                { "1. SPATIAL AUTOCORRELATION: MORAN'S I & GEARY'S C", "1", "Sec1" },
                { "   1.1 Spatial Data & Study Area Representation", "2", "Sec1.1" },
                { "      1.1.1 Data Generation Methodology", "3", "Sec1.1.1" },
                { "      1.1.2 Choropleth Map of Prevalence", "3", "Sec1.1.2" },
                { "      1.1.3 Data Table (First 10 Rows)", "3", "Sec1.1.3" },
                { "   1.2 Spatial Weights Matrix Construction", "2", "Sec1.2" },
                { "      1.2.1 Queen Contiguity Definition", "3", "Sec1.2.1" },
                { "      1.2.2 Matrix Properties", "3", "Sec1.2.2" },
                { "      1.2.3 Visualisation", "3", "Sec1.2.3" },
                { "      1.2.4 Alternative Weight Specifications", "3", "Sec1.2.4" },
                { "   1.3 Global Moran's I Statistic", "2", "Sec1.3" },
                { "      1.3.1 Mathematical Formulation", "3", "Sec1.3.1" },
                { "      1.3.2 Interpretation Guide", "3", "Sec1.3.2" },
                { "      1.3.3 Computational Results", "3", "Sec1.3.3" },
                { "      1.3.4 Moran Scatterplot Analysis", "3", "Sec1.3.4" },
                { "   1.4 Global Geary's C Statistic", "2", "Sec1.4" },
                { "      1.4.1 Mathematical Formulation", "3", "Sec1.4.1" },
                { "      1.4.2 Interpretation Guide", "3", "Sec1.4.2" },
                { "      1.4.3 Computational Results", "3", "Sec1.4.3" },
                { "      1.4.4 Comparison: Moran's I vs. Geary's C", "3", "Sec1.4.4" },
                { "      1.4.5 Local Geary Index Map", "3", "Sec1.4.5" },
                { "   1.5 Local Indicators of Spatial Association (LISA)", "2", "Sec1.5" },
                { "      1.5.1 Local Moran's I Formula", "3", "Sec1.5.1" },
                { "      1.5.2 Cluster Classification", "3", "Sec1.5.2" },
                { "      1.5.3 LISA Cluster Map", "3", "Sec1.5.3" },
                { "2. POINT PATTERN ANALYSIS AND HOTSPOT DETECTION", "1", "Sec2" },
                { "   2.1 Getis-Ord Gi* Local Hotspot Detection", "2", "Sec2.1" },
                { "      2.1.1 Gi* Formula", "3", "Sec2.1.1" },
                { "      2.1.2 Significance Thresholds", "3", "Sec2.1.2" },
                { "      2.1.3 Hotspot Map", "3", "Sec2.1.3" },
                { "   2.2 Discrete Point Pattern Classifications", "2", "Sec2.2" },
                { "      2.2.1 Pattern Types", "3", "Sec2.2.1" },
                { "      2.2.2 Visual Comparison", "3", "Sec2.2.2" },
                { "   2.3 Nearest Neighbour Index (NNI)", "2", "Sec2.3" },
                { "      2.3.1 NNI Definition & Formula", "3", "Sec2.3.1" },
                { "      2.3.2 Calculations & Interpretation", "3", "Sec2.3.2" },
                { "   2.4 Kernel Density Estimation (KDE) Modeling", "2", "Sec2.4" },
                { "      2.4.1 KDE Surface Generation", "3", "Sec2.4.1" },
                { "      2.4.2 Density Visualisation", "3", "Sec2.4.2" },
                { "   2.5 Ripley's K & Besag's L-Function Multi-Scale Analysis", "2", "Sec2.5" },
                { "      2.5.1 Mathematical Definition", "3", "Sec2.5.1" },
                { "      2.5.2 Multi-Scale Results & Interpretation", "3", "Sec2.5.2" },
                { "      2.5.3 Spatial Analytics Dashboard", "3", "Sec2.5.3" },
                { "3. REFERENCES", "1", "Sec3" },
                { "4. APPENDIX: FORMULAS & DATA MATRIX", "1", "Sec4" },
                { "   4.1 Complete Statistical Formula Summary", "2", "Sec4.1" },
                { "   4.2 Complete 10×10 Grid Prevalence Data Matrix", "2", "Sec4.2" }
            };

            for (int i = 0; i < tocItems.GetLength(0); i++)
            {
                string text = tocItems[i, 0];
                string level = tocItems[i, 1];
                string anchor = tocItems[i, 2];

                body.Append(new Paragraph(
                    new ParagraphProperties(new ParagraphStyleId { Val = $"TOC{level}" }),
                    new Run(new Text(text)),
                    new Run(new TabChar()),
                    new Run(new FieldChar { FieldCharType = FieldCharValues.Begin }),
                    new Run(new FieldCode($" PAGEREF {anchor} \\h ") { Space = SpaceProcessingModeValues.Preserve }),
                    new Run(new FieldChar { FieldCharType = FieldCharValues.Separate }),
                    new Run(new Text("1")),
                    new Run(new FieldChar { FieldCharType = FieldCharValues.End })));
            }

            body.Append(new Paragraph(new Run(new FieldChar { FieldCharType = FieldCharValues.End })));

            // Page Break
            body.Append(new Paragraph(new ParagraphProperties(new SectionProperties(
                new SectionType { Val = SectionMarkValues.NextPage },
                new PageSize { Width = (UInt32Value)(uint)A4W, Height = (UInt32Value)(uint)A4H },
                new PageMargin { Top = 1440, Right = 1440, Bottom = 1440, Left = 1440, Header = 720, Footer = 720 }))));
        }

        static void AddInteractiveWorkflowNavigator(Body body)
        {
            body.Append(CreateHeading1("INTERACTIVE ANALYSIS WORKFLOW", "_WorkflowNavigator"));

            body.Append(CreatePara("This interactive navigator acts as a quick access console for the analysis steps. Click on the button in the third column to navigate directly to the corresponding section within the document."));

            // Interactive Navigator Table
            var table = new Table();
            table.Append(new TableProperties(
                new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct },
                new TableBorders(
                    new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy },
                    new LeftBorder { Val = BorderValues.Nil },
                    new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy },
                    new RightBorder { Val = BorderValues.Nil },
                    new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light },
                    new InsideVerticalBorder { Val = BorderValues.Nil })));

            table.Append(new TableGrid(
                new GridColumn { Width = "1200" },
                new GridColumn { Width = "6300" },
                new GridColumn { Width = "2000" }));

            // Header row
            table.Append(CreateTableRow(true, new string[] { "Step", "Analytical Workflow Component", "Document Navigation Link" }));

            // Data rows with anchors
            string[,] steps = {
                { "Step 1", "Spatial Data & Study Area: Prevalence data generation methodology, choropleth map (Figure 1), and sample matrix.", "Sec1.1" },
                { "Step 2", "Spatial Weights Matrix: Queen contiguity definition, connectivity properties, and network graph (Figure 2).", "Sec1.2" },
                { "Step 3", "Global Moran's I: Formulation, expected values, results, and Moran scatterplot (Figure 3).", "Sec1.3" },
                { "Step 4", "Global Geary's C: Local/global formulations, calculations, comparison table, and Local Geary map (Figure 4).", "Sec1.4" },
                { "Step 5", "Local Indicators of Spatial Association (LISA): Formulation, cluster classifications, and LISA cluster map (Figure 5).", "Sec1.5" },
                { "Step 6", "Getis-Ord Gi* Hotspot Detection: Formulation, z-score significance thresholds, and hotspot map (Figure 6).", "Sec2.1" },
                { "Step 7", "Point Pattern Classifications: Pattern types, visual comparison of Clustered/Random/Regular (Figure 7).", "Sec2.2" },
                { "Step 8", "Nearest Neighbour Index & KDE: NNI formulation, calculations, and KDE density surface (Figure 8).", "Sec2.3" },
                { "Step 9", "Ripley's K & Besag's L-Function: Mathematical definition, multi-scale results (Figure 9), and Integrated Dashboard (Figure 10).", "Sec2.5" }
            };

            for (int i = 0; i < steps.GetLength(0); i++)
            {
                string step = steps[i, 0];
                string desc = steps[i, 1];
                string anchor = steps[i, 2];

                var row = new TableRow();
                
                // Column 1
                row.Append(new TableCell(new Paragraph(
                    new ParagraphProperties(new Justification { Val = JustificationValues.Center }),
                    new Run(new RunProperties(new Bold(), new Color { Val = Navy }), new Text(step)))));
                
                // Column 2
                row.Append(new TableCell(new Paragraph(
                    new Run(new Text(desc)))));

                // Column 3 (Navigation Button)
                var p = new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Center }));
                var link = new Hyperlink(
                    new Run(new RunProperties(new Bold(), new Underline(), new Color { Val = Blue }), new Text("Go to Section ➜"))
                ) { Anchor = anchor };
                p.Append(link);
                row.Append(new TableCell(p));

                table.Append(row);
            }

            body.Append(table);

            // Page Break
            body.Append(new Paragraph(new ParagraphProperties(new SectionProperties(
                new SectionType { Val = SectionMarkValues.NextPage },
                new PageSize { Width = (UInt32Value)(uint)A4W, Height = (UInt32Value)(uint)A4H },
                new PageMargin { Top = 1440, Right = 1440, Bottom = 1440, Left = 1440, Header = 720, Footer = 720 }))));
        }

        // ========================================================================
        // Main Content Builder
        // ========================================================================
        static void AddContentSections(WordprocessingDocument doc, Body body, MainDocumentPart mainPart, string imagesDir, ref uint docPrId)
        {
            // Create Running Header Part
            var headerPart = mainPart.AddNewPart<HeaderPart>();
            var headerId = mainPart.GetIdOfPart(headerPart);
            headerPart.Header = new Header(
                new Paragraph(
                    new ParagraphProperties(new Justification { Val = JustificationValues.Right }),
                    new Run(new RunProperties(new FontSize { Val = "18" }, new Color { Val = Mid }),
                        new Text("Spatial Autocorrelation & Point Pattern Analysis Assignment"))));

            // Create Running Footer Part (Page X of Y)
            var footerPart = mainPart.AddNewPart<FooterPart>();
            var footerId = mainPart.GetIdOfPart(footerPart);
            var footerPara = new Paragraph(new ParagraphProperties(new Justification { Val = JustificationValues.Center }));
            
            footerPara.Append(new Run(new RunProperties(new FontSize { Val = "18" }, new Color { Val = Mid }), new Text("Page ")));
            footerPara.Append(new Run(new FieldChar { FieldCharType = FieldCharValues.Begin }));
            footerPara.Append(new Run(new FieldCode(" PAGE ") { Space = SpaceProcessingModeValues.Preserve }));
            footerPara.Append(new Run(new FieldChar { FieldCharType = FieldCharValues.Separate }));
            footerPara.Append(new Run(new Text("1")));
            footerPara.Append(new Run(new FieldChar { FieldCharType = FieldCharValues.End }));
            footerPara.Append(new Run(new RunProperties(new FontSize { Val = "18" }, new Color { Val = Mid }), new Text(" of ")));
            footerPara.Append(new Run(new FieldChar { FieldCharType = FieldCharValues.Begin }));
            footerPara.Append(new Run(new FieldCode(" NUMPAGES ") { Space = SpaceProcessingModeValues.Preserve }));
            footerPara.Append(new Run(new FieldChar { FieldCharType = FieldCharValues.Separate }));
            footerPara.Append(new Run(new Text("1")));
            footerPara.Append(new Run(new FieldChar { FieldCharType = FieldCharValues.End }));
            
            footerPart.Footer = new Footer(footerPara);


            body.Append(CreateHeading1("SPATIAL AUTOCORRELATION & POINT PATTERN ANALYSIS", "SecTitle"));
            body.Append(CreatePara(CreateRun("Simplified Study Guide for Examination", Navy, italic: true)));

            // --------------------------------------------------------------------
            // CHAPTER 1: SPATIAL AUTOCORRELATION
            // --------------------------------------------------------------------
            body.Append(CreateHeading1("CHAPTER 1: SPATIAL AUTOCORRELATION", "Sec1"));

            body.Append(CreateHeading2("1.1 What is Spatial Autocorrelation?", "Sec1.1"));
            AddBulletItem(body, "Simple Definition", "It measures whether similar values cluster together in space.");
            AddBulletItem(body, "Tobler's First Law", "\"Everything is related to everything else, but near things are more related than distant things.\"");
            AddBulletItem(body, "Example", "Disease hotspots — high prevalence areas tend to be near other high prevalence areas.");

            body.Append(CreateHeading2("1.2 The Dataset: 10×10 Grid", "Sec1.2"));
            AddBulletItem(body, "Study Area", "100 grid cells (10 rows × 10 columns)");
            AddBulletItem(body, "Variable", "Disease prevalence (%)");
            AddBulletItem(body, "Pattern", "One hotspot centered at cell (3,3) with values decreasing outward");
            AddBulletItem(body, "Why this pattern?", "Simulated using a Gaussian (bell curve) decay from the center + random noise");
            body.Append(CreatePara(CreateRun("Key Data Points to Remember:", null, true)));
            AddBulletItem(body, "Hotspot center (3,3)", "81.65%");
            AddBulletItem(body, "Corner cell (0,0)", "28.40%");
            AddBulletItem(body, "Mean prevalence across all cells", "~13.91%");
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "grid_heatmap.png"), "10x10 Grid Heatmap", ref docPrId, 12);
            body.Append(CreateCaption("Figure 1: Simulated disease prevalence on a 10x10 grid with a clear hotspot centered at (3,3)."));

            body.Append(CreateHeading2("1.3 Spatial Weights Matrix (W)", "Sec1.3"));
            body.Append(CreatePara(CreateRun("What is it?", null, true)));
            AddBulletItem(body, "Definition", "A table showing which cells are \"neighbors\" of each other");
            AddBulletItem(body, "Queen Contiguity Rule", "Two cells are neighbors if they share an edge OR a corner (up to 8 neighbors)");

            body.Append(CreatePara(CreateRun("Types of Cells:", null, true)));
            var tblNeighbors = new Table();
            tblNeighbors.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblNeighbors.Append(CreateTableRow(true, false, new string[] { "Cell Location", "Number of Neighbors", "Example" }));
            tblNeighbors.Append(CreateTableRow(false, false, new string[] { "Interior cells", "8", "Cell (4,4)" }));
            tblNeighbors.Append(CreateTableRow(false, true, new string[] { "Edge cells (not corners)", "5", "Cell (0,4)" }));
            tblNeighbors.Append(CreateTableRow(false, false, new string[] { "Corner cells", "3", "Cell (0,0)" }));
            body.Append(tblNeighbors);

            body.Append(CreatePara(CreateRun("Important Number to Remember:", null, true)));
            AddBulletItem(body, "S₀ = 684", "total neighbor connections in the entire grid");
            body.Append(CreatePara("This number is used in ALL global statistics."));

            body.Append(CreatePara(CreateRun("Row-Standardization:", null, true)));
            AddBulletItem(body, "Rule", "Each neighbor gets equal weight = 1 ÷ (number of neighbors)");
            AddBulletItem(body, "Interior cell", "weight = 1/8 = 0.125");
            AddBulletItem(body, "Corner cell", "weight = 1/3 = 0.333");

            body.Append(CreateCalloutBox("Exam Tip: Corner cells have fewer neighbors, so each neighbor matters more. This creates \"edge effects.\""));

            body.Append(CreateHeading2("1.4 Global Moran's I", "Sec1.4"));
            body.Append(CreatePara(CreateRun("What it tells you: ", null, true), CreateRun("Whether the entire map shows clustering, dispersion, or randomness.")));
            body.Append(CreatePara(CreateRun("Formula (simplified):", null, true)));

            // Equation 5: Global Moran's I
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                MathRun("I"),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(MathRun("N")),
                    new M.Denominator(new M.Subscript(new M.Base(MathRun("S")), new M.SubArgument(MathRun("0"))))
                ),
                MathRun("·"),
                new M.Fraction(
                    new M.Numerator(
                        new M.Nary(
                            new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                            new M.SubArgument(MathRun("i=1")),
                            new M.SuperArgument(MathRun("N")),
                            new M.Base(new M.Nary(
                                new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                                new M.SubArgument(MathRun("j=1")),
                                new M.SuperArgument(MathRun("N")),
                                new M.Base(
                                    new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))),
                                    new M.Delimiter(
                                        new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                                        new M.Base(new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("i"))), MathRun("-"), MathRun("x̄"))
                                    ),
                                    new M.Delimiter(
                                        new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                                        new M.Base(new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("j"))), MathRun("-"), MathRun("x̄"))
                                    )
                                )
                            ))
                        )
                    ),
                    new M.Denominator(
                        new M.Nary(
                            new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                            new M.SubArgument(MathRun("i=1")),
                            new M.SuperArgument(MathRun("N")),
                            new M.Base(new M.Superscript(
                                new M.Base(new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }), new M.Base(new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("i"))), MathRun("-"), MathRun("x̄")))),
                                new M.SuperArgument(MathRun("2"))
                            ))
                        )
                    )
                )
            ))));

            body.Append(CreatePara(CreateRun("In Plain English:", null, true)));
            AddBulletItem(body, "Numerator", "how much neighbors vary together");
            AddBulletItem(body, "Denominator", "total variation in the data");
            AddBulletItem(body, "If neighbors are similar", "Positive I (clustering)");
            AddBulletItem(body, "If neighbors are different", "Negative I (dispersion)");

            body.Append(CreatePara(CreateRun("Results from Assignment:", null, true)));
            var tblMoran = new Table();
            tblMoran.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblMoran.Append(CreateTableRow(true, false, new string[] { "Statistic", "Value", "Meaning" }));
            tblMoran.Append(CreateTableRow(false, false, new string[] { "Observed I", "0.360", "Positive clustering" }));
            tblMoran.Append(CreateTableRow(false, true, new string[] { "Expected I", "-0.010", "Value if random" }));
            tblMoran.Append(CreateTableRow(false, false, new string[] { "Z-score", "7.13", "Highly significant" }));
            tblMoran.Append(CreateTableRow(false, true, new string[] { "p-value", "1.03 × 10⁻¹²", "Reject randomness" }));
            body.Append(tblMoran);

            body.Append(CreateCalloutBox("Exam Tip: Z > 1.96 means significant at 95% confidence. Our Z = 7.13 is extremely significant!"));

            body.Append(CreatePara(CreateRun("Moran Scatterplot:", null, true)));
            AddBulletItem(body, "X-axis", "Prevalence at each cell (standardized)");
            AddBulletItem(body, "Y-axis", "Average prevalence of neighbors");
            AddBulletItem(body, "Slope of the line", "Moran's I value (~0.36)");
            AddBulletItem(body, "Most points in", "upper-right (high-high) and lower-left (low-low) = clustering");
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "moran_scatterplot.png"), "Moran Scatterplot", ref docPrId, 12);
            body.Append(CreateCaption("Figure 2: Moran scatterplot showing positive spatial autocorrelation (clustering)."));

            body.Append(CreateHeading2("1.5 Global Geary's C", "Sec1.5"));
            body.Append(CreatePara(CreateRun("What it tells you: ", null, true), CreateRun("Another way to measure spatial autocorrelation, but focuses on differences between neighbors (not deviations from mean).")));
            body.Append(CreatePara(CreateRun("Formula:", null, true)));

            // Equation 8: Geary's C
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                MathRun("C"),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }), new M.Base(MathRun("N"), MathRun("-"), MathRun("1")))),
                    new M.Denominator(MathRun("2"), MathRun("·"), new M.Subscript(new M.Base(MathRun("S")), new M.SubArgument(MathRun("0"))))
                ),
                MathRun("·"),
                new M.Fraction(
                    new M.Numerator(
                        new M.Nary(
                            new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                            new M.SubArgument(MathRun("i=1")),
                            new M.SuperArgument(MathRun("N")),
                            new M.Base(new M.Nary(
                                new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                                new M.SubArgument(MathRun("j=1")),
                                new M.SuperArgument(MathRun("N")),
                                new M.Base(
                                    new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))),
                                    new M.Superscript(
                                        new M.Base(new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }), new M.Base(new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("i"))), MathRun("-"), new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("j")))))),
                                        new M.SuperArgument(MathRun("2"))
                                    )
                                )
                            ))
                        )
                    ),
                    new M.Denominator(
                        new M.Nary(
                            new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                            new M.SubArgument(MathRun("i=1")),
                            new M.SuperArgument(MathRun("N")),
                            new M.Base(
                                new M.Superscript(
                                    new M.Base(new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }), new M.Base(new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("i"))), MathRun("-"), MathRun("x̄")))),
                                    new M.SuperArgument(MathRun("2"))
                                )
                            )
                        )
                    )
                )
            ))));

            body.Append(CreatePara(CreateRun("Key Difference from Moran's I:", null, true)));
            var tblDiff = new Table();
            tblDiff.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblDiff.Append(CreateTableRow(true, false, new string[] { "Feature", "Moran's I", "Geary's C" }));
            tblDiff.Append(CreateTableRow(false, false, new string[] { "Focus", "Deviations from mean", "Differences between neighbors" }));
            tblDiff.Append(CreateTableRow(false, true, new string[] { "Range", "-1 to +1", "0 to 2" }));
            tblDiff.Append(CreateTableRow(false, false, new string[] { "Expected under randomness", "-1/(N-1) ≈ -0.01", "1.0" }));
            tblDiff.Append(CreateTableRow(false, true, new string[] { "Positive autocorrelation", "I > Expected", "C < 1.0" }));
            tblDiff.Append(CreateTableRow(false, false, new string[] { "Negative autocorrelation", "I < Expected", "C > 1.0" }));
            body.Append(tblDiff);

            body.Append(CreatePara(CreateRun("Results from Assignment:", null, true)));
            var tblGeary = new Table();
            tblGeary.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblGeary.Append(CreateTableRow(true, false, new string[] { "Statistic", "Value", "Meaning" }));
            tblGeary.Append(CreateTableRow(false, false, new string[] { "Observed C", "0.670", "< 1.0 = positive clustering" }));
            tblGeary.Append(CreateTableRow(false, true, new string[] { "Expected C", "1.000", "Random baseline" }));
            tblGeary.Append(CreateTableRow(false, false, new string[] { "Z-score", "-6.35", "Highly significant" }));
            tblGeary.Append(CreateTableRow(false, true, new string[] { "p-value", "1.12 × 10⁻¹⁰", "Strong clustering" }));
            body.Append(tblGeary);

            body.Append(CreateCalloutBox("Exam Tip: C < 1 always means clustering. C > 1 means dispersion. The further from 1, the stronger the pattern."));

            body.Append(CreateHeading2("1.6 Local Indicators of Spatial Association (LISA)", "Sec1.6"));
            body.Append(CreatePara(CreateRun("Why LISA? ", null, true), CreateRun("Global statistics give one number for the whole map. LISA tells you which specific cells are part of clusters.")));

            body.Append(CreatePara(CreateRun("Local Moran's I Formula:", null, true)));
            // Equation 9: Local Moran's I
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                new M.Subscript(new M.Base(MathRun("I")), new M.SubArgument(MathRun("i"))),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(new M.Subscript(new M.Base(MathRun("z")), new M.SubArgument(MathRun("i")))),
                    new M.Denominator(new M.Subscript(new M.Base(MathRun("m")), new M.SubArgument(MathRun("2"))))
                ),
                MathRun("·"),
                new M.Nary(
                    new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                    new M.SubArgument(MathRun("j=1")),
                    new M.SuperArgument(MathRun("N")),
                    new M.Base(
                        new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))),
                        new M.Subscript(new M.Base(MathRun("z")), new M.SubArgument(MathRun("j")))
                    )
                )
            ))));
            body.Append(CreatePara("Where z_i = x_i - x̄ (deviation from mean), m_2 = variance, and Σw_ij·z_j = spatial lag (average of neighbors)."));

            body.Append(CreatePara(CreateRun("Four Cluster Types (QUADRANTS):", null, true)));
            var tblLisa = new Table();
            tblLisa.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblLisa.Append(CreateTableRow(true, false, new string[] { "Type", "Name", "Meaning", "Example in Data" }));
            tblLisa.Append(CreateTableRow(false, false, new string[] { "HH", "High-High", "High value surrounded by high values", "Hotspot center (3,3)" }));
            tblLisa.Append(CreateTableRow(false, true, new string[] { "LL", "Low-Low", "Low value surrounded by low values", "Grid corners/edges" }));
            tblLisa.Append(CreateTableRow(false, false, new string[] { "HL", "High-Low", "High value surrounded by low values", "Outlier" }));
            tblLisa.Append(CreateTableRow(false, true, new string[] { "LH", "Low-High", "Low value surrounded by high values", "Outlier" }));
            body.Append(tblLisa);

            body.Append(CreatePara(CreateRun("Example Calculation for Cell (3,3):", null, true)));
            AddBulletItem(body, "Value = 81.65%, Mean", "13.91%");
            AddBulletItem(body, "z_i", "81.65 - 13.91 = 67.74");
            AddBulletItem(body, "Neighbors range", "55% to 75%");
            AddBulletItem(body, "Spatial lag", "≈ 52.40");
            AddBulletItem(body, "I_i", "(67.74 / 335.80) × 52.40 = 10.57 → HH Cluster");

            body.Append(CreateCalloutBox("Exam Tip: LISA uses FDR (False Discovery Rate) correction because testing 100 cells creates many chances for false positives."));
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "lisa_cluster_map.png"), "LISA Cluster Map", ref docPrId, 12);
            body.Append(CreateCaption("Figure 3: LISA Cluster map highlighting the High-High hotspot and Low-Low coldspots."));

            body.Append(new Paragraph(new Run(new Break { Type = BreakValues.Page })));

            // --------------------------------------------------------------------
            // CHAPTER 2: POINT PATTERN ANALYSIS
            // --------------------------------------------------------------------
            body.Append(CreateHeading1("CHAPTER 2: POINT PATTERN ANALYSIS", "Sec2"));

            body.Append(CreateHeading2("2.1 Getis-Ord Gi* Hotspot Detection", "Sec2.1"));
            body.Append(CreatePara(CreateRun("What is Gi*?", null, true)));
            AddBulletItem(body, "Purpose", "Identifies hotspots (clusters of high values) and coldspots (clusters of low values)");
            AddBulletItem(body, "Key difference from LISA", "Gi* includes the cell itself (w_ii = 1), so it finds pure hotspots, NOT outliers");

            // Equation 11: Getis-Ord Gi*
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                new M.SubSuperscript(
                    new M.Base(MathRun("G")),
                    new M.SubArgument(MathRun("i")),
                    new M.SuperArgument(MathRun("*"))
                ),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(
                        new M.Nary(
                            new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                            new M.SubArgument(MathRun("j=1")),
                            new M.SuperArgument(MathRun("N")),
                            new M.Base(
                                new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))),
                                new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("j")))
                            )
                        ),
                        MathRun("-"),
                        MathRun("X̄"),
                        new M.Nary(
                            new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                            new M.SubArgument(MathRun("j=1")),
                            new M.SuperArgument(MathRun("N")),
                            new M.Base(new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))))
                        )
                    ),
                    new M.Denominator(
                        MathRun("S"),
                        new M.Radical(
                            new M.RadicalProperties(new M.HideDegree { Val = M.BooleanValues.True }),
                            new M.Degree(),
                            new M.Base(new M.Fraction(
                                new M.Numerator(
                                    MathRun("N"),
                                    new M.Nary(
                                        new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                                        new M.SubArgument(MathRun("j=1")),
                                        new M.SuperArgument(MathRun("N")),
                                        new M.Base(new M.Superscript(new M.Base(new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij")))), new M.SuperArgument(MathRun("2"))))
                                    ),
                                    MathRun("-"),
                                    new M.Superscript(
                                        new M.Base(new M.Delimiter(
                                            new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                                            new M.Base(new M.Nary(
                                                new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                                                new M.SubArgument(MathRun("j=1")),
                                                new M.SuperArgument(MathRun("N")),
                                                new M.Base(new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))))))
                                        )),
                                        new M.SuperArgument(MathRun("2"))
                                    )
                                ),
                                new M.Denominator(MathRun("N"), MathRun("-"), MathRun("1"))
                            ))
                        )
                    )
                )
            ))));

            body.Append(CreatePara(CreateRun("Z-Score Interpretation:", null, true)));
            var tblZScore = new Table();
            tblZScore.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblZScore.Append(CreateTableRow(true, false, new string[] { "Gi* Z-Score", "Meaning", "Confidence" }));
            tblZScore.Append(CreateTableRow(false, false, new string[] { "> +1.96", "Hotspot", "95%" }));
            tblZScore.Append(CreateTableRow(false, true, new string[] { "> +2.58", "Strong Hotspot", "99%" }));
            tblZScore.Append(CreateTableRow(false, false, new string[] { "<< -1.96", "Coldspot", "95%" }));
            tblZScore.Append(CreateTableRow(false, true, new string[] { "<< -2.58", "Strong Coldspot", "99%" }));
            body.Append(tblZScore);

            body.Append(CreatePara(CreateRun("Example for Cell (3,3):", null, true)));
            AddBulletItem(body, "Local sum", "≈ 538.5%");
            AddBulletItem(body, "Expected sum", "13.91 × 9 = 125.2%");
            AddBulletItem(body, "Gi*", "+7.74 → Extremely significant hotspot (99.9% confidence)");

            body.Append(CreatePara(CreateRun("Example for Cell (0,0):", null, true)));
            AddBulletItem(body, "Gi*", "≈ -2.48 → Significant coldspot");

            body.Append(CreateHeading2("2.2 Point Pattern Types", "Sec2.2"));
            body.Append(CreatePara("Three basic patterns for discrete points:"));
            var tblPointTypes = new Table();
            tblPointTypes.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblPointTypes.Append(CreateTableRow(true, false, new string[] { "Pattern", "Description", "Cause", "NNI Value" }));
            tblPointTypes.Append(CreateTableRow(false, false, new string[] { "Clustered", "Points grouped together", "Shared resource, attraction", "<< 1" }));
            tblPointTypes.Append(CreateTableRow(false, true, new string[] { "Random", "No pattern", "Independent events", "= 1" }));
            tblPointTypes.Append(CreateTableRow(false, false, new string[] { "Regular", "Evenly spaced", "Competition, repulsion", "> 1" }));
            body.Append(tblPointTypes);

            body.Append(CreateHeading2("2.3 Nearest Neighbour Index (NNI)", "Sec2.3"));
            body.Append(CreatePara(CreateRun("Formula:", null, true)));
            // Equation 13: Nearest Neighbour Index
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                MathRun("NNI"),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(new M.Subscript(new M.Base(MathRun("d")), new M.SubArgument(MathRun("obs")))),
                    new M.Denominator(new M.Subscript(new M.Base(MathRun("d")), new M.SubArgument(MathRun("exp"))))
                )
            ))));
            body.Append(CreatePara("Where d_obs = average distance to nearest neighbor, d_exp = expected distance if random, ρ = n/A = point density, n = 80 points, A = 100 units²."));

            body.Append(CreatePara(CreateRun("Calculation Steps:", null, true)));
            AddBulletItem(body, "1. Density", "ρ = 80/100 = 0.8");
            AddBulletItem(body, "2. Expected distance", "d_exp = 0.5 / √0.8 = 0.559");
            AddBulletItem(body, "3. Observed distance", "d_obs = 0.312");
            AddBulletItem(body, "4. NNI", "0.312 / 0.559 = 0.558");
            AddBulletItem(body, "5. Z-score", "≈ -7.56");
            body.Append(CreatePara(CreateRun("Conclusion: ", null, true), CreateRun("NNI < 1 → Significantly clustered pattern.")));

            body.Append(CreateCalloutBox("Exam Tip: NNI is a \"first-order\" statistic — it only looks at the closest neighbor. Use Ripley's K for multiple scales."));

            body.Append(CreateHeading2("2.4 Kernel Density Estimation (KDE)", "Sec2.4"));
            body.Append(CreatePara(CreateRun("Purpose: ", null, true), CreateRun("Converts discrete points into a smooth, continuous surface showing where points are concentrated.")));
            body.Append(CreatePara(CreateRun("Gaussian KDE Formula:", null, true)));
            // Equation: KDE Gaussian formula
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                new M.Accent(
                    new M.AccentProperties(new M.AccentChar { Val = "̂" }),
                    new M.Base(MathRun("f"))
                ),
                new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }), new M.Base(MathRun("x"))),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(MathRun("1")),
                    new M.Denominator(MathRun("n"), MathRun("h"))
                ),
                new M.Nary(
                    new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                    new M.SubArgument(MathRun("i=1")),
                    new M.SuperArgument(MathRun("n")),
                    new M.Base(
                        MathRun("K"),
                        new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                            new M.Base(new M.Fraction(
                                new M.Numerator(MathRun("x"), MathRun("−"), new M.Subscript(new M.Base(MathRun("x")), new M.SubArgument(MathRun("i")))),
                                new M.Denominator(MathRun("h"))
                            ))
                        )
                    )
                )
            ))));
            body.Append(CreatePara(CreateRun("Key Parameter (Bandwidth h):", null, true)));
            AddBulletItem(body, "Small h", "sharp peaks (shows detail but noisy)");
            AddBulletItem(body, "Large h", "smooth surface (hides local patterns)");
            AddBulletItem(body, "This study", "uses h = 1.5 units");
            body.Append(CreatePara(CreateRun("Result: ", null, true), CreateRun("Density surface peaks at the bottom-left hotspot, matching the prevalence cluster.")));
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "kde_surface.png"), "KDE Surface", ref docPrId, 12);
            body.Append(CreateCaption("Figure 4: Kernel Density Estimation surface showing continuous hotspot concentration."));

            body.Append(CreateHeading2("2.5 Ripley's K and Besag's L-Function", "Sec2.5"));
            body.Append(CreatePara(CreateRun("Why use this? ", null, true), CreateRun("NNI only checks one distance. Ripley's K checks all distances (multi-scale analysis).")));
            body.Append(CreatePara(CreateRun("Formulas:", null, true)));
            // Equation 15: Ripley's K-function
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                MathRun("K"),
                new M.Delimiter(
                    new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                    new M.Base(MathRun("r"))
                ),
                MathRun("="),
                new M.Fraction(
                    new M.Numerator(MathRun("A")),
                    new M.Denominator(new M.Superscript(new M.Base(MathRun("n")), new M.SuperArgument(MathRun("2"))))
                ),
                MathRun("·"),
                new M.Nary(
                    new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                    new M.SubArgument(MathRun("i=1")),
                    new M.SuperArgument(MathRun("n")),
                    new M.Base(new M.Nary(
                        new M.NaryProperties(new M.AccentChar { Val = "∑" }),
                        new M.SubArgument(MathRun("j≠i")),
                        new M.SuperArgument(MathRun("n")),
                        new M.Base(
                            new M.Subscript(new M.Base(MathRun("w")), new M.SubArgument(MathRun("ij"))),
                            MathRun("·"),
                            MathRun("I"),
                            new M.Delimiter(
                                new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                                new M.Base(
                                    new M.Subscript(new M.Base(MathRun("d")), new M.SubArgument(MathRun("ij"))),
                                    MathRun("≤"),
                                    MathRun("r")
                                )
                            )
                        )
                    ))
                )
            ))));
            // Equation 16: Besag L-function
            body.Append(new Paragraph(new M.Paragraph(new M.OfficeMath(
                MathRun("L"),
                new M.Delimiter(
                    new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }),
                    new M.Base(MathRun("r"))
                ),
                MathRun("="),
                new M.Radical(
                    new M.RadicalProperties(new M.HideDegree { Val = M.BooleanValues.True }),
                    new M.Degree(),
                    new M.Base(new M.Fraction(
                        new M.Numerator(MathRun("K"), new M.Delimiter(new M.DelimiterProperties(new M.BeginChar { Val = "(" }, new M.EndChar { Val = ")" }), new M.Base(MathRun("r")))),
                        new M.Denominator(MathRun("π"))
                    ))
                ),
                MathRun("-"),
                MathRun("r")
            ))));

            body.Append(CreatePara(CreateRun("Interpretation of L(r):", null, true)));
            var tblBesag = new Table();
            tblBesag.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblBesag.Append(CreateTableRow(true, false, new string[] { "L(r) Value", "Meaning" }));
            tblBesag.Append(CreateTableRow(false, false, new string[] { "L(r) = 0", "Complete Spatial Randomness" }));
            tblBesag.Append(CreateTableRow(false, true, new string[] { "L(r) > 0", "Clustering at distance r" }));
            tblBesag.Append(CreateTableRow(false, false, new string[] { "L(r) < 0", "Dispersion at distance r" }));
            body.Append(tblBesag);

            body.Append(CreatePara(CreateRun("Results from Assignment:", null, true)));
            AddBulletItem(body, "At r = 1.0", "L(r) = +0.42 → Significant small-scale clustering");
            AddBulletItem(body, "At r = 2.5", "L(r) = +1.28 (peak) → Main clustering scale");
            AddBulletItem(body, "At r > 4.0", "Still above envelope → Global clustering pattern");

            body.Append(CreateCalloutBox("Exam Tip: The peak at r = 2.5 tells us the hotspot is about 2.5 units wide. Edge correction (w_ij) is needed because circles near boundaries are cut off."));
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "ripley_l_function.png"), "Besag's L Function", ref docPrId, 12);
            body.Append(CreateCaption("Figure 5: Besag's L(r) function showing significant multi-scale clustering peaking at r = 2.5."));

            body.Append(new Paragraph(new Run(new Break { Type = BreakValues.Page })));

            // --------------------------------------------------------------------
            // QUICK FORMULA SHEET & KEY DEFINITIONS
            // --------------------------------------------------------------------
            body.Append(CreateHeading1("QUICK FORMULA SHEET FOR EXAM", "Sec3"));
            body.Append(CreatePara("Refer to the equations throughout the text. Key expected values under randomness are:"));
            AddBulletItem(body, "Moran's I", "E(I) = -1/(N-1)");
            AddBulletItem(body, "Geary's C", "E(C) = 1.0");
            AddBulletItem(body, "Getis-Ord Gi*", "Z ~ N(0,1)");
            AddBulletItem(body, "NNI", "1.0");
            AddBulletItem(body, "Besag's L", "0");

            body.Append(CreateHeading1("KEY DEFINITIONS (EXAM-READY)", "Sec4"));
            var tblDefs = new Table();
            tblDefs.Append(new TableProperties(new TableWidth { Width = "5000", Type = TableWidthUnitValues.Pct }, new TableBorders(new TopBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new BottomBorder { Val = BorderValues.Single, Size = 12, Color = Navy }, new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Color = Light })));
            tblDefs.Append(CreateTableRow(true, false, new string[] { "Term", "Simple Definition" }));
            tblDefs.Append(CreateTableRow(false, false, new string[] { "Spatial Autocorrelation", "Correlation of a variable with itself across space" }));
            tblDefs.Append(CreateTableRow(false, true, new string[] { "Queen Contiguity", "Neighbors share edge OR corner (up to 8)" }));
            tblDefs.Append(CreateTableRow(false, false, new string[] { "Rook Contiguity", "Neighbors share only edge (up to 4)" }));
            tblDefs.Append(CreateTableRow(false, true, new string[] { "Spatial Lag", "Weighted average of neighbor values" }));
            tblDefs.Append(CreateTableRow(false, false, new string[] { "Row-Standardization", "Dividing weights so each row sums to 1" }));
            tblDefs.Append(CreateTableRow(false, true, new string[] { "Hotspot", "Statistically significant cluster of high values" }));
            tblDefs.Append(CreateTableRow(false, false, new string[] { "Coldspot", "Statistically significant cluster of low values" }));
            tblDefs.Append(CreateTableRow(false, true, new string[] { "LISA", "Local Indicator of Spatial Association" }));
            tblDefs.Append(CreateTableRow(false, false, new string[] { "FDR Correction", "Adjusts p-values for multiple testing" }));
            tblDefs.Append(CreateTableRow(false, true, new string[] { "Edge Effect", "Boundary cells have fewer neighbors, biasing results" }));
            tblDefs.Append(CreateTableRow(false, false, new string[] { "Bandwidth", "Smoothing parameter in KDE" }));
            tblDefs.Append(CreateTableRow(false, true, new string[] { "CSR", "Complete Spatial Randomness (null hypothesis)" }));
            body.Append(tblDefs);

            body.Append(CreateHeading1("SUMMARY: WHAT THE RESULTS PROVE", "Sec5"));
            AddBulletItem(body, "1. Moran's I = 0.36 (Z = 7.13)", "The entire map shows significant positive clustering");
            AddBulletItem(body, "2. Geary's C = 0.67 (Z = -6.35)", "Confirms neighbors are similar to each other");
            AddBulletItem(body, "3. LISA Map", "Cell (3,3) is a High-High hotspot core; edges are Low-Low coldspots");
            AddBulletItem(body, "4. Gi* Map", "Significant hotspot at Z > +2.58; coldspots at Z < -1.96");
            AddBulletItem(body, "5. NNI = 0.558", "Point pattern is significantly clustered");
            AddBulletItem(body, "6. Ripley's K / L-function", "Clustering is significant across all scales from r=0 to r=4.5, peaking at r = 2.5");

            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "the_end.png"), "The End", ref docPrId, 16);
            
            // Append Final Section Break linking headers and footers
            body.Append(new Paragraph(new ParagraphProperties(new SectionProperties(
                new HeaderReference { Type = HeaderFooterValues.Default, Id = headerId },
                new FooterReference { Type = HeaderFooterValues.Default, Id = footerId },
                new PageSize { Width = (UInt32Value)(uint)A4W, Height = (UInt32Value)(uint)A4H },
                new PageMargin { Top = 1440, Right = 1440, Bottom = 1440, Left = 1440, Header = 720, Footer = 720 }))));
        }

        // ========================================================================
        // Factory & Markup Helpers
        // ========================================================================
        static Paragraph CreateHeading1(string text, string bookmarkName)
        {
            int id = ++bookmarkId;
            return new Paragraph(
                new ParagraphProperties(new ParagraphStyleId { Val = "Heading1" }),
                new BookmarkStart { Id = id.ToString(), Name = bookmarkName },
                new Run(new Text(text)),
                new BookmarkEnd { Id = id.ToString() });
        }

        static Paragraph CreateHeading2(string text, string? bookmarkName = null)
        {
            var p = new Paragraph(new ParagraphProperties(new ParagraphStyleId { Val = "Heading2" }));
            if (!string.IsNullOrEmpty(bookmarkName))
            {
                int id = ++bookmarkId;
                p.Append(new BookmarkStart { Id = id.ToString(), Name = bookmarkName });
                p.Append(new Run(new Text(text)));
                p.Append(new BookmarkEnd { Id = id.ToString() });
            }
            else
            {
                p.Append(new Run(new Text(text)));
            }
            return p;
        }

        static Paragraph CreateHeading3(string text, string? bookmarkName = null)
        {
            var p = new Paragraph(new ParagraphProperties(new ParagraphStyleId { Val = "Heading3" }));
            if (!string.IsNullOrEmpty(bookmarkName))
            {
                int id = ++bookmarkId;
                p.Append(new BookmarkStart { Id = id.ToString(), Name = bookmarkName });
                p.Append(new Run(new Text(text)));
                p.Append(new BookmarkEnd { Id = id.ToString() });
            }
            else
            {
                p.Append(new Run(new Text(text)));
            }
            return p;
        }

        static Paragraph CreatePara(string text)
        {
            return new Paragraph(new Run(new Text(text)));
        }

        static Paragraph CreatePara(params Run[] runs)
        {
            var p = new Paragraph();
            foreach (var run in runs)
            {
                p.Append(run);
            }
            return p;
        }

        static Run CreateRun(string text, string? color = null, bool bold = false, bool italic = false)
        {
            var run = new Run();
            var rpr = new RunProperties(new RunFonts { Ascii = "Times New Roman", HighAnsi = "Times New Roman" });
            if (bold) rpr.Append(new Bold());
            if (italic) rpr.Append(new Italic());
            if (color != null) rpr.Append(new Color { Val = color });
            run.Append(rpr);
            run.Append(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            return run;
        }

        static Paragraph CreateCaption(string text)
        {
            return new Paragraph(
                new ParagraphProperties(new ParagraphStyleId { Val = "Caption" }),
                new Run(new Text(text)));
        }

        static void AddBulletItem(Body body, string boldText, string regularText)
        {
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new NumberingProperties(new NumberingLevelReference { Val = 0 }, new NumberingId { Val = 1 })),
                new Run(new RunProperties(new Bold(), new Color { Val = Navy }), new Text(boldText + ": ")),
                new Run(new Text(regularText))));
        }

        static void AddFootnoteRef(WordprocessingDocument doc, Paragraph para, MainDocumentPart mp, string text)
        {
            var fnp = mp.FootnotesPart ?? mp.AddNewPart<FootnotesPart>();
            if (fnp.Footnotes == null)
            {
                fnp.Footnotes = new Footnotes(
                    new Footnote(new Paragraph(new Run(new SeparatorMark()))) { Type = FootnoteEndnoteValues.Separator, Id = -1 },
                    new Footnote(new Paragraph(new Run(new ContinuationSeparatorMark()))) { Type = FootnoteEndnoteValues.ContinuationSeparator, Id = 0 }
                );
            }
            int fnId = (int)(fnp.Footnotes.Elements<Footnote>().Max(fn => fn.Id?.Value ?? 0) + 1);
            fnp.Footnotes.Append(new Footnote(new Paragraph(
                new Run(new RunProperties(new VerticalTextAlignment { Val = VerticalPositionValues.Superscript }), new FootnoteReferenceMark()),
                new Run(new RunProperties(new FontSize { Val = "18" }), new Text(" " + text) { Space = SpaceProcessingModeValues.Preserve })
            )) { Id = fnId });

            para.Append(new Run(new RunProperties(new VerticalTextAlignment { Val = VerticalPositionValues.Superscript }),
                new FootnoteReference { Id = fnId }));
        }

        static Paragraph CreateReferenceItem(string text)
        {
            return new Paragraph(
                new ParagraphProperties(new SpacingBetweenLines { Before = "60", After = "120" }, new Indentation { Left = "360", Hanging = "360" }),
                new Run(new Text(text)));
        }

        // --- Image Insertion ---
        static string AddImage(MainDocumentPart mp, string path)
        {
            var ip = mp.AddImagePart(ImagePartType.Png);
            using (var fs = new FileStream(path, FileMode.Open))
                ip.FeedData(fs);
            return mp.GetIdOfPart(ip);
        }

        static Drawing CreateFloatingBackground(string imgId, uint prId, string name)
        {
            return new Drawing(new DW.Anchor(
                new DW.SimplePosition { X = 0, Y = 0 },
                new DW.HorizontalPosition(new DW.PositionOffset("0")) { RelativeFrom = DW.HorizontalRelativePositionValues.Page },
                new DW.VerticalPosition(new DW.PositionOffset("0")) { RelativeFrom = DW.VerticalRelativePositionValues.Page },
                new DW.Extent { Cx = A4WE, Cy = A4HE },
                new DW.EffectExtent { LeftEdge = 0, TopEdge = 0, RightEdge = 0, BottomEdge = 0 },
                new DW.WrapNone(),
                new DW.DocProperties { Id = prId, Name = name },
                new DW.NonVisualGraphicFrameDrawingProperties(new A.GraphicFrameLocks { NoChangeAspect = true }),
                new A.Graphic(new A.GraphicData(
                    new PIC.Picture(
                        new PIC.NonVisualPictureProperties(
                            new PIC.NonVisualDrawingProperties { Id = 0, Name = $"{name}.png" },
                            new PIC.NonVisualPictureDrawingProperties()),
                        new PIC.BlipFill(new A.Blip { Embed = imgId }, new A.Stretch(new A.FillRectangle())),
                        new PIC.ShapeProperties(
                            new A.Transform2D(new A.Offset { X = 0, Y = 0 }, new A.Extents { Cx = A4WE, Cy = A4HE }),
                            new A.PresetGeometry { Preset = A.ShapeTypeValues.Rectangle })))
                { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }))
            { DistanceFromTop = 0, DistanceFromBottom = 0, DistanceFromLeft = 0, DistanceFromRight = 0,
              SimplePos = false, RelativeHeight = 251658240, BehindDoc = true,
              Locked = false, LayoutInCell = true, AllowOverlap = true });
        }

        static void AddInlineImage(Body body, MainDocumentPart mainPart, string imagePath, string altText, ref uint docPrId, int maxWidthCm = 15)
        {
            if (!File.Exists(imagePath))
            {
                Console.Error.WriteLine($"WARNING: Image not found: {imagePath}");
                return;
            }
            var imagePart = mainPart.AddImagePart(ImagePartType.Png);
            byte[] imageBytes = File.ReadAllBytes(imagePath);
            using (var ms = new MemoryStream(imageBytes)) imagePart.FeedData(ms);
            var imageId = mainPart.GetIdOfPart(imagePart);

            // Read actual dimensions
            int imgWidth, imgHeight;
            using (var ms = new MemoryStream(imageBytes))
            {
                ms.Seek(16, SeekOrigin.Begin);
                byte[] wb = new byte[4], hb = new byte[4];
                ms.Read(wb, 0, 4); ms.Read(hb, 0, 4);
                if (BitConverter.IsLittleEndian) { Array.Reverse(wb); Array.Reverse(hb); }
                imgWidth = BitConverter.ToInt32(wb, 0);
                imgHeight = BitConverter.ToInt32(hb, 0);
            }

            // Calculate display sizes in EMU
            long maxWidthEmu = maxWidthCm * 360000L;
            long cx = maxWidthEmu;
            long cy = (long)(cx * ((double)imgHeight / imgWidth));
            var id = docPrId++;

            body.Append(new Paragraph(
                new ParagraphProperties(new KeepNext(), new Justification { Val = JustificationValues.Center },
                    new SpacingBetweenLines { Before = "120", After = "60" }),
                new Run(new Drawing(new DW.Inline(
                    new DW.Extent { Cx = cx, Cy = cy },
                    new DW.EffectExtent { LeftEdge = 0, TopEdge = 0, RightEdge = 0, BottomEdge = 0 },
                    new DW.DocProperties { Id = id, Name = altText },
                    new DW.NonVisualGraphicFrameDrawingProperties(new A.GraphicFrameLocks { NoChangeAspect = true }),
                    new A.Graphic(new A.GraphicData(
                        new PIC.Picture(
                            new PIC.NonVisualPictureProperties(
                                new PIC.NonVisualDrawingProperties { Id = 0, Name = $"{altText}.png" },
                                new PIC.NonVisualPictureDrawingProperties()),
                            new PIC.BlipFill(new A.Blip { Embed = imageId }, new A.Stretch(new A.FillRectangle())),
                            new PIC.ShapeProperties(
                                new A.Transform2D(new A.Offset { X = 0, Y = 0 }, new A.Extents { Cx = cx, Cy = cy }),
                                new A.PresetGeometry { Preset = A.ShapeTypeValues.Rectangle })))
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }))
                { DistanceFromTop = 0, DistanceFromBottom = 0, DistanceFromLeft = 0, DistanceFromRight = 0 }))));
        }


        static TableRow CreateEquationTableRow(string title, M.OfficeMath math)
        {
            var row = new TableRow();
            
            // Cell 1: Title
            var cell1Props = new TableCellProperties(new TableCellWidth { Width = "3000", Type = TableWidthUnitValues.Dxa });
            cell1Props.Append(new Shading { Val = ShadingPatternValues.Clear, Fill = TableHeaderBg });
            var run1 = new Run(new RunProperties(new RunFonts { Ascii = "Times New Roman", HighAnsi = "Times New Roman" }, new FontSize { Val = "20" }, new Color { Val = Dark }, new Bold()), new Text(title));
            row.Append(new TableCell(
                cell1Props,
                new Paragraph(
                    new ParagraphProperties(new Justification { Val = JustificationValues.Center }, new SpacingBetweenLines { Before = "60", After = "60" }),
                    run1)));

            // Cell 2: Math
            var cell2Props = new TableCellProperties(new TableCellWidth { Width = "7000", Type = TableWidthUnitValues.Dxa });
            row.Append(new TableCell(
                cell2Props,
                new Paragraph(
                    new ParagraphProperties(new Justification { Val = JustificationValues.Center }, new SpacingBetweenLines { Before = "60", After = "60" }),
                    new M.Paragraph(math))));

            return row;
        }

        // --- Table Helpers ---
        static TableRow CreateTableRow(bool isHeader, bool isAlternate, params string[] cells)
        {
            var row = new TableRow();
            if (isHeader) row.Append(new TableRowProperties(new TableHeader()));

            foreach (var text in cells)
            {
                var cellProperties = new TableCellProperties(new TableCellWidth { Width = "0", Type = TableWidthUnitValues.Auto });
                if (isHeader)
                {
                    cellProperties.Append(new Shading { Val = ShadingPatternValues.Clear, Fill = TableHeaderBg });
                }
                else if (isAlternate)
                {
                    cellProperties.Append(new Shading { Val = ShadingPatternValues.Clear, Fill = "F9FAFB" }); // Lighter gray for zebra striping
                }

                var runProperties = new RunProperties(new FontSize { Val = "20" }, new Color { Val = Dark });
                if (isHeader)
                {
                    runProperties.Append(new Bold());
                }

                row.Append(new TableCell(
                    cellProperties,
                    new Paragraph(
                        new ParagraphProperties(new Justification { Val = JustificationValues.Center }, new SpacingBetweenLines { Before = "60", After = "60" }),
                        new Run(runProperties, new Text(text)))));
            }
            return row;
        }

        static TableRow CreateTableRow(bool isHeader, params string[] cells)
        {
            return CreateTableRow(isHeader, false, cells);
        }

        // ========================================================================
        // Math Builders (OMML)
        // ========================================================================
        static M.Run MathRun(string text)
        {
            return new M.Run(new M.Text { Text = text });
        }

        static Paragraph CreateCalloutBox(string text)
        {
            var p = new Paragraph(
                new ParagraphProperties(
                    new ParagraphBorders(
                        new LeftBorder { Val = BorderValues.Single, Color = Blue, Size = 24, Space = 4 },
                        new TopBorder { Val = BorderValues.Nil },
                        new RightBorder { Val = BorderValues.Nil },
                        new BottomBorder { Val = BorderValues.Nil }
                    ),
                    new Shading { Val = ShadingPatternValues.Clear, Fill = CalloutBg },
                    new SpacingBetweenLines { Before = "120", After = "120", Line = "360", LineRule = LineSpacingRuleValues.Auto },
                    new Indentation { Left = "200", Right = "200" }
                ),
                new Run(
                    new RunProperties(new Color { Val = Dark }, new Italic()),
                    new Text(text)
                )
            );
            return p;
        }
    }
}
