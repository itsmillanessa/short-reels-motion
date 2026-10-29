# Short Reels Motion - instalador para Windows (PowerShell 5.1 o 7).
#
#   irm https://raw.githubusercontent.com/itsmillanessa/short-reels-motion/main/install.ps1 | iex
#   (o pidele a tu agente: "instala Short Reels Motion: https://github.com/itsmillanessa/short-reels-motion")
#
#   Con opciones:  & ([scriptblock]::Create((irm https://raw.githubusercontent.com/itsmillanessa/short-reels-motion/main/install.ps1))) -Yes
#
# Que hace:
#   1. Revisa lo que hace falta: git, Node 22 o mas nuevo, FFmpeg y un navegador Chrome o Edge. Sin -Yes solo dice que
#      falta y como instalarlo; con -Yes lo instala con winget.
#   2. Clona (o actualiza) Short Reels Motion en $HOME\short-reels-motion (o -Dir / SRM_DIR).
#   3. Instala el comando srm global con npm.
#   4. Registra el skill "director de shorts" para Claude Code (~\.claude\skills) y, si usas Codex, en ~\.codex\skills.
#   5. Corre srm doctor.
param(
  [switch]$Yes,
  [switch]$Whisper,
  [string]$Dir = (Join-Path $HOME 'short-reels-motion'),
  [switch]$NoGlobal,
  [switch]$NoSkill
)
$ErrorActionPreference = 'Stop'
$Repo = if ($env:SRM_REPO) { $env:SRM_REPO } else { 'https://github.com/itsmillanessa/short-reels-motion.git' }
$Branch = if ($env:SRM_BRANCH) { $env:SRM_BRANCH } else { 'main' }
if ($env:SRM_DIR) { $Dir = $env:SRM_DIR }
$Src = $env:SRM_SRC
if ($Src) { $Dir = $Src }

function Say($t) { Write-Host ''; Write-Host "> $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [ok] $t" }
function Miss($t) { Write-Host "  [x]  $t" -ForegroundColor Yellow }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
$missing = New-Object System.Collections.Generic.List[string]
function Install-Pkg($what, $wingetId) {
  if (-not $Yes) { $missing.Add($what); return }
  if (-not (Has winget)) { Miss "${what}: falta winget (App Installer, de Microsoft Store)"; $missing.Add($what); return }
  winget install --id $wingetId -e --silent --accept-source-agreements --accept-package-agreements | Out-Host
  Refresh-Path
}

# ---- 1. what the machine needs
Say '1/5 Lo que hace falta'
if (Has git) { Ok 'git' } else { Miss 'git'; Install-Pkg 'git' 'Git.Git' }
$nodeOk = $false
if (Has node) {
  $major = [int](node -p "process.versions.node.split('.')[0]")
  if ($major -ge 22) { Ok "Node $(node -v)"; $nodeOk = $true } else { Miss "Node $(node -v): se necesita 22 o mas nuevo" }
} else { Miss 'Node' }
if (-not $nodeOk) { Install-Pkg 'Node 22+' 'OpenJS.NodeJS.LTS' }
if ((Has ffmpeg) -and (Has ffprobe)) { Ok 'FFmpeg' } else { Miss 'FFmpeg'; Install-Pkg 'FFmpeg' 'Gyan.FFmpeg' }
$browsers = @(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'BraveSoftware\Brave-Browser\Application\brave.exe')
)
$browser = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($browser) { Ok "navegador: $browser" } else { Miss 'un navegador Chrome o Edge'; Install-Pkg 'Google Chrome' 'Google.Chrome' }
if ($Whisper -and -not (Has 'whisper-cli')) { Miss 'whisper: descarga whisper.cpp de https://github.com/ggml-org/whisper.cpp/releases y deja whisper-cli.exe en el PATH' }
if ($missing.Count -gt 0) {
  Write-Host ''
  Write-Host "Falta: $($missing -join ', ')"
  Write-Host 'Vuelve a correr el instalador con -Yes para instalarlo con winget, o instalalo tu y repite.'
  exit 1
}

# ---- 2. the code
if ($Src) {
  Say "2/5 Usando la copia local: $Dir"
  if (-not (Test-Path (Join-Path $Dir 'cli\om.js'))) { throw "SRM_SRC no parece Short Reels Motion: falta cli\om.js en $Dir" }
} elseif (Test-Path (Join-Path $Dir '.git')) {
  Say "2/5 Actualizando $Dir"
  git -C $Dir pull --quiet --ff-only origin $Branch
} elseif (Test-Path $Dir) {
  throw "$Dir ya existe y no es Short Reels Motion; usa -Dir para instalar en otra carpeta"
} else {
  Say "2/5 Descargando Short Reels Motion en $Dir"
  git clone --quiet --branch $Branch $Repo $Dir
}

# ---- 3. the command
Say '3/5 Comando srm'
if ($NoGlobal) { Ok "omitido (-NoGlobal): node `"$Dir\cli\om.js`" funciona igual" }
else { npm install -g --silent --no-audit --no-fund $Dir; Ok 'srm instalado' }

# ---- 4. the skill (a junction: no admin rights needed)
Say '4/5 Skill "director de shorts" para tu agente'
function Link-Skill($skills) {
  New-Item -ItemType Directory -Force -Path $skills | Out-Null
  $target = Join-Path $skills 'short-reels-motion'
  if (Test-Path $target) {
    $item = Get-Item $target -Force
    if (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { Miss "$target ya existe y no es un enlace; no lo toco"; return }
    $item.Delete()
  }
  New-Item -ItemType Junction -Path $target -Target (Join-Path $Dir 'skills\short-reels-motion') | Out-Null
  Ok $target
}
if ($NoSkill) { Ok 'omitido (-NoSkill)' }
else {
  Link-Skill (Join-Path $HOME '.claude\skills')
  if (Test-Path (Join-Path $HOME '.codex')) { Link-Skill (Join-Path $HOME '.codex\skills') }
}

# ---- 5. check
Say '5/5 Revision final'
node (Join-Path $Dir 'cli\om.js') doctor
Write-Host ''
Write-Host 'Listo. Abre tu agente (Claude Code o Codex) y pidele un video, por ejemplo:'
Write-Host '  "Hazme un reel de 30 segundos sobre como usar la IA para resumir correos"'
Write-Host 'Para actualizar Short Reels Motion mas adelante, vuelve a correr este instalador.'
