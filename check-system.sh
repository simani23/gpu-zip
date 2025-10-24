#!/bin/bash

# GPU Security Research - System Verification Script
# Checks if all dependencies are installed and system is ready

echo "=========================================="
echo "GPU Security Research - System Check"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
FAILURES=0

check_cmd() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✅${NC} $2"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}❌${NC} $2 - NOT FOUND"
        ((FAILURES++))
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}❌${NC} $2 - NOT FOUND"
        ((FAILURES++))
        return 1
    fi
}

check_python_module() {
    if python3 -c "import $1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} Python module: $1"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}❌${NC} Python module: $1 - NOT FOUND"
        ((FAILURES++))
        return 1
    fi
}

check_optional() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✅${NC} $2 (optional)"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC}  $2 - not installed (optional)"
        ((WARNINGS++))
        return 1
    fi
}

# System Information
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️  System Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "OS: $NAME $VERSION"
else
    echo "OS: Unknown"
fi
uname -r | xargs echo "Kernel:"
echo ""

# CPU Information
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 CPU Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /proc/cpuinfo ]; then
    CPU_MODEL=$(grep "model name" /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)
    CPU_CORES=$(nproc)
    echo "CPU: $CPU_MODEL"
    echo "Cores: $CPU_CORES"
    
    if echo "$CPU_MODEL" | grep -qi "AMD\|Ryzen"; then
        echo -e "${GREEN}Type: AMD processor${NC}"
    elif echo "$CPU_MODEL" | grep -qi "Intel"; then
        echo -e "${GREEN}Type: Intel processor${NC}"
    fi
else
    echo "Could not read CPU info"
fi
echo ""

# GPU Information
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 GPU Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v lspci &> /dev/null; then
    GPU_INFO=$(lspci | grep -i 'vga\|3d')
    if [ -n "$GPU_INFO" ]; then
        echo "$GPU_INFO"
        echo ""
        
        if echo "$GPU_INFO" | grep -qi "intel"; then
            echo -e "${GREEN}✅ Intel iGPU detected - Excellent platform for all tests${NC}"
        fi
        
        if echo "$GPU_INFO" | grep -qi "amd\|radeon"; then
            echo -e "${GREEN}✅ AMD Radeon detected - Good platform for all tests${NC}"
        fi
        
        if echo "$GPU_INFO" | grep -qi "nvidia"; then
            echo -e "${YELLOW}⚠️  NVIDIA dGPU detected - Some tests have limited effectiveness${NC}"
            echo "   (LLC tests measure CPU cache only, not GPU L2)"
        fi
    else
        echo -e "${RED}❌ No GPU detected${NC}"
    fi
else
    echo -e "${RED}❌ lspci not found - cannot detect GPU${NC}"
fi
echo ""

# Build Tools
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 Build Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_cmd "gcc" "GCC compiler"
check_cmd "g++" "G++ compiler"
check_cmd "make" "Make"
check_cmd "git" "Git"
echo ""

# OpenGL/Graphics Libraries
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 Graphics Libraries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for library files
if ldconfig -p 2>/dev/null | grep -q libglfw; then
    echo -e "${GREEN}✅${NC} GLFW library"
    ((SUCCESS++))
else
    echo -e "${RED}❌${NC} GLFW library - NOT FOUND"
    ((FAILURES++))
fi

if ldconfig -p 2>/dev/null | grep -q libGL.so; then
    echo -e "${GREEN}✅${NC} OpenGL library"
    ((SUCCESS++))
else
    echo -e "${RED}❌${NC} OpenGL library - NOT FOUND"
    ((FAILURES++))
fi

if ldconfig -p 2>/dev/null | grep -q libGLU.so; then
    echo -e "${GREEN}✅${NC} GLU library"
    ((SUCCESS++))
else
    echo -e "${RED}❌${NC} GLU library - NOT FOUND"
    ((FAILURES++))
fi

check_optional "glxinfo" "glxinfo utility"
echo ""

# Python Environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐍 Python Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if check_cmd "python3" "Python 3"; then
    python3 --version | sed 's/^/   /'
fi
check_python_module "numpy"
check_python_module "matplotlib"
check_python_module "cpuinfo"
check_cmd "pip3" "pip3"
echo ""

# System Utilities
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛠️  System Utilities"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_cmd "lspci" "lspci (PCI utilities)"
check_cmd "bc" "bc (calculator)"
check_cmd "stress-ng" "stress-ng"
check_cmd "rdmsr" "rdmsr (MSR tools)"
check_cmd "wrmsr" "wrmsr (MSR tools)"
echo ""

# MSR Module
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  MSR Kernel Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if lsmod | grep -q "^msr"; then
    echo -e "${GREEN}✅${NC} MSR module is loaded"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️${NC}  MSR module not loaded"
    echo "   Load with: sudo modprobe msr"
    ((WARNINGS++))
fi

if [ -c /dev/cpu/0/msr ]; then
    echo -e "${GREEN}✅${NC} MSR device accessible"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️${NC}  MSR device not accessible"
    echo "   May need to load module or disable Secure Boot"
    ((WARNINGS++))
fi
echo ""

# Built Binaries
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Built Binaries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "poc/gpu-create/bin/texture" "GPU PoC binary (texture)"
check_file "03-llc/bin/texture" "LLC test binary (original)"
check_file "03-llc/bin/texture-auto" "LLC test binary (auto-detect)"
echo ""

if [ $FAILURES -gt 0 ]; then
    echo -e "${RED}Missing binaries. Build with:${NC}"
    echo "  cd poc/gpu-create && make"
    echo "  cd ../../03-llc && make"
    echo ""
fi

# Cache Information (for LLC tests)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Cache Information (for LLC tests)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "/sys/devices/system/cpu/cpu0/cache/" ]; then
    for idx in 3 2 1 0; do
        CACHE_SIZE_FILE="/sys/devices/system/cpu/cpu0/cache/index${idx}/size"
        CACHE_LEVEL_FILE="/sys/devices/system/cpu/cpu0/cache/index${idx}/level"
        
        if [ -f "$CACHE_SIZE_FILE" ] && [ -f "$CACHE_LEVEL_FILE" ]; then
            LEVEL=$(cat "$CACHE_LEVEL_FILE")
            SIZE=$(cat "$CACHE_SIZE_FILE")
            
            if [ "$LEVEL" -ge 3 ]; then
                echo -e "${GREEN}✅${NC} Last Level Cache (L${LEVEL}): $SIZE"
                ((SUCCESS++))
                break
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠️${NC}  Cache information not available in sysfs"
    ((WARNINGS++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Success:${NC} $SUCCESS checks passed"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS optional items"
echo -e "${RED}Failures:${NC} $FAILURES required items missing"
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ System is ready for GPU security research!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Build binaries: cd poc/gpu-create && make"
    echo "  2. Run tests based on your GPU type"
    echo "  3. See README.md in each directory for details"
    exit 0
else
    echo -e "${RED}❌ System has missing dependencies${NC}"
    echo ""
    echo "Run installation script:"
    echo "  ./install-dependencies.sh"
    exit 1
fi

