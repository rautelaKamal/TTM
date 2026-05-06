#!/bin/sh

echo "Running database migrations..."
./packages/db/node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma || echo "WARNING: Migration failed or already up to date, continuing..."

echo "Starting API server..."
exec node apps/api/dist/index.js
