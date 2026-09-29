# Add a Stillwater progress entry and optionally attach screenshots.
# Usage:
#   pwsh docs/progress-site/scripts/add-entry.ps1 -Title "Fog pass" -Summary "Tuned exterior fog density." -Tags setup,atmosphere -Screenshots fog1.png,fog2.png
param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Summary,
  [string]$Tags = "",
  [string]$Screenshots = "",
  [string]$Date = (Get-Date -Format "yyyy-MM-dd")
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
# $PSScriptRoot = docs/progress-site/scripts -> site root is parent
$siteRoot = Split-Path $PSScriptRoot -Parent
$jsonPath = Join-Path $siteRoot "data\progress.json"

$data = Get-Content $jsonPath -Raw | ConvertFrom-Json
$idBase = ($Title.ToLower() -replace "[^a-z0-9]+", "-").Trim("-")
$id = "$Date-$idBase"

$tagList = @()
if ($Tags) { $tagList = $Tags.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ } }

$shotList = @()
if ($Screenshots) {
  $shotList = $Screenshots.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$entry = [pscustomobject]@{
  id = $id
  date = $Date
  title = $Title
  summary = $Summary
  tags = $tagList
  screenshots = $shotList
}

$entries = @($data.entries) + @($entry)
$data.entries = $entries
$data.updated = $Date

($data | ConvertTo-Json -Depth 8) | Set-Content -Path $jsonPath -Encoding UTF8
Write-Host "Added entry: $id"
Write-Host "Edit screenshots under: $(Join-Path $siteRoot 'screenshots')"
Write-Host "Commit + push to refresh the live journal."
