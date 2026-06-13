import docx
import os
import re
from bs4 import BeautifulSoup

# 1. Update DOCX
doc_path = "Spatial_Autocorrelation_Enhanced.docx"
output_doc_path = "demo_assign.docx"

authentic_references = [
    "1. Anselin, L. (1995). Local Indicators of Spatial Association—LISA. Geographical Analysis, 27(2), 93-115. https://doi.org/10.1111/j.1538-4632.1995.tb00338.x",
    "2. Tobler, W. R. (1970). A Computer Movie Simulating Urban Growth in the Detroit Region. Economic Geography, 46, 234-240.",
    "3. Cressie, N. A. C. (1993). Statistics for Spatial Data. John Wiley & Sons. ISBN: 978-0-471-00255-0",
    "4. Getis, A., & Ord, J. K. (1992). The Analysis of Spatial Association by Use of Distance Statistics. Geographical Analysis, 24(3), 189-206.",
    "5. Ripley, B. D. (1981). Spatial Statistics. John Wiley & Sons. ISBN: 978-0-471-08367-2",
    "6. O'Sullivan, D., & Unwin, D. J. (2010). Geographic Information Analysis (2nd ed.). John Wiley & Sons."
]

doc = docx.Document(doc_path)

ref_found = False
for p in doc.paragraphs:
    if "References" in p.text and not ref_found:
        ref_found = True
        continue
    
    if ref_found:
        # Check if this paragraph contains the fake references
        if "anti-gravity" in p.text.lower() or "gpt" in p.text.lower() or "cli" in p.text.lower():
            # Clear this paragraph and insert new references
            p.text = "\n".join(authentic_references)
            break

doc.save(output_doc_path)
print(f"Saved {output_doc_path} with authentic references.")

# 2. Update HTML (index.html is the content we prepared earlier)
html_path = "index.html"
if os.path.exists(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, "lxml")
    
    # Find the references heading
    ref_heading = soup.find(string=re.compile("19. References"))
    if ref_heading:
        h2 = ref_heading.find_parent('h2')
        if h2:
            next_p = h2.find_next_sibling('p')
            if next_p:
                next_p.clear()
                ul = soup.new_tag("ul", style="list-style-type: none; padding-left: 0;")
                for ref in authentic_references:
                    li = soup.new_tag("li", style="margin-bottom: 10px;")
                    li.string = ref
                    ul.append(li)
                next_p.append(ul)
                
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    print("Updated index.html references.")
