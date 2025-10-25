#!/bin/bash

# GPU Security Research - Dependency Installation Script
# For Ubuntu/Debian-based systems
# Run this on a fresh Ubuntu installation to set up all prerequisites

set -e  # Exit on error

echo "=========================================="
echo "GPU Security Research - Setup Script"
echo "Installing all dependencies..."
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "smallWarning:  Warning: Running as root. This is not recommended."
    echo "Please run as a regular user. The script will use sudo when needed."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if running Ubuntu/Debian
if [ ! -f /etc/os-release ]; then
    echo " Error: Cannot detect OS. This script is for Ubuntu/Debian."
    exit 1
fi

. /etc/os-release
echo "Detected OS: $NAME $VERSION"
echo ""

# Update package lists
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Updating package lists..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt update

# Install build essentials
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Step 2: Installing build tools..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y build-essential make g++ gcc vim

# Install OpenGL/GLFW libraries
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 Step 3: Installing OpenGL/GLFW libraries..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y libglfw3-dev libgl1-mesa-dev libglu1-mesa-dev mesa-utils

# Install Python and scientific libraries
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐍 Step 4: Installing Python and scientific libraries..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y python3 python3-pip python3-numpy python3-matplotlib python3-dev python3-cpuinfo

# Install additional Python packages via pip (for more recent versions)
#echo ""
#echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
#echo "📊 Step 5: Installing additional Python packages..."
#echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
#pip3 install --user py-cpuinfo || echo "smallWarning:  Warning: py-cpuinfo installation failed (optional)"

# Install system utilities
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛠️  Step 6: Installing system utilities..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y pciutils bc stress-ng

# Install MSR tools (for hardware performance monitoring)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  Step 7: Installing MSR tools..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y msr-tools

# Load MSR kernel module
echo ""
echo "Loading MSR kernel module..."
if sudo modprobe msr; then
    echo "GDone: MSR module loaded successfully"
else
    echo "smallWarning:  Warning: Could not load MSR module. May need to enable in BIOS or install linux-modules-extra."
fi

# Install git (if not present)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Step 8: Installing version control..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y git

# Optional: Install additional useful tools
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 9: Installing optional tools..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo apt install -y htop iotop cpufrequtils linux-tools-common linux-tools-generic || echo "smallWarning:  Some optional tools not available"

echo ""
echo "=========================================="
echo "GDone: Installation Complete!"
echo "=========================================="
echo ""

# Summary
echo "📋 Installed Components:"
echo "  GDone: Build tools (gcc, g++, make)"
echo "  GDone: OpenGL/GLFW libraries"
echo "  GDone: Python 3 + NumPy + Matplotlib"
echo "  GDone: System utilities (stress-ng, bc, pciutils)"
echo "  GDone: MSR tools"
echo ""

# Check GPU
echo "🎮 Detected GPU(s):"
lspci | grep -i 'vga\|3d' || echo "  No GPU detected"
echo ""

# Check Python
echo "🐍 Python environment:"
python3 --version
python3 -c "import numpy; print('  NumPy:', numpy.__version__)"
python3 -c "import matplotlib; print('  Matplotlib:', matplotlib.__version__)"
python3 -c "import cpuinfo; print('  py-cpuinfo: installed')" 2>/dev/null || echo "  py-cpuinfo: not installed (run: pip3 install --user py-cpuinfo)"
echo ""

# Next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Verify installation:"
echo "   ./check-system.sh"
echo ""
echo "2. Build GPU PoCs:"
echo "   cd poc/gpu-create && make"
echo "   cd ../../03-llc && make"
echo ""
echo "3. Run tests based on your GPU:"
echo ""
echo "   For Intel iGPU / AMD Radeon iGPU:"
echo "   - cd 02-memory-stressor && ./stressor.sh"
echo "   - cd 03-llc/scripts && ./llc-auto.sh"
echo "   - cd poc/gpu-create/scripts && ./time-all.sh"
echo ""
echo "   For NVIDIA dGPU:"
echo "   - cd 02-memory-stressor && ./stressor.sh"
echo "   - cd poc/gpu-create/scripts && ./time-all.sh"
echo ""
echo "4. Chrome PoCs:"
echo "   cd 05-chrome-poc-local && ./start-server.sh"
echo "   Open: http://localhost:8000/chrome-pp/chrome.html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "smallWarning:  Important Notes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• For MSR access, you may need to:"
echo "  - Disable Secure Boot in BIOS"
echo "  - Load MSR module: sudo modprobe msr"
echo "  - Add yourself to msr group (if exists)"
echo ""
echo "• For best results:"
echo "  - Close unnecessary applications before testing"
echo "  - Disable CPU frequency scaling: sudo cpupower frequency-set -g performance"
echo "  - Use dedicated testing session"
echo ""
echo "• Run './check-system.sh' to verify everything is set up correctly"
echo ""
echo "=========================================="

