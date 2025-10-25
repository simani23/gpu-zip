#!/bin/bash

# Quick-start script for GPU Compression PoC
# Self-contained local version

echo "=========================================="
echo "GPU Compression Side-Channel PoC Server"
echo "Self-Contained Local Version"
echo "=========================================="
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found!"
    echo "Please install Python 3 to run the local server."
    exit 1
fi

# Get directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Starting HTTP server on port 8000..."
echo "Server root: $SCRIPT_DIR"
echo ""
echo "Available PoCs:"
echo "  1. chrome-pp (Rendering Time):  http://localhost:8000/chrome-pp/chrome.html"
echo "  2. chrome-cache (LLC Walk Time): http://localhost:8000/chrome-cache/chrome.html"
echo ""
echo "Test Patterns:"
echo "  - Checkerboard: http://localhost:8000/test-patterns/checkerboard.html"
echo "  - Black:        http://localhost:8000/test-patterns/solid-black.html"
echo "  - White:        http://localhost:8000/test-patterns/solid-white.html"
echo "  - Gradient:     http://localhost:8000/test-patterns/gradient.html"
echo "  - Noise:        http://localhost:8000/test-patterns/noise.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

# Start server
cd "$SCRIPT_DIR"
python3 -m http.server 8000


