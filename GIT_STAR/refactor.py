import re

with open('c:/Users/akshi/Desktop/GIT_STAR/docx_build/Program.cs', 'r', encoding='utf-8') as f:
    content = f.read()

def get_equation(name):
    pattern = r'(// [^\n]*' + re.escape(name) + r'[^\n]*\n\s*body\.Append\(new Paragraph\(new M\.Paragraph\(new M\.OfficeMath\(.*?\)\)\)\);)'
    m = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1)
    return '// EQUATION NOT FOUND: ' + name

eq_moran = get_equation("Global Moran's I")
eq_geary = get_equation("Geary's C")
eq_local_moran = get_equation("Local Moran's I")
eq_gi = get_equation("Getis-Ord Gi*")
eq_nni = get_equation("Nearest Neighbour Index")
eq_kde = get_equation("KDE Gaussian")
eq_ripley = get_equation("Ripley's K-function")
eq_besag = get_equation("Besag L-function")

new_body = f"""

            body.Append(CreateHeading1("SPATIAL AUTOCORRELATION & POINT PATTERN ANALYSIS", "SecTitle"));
            body.Append(CreatePara(CreateRun("Simplified Study Guide for Examination", Navy, italic: true)));

            // --------------------------------------------------------------------
            // CHAPTER 1: SPATIAL AUTOCORRELATION
            // --------------------------------------------------------------------
            body.Append(CreateHeading1("CHAPTER 1: SPATIAL AUTOCORRELATION", "Sec1"));

            body.Append(CreateHeading2("1.1 What is Spatial Autocorrelation?", "Sec1.1"));
            AddBulletItem(body, "Simple Definition", "It measures whether similar values cluster together in space.");
            AddBulletItem(body, "Tobler's First Law", "\\\"Everything is related to everything else, but near things are more related than distant things.\\\"");
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

            body.Append(CreateHeading2("1.3 Spatial Weights Matrix (W)", "Sec1.3"));
            body.Append(CreatePara(CreateRun("What is it?", null, true)));
            AddBulletItem(body, "Definition", "A table showing which cells are \\\"neighbors\\\" of each other");
            AddBulletItem(body, "Queen Contiguity Rule", "Two cells are neighbors if they share an edge OR a corner (up to 8 neighbors)");

            body.Append(CreatePara(CreateRun("Types of Cells:", null, true)));
            var tblNeighbors = new Table();
            tblNeighbors.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblNeighbors.Append(CreateTableRow(true, false, new string[] {{ "Cell Location", "Number of Neighbors", "Example" }}));
            tblNeighbors.Append(CreateTableRow(false, false, new string[] {{ "Interior cells", "8", "Cell (4,4)" }}));
            tblNeighbors.Append(CreateTableRow(false, true, new string[] {{ "Edge cells (not corners)", "5", "Cell (0,4)" }}));
            tblNeighbors.Append(CreateTableRow(false, false, new string[] {{ "Corner cells", "3", "Cell (0,0)" }}));
            body.Append(tblNeighbors);

            body.Append(CreatePara(CreateRun("Important Number to Remember:", null, true)));
            AddBulletItem(body, "S₀ = 684", "total neighbor connections in the entire grid");
            body.Append(CreatePara("This number is used in ALL global statistics."));

            body.Append(CreatePara(CreateRun("Row-Standardization:", null, true)));
            AddBulletItem(body, "Rule", "Each neighbor gets equal weight = 1 ÷ (number of neighbors)");
            AddBulletItem(body, "Interior cell", "weight = 1/8 = 0.125");
            AddBulletItem(body, "Corner cell", "weight = 1/3 = 0.333");

            body.Append(CreateCalloutBox("Exam Tip: Corner cells have fewer neighbors, so each neighbor matters more. This creates \\\"edge effects.\\\""));

            body.Append(CreateHeading2("1.4 Global Moran's I", "Sec1.4"));
            body.Append(CreatePara(CreateRun("What it tells you: ", null, true), CreateRun("Whether the entire map shows clustering, dispersion, or randomness.")));
            body.Append(CreatePara(CreateRun("Formula (simplified):", null, true)));

            {eq_moran}

            body.Append(CreatePara(CreateRun("In Plain English:", null, true)));
            AddBulletItem(body, "Numerator", "how much neighbors vary together");
            AddBulletItem(body, "Denominator", "total variation in the data");
            AddBulletItem(body, "If neighbors are similar", "Positive I (clustering)");
            AddBulletItem(body, "If neighbors are different", "Negative I (dispersion)");

            body.Append(CreatePara(CreateRun("Results from Assignment:", null, true)));
            var tblMoran = new Table();
            tblMoran.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblMoran.Append(CreateTableRow(true, false, new string[] {{ "Statistic", "Value", "Meaning" }}));
            tblMoran.Append(CreateTableRow(false, false, new string[] {{ "Observed I", "0.360", "Positive clustering" }}));
            tblMoran.Append(CreateTableRow(false, true, new string[] {{ "Expected I", "-0.010", "Value if random" }}));
            tblMoran.Append(CreateTableRow(false, false, new string[] {{ "Z-score", "7.13", "Highly significant" }}));
            tblMoran.Append(CreateTableRow(false, true, new string[] {{ "p-value", "1.03 × 10⁻¹²", "Reject randomness" }}));
            body.Append(tblMoran);

            body.Append(CreateCalloutBox("Exam Tip: Z > 1.96 means significant at 95% confidence. Our Z = 7.13 is extremely significant!"));

            body.Append(CreatePara(CreateRun("Moran Scatterplot:", null, true)));
            AddBulletItem(body, "X-axis", "Prevalence at each cell (standardized)");
            AddBulletItem(body, "Y-axis", "Average prevalence of neighbors");
            AddBulletItem(body, "Slope of the line", "Moran's I value (~0.36)");
            AddBulletItem(body, "Most points in", "upper-right (high-high) and lower-left (low-low) = clustering");

            body.Append(CreateHeading2("1.5 Global Geary's C", "Sec1.5"));
            body.Append(CreatePara(CreateRun("What it tells you: ", null, true), CreateRun("Another way to measure spatial autocorrelation, but focuses on differences between neighbors (not deviations from mean).")));
            body.Append(CreatePara(CreateRun("Formula:", null, true)));

            {eq_geary}

            body.Append(CreatePara(CreateRun("Key Difference from Moran's I:", null, true)));
            var tblDiff = new Table();
            tblDiff.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblDiff.Append(CreateTableRow(true, false, new string[] {{ "Feature", "Moran's I", "Geary's C" }}));
            tblDiff.Append(CreateTableRow(false, false, new string[] {{ "Focus", "Deviations from mean", "Differences between neighbors" }}));
            tblDiff.Append(CreateTableRow(false, true, new string[] {{ "Range", "-1 to +1", "0 to 2" }}));
            tblDiff.Append(CreateTableRow(false, false, new string[] {{ "Expected under randomness", "-1/(N-1) ≈ -0.01", "1.0" }}));
            tblDiff.Append(CreateTableRow(false, true, new string[] {{ "Positive autocorrelation", "I > Expected", "C < 1.0" }}));
            tblDiff.Append(CreateTableRow(false, false, new string[] {{ "Negative autocorrelation", "I < Expected", "C > 1.0" }}));
            body.Append(tblDiff);

            body.Append(CreatePara(CreateRun("Results from Assignment:", null, true)));
            var tblGeary = new Table();
            tblGeary.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblGeary.Append(CreateTableRow(true, false, new string[] {{ "Statistic", "Value", "Meaning" }}));
            tblGeary.Append(CreateTableRow(false, false, new string[] {{ "Observed C", "0.670", "< 1.0 = positive clustering" }}));
            tblGeary.Append(CreateTableRow(false, true, new string[] {{ "Expected C", "1.000", "Random baseline" }}));
            tblGeary.Append(CreateTableRow(false, false, new string[] {{ "Z-score", "-6.35", "Highly significant" }}));
            tblGeary.Append(CreateTableRow(false, true, new string[] {{ "p-value", "1.12 × 10⁻¹⁰", "Strong clustering" }}));
            body.Append(tblGeary);

            body.Append(CreateCalloutBox("Exam Tip: C < 1 always means clustering. C > 1 means dispersion. The further from 1, the stronger the pattern."));

            body.Append(CreateHeading2("1.6 Local Indicators of Spatial Association (LISA)", "Sec1.6"));
            body.Append(CreatePara(CreateRun("Why LISA? ", null, true), CreateRun("Global statistics give one number for the whole map. LISA tells you which specific cells are part of clusters.")));

            body.Append(CreatePara(CreateRun("Local Moran's I Formula:", null, true)));
            {eq_local_moran}
            body.Append(CreatePara("Where z_i = x_i - x̄ (deviation from mean), m_2 = variance, and Σw_ij·z_j = spatial lag (average of neighbors)."));

            body.Append(CreatePara(CreateRun("Four Cluster Types (QUADRANTS):", null, true)));
            var tblLisa = new Table();
            tblLisa.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblLisa.Append(CreateTableRow(true, false, new string[] {{ "Type", "Name", "Meaning", "Example in Data" }}));
            tblLisa.Append(CreateTableRow(false, false, new string[] {{ "HH", "High-High", "High value surrounded by high values", "Hotspot center (3,3)" }}));
            tblLisa.Append(CreateTableRow(false, true, new string[] {{ "LL", "Low-Low", "Low value surrounded by low values", "Grid corners/edges" }}));
            tblLisa.Append(CreateTableRow(false, false, new string[] {{ "HL", "High-Low", "High value surrounded by low values", "Outlier" }}));
            tblLisa.Append(CreateTableRow(false, true, new string[] {{ "LH", "Low-High", "Low value surrounded by high values", "Outlier" }}));
            body.Append(tblLisa);

            body.Append(CreatePara(CreateRun("Example Calculation for Cell (3,3):", null, true)));
            AddBulletItem(body, "Value = 81.65%, Mean", "13.91%");
            AddBulletItem(body, "z_i", "81.65 - 13.91 = 67.74");
            AddBulletItem(body, "Neighbors range", "55% to 75%");
            AddBulletItem(body, "Spatial lag", "≈ 52.40");
            AddBulletItem(body, "I_i", "(67.74 / 335.80) × 52.40 = 10.57 → HH Cluster");

            body.Append(CreateCalloutBox("Exam Tip: LISA uses FDR (False Discovery Rate) correction because testing 100 cells creates many chances for false positives."));

            body.Append(new Paragraph(new Run(new Break {{ Type = BreakValues.Page }})));

            // --------------------------------------------------------------------
            // CHAPTER 2: POINT PATTERN ANALYSIS
            // --------------------------------------------------------------------
            body.Append(CreateHeading1("CHAPTER 2: POINT PATTERN ANALYSIS", "Sec2"));

            body.Append(CreateHeading2("2.1 Getis-Ord Gi* Hotspot Detection", "Sec2.1"));
            body.Append(CreatePara(CreateRun("What is Gi*?", null, true)));
            AddBulletItem(body, "Purpose", "Identifies hotspots (clusters of high values) and coldspots (clusters of low values)");
            AddBulletItem(body, "Key difference from LISA", "Gi* includes the cell itself (w_ii = 1), so it finds pure hotspots, NOT outliers");

            {eq_gi}

            body.Append(CreatePara(CreateRun("Z-Score Interpretation:", null, true)));
            var tblZScore = new Table();
            tblZScore.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblZScore.Append(CreateTableRow(true, false, new string[] {{ "Gi* Z-Score", "Meaning", "Confidence" }}));
            tblZScore.Append(CreateTableRow(false, false, new string[] {{ "> +1.96", "Hotspot", "95%" }}));
            tblZScore.Append(CreateTableRow(false, true, new string[] {{ "> +2.58", "Strong Hotspot", "99%" }}));
            tblZScore.Append(CreateTableRow(false, false, new string[] {{ "<< -1.96", "Coldspot", "95%" }}));
            tblZScore.Append(CreateTableRow(false, true, new string[] {{ "<< -2.58", "Strong Coldspot", "99%" }}));
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
            tblPointTypes.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblPointTypes.Append(CreateTableRow(true, false, new string[] {{ "Pattern", "Description", "Cause", "NNI Value" }}));
            tblPointTypes.Append(CreateTableRow(false, false, new string[] {{ "Clustered", "Points grouped together", "Shared resource, attraction", "<< 1" }}));
            tblPointTypes.Append(CreateTableRow(false, true, new string[] {{ "Random", "No pattern", "Independent events", "= 1" }}));
            tblPointTypes.Append(CreateTableRow(false, false, new string[] {{ "Regular", "Evenly spaced", "Competition, repulsion", "> 1" }}));
            body.Append(tblPointTypes);

            body.Append(CreateHeading2("2.3 Nearest Neighbour Index (NNI)", "Sec2.3"));
            body.Append(CreatePara(CreateRun("Formula:", null, true)));
            {eq_nni}
            body.Append(CreatePara("Where d_obs = average distance to nearest neighbor, d_exp = expected distance if random, ρ = n/A = point density, n = 80 points, A = 100 units²."));

            body.Append(CreatePara(CreateRun("Calculation Steps:", null, true)));
            AddBulletItem(body, "1. Density", "ρ = 80/100 = 0.8");
            AddBulletItem(body, "2. Expected distance", "d_exp = 0.5 / √0.8 = 0.559");
            AddBulletItem(body, "3. Observed distance", "d_obs = 0.312");
            AddBulletItem(body, "4. NNI", "0.312 / 0.559 = 0.558");
            AddBulletItem(body, "5. Z-score", "≈ -7.56");
            body.Append(CreatePara(CreateRun("Conclusion: ", null, true), CreateRun("NNI < 1 → Significantly clustered pattern.")));

            body.Append(CreateCalloutBox("Exam Tip: NNI is a \\\"first-order\\\" statistic — it only looks at the closest neighbor. Use Ripley's K for multiple scales."));

            body.Append(CreateHeading2("2.4 Kernel Density Estimation (KDE)", "Sec2.4"));
            body.Append(CreatePara(CreateRun("Purpose: ", null, true), CreateRun("Converts discrete points into a smooth, continuous surface showing where points are concentrated.")));
            body.Append(CreatePara(CreateRun("Gaussian KDE Formula:", null, true)));
            {eq_kde}
            body.Append(CreatePara(CreateRun("Key Parameter (Bandwidth h):", null, true)));
            AddBulletItem(body, "Small h", "sharp peaks (shows detail but noisy)");
            AddBulletItem(body, "Large h", "smooth surface (hides local patterns)");
            AddBulletItem(body, "This study", "uses h = 1.5 units");
            body.Append(CreatePara(CreateRun("Result: ", null, true), CreateRun("Density surface peaks at the bottom-left hotspot, matching the prevalence cluster.")));

            body.Append(CreateHeading2("2.5 Ripley's K and Besag's L-Function", "Sec2.5"));
            body.Append(CreatePara(CreateRun("Why use this? ", null, true), CreateRun("NNI only checks one distance. Ripley's K checks all distances (multi-scale analysis).")));
            body.Append(CreatePara(CreateRun("Formulas:", null, true)));
            {eq_ripley}
            {eq_besag}

            body.Append(CreatePara(CreateRun("Interpretation of L(r):", null, true)));
            var tblBesag = new Table();
            tblBesag.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblBesag.Append(CreateTableRow(true, false, new string[] {{ "L(r) Value", "Meaning" }}));
            tblBesag.Append(CreateTableRow(false, false, new string[] {{ "L(r) = 0", "Complete Spatial Randomness" }}));
            tblBesag.Append(CreateTableRow(false, true, new string[] {{ "L(r) > 0", "Clustering at distance r" }}));
            tblBesag.Append(CreateTableRow(false, false, new string[] {{ "L(r) < 0", "Dispersion at distance r" }}));
            body.Append(tblBesag);

            body.Append(CreatePara(CreateRun("Results from Assignment:", null, true)));
            AddBulletItem(body, "At r = 1.0", "L(r) = +0.42 → Significant small-scale clustering");
            AddBulletItem(body, "At r = 2.5", "L(r) = +1.28 (peak) → Main clustering scale");
            AddBulletItem(body, "At r > 4.0", "Still above envelope → Global clustering pattern");

            body.Append(CreateCalloutBox("Exam Tip: The peak at r = 2.5 tells us the hotspot is about 2.5 units wide. Edge correction (w_ij) is needed because circles near boundaries are cut off."));

            body.Append(new Paragraph(new Run(new Break {{ Type = BreakValues.Page }})));

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
            tblDefs.Append(new TableProperties(new TableWidth {{ Width = "5000", Type = TableWidthUnitValues.Pct }}, new TableBorders(new TopBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new BottomBorder {{ Val = BorderValues.Single, Size = 12, Color = Navy }}, new InsideHorizontalBorder {{ Val = BorderValues.Single, Size = 4, Color = Light }})));
            tblDefs.Append(CreateTableRow(true, false, new string[] {{ "Term", "Simple Definition" }}));
            tblDefs.Append(CreateTableRow(false, false, new string[] {{ "Spatial Autocorrelation", "Correlation of a variable with itself across space" }}));
            tblDefs.Append(CreateTableRow(false, true, new string[] {{ "Queen Contiguity", "Neighbors share edge OR corner (up to 8)" }}));
            tblDefs.Append(CreateTableRow(false, false, new string[] {{ "Rook Contiguity", "Neighbors share only edge (up to 4)" }}));
            tblDefs.Append(CreateTableRow(false, true, new string[] {{ "Spatial Lag", "Weighted average of neighbor values" }}));
            tblDefs.Append(CreateTableRow(false, false, new string[] {{ "Row-Standardization", "Dividing weights so each row sums to 1" }}));
            tblDefs.Append(CreateTableRow(false, true, new string[] {{ "Hotspot", "Statistically significant cluster of high values" }}));
            tblDefs.Append(CreateTableRow(false, false, new string[] {{ "Coldspot", "Statistically significant cluster of low values" }}));
            tblDefs.Append(CreateTableRow(false, true, new string[] {{ "LISA", "Local Indicator of Spatial Association" }}));
            tblDefs.Append(CreateTableRow(false, false, new string[] {{ "FDR Correction", "Adjusts p-values for multiple testing" }}));
            tblDefs.Append(CreateTableRow(false, true, new string[] {{ "Edge Effect", "Boundary cells have fewer neighbors, biasing results" }}));
            tblDefs.Append(CreateTableRow(false, false, new string[] {{ "Bandwidth", "Smoothing parameter in KDE" }}));
            tblDefs.Append(CreateTableRow(false, true, new string[] {{ "CSR", "Complete Spatial Randomness (null hypothesis)" }}));
            body.Append(tblDefs);

            body.Append(CreateHeading1("SUMMARY: WHAT THE RESULTS PROVE", "Sec5"));
            AddBulletItem(body, "1. Moran's I = 0.36 (Z = 7.13)", "The entire map shows significant positive clustering");
            AddBulletItem(body, "2. Geary's C = 0.67 (Z = -6.35)", "Confirms neighbors are similar to each other");
            AddBulletItem(body, "3. LISA Map", "Cell (3,3) is a High-High hotspot core; edges are Low-Low coldspots");
            AddBulletItem(body, "4. Gi* Map", "Significant hotspot at Z > +2.58; coldspots at Z < -1.96");
            AddBulletItem(body, "5. NNI = 0.558", "Point pattern is significantly clustered");
            AddBulletItem(body, "6. Ripley's K / L-function", "Clustering is significant across all scales from r=0 to r=4.5, peaking at r = 2.5");
"""

start_marker = "footerPart.Footer = new Footer(footerPara);"
end_marker = "// Append Final Section Break linking headers and footers"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    start_idx += len(start_marker)
    new_content = content[:start_idx] + "\n" + new_body + "\n            " + content[end_idx:]
    with open('c:/Users/akshi/Desktop/GIT_STAR/docx_build/Program.cs', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print(f"Failed to find markers: start_idx={start_idx}, end_idx={end_idx}")
