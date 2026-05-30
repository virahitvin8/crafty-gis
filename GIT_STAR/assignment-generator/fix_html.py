import os
import base64
import re

base_dir = r"c:\Users\akshi\Desktop\stats assignment"
html_path = os.path.join(base_dir, "templates", "index.html")
logo_path = os.path.join(base_dir, "shuats_logo.png")

with open(logo_path, "rb") as f:
    b64_logo = base64.b64encode(f.read()).decode('utf-8')
logo_data_uri = f"data:image/png;base64,{b64_logo}"

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Update CSS for strict A4 printing, page borders, and avoiding page breaks inside elements
css_updates = """
  /* Document preview styles */
  #doc-preview {
    padding: 0;
    background: #e5e7eb;
    font-family: 'Playfair Display', 'Georgia', serif;
    color: #000;
  }

  .doc-page {
    max-width: 210mm; /* A4 width */
    margin: 0 auto 40px;
    padding: 20mm;
    background: white;
    position: relative;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    box-sizing: border-box;
    border: 2px solid #000; /* Page Border */
    page-break-after: always;
    break-after: page;
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 10mm; /* Let browser handle outer margin */
    }
    
    body {
      background: #fff;
    }

    #doc-preview {
      background: #fff;
      padding: 0;
    }

    .doc-page {
      margin: 0;
      box-shadow: none;
      width: 100%;
      max-width: 100%;
      border: 3px solid #000; /* Thicker page border for print */
      padding: 15mm;
      height: auto;
      page-break-after: always;
      break-after: page;
    }

    /* Prevent breaking inside critical elements */
    h1, h2, h3, h4, .topic-banner, .section-heading, table, .formula-box, .note-box, .cover-submitted-section, .doc-list {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

  /* Typography Colors - Strictly Dark */
  h1, h2, h3, h4, .section-heading, .sub-heading, .body-text, td, th {
    color: #000 !important;
  }
  
  .topic-banner {
    background: #f4f4f5;
    color: #000;
    padding: 24px 30px;
    border-radius: 8px;
    border: 2px solid #000;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    page-break-inside: avoid;
  }

  .topic-banner-left h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.6rem;
    line-height: 1.2;
    color: #000;
    margin: 0;
  }

  .topic-banner-right {
    font-family: 'DM Serif Display', serif;
    font-size: 2.2rem;
    color: #000;
    font-weight: bold;
  }

  /* Cover page specific */
  .cover-page {
    text-align: center;
    padding: 20mm;
    background: white;
    color: #000;
    position: relative;
    border: 3px solid #000;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    height: 100%;
  }

  @media print {
    .cover-page {
      border: 3px solid #000;
      padding: 15mm;
      height: 100%;
    }
  }

  .cover-institution {
    font-family: 'Libre Baskerville', serif;
    font-size: 16px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #000;
    margin-bottom: 8px;
    font-weight: 800;
  }

  .cover-institution-sub {
    font-family: 'Libre Baskerville', serif;
    font-size: 12px;
    color: #000;
    margin-bottom: 30px;
    font-weight: bold;
  }

  .cover-program-tag {
    display: inline-block;
    padding: 8px 22px;
    border: 2px solid #000;
    font-size: 14px;
    color: #000;
    margin-bottom: 12px;
    font-weight: bold;
  }

  .cover-course-tag {
    display: inline-block;
    padding: 6px 18px;
    border: 2px solid #000;
    font-size: 13px;
    color: #000;
    margin-bottom: 24px;
    font-weight: bold;
  }

  .cover-main-title {
    font-family: 'DM Serif Display', serif;
    font-size: 2.8rem;
    line-height: 1.15;
    margin-bottom: 8px;
    color: #000;
  }

  .cover-sub-title {
    font-family: 'DM Serif Display', serif;
    font-style: italic;
    font-size: 1.6rem;
    color: #000;
    margin-bottom: 40px;
  }

  .cover-divider {
    width: 100px;
    height: 3px;
    background: #000;
    margin: 0 auto 40px;
  }

  .cover-submitted-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px 40px;
    text-align: left;
    max-width: 600px;
    margin: 0 auto;
    page-break-inside: avoid;
  }

  .cover-submitted-block .block-title {
    font-size: 13px;
    text-transform: uppercase;
    color: #000;
    margin-bottom: 8px;
    border-bottom: 2px solid #000;
    padding-bottom: 4px;
    font-weight: 900;
  }

  .cover-submitted-block .block-line {
    font-size: 1.2rem;
    color: #000;
    line-height: 1.6;
    font-weight: bold;
  }

  .cover-submitted-block .block-line.sub {
    font-size: 1rem;
    color: #000;
    font-weight: normal;
  }

  /* The End page */
  .end-page {
    text-align: center;
    padding: 60px 40px;
    background: white;
    color: #000;
  }
  .end-title {
    font-size: 2.5rem;
    color: #000;
    margin-bottom: 24px;
    font-weight: bold;
  }
"""

