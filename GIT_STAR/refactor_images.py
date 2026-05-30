import re
import os

with open(r'c:\Users\akshi\Desktop\GIT_STAR\docx_build\Program.cs', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Heatmap after "1.2 The Dataset: 10×10 Grid"
target_1 = """AddBulletItem(body, "Mean prevalence across all cells", "~13.91%");"""
replace_1 = target_1 + """
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "grid_heatmap.png"), "10x10 Grid Heatmap", ref docPrId, 12);
            body.Append(CreateCaption("Figure 1: Simulated disease prevalence on a 10x10 grid with a clear hotspot centered at (3,3)."));"""

# 2. Moran Scatterplot after "Most points in", "upper-right (high-high) and lower-left (low-low) = clustering"
target_2 = """AddBulletItem(body, "Most points in", "upper-right (high-high) and lower-left (low-low) = clustering");"""
replace_2 = target_2 + """
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "moran_scatterplot.png"), "Moran Scatterplot", ref docPrId, 12);
            body.Append(CreateCaption("Figure 2: Moran scatterplot showing positive spatial autocorrelation (clustering)."));"""

# 3. LISA map after "Exam Tip: LISA uses FDR (False Discovery Rate) correction because testing 100 cells creates many chances for false positives."
target_3 = """body.Append(CreateCalloutBox("Exam Tip: LISA uses FDR (False Discovery Rate) correction because testing 100 cells creates many chances for false positives."));"""
replace_3 = target_3 + """
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "lisa_cluster_map.png"), "LISA Cluster Map", ref docPrId, 12);
            body.Append(CreateCaption("Figure 3: LISA Cluster map highlighting the High-High hotspot and Low-Low coldspots."));"""

# 4. KDE Surface after "Result: ", CreateRun("Density surface peaks at the bottom-left hotspot, matching the prevalence cluster."
target_4 = """body.Append(CreatePara(CreateRun("Result: ", null, true), CreateRun("Density surface peaks at the bottom-left hotspot, matching the prevalence cluster.")));"""
replace_4 = target_4 + """
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "kde_surface.png"), "KDE Surface", ref docPrId, 12);
            body.Append(CreateCaption("Figure 4: Kernel Density Estimation surface showing continuous hotspot concentration."));"""

# 5. Ripley's L after "Exam Tip: The peak at r = 2.5 tells us the hotspot is about 2.5 units wide. Edge correction (w_ij) is needed because circles near boundaries are cut off."
target_5 = """body.Append(CreateCalloutBox("Exam Tip: The peak at r = 2.5 tells us the hotspot is about 2.5 units wide. Edge correction (w_ij) is needed because circles near boundaries are cut off."));"""
replace_5 = target_5 + """
            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "ripley_l_function.png"), "Besag's L Function", ref docPrId, 12);
            body.Append(CreateCaption("Figure 5: Besag's L(r) function showing significant multi-scale clustering peaking at r = 2.5."));"""


# Ensure Path class is used (needs System.IO if not already there, but Program.cs probably has it since it uses FileStream)
content = content.replace(target_1, replace_1)
content = content.replace(target_2, replace_2)
content = content.replace(target_3, replace_3)
content = content.replace(target_4, replace_4)
content = content.replace(target_5, replace_5)

with open(r'c:\Users\akshi\Desktop\GIT_STAR\docx_build\Program.cs', 'w', encoding='utf-8') as f:
    f.write(content)

print("Program.cs successfully updated with image insertion calls.")
