#!/bin/sh

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma || echo "WARNING: Migration failed or already up to date, continuing..."

echo "Starting API server..."
exec node dist/index.js
