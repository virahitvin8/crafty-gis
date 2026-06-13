import os
import glob

files = glob.glob("**/*", recursive=True)
files = [f for f in files if os.path.isfile(f)]
files.sort(key=os.path.getmtime, reverse=True)

print("Recently modified files:")
for f in files[:20]:
    print(f" - {f}: {os.path.getsize(f)} bytes, mtime={os.path.getmtime(f)}")
