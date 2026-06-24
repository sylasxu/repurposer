#!/bin/bash
set -e

echo "Starting Repurposer development environment..."

# Kill existing backend/frontend processes first
kill_port() {
  local port=$1
  local name=$2
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing existing $name on port $port..."
    kill -9 $pids 2>/dev/null || true
  fi
}

kill_port 8000 "backend"
kill_port 3000 "frontend"

# Start PostgreSQL if not running
if ! docker ps | grep -q repurposer-db; then
  echo "Starting PostgreSQL..."
  docker run -d --name repurposer-db \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=repurposer \
    -p 5432:5432 \
    postgres:16-alpine 2>/dev/null || true
fi

# Start backend
cd apps/api
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

# Start frontend
cd ../web
pnpm dev &
WEB_PID=$!

# Cleanup on exit
trap "kill $API_PID $WEB_PID 2>/dev/null || true; exit" INT TERM

wait
