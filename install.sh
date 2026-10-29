#!/usr/bin/env bash
# Short Reels Motion — instalador para macOS y Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/itsmillanessa/short-reels-motion/main/install.sh | bash
#   (o pídeselo a tu agente: «instala Short Reels Motion: https://github.com/itsmillanessa/short-reels-motion»)
#
# Qué hace:
#   1. Revisa lo que hace falta: git, Node 22 o más nuevo, FFmpeg y un navegador Chrome (Chrome, Chromium, Edge,
#      Brave…). Sin --yes solo dice qué falta y cómo instalarlo; con --yes lo instala (Homebrew en macOS, apt en Linux).
#   2. Clona (o actualiza) Short Reels Motion en ~/short-reels-motion (o --dir / SRM_DIR).
#   3. Instala el comando `srm` global con npm.
#   4. Registra el skill «director de shorts» para Claude Code (~/.claude/skills) y, si usas Codex, en ~/.codex/skills.
#   5. Con --whisper instala whisper-cpp (para usar tu propia grabación como voz, palabra por palabra).
#   6. Corre `srm doctor`.
#
# Opciones (después de `bash -s --` si lo corres con curl):
#   --yes        instala lo que falte del sistema sin preguntar
#   --whisper    instala también whisper-cpp
#   --dir RUTA   dónde va Short Reels Motion (por defecto ~/short-reels-motion)
#   --no-global  no instala el comando `srm` global (pruebas)
#   --no-skill   no registra el skill
# Variables: SRM_DIR, SRM_REPO, SRM_BRANCH (de dónde clonar), SRM_SRC (usar una copia local tal cual, sin clonar).
set -euo pipefail

SRM_REPO="${SRM_REPO:-https://github.com/itsmillanessa/short-reels-motion.git}"
SRM_BRANCH="${SRM_BRANCH:-main}"
SRM_DIR="${SRM_DIR:-$HOME/short-reels-motion}"
SRM_SRC="${SRM_SRC:-}"
YES=""; WHISPER=""; NO_GLOBAL=""; NO_SKILL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) YES=1 ;;
    --whisper) WHISPER=1 ;;
    --dir) SRM_DIR="$2"; shift ;;
    --no-global) NO_GLOBAL=1 ;;
    --no-skill) NO_SKILL=1 ;;
    *) echo "opción desconocida: $1"; exit 2 ;;
  esac
  shift
done
[ -n "$SRM_SRC" ] && SRM_DIR="$SRM_SRC"

