# Start the unified InfraPedia backend (Django on port 8000).
# Run the frontend separately: cd frontend && npm run dev
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'

Write-Host 'Starting InfraPedia backend on http://127.0.0.1:8000 ...'
Push-Location $Backend
try {
    python manage.py runserver 127.0.0.1:8000
} finally {
    Pop-Location
}
