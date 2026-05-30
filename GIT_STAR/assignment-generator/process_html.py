import os
import re
from bs4 import BeautifulSoup
import shutil

html_path = "Spatial_Autocorrelation_Enhanced_Clean.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "lxml")

# 1. Add CSS
head = soup.new_tag("head")
title = soup.new_tag("title")
title.string = "Spatial Autocorrelation Enhanced"
head.append(title)

style = soup.new_tag("style")
style.string = """
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
}
h1, h2, h3 {
    color: #2c3e50;
    margin-top: 30px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 5px;
}
p {
    margin-bottom: 15px;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
th, td {
    padding: 12px;
    border: 1px solid #ddd;
    text-align: left;
}
th {
    background-color: #3498db;
    color: white;
}
.callout {
    background: #e8f4f8;
    border-left: 5px solid #3498db;
    padding: 15px;
    margin: 20px 0;
    border-radius: 4px;
}
.callout-title {
    font-weight: bold;
    color: #2980b9;
    margin-bottom: 5px;
    display: block;
}
.toc {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 40px;
}
.toc a {
    text-decoration: none;
    color: #34495e;
}
.toc a:hover {
    color: #3498db;
}
img.generated-img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    margin: 20px 0;
    display: block;
}
"""
head.append(style)
if soup.head:
    soup.head.replace_with(head)
else:
    soup.html.insert(0, head)

# 2. Replace Emojis with Callouts
# Find all tables or paragraphs that look like callouts
for p in soup.find_all(['p', 'strong', 'td']):
    text = p.get_text()
    if '📌' in text or '🌍' in text or '🔥' in text or '💡' in text:
        # We will replace emojis directly in the text nodes
        pass

# Actually, doing it via regex on the string is easier for emojis
html_str = str(soup)

emoji_map = {
    '📌 KEY': '<span class="callout-title">🔑 KEY CONCEPT</span>',
    '📌 DEF': '<span class="callout-title">📖 DEFINITION</span>',
    '🌍 LAW': '<span class="callout-title">⚖️ TOBLER\'S FIRST LAW OF GEOGRAPHY</span>',
    '🔥 HOTSPOT': '<span class="callout-title">📍 HOTSPOT</span>',
    '💡 NOTE': '<span class="callout-title">📝 NOTE</span>'
}

for emoji, replacement in emoji_map.items():
    html_str = html_str.replace(emoji, replacement)
    
# Remove other stray emojis
html_str = re.sub(r'[📌🌍🔥💡]', '', html_str)

soup = BeautifulSoup(html_str, "lxml")

# 3. Handle TOC & Headings
# Identify headings (they are currently <p><strong>1. Introduction...</strong></p>)
headings = []
for p in soup.find_all('p'):
    strong = p.find('strong')
    if strong:
        text = strong.get_text(strip=True)
        if re.match(r'^\d+\.\s', text):
            # This is a heading
            h2 = soup.new_tag("h2")
            h2.string = text
            h2['id'] = "section-" + re.sub(r'\W+', '-', text.lower())
            p.replace_with(h2)
            headings.append(h2)

# Find TOC table
toc_header = soup.find(string=re.compile("TABLE OF CONTENTS"))
if toc_header:
    toc_p = toc_header.find_parent('p')
    if toc_p:
        toc_table = toc_p.find_next_sibling('table')
        if toc_table:
            toc_table['class'] = 'toc'
            # Update links in TOC
            rows = toc_table.find_all('tr')
            for i, row in enumerate(rows):
                if i == 0:
                    continue # header
                cols = row.find_all('td')
                if len(cols) >= 2:
                    sec_num = cols[0].get_text(strip=True)
                    sec_title = cols[1].get_text(strip=True)
                    
                    # Find matching heading
                    match = next((h for h in headings if sec_title.lower() in h.get_text(strip=True).lower()), None)
                    if match:
                        a = soup.new_tag("a", href="#" + match['id'])
                        a.string = sec_title
                        cols[1].clear()
                        cols[1].append(a)

# 4. Insert Images
brain_dir = r"C:\Users\akshi\.gemini\antigravity-ide\brain\3f180ed4-3035-4219-989a-9d8a67368476"
assets_dir = "assets"
os.makedirs(assets_dir, exist_ok=True)

images = {
    "Kernel Density Estimation": "kde_heatmap_1779888835744.png",
    "Spatial Interpolation": "spatial_interpolation_1779888854173.png",
    "Point Pattern Analysis": "point_pattern_1779888869538.png"
}

for heading_text, img_filename in images.items():
    src_path = os.path.join(brain_dir, img_filename)
    if os.path.exists(src_path):
        dst_path = os.path.join(assets_dir, img_filename)
        shutil.copy(src_path, dst_path)
        
        match = next((h for h in headings if heading_text.lower() in h.get_text(strip=True).lower()), None)
        if match:
            img_tag = soup.new_tag("img", src=f"assets/{img_filename}", **{'class': 'generated-img'})
            match.insert_after(img_tag)

# Find tables with the callout-titles and convert them to div callouts for better styling
for span in soup.find_all('span', class_='callout-title'):
    parent_td = span.find_parent('td')
    if parent_td:
        parent_tr = parent_td.find_parent('tr')
        parent_table = parent_tr.find_parent('table')
        
        # Get the text from the next td
        next_td = parent_td.find_next_sibling('td')
        if next_td:
            content = next_td.get_text(strip=True)
            div = soup.new_tag("div", **{'class': 'callout'})
            div.append(span)
            
            p = soup.new_tag("p")
            p.string = content
            div.append(p)
            
            parent_table.replace_with(div)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(soup.prettify())

print("Processed HTML saved as index.html")
