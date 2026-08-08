Remove-Item -Recurse -Force www -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path www | Out-Null
Copy-Item -Path "index.html" -Destination "www\"
Copy-Item -Path "manifest.json" -Destination "www\"
Copy-Item -Path "sw.js" -Destination "www\"
Copy-Item -Path "favicon.ico" -Destination "www\" -ErrorAction SilentlyContinue
Copy-Item -Path "css" -Destination "www\css" -Recurse
Copy-Item -Path "js" -Destination "www\js" -Recurse
Copy-Item -Path "lib" -Destination "www\lib" -Recurse -ErrorAction SilentlyContinue
Copy-Item -Path "assets" -Destination "www\assets" -Recurse -ErrorAction SilentlyContinue
Write-Host "Web assets copied to www folder successfully!"
