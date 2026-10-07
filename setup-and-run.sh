#!/usr/bin/env bash

# ==============================================================================
# PathPrint - 1-Click Setup & Launch Script
# Automates environment setup, dependency installation, and service orchestration.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color Palette
CYAN='\033[0;36m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}${BOLD}=====================================================${NC}"
echo -e "${CYAN}${BOLD}       🧭 PathPrint - 1-Click Setup & Launcher        ${NC}"
echo -e "${CYAN}${BOLD}=====================================================${NC}\n"

# ------------------------------------------------------------------------------
# 1. Check Prerequisites (Python 3 & Node.js)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ [1/5] Checking system prerequisites...${NC}"

if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python 3 is required but not found in PATH.${NC}"
    echo -e "Please install Python 3.10+ from https://www.python.org/downloads/"
    exit 1
fi

if ! command -v npm &>/dev/null; then
    echo -e "${RED}❌ Node.js and npm are required but not found in PATH.${NC}"
    echo -e "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Python $(python3 --version | cut -d' ' -f2) and Node $(node -v) detected.${NC}"

# ------------------------------------------------------------------------------
# 2. Configure Environment Files
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [2/5] Checking environment configuration...${NC}"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        echo -e "${YELLOW}  • Creating root .env from .env.example...${NC}"
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    else
        echo -e "${YELLOW}  • Creating default .env file...${NC}"
        touch "$SCRIPT_DIR/.env"
    fi
fi

if [ ! -f "$SCRIPT_DIR/frontend/.env" ]; then
    if [ -f "$SCRIPT_DIR/.env" ]; then
        echo -e "${YELLOW}  • Linking frontend/.env...${NC}"
        cp "$SCRIPT_DIR/.env" "$SCRIPT_DIR/frontend/.env"
    fi
fi
echo -e "${GREEN}✓ Environment configuration ready.${NC}"

# ------------------------------------------------------------------------------
# 3. Python Virtual Environment & Backend Dependencies
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [3/5] Setting up Python backend environment...${NC}"

VENV_DIR="$SCRIPT_DIR/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}  • Creating virtual environment at ./venv ...${NC}"
    python3 -m venv "$VENV_DIR"
fi

VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"
VENV_UVICORN="$VENV_DIR/bin/uvicorn"

# Verify pip and install backend dependencies if needed
if [ ! -f "$VENV_DIR/.installed" ]; then
    echo -e "${YELLOW}  • Installing backend dependencies (this may take ~30s on first run)...${NC}"
    "$VENV_PIP" install --upgrade pip --quiet
    "$VENV_PIP" install -r "$SCRIPT_DIR/backend/requirements.txt" --quiet
    touch "$VENV_DIR/.installed"
    echo -e "${GREEN}✓ Python dependencies installed.${NC}"
else
    echo -e "${GREEN}✓ Python virtualenv verified.${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Frontend Node Modules Installation
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [4/5] Setting up React frontend dependencies...${NC}"

cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}  • Installing npm dependencies (first run only)...${NC}"
    npm install --quiet
    echo -e "${GREEN}✓ Frontend packages installed.${NC}"
else
    echo -e "${GREEN}✓ Frontend packages verified.${NC}"
fi
cd "$SCRIPT_DIR"

# ------------------------------------------------------------------------------
# 5. Clear Stale Ports & Start Services
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}▶ [5/5] Launching fullstack services...${NC}"

kill_stale_ports() {
    local pids_8000 pids_5173
    pids_8000=$(lsof -ti:8000 2>/dev/null || true)
    if [ -n "$pids_8000" ]; then
        echo "$pids_8000" | xargs kill -9 2>/dev/null || true
    fi

    pids_5173=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$pids_5173" ]; then
        echo "$pids_5173" | xargs kill -9 2>/dev/null || true
    fi

    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    sleep 1
}

kill_stale_ports

# Trap shutdown signals to terminate both servers cleanly
cleanup() {
    echo -e "\n\n${YELLOW}🛑 Shutting down PathPrint services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped cleanly. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start FastAPI Backend
cd "$SCRIPT_DIR/backend"
"$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 2

# Start Vite Frontend
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host --port 5173 &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

# Live Banner
echo -e "\n${GREEN}${BOLD}=====================================================${NC}"
echo -e "${GREEN}${BOLD}  ✨ PathPrint is live and ready!                   ${NC}"
echo -e "${GREEN}${BOLD}=====================================================${NC}"
echo -e "  • ${BOLD}Frontend Dashboard :${NC} ${CYAN}http://localhost:5173${NC}"
echo -e "  • ${BOLD}Backend API Docs   :${NC} ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  • ${BOLD}API Health Endpoint:${NC} ${CYAN}http://localhost:8000/health${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "${YELLOW}Press [Ctrl+C] at any time to stop all services.${NC}\n"

wait
