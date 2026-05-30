import os

with open(r'c:\Users\akshi\Desktop\GIT_STAR\docx_build\Program.cs', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            // Append Final Section Break linking headers and footers"""

replace = """            AddInlineImage(body, mainPart, Path.Combine(imagesDir, "the_end.png"), "The End", ref docPrId, 16);
            
            // Append Final Section Break linking headers and footers"""

content = content.replace(target, replace)

with open(r'c:\Users\akshi\Desktop\GIT_STAR\docx_build\Program.cs', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added the_end.png to Program.cs")
