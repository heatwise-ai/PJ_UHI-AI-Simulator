#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HEATWISE="$SCRIPT_DIR/heatwise"
FRONTEND="$HEATWISE/frontend"

echo "====================================="
echo "  서울 UHI 시뮬레이터 시작"
echo "====================================="

# ── 1. Python 가상환경 ──
VENV="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV" ]; then
  echo "[1/3] 가상환경 생성 중..."
  python3 -m venv "$VENV"
fi
source "$VENV/bin/activate"

# ── 2. Python 패키지 설치 ──
echo "[2/3] Python 패키지 설치 중..."
pip install -q --upgrade pip
pip install -q -r "$HEATWISE/requirements.txt"

# ── 3. 서버 실행 (dist는 이미 빌드됨) ──
echo "[3/3] 서버 시작..."
echo ""
echo "  ✅ http://localhost:8000 으로 접속하세요"
echo "  종료: Ctrl+C"
echo "====================================="
cd "$HEATWISE"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
