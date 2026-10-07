#!/usr/bin/env bash

# ==============================================================================
# PathPrint - Service Orchestration Script (Phase 1)
# Launches FastAPI Backend (port 8000) and Vite React Frontend (port 5173)
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}   🚀 Starting PathPrint Fullstack Services (Phase 1) ${NC}"
echo -e "${CYAN}=====================================================${NC}"

# Function to kill existing processes on ports 8000 and 5173
kill_stale_ports() {
    echo -e "${YELLOW}🔍 Checking and clearing stale processes on ports 8000 & 5173...${NC}"
    
    local pids_8000
    pids_8000=$(lsof -ti:8000 2>/dev/null || true)
    if [ -n "$pids_8000" ]; then
        echo -e "${YELLOW}  • Killing existing process(es) on port 8000: $pids_8000${NC}"
        echo "$pids_8000" | xargs kill -9 2>/dev/null || true
    fi

    local pids_5173
    pids_5173=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$pids_5173" ]; then
        echo -e "${YELLOW}  • Killing existing process(es) on port 5173: $pids_5173${NC}"
        echo "$pids_5173" | xargs kill -9 2>/dev/null || true
    fi

    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    
    sleep 1
    echo -e "${GREEN}✓ Ports 8000 and 5173 are clear.${NC}"
}

# 1. Clear ports before starting fresh
kill_stale_ports

# Python virtual environment detection
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python"
VENV_UVICORN="$SCRIPT_DIR/venv/bin/uvicorn"

if [ ! -f "$VENV_PYTHON" ]; then
    # Check parent venv fallback
    if [ -f "$SCRIPT_DIR/../venv/bin/python" ]; then
        VENV_PYTHON="$SCRIPT_DIR/../venv/bin/python"
        VENV_UVICORN="$SCRIPT_DIR/../venv/bin/uvicorn"
    else
        VENV_PYTHON="python3"
        VENV_UVICORN="uvicorn"
    fi
fi

# Cleanup handler on exit (Ctrl+C)
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down PathPrint services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 2. Start FastAPI Backend
echo -e "\n${BLUE}▶ Starting FastAPI Backend on http://localhost:8000 ...${NC}"
cd "$SCRIPT_DIR/backend"
"$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait briefly for backend bind
sleep 2

# 3. Start Vite Frontend
echo -e "${GREEN}▶ Starting Vite Frontend on http://localhost:5173 ...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host --port 5173 &
FRONTEND_PID=$!

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}  ✓ PathPrint (Phase 1) is live!                     ${NC}"
echo -e "${GREEN}  • Frontend UI : ${CYAN}http://localhost:5173              ${NC}"
echo -e "${GREEN}  • Backend API : ${CYAN}http://localhost:8000              ${NC}"
echo -e "${GREEN}  • API Docs    : ${CYAN}http://localhost:8000/docs         ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}Press [Ctrl+C] to stop all services.${NC}\n"

wait
