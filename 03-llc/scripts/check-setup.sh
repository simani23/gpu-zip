#!/usr/bin/env bash

# Setup validation script for LLC tests
# Checks prerequisites and system compatibility

echo "=== LLC Walk Time Test - Setup Validation ==="
echo ""

# Check OS
echo "1. Operating System:"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   ✓ Linux detected"
else
    echo "   ✗ Non-Linux OS: $OSTYPE (Linux required)"
fi
echo ""

# Check for required commands
echo "2. Required Tools:"

# g++
if command -v g++ &> /dev/null; then
    echo "   ✓ g++: $(g++ --version | head -1)"
else
    echo "   ✗ g++: NOT FOUND"
    echo "     Install: sudo apt install build-essential"
fi

# bc
if command -v bc &> /dev/null; then
    echo "   ✓ bc: Available"
else
    echo "   ✗ bc: NOT FOUND (needed for llc-auto.sh)"
    echo "     Install: sudo apt install bc"
fi

# Python
if command -v python3 &> /dev/null; then
    echo "   ✓ python3: $(python3 --version)"
else
    echo "   ✗ python3: NOT FOUND"
fi

echo ""

# Check OpenGL libraries
echo "3. OpenGL Libraries:"
if ldconfig -p | grep -q libGL.so; then
    echo "   ✓ OpenGL library found"
else
    echo "   ✗ OpenGL library NOT FOUND"
    echo "     Install: sudo apt install libgl1-mesa-dev"
fi

if ldconfig -p | grep -q libglfw.so; then
    echo "   ✓ GLFW library found"
else
    echo "   ✗ GLFW library NOT FOUND"
    echo "     Install: sudo apt install libglfw3-dev"
fi

echo ""

# Check Python packages
echo "4. Python Packages:"
for pkg in numpy matplotlib; do
    if python3 -c "import $pkg" 2>/dev/null; then
        echo "   ✓ $pkg"
    else
        echo "   ✗ $pkg: NOT FOUND"
        echo "     Install: pip install $pkg"
    fi
done

echo ""

# Detect CPU and cache
echo "5. CPU and Cache Detection:"
if [ -f "/proc/cpuinfo" ]; then
    CPU_MODEL=$(grep "model name" /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)
    echo "   CPU: $CPU_MODEL"
    
    # Check if AMD or Intel
    if echo "$CPU_MODEL" | grep -qi "AMD\|Ryzen"; then
        echo "   Type: AMD processor detected"
        echo "   ✓ Use llc-auto.sh for auto-detection"
    elif echo "$CPU_MODEL" | grep -qi "Intel"; then
        echo "   Type: Intel processor detected"
        if echo "$CPU_MODEL" | grep -qi "i7-8700"; then
            echo "   ✓ Exact match! Use llc.sh for paper reproduction"
        else
            echo "   ✓ Use llc-auto.sh for auto-detection"
        fi
    else
        echo "   Type: Unknown processor"
        echo "   ⚠ Auto-detection will use conservative defaults"
    fi
else
    echo "   ✗ Cannot read /proc/cpuinfo"
fi

echo ""

# Detect LLC/L3 cache
echo "6. Last Level Cache (LLC) Detection:"
LLC_DETECTED=false
if [ -d "/sys/devices/system/cpu/cpu0/cache/" ]; then
    echo "   ✓ Cache sysfs available"
    
    for idx in 3 2 1 0; do
        CACHE_SIZE_FILE="/sys/devices/system/cpu/cpu0/cache/index${idx}/size"
        CACHE_LEVEL_FILE="/sys/devices/system/cpu/cpu0/cache/index${idx}/level"
        
        if [ -f "$CACHE_SIZE_FILE" ] && [ -f "$CACHE_LEVEL_FILE" ]; then
            LEVEL=$(cat "$CACHE_LEVEL_FILE")
            SIZE=$(cat "$CACHE_SIZE_FILE")
            
            if [ "$LEVEL" -ge 3 ]; then
                echo "   LLC (L${LEVEL}): $SIZE"
                LLC_DETECTED=true
                break
            fi
        fi
    done
    
    if [ "$LLC_DETECTED" = false ]; then
        echo "   ⚠ LLC not detected in sysfs"
    fi
else
    echo "   ✗ Cache information not available (/sys/devices/system/cpu/cpu0/cache/)"
    echo "     Auto-detection may use default values"
fi

echo ""

# Detect GPU
echo "7. GPU Detection:"
if command -v lspci &> /dev/null; then
    GPU_INFO=$(lspci | grep -i 'vga\|3d')
    
    if echo "$GPU_INFO" | grep -qi "intel"; then
        echo "   ✓ Intel iGPU detected"
        echo "   Type: Integrated GPU (shares LLC with CPU)"
        echo "   Status: Ideal for LLC walk time tests"
    fi
    
    if echo "$GPU_INFO" | grep -qi "amd\|radeon"; then
        echo "   ✓ AMD Radeon detected"
        echo "   Type: Integrated GPU (shares L3 with CPU)"
        echo "   Status: Ideal for LLC walk time tests"
    fi
    
    if echo "$GPU_INFO" | grep -qi "nvidia"; then
        echo "   ✓ NVIDIA GPU detected"
        echo "   Type: Discrete GPU (separate VRAM/cache)"
        echo "   ⚠ Status: LLC test measures CPU cache only"
        echo "   Note: GPU compression may not show in results"
        echo "   Recommendation: Also use memory-stressor and direct GPU tests"
    fi
    
    if [ -z "$GPU_INFO" ]; then
        echo "   ✗ No GPU detected"
    fi
else
    echo "   ✗ lspci not available"
    echo "     Install: sudo apt install pciutils"
fi

echo ""

# Check if binaries are built
echo "8. Compiled Binaries:"
if [ -f "../bin/texture" ]; then
    echo "   ✓ texture (original) built"
else
    echo "   ✗ texture (original) NOT FOUND"
    echo "     Build: cd .. && make"
fi

if [ -f "../bin/texture-auto" ]; then
    echo "   ✓ texture-auto (auto-detection) built"
else
    echo "   ✗ texture-auto (auto-detection) NOT FOUND"
    echo "     Build: cd .. && make"
fi

echo ""

# Check shader files
echo "9. Shader Files:"
if [ -f "../../shader/vertex.glsl" ] && [ -f "../../shader/fragment.glsl" ]; then
    echo "   ✓ Shader files found"
else
    echo "   ✗ Shader files NOT FOUND"
    echo "     Check: ../../shader/vertex.glsl and fragment.glsl"
fi

echo ""

# Summary
echo "=== Validation Complete ==="
echo ""

HAS_IGPU=false
if lspci 2>/dev/null | grep -i 'vga\|3d' | grep -qi "intel\|amd.*radeon"; then
    HAS_IGPU=true
fi

if [ -f "../bin/texture-auto" ] && [ "$LLC_DETECTED" = true ] && [ "$HAS_IGPU" = true ]; then
    echo "✓ System ready for LLC walk time tests!"
    echo ""
    echo "Recommended: Run llc-auto.sh for optimal configuration"
elif [ -f "../bin/texture-auto" ] && [ "$LLC_DETECTED" = true ]; then
    echo "⚠ System configured but GPU type may affect results"
    echo ""
    echo "You can run tests, but results may vary (especially with dGPU)"
else
    echo "✗ Setup incomplete - see issues above"
fi

echo ""
echo "Next steps:"
echo "  1. Build binaries: cd .. && make"
echo "  2. Run tests: cd scripts && ./llc-auto.sh"
echo "  3. Plot results: python plot_llc_size.py ./data/"