say() { printf '\n\033[1m› %s\033[0m\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
miss() { printf '  ✗ %s\n' "$*"; }
has() { command -v "$1" >/dev/null 2>&1; }
OS="$(uname -s)"
MISSING=()

# ---- 1. what the machine needs
say "1/6 Lo que hace falta"
install_pkg() {   # $1 = what, $2 = brew formula (or "--cask x"), $3 = apt package
  if [ -z "$YES" ]; then MISSING+=("$1"); return 1; fi
  if [ "$OS" = "Darwin" ]; then
    has brew || { miss "$1: falta Homebrew (https://brew.sh); instálalo y vuelve a correr esto"; MISSING+=("$1"); return 1; }
    # shellcheck disable=SC2086
    brew install $2
  elif has apt-get; then
    sudo apt-get update -qq && sudo apt-get install -y "$3"
  else
    miss "$1: instálalo con el gestor de paquetes de tu sistema"; MISSING+=("$1"); return 1
  fi
}
if has git; then ok "git"; else miss "git"; install_pkg "git" "git" "git" || true; fi
NODE_OK=""
if has node; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$NODE_MAJOR" -ge 22 ]; then ok "Node $(node -v)"; NODE_OK=1; else miss "Node $(node -v): se necesita 22 o más nuevo"; fi
else miss "Node"; fi
if [ -z "$NODE_OK" ]; then
  if [ "$OS" = "Darwin" ]; then install_pkg "Node 22+" "node" "nodejs" && NODE_OK=1 || true
  else MISSING+=("Node 22+ (Linux: https://github.com/nvm-sh/nvm y luego «nvm install 22»)"); fi
fi
if has ffmpeg && has ffprobe; then ok "FFmpeg"; else miss "FFmpeg"; install_pkg "FFmpeg" "ffmpeg" "ffmpeg" || true; fi
CHROME=""
if [ "$OS" = "Darwin" ]; then
  for app in "Google Chrome" "Chromium" "Microsoft Edge" "Brave Browser" "Arc" "Comet" "Vivaldi" "Opera"; do
    [ -d "/Applications/$app.app" ] || [ -d "$HOME/Applications/$app.app" ] && { CHROME="$app"; break; }
  done
else
  for bin in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge brave-browser; do has "$bin" && { CHROME="$bin"; break; }; done
fi
if [ -n "$CHROME" ]; then ok "navegador: $CHROME"; else miss "un navegador Chrome"; install_pkg "Google Chrome" "--cask google-chrome" "chromium-browser" || true; fi
if [ -n "$WHISPER" ]; then
  if has whisper-cli; then ok "whisper"; else install_pkg "whisper-cpp" "whisper-cpp" "whisper-cpp" || true; fi
fi
if [ "${#MISSING[@]}" -gt 0 ]; then
  echo
  echo "Falta: ${MISSING[*]}"
  echo "Vuelve a correr el instalador con --yes para instalarlo (macOS: Homebrew; Linux: apt), o instálalo tú y repite."
  exit 1
fi

# ---- 2. the code
if [ -n "$SRM_SRC" ]; then
  say "2/6 Usando la copia local: $SRM_DIR"
  [ -f "$SRM_DIR/cli/om.js" ] || { echo "SRM_SRC no parece Short Reels Motion: falta cli/om.js en $SRM_DIR"; exit 1; }
elif [ -d "$SRM_DIR/.git" ]; then
  say "2/6 Actualizando $SRM_DIR"
  git -C "$SRM_DIR" pull --quiet --ff-only origin "$SRM_BRANCH" || echo "  (no se pudo actualizar sin conflictos; sigo con lo que hay)"
elif [ -e "$SRM_DIR" ]; then
  echo "$SRM_DIR ya existe y no es Short Reels Motion; usa --dir para instalar en otra carpeta"; exit 1
else
  say "2/6 Descargando Short Reels Motion en $SRM_DIR"
  git clone --quiet --branch "$SRM_BRANCH" "$SRM_REPO" "$SRM_DIR"
fi

# ---- 3. the command
say "3/6 Comando srm"
if [ -n "$NO_GLOBAL" ]; then
  ok "omitido (--no-global): node \"$SRM_DIR/cli/om.js\" funciona igual"
else
  npm install -g --silent --no-audit --no-fund "$SRM_DIR"
  ok "srm instalado ($(npm prefix -g)/bin/srm)"
fi

# ---- 4. the skill
say "4/6 Skill «director de shorts» para tu agente"
link_skill() {   # $1 = skills folder of an agent
  mkdir -p "$1"
  local target="$1/short-reels-motion"
  if [ -e "$target" ] && [ ! -L "$target" ]; then miss "$target ya existe y no es un enlace; no lo toco"; return; fi
  ln -sfn "$SRM_DIR/skills/short-reels-motion" "$target"
  ok "$target"
}
if [ -n "$NO_SKILL" ]; then ok "omitido (--no-skill)"
else
  link_skill "$HOME/.claude/skills"
  if [ -d "$HOME/.codex" ]; then link_skill "$HOME/.codex/skills"; fi
fi

# ---- 5. a name clash: an old "srm" (secure delete) earlier on PATH would run instead
say "5/6 Revisando el nombre srm"
if [ -z "$NO_GLOBAL" ]; then
  FOUND="$(command -v srm || true)"
  if [ -n "$FOUND" ] && ! grep -q "short-reels-motion" "$FOUND" 2>/dev/null && [ "$(cd "$(dirname "$FOUND")" && pwd -P)" != "$(npm prefix -g)/bin" ]; then
    miss "otro programa responde a «srm» ($FOUND): usa el comando «short-reels-motion»"
  else ok "srm es Short Reels Motion"; fi
fi

# ---- 6. check
say "6/6 Revisión final"
node "$SRM_DIR/cli/om.js" doctor || true
cat <<'TXT'

Listo. Abre tu agente (Claude Code o Codex) y pídele un video, por ejemplo:
  «Hazme un reel de 30 segundos sobre cómo usar la IA para resumir correos»

El agente escribe el guion, te lo pasa para aprobar, hace el video y te abre el studio para que comentes.
Para actualizar Short Reels Motion más adelante, vuelve a correr este instalador.
TXT
