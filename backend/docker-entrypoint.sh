#!/bin/sh
set -e

# Create the tables and the admin account (idempotent). SEED_DEMO=true also
# adds the demo school, which is skipped once any data exists.
if [ "${SEED_DEMO:-false}" = "true" ]; then
  python -m app.seed
else
  python -m app.seed --bare
fi

exec "$@"
