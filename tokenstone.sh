#!/bin/bash
# Doppio clic, o ./tokenstone.sh (Linux): accende TokenStone e apre la pagina iniziale
# nel browser. Per spegnere, Ctrl+C o chiudi il terminale.
# Se il cantiere e gia acceso, apre solo la pagina.

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Per accendere il cantiere serve Node.js, versione 18 o successiva."
  echo "  Si scarica da https://nodejs.org, o dal gestore pacchetti della distribuzione."
  echo
  exit 1
fi

exec node tools/server.js "$@"
