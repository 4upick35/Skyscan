$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
$nodePath = "C:\Users\4upic\CascadeProjects\weather\node\node-v22.14.0-win-x64"
$projectPath = "C:\Users\4upic\CascadeProjects\weather"
$env:Path = "$dockerPath;$nodePath;$env:Path"

Set-Location $projectPath

$logDir = "$projectPath\logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# 1. Запуск Skyscan в Docker
Write-Host "[Skyscan-Docker] Starting..."
$dockerCheck = docker inspect skyscan --format "{{.State.Status}}" 2>$null
if ($dockerCheck -eq "running") {
    Write-Host "[Skyscan-Docker] Already running"
} else {
    docker compose -f "$projectPath\docker-compose.yml" up -d 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    $status = docker inspect skyscan --format "{{.State.Status}}" 2>$null
    Write-Host "[Skyscan-Docker] Status: $status"
}

# 2. Запуск Cloudflare Tunnel
$tunnelProc = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($tunnelProc) {
    Write-Host "[Skyscan-Tunnel] Already running (PID: $($tunnelProc.Id))"
} else {
    Write-Host "[Skyscan-Tunnel] Starting..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cloudflared"
    $psi.Arguments = "tunnel --config `"$projectPath\config.yml`" run"
    $psi.EnvironmentVariables["PATH"] = "$nodePath;$env:Path"
    $psi.WorkingDirectory = $projectPath
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    Start-Sleep -Seconds 3
    if (!$proc.HasExited) {
        Write-Host "[Skyscan-Tunnel] Started (PID: $($proc.Id))"
    }
}

Write-Host "----------------------------------------"
Write-Host "Skyscan services started successfully!"
Write-Host "App:          http://localhost:9002"
Write-Host "Public:       https://wth.behmatata.xyz"
Write-Host "Nextcloud:    https://nc.behmatata.xyz"
Write-Host "Docker IP:    172.18.0.11 (windsurf-project_default)"
Write-Host "----------------------------------------"
