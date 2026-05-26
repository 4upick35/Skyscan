param(
    [switch]$Clean = $false,
    [switch]$SkipBuild = $false,
    [string]$OutputDir = ".\apk-output"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SkyScan APK Builder v1.0" -ForegroundColor Cyan
Write-Host "  Umbrella Corp. Terminal" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Java
try {
    $javaVersion = java -version 2>&1
    Write-Host "[OK] Java:" $javaVersion[0].ToString().Trim() -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Java not found! Install JDK 17+" -ForegroundColor Red
    exit 1
}

# Проверка Android SDK
$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
    $androidHome = $env:ANDROID_SDK_ROOT
}
if (-not $androidHome) {
    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:ProgramFiles\Android\Sdk",
        "${env:ProgramFiles(x86)}\Android\Sdk"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $androidHome = $candidate
            break
        }
    }
}
if ($androidHome -and (Test-Path $androidHome)) {
    Write-Host "[OK] Android SDK: $androidHome" -ForegroundColor Green
    $env:ANDROID_HOME = $androidHome
    $env:ANDROID_SDK_ROOT = $androidHome
} else {
    Write-Host "[WARN] Android SDK not found. Ensure ANDROID_HOME is set." -ForegroundColor Yellow
}

# Проверка Node
try {
    $nodeVer = node --version
    Write-Host "[OK] Node: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Node.js not found!" -ForegroundColor Red
    exit 1
}

# Clean если нужно
if ($Clean -and (Test-Path ".next")) {
    Write-Host "[CLEAN] Removing .next, out, node_modules/.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "out" -ErrorAction SilentlyContinue
}

# Установка зависимостей
Write-Host ""
Write-Host ">>> [1/5] Installing npm dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Сборка Next.js статического экспорта
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host ">>> [2/5] Building Next.js static export..." -ForegroundColor Cyan
    
    # Устанавливаем переменную окружения для статического экспорта
    $env:NEXT_EXPORT = "true"
    
    npx next build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Next.js build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Проверяем, что статический экспорт создан
    if (-not (Test-Path "out")) {
        Write-Host "[FAIL] Static export directory 'out' not found!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Static export created in 'out/'" -ForegroundColor Green
    
    # Копируем service worker и manifest в out, если их там нет
    if (Test-Path "public\sw.js") {
        Copy-Item "public\sw.js" "out\sw.js" -Force
        Write-Host "[OK] Service worker copied to out/" -ForegroundColor Green
    }
    if (Test-Path "public\manifest.json") {
        Copy-Item "public\manifest.json" "out\manifest.json" -Force
    }
    if (Test-Path "public\icon.svg") {
        Copy-Item "public\icon.svg" "out\icon.svg" -Force
    }
} else {
    Write-Host ""
    Write-Host ">>> [2/5] Skipping Next.js build (--SkipBuild)" -ForegroundColor Yellow
}

# Sync Capacitor
Write-Host ""
Write-Host ">>> [3/5] Syncing Capacitor..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Capacitor synced" -ForegroundColor Green

# Создание директории для выходного APK
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Сборка APK
Write-Host ""
Write-Host ">>> [4/5] Building Android APK..." -ForegroundColor Cyan
Set-Location "android"

# Проверяем существование gradlew
if (-not (Test-Path "gradlew.bat")) {
    Write-Host "[FAIL] gradlew.bat not found in android/" -ForegroundColor Red
    exit 1
}

# Собираем release APK
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] APK build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] APK built successfully" -ForegroundColor Green

# Копируем APK в выходную директорию
$apkPath = "app\build\outputs\apk\release"
if (Test-Path $apkPath) {
    $apkFiles = Get-ChildItem "$apkPath\*.apk"
    foreach ($apk in $apkFiles) {
        $dest = Join-Path "..\$OutputDir" $apk.Name
        Copy-Item $apk.FullName $dest -Force
        Write-Host "[OK] Copied: $dest" -ForegroundColor Green
    }
}

Set-Location $ProjectRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "APK files in: $OutputDir" -ForegroundColor Green
Write-Host ""

# Показываем файлы
Get-ChildItem $OutputDir -Filter "*.apk" | ForEach-Object {
    $sizeInMB = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  - $($_.Name) ($sizeInMB MB)" -ForegroundColor White
}

Write-Host ""
Write-Host "To install on device:" -ForegroundColor Yellow
Write-Host "  adb install $OutputDir\app-release-unsigned.apk" -ForegroundColor Gray