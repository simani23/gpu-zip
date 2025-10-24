#!/bin/bash

# GPU Detection Script for AMD + NVIDIA Systems
# This script helps verify that both AMD iGPU and NVIDIA dGPU are properly detected

echo "=========================================="
echo "GPU Detection for Leakage Channel Testing"
echo "=========================================="
echo ""

# Check for AMD GPU
echo "Checking for AMD GPU..."
if ls /sys/class/hwmon/*/name 2>/dev/null | xargs grep -l "amdgpu" > /dev/null 2>&1; then
    echo "✓ AMD GPU detected:"
    AMD_HWMON=$(ls /sys/class/hwmon/*/name | xargs grep -l "amdgpu" | head -1 | xargs dirname)
    if [ -f "$AMD_HWMON/freq1_input" ]; then
        FREQ=$(cat "$AMD_HWMON/freq1_input")
        FREQ_MHZ=$((FREQ / 1000000))
        echo "  - Current frequency: ${FREQ_MHZ} MHz"
    fi
    if [ -f "$AMD_HWMON/device/uevent" ]; then
        echo "  - Device info:"
        grep "PCI_ID" "$AMD_HWMON/device/uevent" 2>/dev/null | sed 's/^/    /'
    fi
else
    echo "✗ No AMD GPU detected"
    echo "  Please check if AMD drivers are loaded (amdgpu module)"
fi

echo ""

# Check for NVIDIA GPU
echo "Checking for NVIDIA GPU..."
if command -v nvidia-smi &> /dev/null; then
    if nvidia-smi -L > /dev/null 2>&1; then
        echo "✓ NVIDIA GPU detected:"
        nvidia-smi -L | sed 's/^/  - /'
        echo ""
        echo "  NVIDIA GPU Status:"
        nvidia-smi --query-gpu=name,driver_version,temperature.gpu,clocks.gr,utilization.gpu --format=csv,noheader | \
            awk -F', ' '{printf "  - Model: %s\n  - Driver: %s\n  - Temp: %s°C\n  - Clock: %s MHz\n  - Utilization: %s%%\n", $1, $2, $3, $4, $5}'
    else
        echo "✗ nvidia-smi found but cannot detect NVIDIA GPU"
    fi
else
    echo "✗ nvidia-smi not found"
    echo "  Please install NVIDIA drivers"
fi

echo ""

# Check MSR module (required for AMD IMC monitoring)
echo "Checking MSR module..."
if lsmod | grep -q "^msr"; then
    echo "✓ MSR module loaded"
else
    echo "⚠ MSR module not loaded"
    echo "  Run: sudo modprobe msr"
fi

echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
AMD_OK=0
NVIDIA_OK=0

if ls /sys/class/hwmon/*/name 2>/dev/null | xargs grep -l "amdgpu" > /dev/null 2>&1; then
    AMD_OK=1
fi

if command -v nvidia-smi &> /dev/null && nvidia-smi -L > /dev/null 2>&1; then
    NVIDIA_OK=1
fi

if [ $AMD_OK -eq 1 ] && [ $NVIDIA_OK -eq 1 ]; then
    echo "✓ System is ready for AMD + NVIDIA monitoring"
    echo ""
    echo "Build with: make CFLAGS+=-DAMD"
    echo "Then run: cd scripts/exp1 && ./exp1.sh"
elif [ $AMD_OK -eq 1 ]; then
    echo "⚠ Only AMD GPU detected"
    echo "  NVIDIA monitoring will be skipped"
    echo ""
    echo "Build with: make CFLAGS+=-DAMD"
elif [ $NVIDIA_OK -eq 1 ]; then
    echo "⚠ Only NVIDIA GPU detected"
    echo "  AMD iGPU monitoring not available"
else
    echo "✗ No supported GPUs detected"
    echo "  Please check GPU drivers"
fi

echo "=========================================="

