#!/usr/bin/env bash

# Setup validation script for memory stressor
# Checks prerequisites and hardware compatibility

echo "=== GPU Memory Stressor - Setup Validation ==="
echo ""

# Check OS
echo "1. Operating System:"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   Done: Linux detected"
    OS_OK=1
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "   ⚠ Windows detected - WSL recommended for full compatibility"
    OS_OK=1
else
    echo "   ✗ Unsupported OS: $OSTYPE"
    OS_OK=0
fi
echo ""

# Check for required commands
echo "2. Required Tools:"

# stress-ng
if command -v stress-ng &> /dev/null; then
    echo "   Done: stress-ng: $(stress-ng --version | head -1)"
else
    echo "   ✗ stress-ng: NOT FOUND"
    echo "     Install: sudo apt install stress-ng"
fi

# lspci
if command -v lspci &> /dev/null; then
    echo "   Done: lspci: Available"
else
    echo "   ✗ lspci: NOT FOUND"
    echo "     Install: sudo apt install pciutils"
fi

# Python
if command -v python3 &> /dev/null; then
    echo "   Done: python3: $(python3 --version)"
else
    echo "   ✗ python3: NOT FOUND"
fi

# Check Python packages
if command -v python3 &> /dev/null; then
    echo ""
    echo "3. Python Packages:"
    
    for pkg in cpuinfo numpy matplotlib; do
        if python3 -c "import $pkg" 2>/dev/null; then
            echo "   Done: $pkg"
        else
            echo "   ✗ $pkg: NOT FOUND"
            echo "     Install: pip install $pkg"
        fi
    done
fi

echo ""

# Detect GPU
echo "4. GPU Detection:"
if command -v lspci &> /dev/null; then
    GPU_INFO=$(lspci | grep -i 'vga\|3d')
    
    if echo "$GPU_INFO" | grep -i "intel" > /dev/null; then
        echo "   Done: Intel iGPU detected:"
        echo "     $(echo "$GPU_INFO" | grep -i intel)"
        echo "     Type: Integrated GPU (shares system RAM)"
    fi
    
    if echo "$GPU_INFO" | grep -i "amd\|radeon" > /dev/null; then
        echo "   Done: AMD Radeon detected:"
        echo "     $(echo "$GPU_INFO" | grep -i 'amd\|radeon')"
        echo "     Type: Integrated GPU (shares system RAM)"
    fi
    
    if echo "$GPU_INFO" | grep -i "nvidia" > /dev/null; then
        echo "   Done: NVIDIA GPU detected:"
        echo "     $(echo "$GPU_INFO" | grep -i nvidia)"
        echo "     Type: Discrete GPU (dedicated VRAM)"
        
        # Check NVIDIA drivers
        if command -v nvidia-smi &> /dev/null; then
            echo "   Done: nvidia-smi available:"
            nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -1
        else
            echo "   ⚠ nvidia-smi not found (optional, improves GPU stress testing)"
        fi
    fi
    
    if [ -z "$GPU_INFO" ]; then
        echo "   ✗ No GPU detected via lspci"
    fi
else
    echo "   ✗ Cannot detect GPU (lspci not available)"
fi

echo ""

# Detect CPU
echo "5. CPU Information:"
if command -v lscpu &> /dev/null; then
    MODEL=$(lscpu | grep "Model name" | cut -d':' -f2 | xargs)
    CORES=$(lscpu | grep "^CPU(s):" | cut -d':' -f2 | xargs)
    echo "   CPU: $MODEL"
    echo "   Cores: $CORES"
else
    echo "   ⚠ lscpu not available"
fi

if command -v python3 &> /dev/null && python3 -c "import cpuinfo" 2>/dev/null; then
    FREQ=$(python3 -c "import cpuinfo; info=cpuinfo.get_cpu_info(); print(info.get('hz_advertised_friendly', 'Unknown'))")
    echo "   Frequency: $FREQ"
fi

echo ""

# Check PoC binary
echo "6. GPU PoC Binary:"
if [ -f "../poc/gpu-create/bin/texture" ]; then
    echo "   Done: texture binary found"
    if [ -x "../poc/gpu-create/bin/texture" ]; then
        echo "   Done: texture binary is executable"
    else
        echo "   ⚠ texture binary exists but not executable"
    fi
else
    echo "   ✗ texture binary NOT FOUND at ../poc/gpu-create/bin/texture"
    echo "     Build it by following instructions in ../poc/gpu-create/Readme.md"
fi

echo ""

# Check OpenGL
echo "7. OpenGL Support:"
if command -v glxinfo &> /dev/null; then
    GL_VERSION=$(glxinfo | grep "OpenGL version" | cut -d':' -f2 | xargs)
    echo "   Done: OpenGL: $GL_VERSION"
    
    GL_RENDERER=$(glxinfo | grep "OpenGL renderer" | cut -d':' -f2 | xargs)
    echo "   Renderer: $GL_RENDERER"
else
    echo "   ⚠ glxinfo not available (install: sudo apt install mesa-utils)"
fi

echo ""
echo "=== Validation Complete ==="
echo ""

# Summary
echo "Summary:"
if [ -f "../poc/gpu-create/bin/texture" ] && command -v stress-ng &> /dev/null; then
    echo "Done: Core requirements met - ready to run stressor.sh"
else
    echo "✗ Missing core requirements - see above for details"
fi


