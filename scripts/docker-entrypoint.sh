#!/bin/sh
# Asegura permisos del volumen de subidas (Dokploy lo monta como root) y
# luego ejecuta la app con un usuario sin privilegios.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${UPLOAD_DIR:-/app/uploads}"
  chown -R nextjs:nodejs "${UPLOAD_DIR:-/app/uploads}" 2>/dev/null || true
  exec su-exec nextjs "$@"
fi
exec "$@"
