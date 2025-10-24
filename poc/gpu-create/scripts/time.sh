#!/usr/bin/env bash

# Enhanced timing script for all shader patterns
# Supports: Black, Random, Gradient, Skew

# Parse args
if [ $# -eq 3 ]; then
    iter=$1
    size=$2 
    type=$3
elif [ $# -eq 4 ]; then
    iter=$1
    size=$2 
    type=$3
    samples=$4
else
    size=3000 
    iter=100
    type=2
    samples=500
fi

echo "=== GPU Shader Pattern Timing Test ==="
echo "Configuration:"
echo "  Size: ${size}x${size}"
echo "  Iterations: ${iter}"
echo "  Workload type: ${type} (0=read-only, 1=write-only, 2=write-read)"
echo "  Samples: ${samples}"
echo ""

# Calculate gradient and skew values based on size
# Gradient: value that divides SCR_WIDTH evenly
gradient_val=$((size / 30))  # e.g., for 3000 -> 100

# Skew: value that doesn't divide SCR_WIDTH evenly
skew_val=$((gradient_val + 1))  # e.g., for 3000 -> 101

echo "Testing shader patterns..."

# Test Black pattern (compressible)
echo "  [1/4] Testing Black pattern (color=0.0)..."
../bin/texture 0.0 ${iter} ${size} ${type} ${samples}

# Test Random pattern (non-compressible)
echo "  [2/4] Testing Random pattern (color=1.0)..."
../bin/texture 1.0 ${iter} ${size} ${type} ${samples}

# Test Gradient pattern (color divides size)
echo "  [3/4] Testing Gradient pattern (color=${gradient_val})..."
../bin/texture ${gradient_val}.0 ${iter} ${size} ${type} ${samples}

# Test Skew pattern (color doesn't divide size)
echo "  [4/4] Testing Skew pattern (color=${skew_val})..."
../bin/texture ${skew_val}.0 ${iter} ${size} ${type} ${samples}

echo ""
echo "All tests completed. Analyzing results..."
echo ""

# Plot results for all patterns
python plot_time.py \
    --black time_${type}_${size}_0.0_${iter}.txt \
    --random time_${type}_${size}_1.0_${iter}.txt \
    --gradient time_${type}_${size}_${gradient_val}.0_${iter}.txt \
    --skew time_${type}_${size}_${skew_val}.0_${iter}.txt

echo ""
echo "Results saved in ./plot/ directory"

