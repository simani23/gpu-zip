#!/usr/bin/env bash

# Enhanced LLC test script with auto-detection for AMD/Intel CPUs
# Automatically adjusts texture size range based on detected LLC size

set -e

echo "=== LLC Walk Time Test (Auto-Detection) ==="
echo ""

# Check if binary exists
BINARY="../bin/texture-auto"
if [ ! -f "$BINARY" ]; then
    echo "Error: texture-auto binary not found at $BINARY"
    echo "Please build it first: cd .. && make"
    exit 1
fi

# Detect LLC size by running the binary with minimal parameters
# This will trigger cache detection and output the LLC size
echo "Detecting system cache configuration..."
echo ""

# Run a quick test to get LLC info (will print to stdout)
OUTPUT=$($BINARY 0.0 10 1000 /tmp/llc_test_$$ 2>&1 || true)
rm -f /tmp/llc_test_$$

echo "$OUTPUT" | grep -E "\[LLC Detection\]"
echo ""

# Extract LLC size from output (in MiB)
LLC_SIZE_MIB=$(echo "$OUTPUT" | grep "LLC Size:" | awk '{print $4}' | cut -d'.' -f1)

if [ -z "$LLC_SIZE_MIB" ] || [ "$LLC_SIZE_MIB" -eq 0 ]; then
    echo "Warning: Could not detect LLC size, using default (12 MiB)"
    LLC_SIZE_MIB=12
fi

echo "Detected LLC Size: ${LLC_SIZE_MIB} MiB"
echo ""

# Calculate appropriate texture size range based on LLC size
# Goal: test from ~0.3x LLC size to ~2.3x LLC size
# Formula: size*size*4 bytes = MiB * 1024 * 1024
# So: size = sqrt(MiB * 1024 * 1024 / 4)

# Minimum texture size: ~0.3x LLC (or 1000 minimum)
MIN_MULTIPLIER="0.3"
MIN_SIZE=$(echo "sqrt($LLC_SIZE_MIB * $MIN_MULTIPLIER * 1024 * 1024 / 4)" | bc -l | cut -d'.' -f1)
MIN_SIZE=$((MIN_SIZE < 1000 ? 1000 : MIN_SIZE))

# Maximum texture size: ~2.3x LLC
MAX_MULTIPLIER="2.3"
MAX_SIZE=$(echo "sqrt($LLC_SIZE_MIB * $MAX_MULTIPLIER * 1024 * 1024 / 4)" | bc -l | cut -d'.' -f1)

# Step size: cover range in ~35 steps
STEP=$(( (MAX_SIZE - MIN_SIZE) / 35 ))
STEP=$((STEP < 50 ? 50 : STEP))

# Round to nice numbers
MIN_SIZE=$(( (MIN_SIZE / 50) * 50 ))
MAX_SIZE=$(( (MAX_SIZE / 50) * 50 ))

echo "Test Configuration:"
echo "  Texture size range: ${MIN_SIZE}x${MIN_SIZE} to ${MAX_SIZE}x${MAX_SIZE}"
echo "  Step size: $STEP"
echo "  Number of samples per test: 2000"
echo ""

# Approximate MiB values for reference
MIN_MIB=$(echo "scale=1; $MIN_SIZE * $MIN_SIZE * 4 / 1024 / 1024" | bc)
MAX_MIB=$(echo "scale=1; $MAX_SIZE * $MAX_SIZE * 4 / 1024 / 1024" | bc)
echo "  Approximate texture size: ${MIN_MIB} MiB to ${MAX_MIB} MiB"
echo ""

# Create output directory
rm -rf data
mkdir -p data

echo "==================================================================="
echo "Starting LLC walk time measurements..."
echo "This will take a while. Each test includes:"
echo "  - Compressible pattern (Black, color=0.0)"
echo "  - Non-compressible pattern (Random, color=1.0)"
echo "==================================================================="
echo ""

COUNTER=0
TOTAL=$(( (MAX_SIZE - MIN_SIZE) / STEP + 1 ))
TOTAL=$((TOTAL * 2))  # Two tests per size

for i in $(seq $MIN_SIZE $STEP $MAX_SIZE)
do
    COUNTER=$((COUNTER + 1))
    echo "[${COUNTER}/${TOTAL}] Testing compressible pattern, size=${i}x${i}..."
    $BINARY 0.0 2000 ${i} ./data/w0_${i}.txt
    
    echo "  Waiting for cooldown..."
    sleep 20
    
    COUNTER=$((COUNTER + 1))
    echo "[${COUNTER}/${TOTAL}] Testing non-compressible pattern, size=${i}x${i}..."
    $BINARY 1.0 2000 ${i} ./data/w1_${i}.txt
    
    echo "  Waiting for cooldown..."
    sleep 20
    echo ""
done

echo "==================================================================="
echo "All tests completed!"
echo ""
echo "Data files saved in: ./data/"
echo "Files generated: $(ls -1 data/ | wc -l)"
echo ""
echo "To plot results, run:"
echo "  python plot_llc_size.py ./data/"
echo "==================================================================="

