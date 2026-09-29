# Capture helper (outside Unreal): rebuild gallery after you copy a PNG into screenshots/.
# For a true viewport grab, run Scripts/Capture_Stillwater_Shot.py inside the editor.
param(
  [string]$Image,
  [string]$Note = "Editor capture",
  [string]$Map = "Stillwater",
  [string]$Focus = ""
)

$ErrorActionPreference = "Stop"
$siteRoot = Split-Path $PSScriptRoot -Parent
$shotsDir = Join-Path $siteRoot "screenshots"
$dataDir = Join-Path $siteRoot "data"
$galleryPath = Join-Path $dataDir "gallery.json"
$progressPath = Join-Path $dataDir "progress.json"

New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null

if (-not $Image) {
  Write-Host "Drop a PNG into: $shotsDir"
  Write-Host "Or pass -Image path\to\shot.png"
  Write-Host "Inside Unreal, prefer: Scripts/Capture_Stillwater_Shot.py"
  & "$PSScriptRoot\rebuild-gallery.ps1"
  exit 0
}

if (-not (Test-Path $Image)) { throw "Image not found: $Image" }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ext = [IO.Path]::GetExtension($Image)
if (-not $ext) { $ext = ".png" }
$destName = "editor_$stamp$ext"
$dest = Join-Path $shotsDir $destName
Copy-Item -Path $Image -Destination $dest -Force

$gallery = @{ updated = (Get-Date -Format "yyyy-MM-dd"); shots = @() }
if (Test-Path $galleryPath) {
  $gallery = Get-Content $galleryPath -Raw | ConvertFrom-Json
}

$entry = [pscustomobject]@{
  file = $destName
  capturedAt = (Get-Date).ToUniversalTime().ToString("o")
  date = (Get-Date -Format "yyyy-MM-dd")
  map = $Map
  note = $Note
  source = "import"
}

$shots = @($entry) + @($gallery.shots | Where-Object { $_.file -ne $destName })
$gallery.shots = $shots
$gallery.updated = Get-Date -Format "yyyy-MM-dd"
($gallery | ConvertTo-Json -Depth 6) | Set-Content $galleryPath -Encoding UTF8

if (Test-Path $progressPath) {
  $progress = Get-Content $progressPath -Raw | ConvertFrom-Json
  if (-not $progress.now) { $progress | Add-Member -NotePropertyName now -NotePropertyValue (@{}) }
  $progress.now.map = $Map
  if ($Focus) { $progress.now.focus = $Focus }
  $progress.updated = Get-Date -Format "yyyy-MM-dd"
  ($progress | ConvertTo-Json -Depth 8) | Set-Content $progressPath -Encoding UTF8
}

Write-Host "Added $destName to gallery."
Write-Host "Commit + push docs/progress-site to publish."
