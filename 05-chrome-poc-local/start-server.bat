@echo off
REM Quick-start script for GPU Compression PoC (Windows)
REM Self-contained local version

echo ==========================================
echo GPU Compression Side-Channel PoC Server
echo Self-Contained Local Version
echo ==========================================
echo.

REM Check if Python 3 is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found!
    echo Please install Python 3 to run the local server.
    pause
    exit /b 1
)

echo Starting HTTP server on port 8000...
echo Server root: %~dp0
echo.
echo Available PoCs:
echo   1. chrome-pp (Rendering Time):  http://localhost:8000/chrome-pp/chrome.html
echo   2. chrome-cache (LLC Walk Time): http://localhost:8000/chrome-cache/chrome.html
echo.
echo Test Patterns:
echo   - Checkerboard: http://localhost:8000/test-patterns/checkerboard.html
echo   - Black:        http://localhost:8000/test-patterns/solid-black.html
echo   - White:        http://localhost:8000/test-patterns/solid-white.html
echo   - Gradient:     http://localhost:8000/test-patterns/gradient.html
echo   - Noise:        http://localhost:8000/test-patterns/noise.html
echo.
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

cd /d %~dp0
python -m http.server 8000


