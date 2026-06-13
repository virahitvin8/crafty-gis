Write-Host "Building and Running the docx generator..." -ForegroundColor Cyan
dotnet run
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Opening document..." -ForegroundColor Green
    Invoke-Item "Spatial_Autocorrelation_Assignment.docx"
} else {
    Write-Host "Build failed." -ForegroundColor Red
}
