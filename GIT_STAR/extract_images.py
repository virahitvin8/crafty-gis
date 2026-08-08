import os
import zipfile

doc_path = r'c:\Users\akshi\Desktop\GIT_STAR\Spatial_Autocorrelation_Assignment.docx'
out_dir = r'c:\Users\akshi\Desktop\GIT_STAR\extracted_figs'
os.makedirs(out_dir, exist_ok=True)

try:
    with zipfile.ZipFile(doc_path) as z:
        img_count = 0
        for name in z.namelist():
            if name.startswith('word/media/'):
                img_data = z.read(name)
                # get file extension
                ext = os.path.splitext(name)[1]
                filename = f"image_{img_count}{ext}"
                filepath = os.path.join(out_dir, filename)
                with open(filepath, 'wb') as f:
                    f.write(img_data)
                print(f"[+] Extracted: {name} -> {filepath}")
                img_count += 1
        print(f"[+] Successfully extracted {img_count} images.")
except Exception as e:
    print(f"[!] Error: {e}")
