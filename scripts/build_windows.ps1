param(
  [string]$AppName = "MFStat"
)

$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path "$PSScriptRoot\..").Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"
$PipExe = Join-Path $BackendDir ".venv\Scripts\pip.exe"
$PyInstallerExe = Join-Path $BackendDir ".venv\Scripts\pyinstaller.exe"

if (-not (Test-Path $PythonExe)) {
  throw "Python venv not found: $PythonExe"
}

if (-not (Test-Path $PyInstallerExe)) {
  & $PipExe install -r (Join-Path $BackendDir "requirements.txt") pyinstaller
}

Push-Location $FrontendDir
try {
  npm run build
}
finally {
  Pop-Location
}

$env:PYINSTALLER_CONFIG_DIR = Join-Path $BackendDir ".pyinstaller"

Push-Location $BackendDir
try {
  & $PyInstallerExe `
    --noconfirm `
    --windowed `
    --name $AppName `
    --add-data "..\frontend\dist;frontend\dist" `
    --collect-all webview `
    desktop_launcher.py
}
finally {
  Pop-Location
}

$DistDir = Join-Path $BackendDir "dist"
$OneFolder = Join-Path $DistDir $AppName
$ZipPath = Join-Path $DistDir "$AppName-windows-x64.zip"

if (-not (Test-Path $OneFolder)) {
  throw "Build succeeded but output directory not found: $OneFolder"
}

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path "$OneFolder\*" -DestinationPath $ZipPath
Write-Host "Built output directory: $OneFolder"
Write-Host "Built zip archive: $ZipPath"
