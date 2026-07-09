# Deprecated: template APIs now run on the unified Django backend (port 8000).
Write-Host 'Use scripts/start-backend.ps1 instead (single server on port 8000).'
& (Join-Path $PSScriptRoot 'start-backend.ps1')
