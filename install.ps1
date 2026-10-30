# Short Reels Motion - instalador para Windows (Windows PowerShell 5.1 o PowerShell 7).
#
#   irm https://raw.githubusercontent.com/itsmillanessa/short-reels-motion/main/install.ps1 | iex
#   (o pidele a tu agente: "instala Short Reels Motion: https://github.com/itsmillanessa/short-reels-motion")
#
#   Con opciones:   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/itsmillanessa/short-reels-motion/main/install.ps1))) -Yes -Kokoro
#   o con variables antes del one-liner:   $env:SRM_YES = 1; irm https://raw.githubusercontent.com/itsmillanessa/short-reels-motion/main/install.ps1 | iex
#   Desde una copia local:   powershell -ExecutionPolicy Bypass -File install.ps1 -Yes
#
# Que hace:
#   1. Revisa lo que hace falta: git, Node 22 o mas nuevo, FFmpeg y un navegador Chrome, Edge o Brave. Sin -Yes solo dice
#      que falta y como instalarlo; con -Yes lo instala con winget.
#   2. Clona (o actualiza) Short Reels Motion en $HOME\short-reels-motion (o -Dir / SRM_DIR).
#   3. Instala el comando srm global con npm.
#   4. Registra el skill "director de shorts" para Claude Code (~\.claude\skills) y, si usas Codex, en ~\.codex\skills.
#   5. Con -Kokoro instala la voz gratis Kokoro; con -Whisper, whisper para usar tu propia grabacion como voz.
#   6. Corre srm doctor.
#
# Opciones, o su variable de entorno (el one-liner con iex no recibe opciones):
#   -Yes        SRM_YES=1         instala con winget lo que falte del sistema
#   -Kokoro     SRM_KOKORO=1      instala tambien la voz gratis Kokoro (~400 MB, una vez)
#   -Whisper    SRM_WHISPER=1     instala tambien whisper (~9 MB; su modelo, ~490 MB, baja la primera vez que se usa)
#   -Dir RUTA   SRM_DIR           donde va Short Reels Motion (por defecto $HOME\short-reels-motion)
#   -NoGlobal   SRM_NO_GLOBAL=1   no instala el comando srm global (pruebas)
#   -NoSkill    SRM_NO_SKILL=1    no registra el skill
# Mas variables: SRM_REPO, SRM_BRANCH (de donde clonar), SRM_SRC (usar una copia local tal cual, sin clonar).
#
# Este archivo va sin BOM y solo con caracteres ASCII: con BOM, "irm | iex" falla desde la primera linea en Windows
# PowerShell 5.1, y sin BOM ese mismo PowerShell lee mal los acentos. Todo corre dentro de un bloque: con iex no queda
# nada en tu sesion (ni variables, ni funciones, ni $ErrorActionPreference) y un error nunca cierra tu ventana.
& {
param(
  [switch]$Yes,
  [switch]$Kokoro,
  [switch]$Whisper,
  [string]$Dir,
  [switch]$NoGlobal,
  [switch]$NoSkill
)
$ErrorActionPreference = 'Stop'
function Flag($name) { $v = [Environment]::GetEnvironmentVariable($name); return [bool]$v -and ($v -notmatch '^(0|false|no)$') }
if (Flag 'SRM_YES') { $Yes = $true }
if (Flag 'SRM_KOKORO') { $Kokoro = $true }
if (Flag 'SRM_WHISPER') { $Whisper = $true }
if (Flag 'SRM_NO_GLOBAL') { $NoGlobal = $true }
if (Flag 'SRM_NO_SKILL') { $NoSkill = $true }
$Repo = if ($env:SRM_REPO) { $env:SRM_REPO } else { 'https://github.com/itsmillanessa/short-reels-motion.git' }
$Branch = if ($env:SRM_BRANCH) { $env:SRM_BRANCH } else { 'main' }
if (-not $Dir) { $Dir = if ($env:SRM_DIR) { $env:SRM_DIR } else { Join-Path $HOME 'short-reels-motion' } }
$Src = $env:SRM_SRC
if ($Src) { $Dir = $Src }

function Say($t) { Write-Host ''; Write-Host "> $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [ok] $t" }
function Miss($t) { Write-Host "  [x]  $t" -ForegroundColor Yellow }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
# A native command: what it writes to stderr is not a failure (hosts that capture stderr - the ISE, agents without a
# console, remoting - turn each line into an error record, terminating under 'Stop'); its exit code says how it went.
# And its output is decoded as UTF-8: piped to Out-Host, PowerShell reads node's UTF-8 with the console's code page
# (437, 850) and doctor's marks and accents came out garbled. A host without a console refuses the setting: then as it is.
function Run-Native([scriptblock]$cmd) {
  $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $enc = $null
  try { $enc = [Console]::OutputEncoding; [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch { $enc = $null }
  try { & $cmd | Out-Host }
  finally {
    $ErrorActionPreference = $eap
    if ($enc) { try { [Console]::OutputEncoding = $enc } catch { } }
  }
}
# A fresh Windows PowerShell (or PowerShell 7) without this process's policy or modules: what a new window would get
# ("-ExecutionPolicy Bypass" and an agent's PowerShell set this process's policy, which Get-ExecutionPolicy reports).
function Fresh-PS($exe, $command) {
  $keep = @{}
  foreach ($k in 'PSModulePath', 'PSExecutionPolicyPreference') { $keep[$k] = [Environment]::GetEnvironmentVariable($k, 'Process'); [Environment]::SetEnvironmentVariable($k, $null, 'Process') }
  $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { return ((& $exe -NoProfile -NonInteractive -Command $command 2>$null) | Out-String).Trim() } catch { return '' }
  finally {
    $ErrorActionPreference = $eap
    foreach ($k in $keep.Keys) { [Environment]::SetEnvironmentVariable($k, $keep[$k], 'Process') }
  }
}
# What winget just installed is on the machine's PATH, not yet on this window's: add what is missing (never replace it,
# an agent's session can carry entries of its own).
function Refresh-Path {
  $known = $env:Path -split ';'
  foreach ($p in (([Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')) -split ';')) {
    if ($p -and ($known -notcontains $p)) { $env:Path += ";$p"; $known += $p }
  }
}
$missing = New-Object System.Collections.Generic.List[string]
function Install-Pkg($what, $wingetId) {
  if (-not $Yes) { $missing.Add($what); return }
  if (-not (Has winget)) { Miss "${what}: falta winget (App Installer, de Microsoft Store)"; return }   # the caller lists it
  Run-Native { winget install --id $wingetId -e --silent --accept-source-agreements --accept-package-agreements }
  Refresh-Path
}

try {
  # ---- 1. what the machine needs
  Say '1/6 Lo que hace falta'
  if (Has git) { Ok 'git' } else { Miss 'git'; Install-Pkg 'git' 'Git.Git'; if ($Yes -and -not (Has git)) { $missing.Add('git') } }
  $nodeMajor = 0
  if (Has node) { $nodeMajor = [int](node -p "process.versions.node.split('.')[0]") }
  if ($nodeMajor -ge 22) { Ok "Node $(node -v)" }
  else {
    if ($nodeMajor) { Miss "Node $(node -v): se necesita 22 o mas nuevo" } else { Miss 'Node' }
    Install-Pkg 'Node 22+' 'OpenJS.NodeJS.LTS'
    if ($Yes -and -not ((Has node) -and [int](node -p "process.versions.node.split('.')[0]") -ge 22)) { $missing.Add('Node 22+ (abre una terminal nueva si se acaba de instalar)') }
  }
  if ((Has ffmpeg) -and (Has ffprobe)) { Ok 'FFmpeg' }
  else { Miss 'FFmpeg'; Install-Pkg 'FFmpeg' 'Gyan.FFmpeg'; if ($Yes -and -not ((Has ffmpeg) -and (Has ffprobe))) { $missing.Add('FFmpeg') } }
  $browsers = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'BraveSoftware\Brave-Browser\Application\brave.exe'),
    (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\Application\brave.exe')
  )
  $browser = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($browser) { Ok "navegador: $browser" }
  else {
    Miss 'un navegador Chrome o Edge'; Install-Pkg 'Google Chrome' 'Google.Chrome'
    if ($Yes -and -not ($browsers | Where-Object { $_ -and (Test-Path $_) })) { $missing.Add('Google Chrome') }
  }
  if ($missing.Count -gt 0) {
    throw ("falta: $($missing -join ', ')`n" +
      'Vuelve a correr el instalador con -Yes (o $env:SRM_YES = 1 antes del one-liner) para instalarlo con winget, o instalalo tu y repite.')
  }

  # ---- 2. the code
  if ($Src) {
    Say "2/6 Usando la copia local: $Dir"
    if (-not (Test-Path (Join-Path $Dir 'cli\om.js'))) { throw "SRM_SRC no parece Short Reels Motion: falta cli\om.js en $Dir" }
  } elseif (Test-Path (Join-Path $Dir '.git')) {
    Say "2/6 Actualizando $Dir"
    Run-Native { git -C $Dir pull --quiet --ff-only origin $Branch }
    if ($LASTEXITCODE -ne 0) { Miss 'no se pudo actualizar sin conflictos; sigo con lo que hay' }
  } elseif (Test-Path $Dir) {
    throw "$Dir ya existe y no es Short Reels Motion; usa -Dir (o SRM_DIR) para instalar en otra carpeta"
  } else {
    Say "2/6 Descargando Short Reels Motion en $Dir"
    Run-Native { git clone --quiet --branch $Branch $Repo $Dir }
    if ($LASTEXITCODE -ne 0) { throw "git clone fallo ($Repo, rama $Branch)" }
  }
  $cli = Join-Path $Dir 'cli\om.js'

  # ---- 3. the command (npm.cmd, not npm: npm.ps1 does not run where PowerShell scripts are disabled)
  Say '3/6 Comando srm'
  if ($NoGlobal) { Ok "omitido (-NoGlobal): node `"$cli`" funciona igual" }
  else {
    Run-Native { npm.cmd install -g --loglevel=error --no-audit --no-fund $Dir }
    if ($LASTEXITCODE -ne 0) { throw 'npm install -g fallo (mira el error de arriba)' }
    Refresh-Path
    Ok 'srm instalado'
    # PowerShell runs npm's srm.ps1 only when scripts are allowed, and a new Windows has them Restricted. Asked of a fresh
    # PowerShell: this one's own policy is not what a new window gets ("-ExecutionPolicy Bypass", an agent's session), and
    # Windows PowerShell and PowerShell 7 keep theirs apart. Group policy can forbid the change: then it is only said.
    foreach ($ps in @(@('powershell.exe', 'Windows PowerShell'), @('pwsh', 'PowerShell 7'))) {
      if (-not (Has $ps[0])) { continue }
      $policy = Fresh-PS $ps[0] 'Get-ExecutionPolicy'
      if ($policy -notmatch '^(Restricted|AllSigned)$') { continue }
      if ($Yes) {
        $after = Fresh-PS $ps[0] 'try { Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction Stop } catch { }; Get-ExecutionPolicy'
        if ($after -notmatch '^(Restricted|AllSigned)$') { Ok "$($ps[1]) ya puede correr srm (ExecutionPolicy RemoteSigned para tu usuario)" }
        else { Miss "$($ps[1]) no deja correr srm.ps1 ($after) y no se pudo cambiar (politica de tu organizacion?): en cmd o Git Bash srm funciona" }
      } else {
        Miss "$($ps[1]) no deja correr srm.ps1 (ExecutionPolicy $policy): en cmd o Git Bash srm funciona; para PowerShell corre"
        Write-Host '       Set-ExecutionPolicy -Scope CurrentUser RemoteSigned'
      }
    }
  }

  # ---- 4. the skill (a junction: no admin rights needed)
  Say '4/6 Skill "director de shorts" para tu agente'
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

  # ---- 5. the voices that need a one-time install (srm voice --setup)
  Say '5/6 Voces'
  if (-not $Kokoro -and -not $Whisper) {
    Ok 'la voz de Windows sirve desde ya; para la voz gratis Kokoro: srm voice --setup   (o -Kokoro / -Whisper aqui)'
  }
  $partial = $false
  if ($Kokoro -and -not (Has uv)) {
    # kokoro-onnx installs on Python 3.10 to 3.13; uv brings its own (and is what srm uses first)
    $py = ''
    if (Has py) { $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'; try { $py = (& py -0 2>&1 | Out-String) } catch { } finally { $ErrorActionPreference = $eap } }
    if ($py -notmatch '3\.1[0-3]') { Miss 'uv (la voz Kokoro necesita uv o Python 3.10-3.13)'; Install-Pkg 'uv (para la voz Kokoro)' 'astral-sh.uv' }
  }
  foreach ($what in @(@('kokoro', $Kokoro), @('whisper', $Whisper))) {
    if (-not $what[1]) { continue }
    Run-Native { node $cli voice --setup $what[0] }
    if ($LASTEXITCODE -ne 0) { Miss "srm voice --setup $($what[0]) no termino; puedes repetirlo despues"; $partial = $true }
  }

  # ---- 6. check
  Say '6/6 Revision final'
  Run-Native { node $cli doctor }
  Write-Host ''
  Write-Host $(if ($partial -or $missing.Count) { 'Listo, salvo lo marcado con [x] arriba. Abre tu agente (Claude Code o Codex) y pidele un video, por ejemplo:' } else { 'Listo. Abre tu agente (Claude Code o Codex) y pidele un video, por ejemplo:' })
  Write-Host '  "Hazme un reel de 30 segundos sobre como usar la IA para resumir correos"'
  if (-not $NoGlobal -and -not (Has srm)) { Write-Host 'Abre una terminal nueva para usar el comando srm.' }
  Write-Host 'Para actualizar Short Reels Motion mas adelante, vuelve a correr este instalador.'
  $global:LASTEXITCODE = 0
} catch {
  Write-Host ''
  Write-Host "No se pudo terminar la instalacion: $($_.Exception.Message)" -ForegroundColor Red
  $global:LASTEXITCODE = 1
}
} @args
# A failure is the exit code when this runs as a file (-File install.ps1) or in a PowerShell started just to run it (an
# agent's `powershell -Command "irm ... | iex"`, which otherwise exits 0); typed into an open window (iex, or a window
# started with -NoExit) the window stays open. No variables here: through iex nothing may stay behind in the session.
if ($LASTEXITCODE -and ($MyInvocation.MyCommand.Path -or (([Environment]::GetCommandLineArgs() -match '^[-/](c|command|e|ec|encodedcommand)$') -and -not ([Environment]::GetCommandLineArgs() -match '^[-/]noexit$')))) { exit $LASTEXITCODE }
