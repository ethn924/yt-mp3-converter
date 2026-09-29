# ============================================================
#  YT-MP3 Converter - Bootstrap
#  Telecharge Node.js 22 LTS, yt-dlp et FFmpeg dans ./bin/
# ============================================================

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = $PSScriptRoot
$binDir = Join-Path $root 'bin'
$nodeDir = Join-Path $binDir 'node'
$ytDlpExe = Join-Path $binDir 'yt-dlp.exe'
$ffmpegDir = Join-Path $binDir 'ffmpeg'
$ffmpegExe = Join-Path $ffmpegDir 'bin\ffmpeg.exe'
$ffprobeExe = Join-Path $ffmpegDir 'bin\ffprobe.exe'

$nodeVersion = 'v22.11.0'
$nodeUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"
$ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
$ffmpegUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'

function Write-Step($msg) { Write-Host "`n-> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  [i] $msg" -ForegroundColor Yellow }

function Stop-NodeProcesses {
    $procs = Get-Process node -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Info "Arret des processus Node en cours..."
        $procs | ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
        }
        Start-Sleep -Seconds 2
    }
}

function Remove-WithRetry($path, $maxRetries = 5) {
    if (-not (Test-Path $path)) { return }
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            Remove-Item $path -Recurse -Force -ErrorAction Stop
            return
        } catch {
            if ($i -eq $maxRetries) { throw }
            Write-Info "Tentative $i echouee, retry dans 2s..."
            Start-Sleep -Seconds 2
        }
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  YT-MP3 Converter - Installation automatique" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }

# 1. Node.js 22 LTS portable
Write-Step "Verification de Node.js 22 LTS..."
$nodeExe = Join-Path $nodeDir 'node.exe'
$needNode = $true
if (Test-Path $nodeExe) {
    $ver = & $nodeExe -v 2>$null
    if ($ver -match 'v2[2-9]\.') {
        Write-Ok "Node.js $ver deja present"
        $needNode = $false
    } else {
        Write-Info "Ancienne version Node $ver detectee, mise a jour..."
        Stop-NodeProcesses
        Remove-WithRetry $nodeDir
    }
}
if ($needNode) {
    Write-Info "Telechargement de Node.js $nodeVersion (~30 Mo)..."
    $zip = Join-Path $env:TEMP "node-$nodeVersion.zip"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $zip -UseBasicParsing
    $tmp = Join-Path $env:TEMP "node-extract-$(Get-Random)"
    Write-Info "Extraction..."
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
    if (Test-Path $nodeDir) { Remove-WithRetry $nodeDir }
    Move-Item -Path $inner.FullName -Destination $nodeDir
    Remove-Item $zip -Force
    Remove-Item $tmp -Recurse -Force
    Write-Ok "Node.js $nodeVersion installe"
}

$npmCmd = Join-Path $nodeDir 'npm.cmd'

# 2. yt-dlp
Write-Step "Verification de yt-dlp..."
if (Test-Path $ytDlpExe) {
    Write-Ok "yt-dlp deja present"
} else {
    Write-Info "Telechargement de yt-dlp (~17 Mo)..."
    Invoke-WebRequest -Uri $ytDlpUrl -OutFile $ytDlpExe -UseBasicParsing
    Write-Ok "yt-dlp installe"
}

# 3. FFmpeg
Write-Step "Verification de FFmpeg..."
if ((Test-Path $ffmpegExe) -and (Test-Path $ffprobeExe)) {
    Write-Ok "FFmpeg deja present"
} else {
    Write-Info "Telechargement de FFmpeg (~80 Mo, patiente 1-2 min)..."
    $zip = Join-Path $env:TEMP "ffmpeg.zip"
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $zip -UseBasicParsing
    $tmp = Join-Path $env:TEMP "ffmpeg-extract-$(Get-Random)"
    Write-Info "Extraction..."
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
    if (Test-Path $ffmpegDir) { Remove-WithRetry $ffmpegDir }
    Move-Item -Path $inner.FullName -Destination $ffmpegDir
    Remove-Item $zip -Force
    Remove-Item $tmp -Recurse -Force
    Write-Ok "FFmpeg installe"
}

# 4. npm install
Write-Step "Installation des dependances npm..."
Set-Location $root
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    & $npmCmd install
    if ($LASTEXITCODE -ne 0) { throw "Echec de npm install" }
    Write-Ok "Dependances installees"
} else {
    Write-Ok "Dependances deja presentes"
}

# 5. .env
if (-not (Test-Path (Join-Path $root '.env'))) {
    @"
PORT=3000
NODE_ENV=development
MAX_CONCURRENT_DOWNLOADS=3
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
MAX_FILE_SIZE_MB=50
ALLOWED_ORIGINS=http://localhost:3000
"@ | Out-File -FilePath (Join-Path $root '.env') -Encoding ascii
    Write-Ok "Fichier .env cree"
}

# 6. downloads/
if (-not (Test-Path (Join-Path $root 'downloads'))) {
    New-Item -ItemType Directory -Path (Join-Path $root 'downloads') -Force | Out-Null
}

# 7. Liberer le port 3000
Write-Step "Liberation du port 3000..."
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $conn | ForEach-Object {
        Write-Info "Arret du PID $($_.OwningProcess)"
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}
Write-Ok "Port 3000 disponible"

# 8. Enrichir le PATH
$env:PATH = "$nodeDir;$binDir;$ffmpegDir\bin;" + $env:PATH

# 9. Lancer le serveur
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Demarrage du serveur..." -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} | Out-Null

& $nodeExe (Join-Path $root 'server.js')

Write-Host ""
Write-Host "Le serveur s'est arrete." -ForegroundColor Yellow
Read-Host "Appuyez sur Entree pour fermer"
