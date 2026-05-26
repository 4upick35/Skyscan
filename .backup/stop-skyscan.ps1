$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
$env:Path = "$dockerPath;$env:Path"

Write-Host "Stopping Skyscan services..."

# Stop cloudflared
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "  cloudflared stopped"

# Stop Docker container
docker compose -f "C:\Users\4upic\CascadeProjects\weather\docker-compose.yml" down 2>&1
Write-Host "  Skyscan Docker container stopped"

Write-Host "All Skyscan services stopped."
