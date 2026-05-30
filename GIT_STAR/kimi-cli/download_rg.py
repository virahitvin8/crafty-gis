import os
import urllib.request
import zipfile
import shutil

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    deps_dir = os.path.join(base_dir, "src", "kimi_cli", "deps")
    bin_dir = os.path.join(deps_dir, "bin")
    tmp_dir = os.path.join(deps_dir, "tmp")
    
    os.makedirs(bin_dir, exist_ok=True)
    os.makedirs(tmp_dir, exist_ok=True)
    
    rg_url = "https://github.com/BurntSushi/ripgrep/releases/download/15.0.0/ripgrep-15.0.0-x86_64-pc-windows-msvc.zip"
    archive_path = os.path.join(tmp_dir, "ripgrep.zip")
    
    print(f"Downloading ripgrep from {rg_url}...")
    urllib.request.urlretrieve(rg_url, archive_path)
    
    print("Extracting ripgrep...")
    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
        zip_ref.extractall(tmp_dir)
        
    extracted_rg_path = os.path.join(tmp_dir, "ripgrep-15.0.0-x86_64-pc-windows-msvc", "rg.exe")
    target_rg_path = os.path.join(bin_dir, "rg.exe")
    
    print(f"Copying {extracted_rg_path} to {target_rg_path}...")
    shutil.copy2(extracted_rg_path, target_rg_path)
    
    # Cleanup
    print("Cleaning up temporary files...")
    shutil.rmtree(tmp_dir)
    print("ripgrep installation complete!")

if __name__ == "__main__":
    main()
