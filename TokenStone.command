#!/bin/bash
# Doppio clic (macOS): accende TokenStone e apre la pagina iniziale nel browser.
# Per spegnere, chiudi questa finestra del Terminale.
# Se il cantiere e gia acceso, apre solo la pagina.

cd "$(dirname "$0")" || exit 1

# Aperto dal Finder, il Terminale non sempre vede il Node di nvm o di Homebrew
if ! command -v node >/dev/null 2>&1; then
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Per accendere il cantiere serve Node.js, versione 18 o successiva."
  echo "  Si scarica da https://nodejs.org - poi fai di nuovo doppio clic qui."
  echo
  read -r -p "  Premi Invio per chiudere. "
  exit 1
fi

node tools/server.js "$@" || read -r -p "  Premi Invio per chiudere. "