# Apply CSS updates. We replace everything between /* Document preview styles */ and /* Status */
html = re.sub(r'/\* Document preview styles \*/.*?/\* Status \*/', css_updates + "\n  /* Status */", html, flags=re.DOTALL)

# Re-write the buildPreview function. Note the removal of the Summaries as requested.
js_logic = """
function buildPreview(name, pid, prog, batch, ts, seed) {
  pid_val = pid;
  const course = 'MAS 744 — Geospatial Statistics- II';

  const html = `
<div id="doc-preview-inner">
  <!-- COVER PAGE -->
  <div class="doc-page cover-page">
    <div class="cover-content">
      <div class="cover-institution">SAM HIGGINBOTTOM UNIVERSITY OF AGRICULTURE, TECHNOLOGY AND SCIENCES</div>
      <div class="cover-institution-sub">SHUATS, Prayagraj - 211007, Uttar Pradesh, India</div>
      
      <img src="__LOGO_URL__" style="width: 140px; height: auto; margin: 0 auto 32px; display: block;" alt="SHUATS Logo">
      
      <div class="cover-program-tag">M.Sc. GIS & REMOTE SENSING (SEMESTER-II)</div><br>
      <div class="cover-course-tag">Course: ${course}</div>
      
      <div class="cover-main-title">SPATIAL AUTOCORRELATION</div>
      <div class="cover-sub-title">&amp; Point Pattern Analysis</div>
      <div class="cover-divider"></div>

      <div class="cover-submitted-section">
        <div class="cover-submitted-block">
          <div class="block-title">Submitted By</div>
          <div class="block-line">${name}</div>
          <div class="block-line sub">PID: ${pid}</div>
          <div class="block-line sub">Program: ${prog}</div>
        </div>
        <div class="cover-submitted-block">
          <div class="block-title">Submitted To</div>
          <div class="block-line">Mis. Arpita Esther</div>
          <div class="block-line sub">Dept. of Mathematics & Statistics</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TOC PAGE -->
  <div class="doc-page">
    <div class="toc-page">
      <div class="toc-header">Table of Contents</div>
      <div class="toc-subline">${course} · Assignment Overview</div>
      <div class="toc-divider-line"></div>

      ${tocEntry('h1','TOPIC 1','Spatial Autocorrelation, Moran\\'s I &amp; Getis-Ord Gi*','1')}
      ${tocEntry('h2','1.1','Spatial Autocorrelation — Definition &amp; Types','1')}
      ${tocEntry('h2','1.2','Moran\\'s I — The Core Measure','2')}
      ${tocEntry('h2','1.3','Getis-Ord Gi* — Local Hotspot Analysis','3')}
      
      ${tocEntry('h1','TOPIC 2','Point Pattern Analysis &amp; Hotspot Detection','4')}
      ${tocEntry('h2','2.1','Point Pattern Analysis — Definition &amp; Types','4')}
      ${tocEntry('h2','2.2','Method 1: Nearest Neighbour Analysis (NNA)','5')}
      ${tocEntry('h2','2.3','Method 2: Ripley\\'s K Function','5')}
      ${tocEntry('h2','2.4','Hotspot Detection — Kernel Density Estimation','6')}
      ${tocEntry('h2','2.5','Complete Workflow in GIS','6')}
    </div>
  </div>

  <!-- PAGE 1: TOPIC 1 -->
  <div class="doc-page">
    <div class="content-page">
      <div class="topic-banner">
        <div class="topic-banner-left">
          <div class="tag" style="font-weight: bold; margin-bottom: 5px;">MAS 744 — Geospatial Statistics- II</div>
          <h2>SPATIAL AUTOCORRELATION</h2>
        </div>
        <div class="topic-banner-right">01</div>
      </div>

      <div class="section-heading"><span class="snum">1.1</span> Spatial Autocorrelation</div>
      <div class="sub-heading">Definition</div>
      <div class="body-text">Spatial Autocorrelation is a measure that tells us whether geographic features (like villages, rainfall stations, or land cover patches) that are close to each other are more similar or more different compared to features that are far apart. In simple words, it answers the question: <em>Are nearby things similar to each other?</em></div>
      <div class="body-text">This concept is based on the <strong>First Law of Geography</strong> proposed by Waldo Tobler (1970), which states:</div>
      <div class="note-box">"Everything is related to everything else, but near things are more related than distant things." — Waldo Tobler, 1970</div>

      <div class="sub-heading">Types of Spatial Autocorrelation</div>
      <table class="doc-table">
        <tr><th>Type</th><th>Meaning &amp; Explanation</th></tr>
        <tr><td><strong>Positive Autocorrelation</strong></td><td>Similar values are found near each other. Example: High rainfall areas surrounded by other high rainfall areas. Most common pattern in nature.</td></tr>
        <tr><td><strong>No Autocorrelation (Random)</strong></td><td>Values are scattered randomly with no spatial pattern. Example: Random distribution of soil sample values with no grouping.</td></tr>
        <tr><td><strong>Negative Autocorrelation</strong></td><td>Dissimilar values are next to each other (checkerboard). Example: High crop yield areas surrounded by low yield areas due to soil variation.</td></tr>
      </table>

      <div class="sub-heading">Why is Spatial Autocorrelation Important in GIS?</div>
      <ul class="doc-list">
        <li>It tells us whether a spatial pattern is random or structured.</li>
        <li>It helps choose the right statistical method for analysis.</li>
        <li>Standard statistics assume data independence; ignoring spatial dependence gives wrong results.</li>
        <li>It is the foundation for hotspot analysis, cluster detection, and spatial regression.</li>
      </ul>
    </div>
    ${footerHtml(name,pid,ts,1,course)}
  </div>

  <!-- PAGE 2: Moran's I -->
  <div class="doc-page">
    <div class="content-page">
      <div class="section-heading"><span class="snum">1.2</span> Moran's I — The Core Measure</div>
      <div class="sub-heading">Definition</div>
      <div class="body-text">Moran's I is the most widely used statistical measure to quantify spatial autocorrelation. It was developed by <strong>Patrick Alfred Pierce Moran in 1950</strong>. It gives a single number summarising whether values are clustered, dispersed, or random — a "correlation coefficient for space."</div>

      <div class="formula-box"><strong>I = (N / W) × [ Σᵢ Σⱼ wᵢⱼ (xᵢ – x̄)(xⱼ – x̄) ] / [ Σᵢ (xᵢ – x̄)² ]</strong></div>

      <table class="doc-table">
        <tr><th>Symbol</th><th>Meaning</th></tr>
        <tr><td>I</td><td>Moran's I value (the result)</td></tr>
        <tr><td>N</td><td>Total number of spatial units or locations</td></tr>
        <tr><td>W</td><td>Sum of all spatial weights (wᵢⱼ) across all pairs</td></tr>
        <tr><td>wᵢⱼ</td><td>Spatial weight between location i and j (1 = neighbors, 0 = not)</td></tr>
        <tr><td>xᵢ</td><td>Value of the variable at location i</td></tr>
        <tr><td>x̄</td><td>Mean value of the variable across all locations</td></tr>
        <tr><td>(xᵢ – x̄)(xⱼ – x̄)</td><td>Numerator: measures how neighboring locations deviate from mean together</td></tr>
        <tr><td>Σᵢ (xᵢ – x̄)²</td><td>Denominator: total variance used to normalize the result</td></tr>
      </table>

      <div class="sub-heading">Interpretation of Moran's I</div>
      <table class="doc-table">
        <tr><th>Moran's I Value</th><th>Interpretation</th><th>GIS/RS Example</th></tr>
        <tr><td><strong>Close to +1</strong></td><td>Strong Positive Autocorrelation (Clustering)</td><td>NDVI values cluster — forests near forests, bare land near bare land</td></tr>
        <tr><td><strong>Close to 0</strong></td><td>No Autocorrelation (Random Pattern)</td><td>Randomly distributed soil pH with no spatial pattern</td></tr>
        <tr><td><strong>Close to -1</strong></td><td>Strong Negative Autocorrelation (Dispersion)</td><td>Checkerboard of high/low crop yield in mixed agriculture zone</td></tr>
      </table>

      <div class="sub-heading">Statistical Testing of Moran's I</div>
      <div class="formula-box"><strong>Z-score = (I – E[I]) / √Var[I]</strong><br><br>
      <em>E[I] = -1/(N-1) &nbsp;|&nbsp; p-value &lt; 0.05 = statistically significant pattern</em></div>

      <div class="note-box">Important: Moran's I is a GLOBAL statistic. It gives one value for the entire study area. It tells you THAT clustering exists but NOT WHERE it is located. For local-level detection, we use Getis-Ord Gi*.</div>
    </div>
    ${footerHtml(name,pid,ts,2,course)}
  </div>

  <!-- PAGE 3: Getis-Ord -->
  <div class="doc-page">
    <div class="content-page">
      <div class="section-heading"><span class="snum">1.3</span> Getis-Ord Gi* — Local Hotspot Analysis</div>
      <div class="sub-heading">Definition</div>
      <div class="body-text">The <strong>Getis-Ord Gi*</strong> statistic (pronounced "Gee-I-Star") is a LOCAL spatial statistic that identifies specific locations which are statistically significant hotspots or coldspots. Unlike Moran's I which gives one result for the whole study area, Gi* gives a separate result (Z-score and p-value) for EVERY SINGLE location in the dataset. Developed by Getis and Ord in 1992.</div>

      <div class="formula-box"><strong>Gi* = [ Σⱼ wᵢⱼ xⱼ – x̄ Σⱼ wᵢⱼ ] / [ S √{ (N Σⱼ wᵢⱼ² – (Σⱼ wᵢⱼ)²) / (N–1) } ]</strong></div>

      <table class="doc-table">
        <tr><th>Symbol</th><th>Meaning</th></tr>
        <tr><td>Gi*</td><td>The Gi* score for each individual location i</td></tr>
        <tr><td>wᵢⱼ</td><td>Spatial weight between location i and j</td></tr>
        <tr><td>xⱼ</td><td>Value of the attribute at neighboring location j</td></tr>
        <tr><td>x̄</td><td>Global mean of the attribute across all locations</td></tr>
        <tr><td>N</td><td>Total number of spatial units</td></tr>
        <tr><td>S</td><td>Standard deviation of attribute values</td></tr>
      </table>

      <div class="sub-heading">Interpretation of Gi* Results</div>
      <table class="doc-table">
        <tr><th>Gi* Z-score</th><th>Type</th><th>What It Means</th></tr>
        <tr><td>High Positive + p &lt; 0.05</td><td><strong>HOTSPOT</strong></td><td>Location and neighbors have unusually HIGH values — significant high-value cluster</td></tr>
        <tr><td>High Negative + p &lt; 0.05</td><td><strong>COLDSPOT</strong></td><td>Location and neighbors have unusually LOW values — significant low-value cluster</td></tr>
        <tr><td>Near 0 + p &gt; 0.05</td><td>Not Significant</td><td>Pattern at this location is random. Cannot be called hotspot or coldspot.</td></tr>
      </table>

      <div class="sub-heading">Key Difference: Moran's I vs. Gi*</div>
      <table class="doc-table">
        <tr><th>Feature</th><th>Moran's I</th><th>Gi*</th></tr>
        <tr><td>Scale</td><td>GLOBAL — one result for whole area</td><td>LOCAL — result for each location</td></tr>
        <tr><td>Output</td><td>Single index value</td><td>Z-score and p-value per location</td></tr>
        <tr><td>Purpose</td><td>Detects IF clustering exists</td><td>Detects WHERE hotspots/coldspots are</td></tr>
      </table>
    </div>
    ${footerHtml(name,pid,ts,3,course)}
  </div>

  <!-- PAGE 4: TOPIC 2 -->
  <div class="doc-page">
    <div class="content-page">
      <div class="topic-banner">
        <div class="topic-banner-left">
          <div class="tag" style="font-weight: bold; margin-bottom: 5px;">MAS 744 — Geospatial Statistics- II</div>
          <h2>POINT PATTERN ANALYSIS</h2>
        </div>
        <div class="topic-banner-right">02</div>
      </div>

      <div class="section-heading"><span class="snum">2.1</span> Point Pattern Analysis</div>
      <div class="sub-heading">Definition</div>
      <div class="body-text">Point Pattern Analysis (PPA) is a set of statistical methods used to examine the spatial distribution of discrete point locations. It studies whether a set of points (disease cases, tree locations, crime events, earthquake epicenters) are arranged in a <strong>RANDOM, CLUSTERED, or DISPERSED</strong> pattern across a geographic area.</div>

      <div class="sub-heading">Three Types of Spatial Point Patterns</div>
      <table class="doc-table">
        <tr><th>Pattern</th><th>Description</th><th>Real-World GIS Example</th></tr>
        <tr><td><strong>Random</strong></td><td>Points scattered with no specific order. Null hypothesis = CSR.</td><td>Random placement of lightning strike locations on flat terrain.</td></tr>
        <tr><td><strong>Clustered</strong></td><td>Points group in specific areas due to an underlying driver. Most common in nature.</td><td>Disease cases near contaminated water; fire hotspots in dry forest regions.</td></tr>
        <tr><td><strong>Dispersed</strong></td><td>Points more evenly spaced than random — suggests competition or planning.</td><td>Mobile phone towers at regular distances; wells deliberately spaced in a field.</td></tr>
      </table>

      <div class="note-box">Null Hypothesis: Complete Spatial Randomness (CSR). All PPA tests compare observed patterns to CSR. CSR assumes: equal probability for any location, independence of each point, and Poisson distribution of point counts.</div>
    </div>
    ${footerHtml(name,pid,ts,4,course)}
  </div>

  <!-- PAGE 5: NNA & Ripley -->
  <div class="doc-page">
    <div class="content-page">
      <div class="section-heading"><span class="snum">2.2</span> Method 1: Nearest Neighbour Analysis (NNA)</div>
      <div class="body-text">NNA measures the average distance from each point to its nearest neighboring point and compares this to the expected distance under CSR (Complete Spatial Randomness).</div>

      <div class="formula-box"><strong>NNR = d(obs) / d(exp) &nbsp;&nbsp;&nbsp; where &nbsp;&nbsp;&nbsp; d(exp) = 0.5 / √(n/A)</strong></div>

      <div class="sub-heading">Interpretation of NNR</div>
      <table class="doc-table">
        <tr><th>NNR Value</th><th>Pattern</th><th>Meaning</th></tr>
        <tr><td><strong>NNR &lt; 1</strong></td><td>CLUSTERED</td><td>Points closer together than random. Real process is causing clustering.</td></tr>
        <tr><td><strong>NNR = 1</strong></td><td>RANDOM (CSR)</td><td>Observed distances match expected. No spatial structure detected.</td></tr>
        <tr><td><strong>NNR &gt; 1</strong></td><td>DISPERSED</td><td>Points more spread out than random. Suggests planning or competition.</td></tr>
      </table>

      <div class="section-heading"><span class="snum">2.3</span> Method 2: Ripley's K Function</div>
      <div class="body-text">Ripley's K function is an advanced <strong>multi-scale</strong> point pattern analysis method. Instead of only looking at nearest neighbor distance, it counts points within successively larger circle radii to detect clustering or dispersion at MULTIPLE spatial scales simultaneously. Developed by Brian Ripley in 1976.</div>

      <div class="formula-box"><strong>K(r) = (A / n²) × Σᵢ Σⱼ (1 / wᵢⱼ) × I(dᵢⱼ &lt; r) &nbsp;&nbsp; for i ≠ j</strong></div>

      <div class="sub-heading">The L Function — Standardized Version of K</div>
      <div class="formula-box"><strong>L(r) = √[K(r) / π] – r</strong></div>

      <table class="doc-table">
        <tr><th>L(r) Value</th><th>Pattern Interpretation</th></tr>
        <tr><td>L(r) &gt; 0 (above CSR envelope)</td><td>CLUSTERING at that distance scale — more points than expected within radius r</td></tr>
        <tr><td>L(r) = 0 (on CSR line)</td><td>RANDOM pattern at that scale — same as expected under CSR</td></tr>
        <tr><td>L(r) &lt; 0 (below CSR envelope)</td><td>DISPERSION at that scale — fewer points than expected</td></tr>
      </table>
    </div>
    ${footerHtml(name,pid,ts,5,course)}
  </div>

  <!-- PAGE 6: KDE & Conclusion -->
  <div class="doc-page">
    <div class="content-page">
      <div class="section-heading"><span class="snum">2.4</span> Kernel Density Estimation (KDE)</div>
      <div class="body-text">KDE creates a continuous smooth density surface (raster) from point data, showing where points are most densely concentrated. Each point spreads as a smooth 'kernel' (bell-shaped) and contributions are summed at every location to create a density map. Widely used in crime analysis, wildlife ecology, accident mapping, and disease surveillance.</div>

      <div class="formula-box"><strong>f(x) = (1 / n×h) × Σ K((x – xᵢ) / h)</strong></div>

      <table class="doc-table">
        <tr><th>Bandwidth Setting</th><th>Effect on Output</th></tr>
        <tr><td>Small Bandwidth (h small)</td><td>Very localized, bumpy surface. Captures fine details. Risk of over-fitting.</td></tr>
        <tr><td>Large Bandwidth (h large)</td><td>Very smooth, generalized surface. Shows broad regional patterns. Risk of over-smoothing.</td></tr>
      </table>

      <div class="section-heading"><span class="snum">2.5</span> Complete Workflow in GIS</div>
      <ul class="doc-list">
        <li><strong>Collect Point Data:</strong> GPS survey, digitizing, or imagery extraction.</li>
        <li><strong>Load into GIS:</strong> Import CSV/shapefile into ArcGIS Pro or QGIS.</li>
        <li><strong>Define Study Area:</strong> Set boundary polygon for analysis region.</li>
        <li><strong>Conduct NNA:</strong> Get NNR and check if pattern is random, clustered, or dispersed.</li>
        <li><strong>Apply Ripley's K:</strong> Multi-scale analysis — see at which distances clustering occurs.</li>
        <li><strong>Run KDE:</strong> Create visual density surface (raster) showing hotspot zones.</li>
      </ul>
    </div>
    ${footerHtml(name,pid,ts,6,course)}
  </div>

  <!-- THE END PAGE -->
  <div class="doc-page">
    <div class="end-page">
      <div class="end-title">— <em>The End</em> —</div>
      <div class="end-sig">
        <strong>${name}</strong><br>
        ${pid} · ${prog}<br>
        ${batch}
      </div>
    </div>
  </div>

</div>`;

  document.getElementById('doc-preview').innerHTML = html;
}
""".replace("__LOGO_URL__", logo_data_uri)

html = re.sub(r'function buildPreview\(.*?\n\}', js_logic, html, flags=re.DOTALL)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
