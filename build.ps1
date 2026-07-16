$ErrorActionPreference = "SilentlyContinue"
$result = & npx next build 2>&1 | Out-String
$result | Out-File -FilePath "build-result.txt" -Encoding utf8
Write-Host "BUILD COMPLETE"
