# Rebuild docs/progress-site/data/gallery.json from screenshots on disk.
# Useful if you drop PNGs manually or after a manual HighResShot copy.
param(
  [string]$Note = "Manual screenshot"
)

$ErrorActionPreference = "Stop"
$siteRoot = Split-Path $PSScriptRoot -Parent
$shotsDir = Join-Path $siteRoot "screenshots"
$dataDir = Join-Path $siteRoot "data"
$galleryPath = Join-Path $dataDir "gallery.json"

New-Item -ItemType Directory -Force -Path $shotsDir, $dataDir | Out-Null

$files = Get-ChildItem -Path $shotsDir -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -match '\.(png|jpe?g)$' } |
  Sort-Object LastWriteTime -Descending

$existing = @{}
if (Test-Path $galleryPath) {
  try {
    $prev = Get-Content $galleryPath -Raw | ConvertFrom-Json
    foreach ($s in @($prev.shots)) {
      if ($s.file) { $existing[$s.file] = $s }
    }
  } catch {}
}

$shots = @()
foreach ($f in $files) {
  if ($existing.ContainsKey($f.Name)) {
    $shots += $existing[$f.Name]
    continue
  }
  $shots += [pscustomobject]@{
    file = $f.Name
    capturedAt = $f.LastWriteTimeUtc.ToString("o")
    date = $f.LastWriteTime.ToString("yyyy-MM-dd")
    map = "imported"
    note = $Note
    source = "manual"
  }
}

$payload = [pscustomobject]@{
  updated = (Get-Date -Format "yyyy-MM-dd")
  shots = $shots
}

($payload | ConvertTo-Json -Depth 6) | Set-Content -Path $galleryPath -Encoding UTF8
Write-Host "Gallery rebuilt: $($shots.Count) shot(s) → $galleryPath"
