import os
import base64
from bs4 import BeautifulSoup
import re

with open("Spatial_Autocorrelation_Enhanced.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "lxml")

os.makedirs("assets", exist_ok=True)

img_count = 1
for img in soup.find_all("img"):
    src = img.get("src", "")
    if src.startswith("data:image"):
        # extract base64
        header, b64 = src.split(",", 1)
        ext = header.split(";")[0].split("/")[1]
        filename = f"image_{img_count}.{ext}"
        filepath = os.path.join("assets", filename)
        with open(filepath, "wb") as img_file:
            img_file.write(base64.b64decode(b64))
        
        img["src"] = f"assets/{filename}"
        img_count += 1

with open("Spatial_Autocorrelation_Enhanced_Clean.html", "w", encoding="utf-8") as f:
    f.write(soup.prettify())

print("Cleaned HTML and extracted images.")
