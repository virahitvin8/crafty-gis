import mammoth

with open("Spatial_Autocorrelation_Enhanced.docx", "rb") as docx_file:
    result = mammoth.convert_to_html(docx_file)
    html = result.value
    messages = result.messages
    with open("Spatial_Autocorrelation_Enhanced.html", "w", encoding="utf-8") as html_file:
        html_file.write(html)
    print(f"Messages: {messages}")

print("Done")
