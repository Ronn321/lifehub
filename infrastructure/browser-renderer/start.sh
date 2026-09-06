#!/bin/sh
set -e

# Headful-Modus (BROWSER_HEADFUL=1): Chromium läuft sichtbar unter einem
# virtuellen X-Server statt headless — vollständiger Browser-Fingerprint
# (echtes Window-Handling, kein Headless-User-Agent-Muster) als Basis für
# Captcha-/Bot-Detection. Ohne die Umgebungsvariable bleibt alles headless.
if [ "${BROWSER_HEADFUL}" = "1" ]; then
  mkdir -p /tmp/.X11-unix
  chmod 1777 /tmp/.X11-unix 2>/dev/null || true
  Xvfb :99 -screen 0 "${BROWSER_XVFB_SCREEN:-1920x1080x24}" -nolisten tcp &
  XVFB_PID=$!
  export DISPLAY=:99
  # Kurz auf das Display warten (Xvfb-Start), dann Chromium starten.
  sleep 1
  if ! kill -0 "$XVFB_PID" 2>/dev/null; then
    echo "Xvfb konnte nicht gestartet werden — Abbruch" >&2
    exit 1
  fi
  echo "Xvfb läuft auf :99 (pid ${XVFB_PID}) — Headful-Modus aktiv"
fi

exec node server.js
