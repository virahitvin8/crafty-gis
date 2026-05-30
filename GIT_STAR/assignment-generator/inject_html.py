import os
import re
from bs4 import BeautifulSoup

def inject():
    # Read the new standalone HTML that has the correct content and references
    with open("index.html", "r", encoding="utf-8") as f:
        new_html = f.read()

    soup = BeautifulSoup(new_html, "lxml")
    
    # 1. Extract styles (we just want all CSS rules)
    styles = soup.find_all("style")
    css_content = ""
    for s in styles:
        css_content += s.string if s.string else ""
        
    # 2. Extract doc-page divs EXCEPT the cover page 
    # (assuming standalone has a cover page, we skip it because we want the JS template one)
    doc_pages = soup.find_all("div", class_="doc-page")
    main_content_html = ""
    for page in doc_pages:
        # Check if it's a cover page
        if "cover-page" not in page.get("class", []):
            main_content_html += str(page) + "\n"

    # 3. Read templates/index.html
    template_path = "templates/index.html"
    with open(template_path, "r", encoding="utf-8") as f:
        tpl_html = f.read()

    # Replace the main content in const html = `...`
    # We will use regex to find the start and end of the MAIN CONTENT section inside buildPreview
    start_marker = "<!-- MAIN CONTENT -->"
    end_marker = "<!-- end main content -->"
    
    pattern = re.compile(rf"({start_marker}).*?({end_marker})", re.DOTALL)
    
    # Check if the markers exist in tpl_html
    if not pattern.search(tpl_html):
        print("Markers not found, adding them manually or searching differently.")
        # fallback: find where COVER PAGE ends
        cover_end = "</div>\n  </div>\n  <!-- MAIN CONTENT -->"
        if cover_end not in tpl_html:
            # Let's just do a manual string split based on known structure
            parts = tpl_html.split("<!-- MAIN CONTENT -->")
            if len(parts) > 1:
                part1 = parts[0] + "<!-- MAIN CONTENT -->\n"
                part2 = "\n<!-- end main content -->" + parts[1].split("<!-- end main content -->")[1]
                tpl_html = part1 + main_content_html + part2
    else:
        tpl_html = pattern.sub(rf"\1\n{main_content_html}\n\2", tpl_html)

    # 4. Inject CSS
    # Let's just find the <style> block in templates/index.html and replace everything inside it,
    # OR append to it. Appending is safer.
    # Actually, we can replace the specific .doc-page styles if needed, but it's easier to just
    # overwrite the <style> block completely, except we need the UI styles.
    # So we'll just append our specific styles before </style>
    
    # Remove some global styles from css_content to avoid breaking UI
    css_content = re.sub(r'body\s*{[^}]*}', '', css_content)
    
    tpl_html = tpl_html.replace("</style>", css_content + "\n</style>")

    with open(template_path, "w", encoding="utf-8") as f:
        f.write(tpl_html)

    print("Successfully injected Spatial Autocorrelation content into templates/index.html")

if __name__ == "__main__":
    inject()
