#!/usr/bin/env bash

# Usage: ./time-all.sh [iterations] [size] [type] [samples]

set -e

# Default values
ITER=${1:-100}
SIZE=${2:-3000}
TYPE=${3:-2}
SAMPLES=${4:-500}

echo "       GPU Shader Pattern Comprehensive Timing Test"
echo "Configuration:"
echo "  Texture Size:      ${SIZE}x${SIZE}"
echo "  Iterations:        ${ITER}"
echo "  Workload Type:     ${TYPE} (0=read-only, 1=write-only, 2=write-read)"
echo "  Samples per test:  ${SAMPLES}"
echo ""

# Check if binary exists
if [ ! -f "../bin/texture" ]; then
    echo "Error: texture binary not found at ../bin/texture"
    echo "Please build it first: cd .. && make"
    exit 1
fi

# Create plot directory
mkdir -p plot

# Calculate pattern values
GRADIENT=$((SIZE / 30))
SKEW=$((GRADIENT + 1))

echo "Pattern values:"
echo "  Black:    0.0 (highly compressible)"
echo "  Random:   1.0 (non-compressible)"
echo "  Gradient: ${GRADIENT}.0 (divides ${SIZE})"
echo "  Skew:     ${SKEW}.0 (doesn't divide ${SIZE})"
echo ""

# Array to track generated files
declare -a FILES_GENERATED

# Test function
run_test() {
    local name=$1
    local color=$2
    local num=$3
    
    echo "[${num}/4] Testing ${name} pattern (color=${color})..."
    
    local filename="time_${TYPE}_${SIZE}_${color}_${ITER}.txt"
    
    # Remove old file if exists
    rm -f "${filename}"
    
    # Run test
    if ../bin/texture "${color}" "${ITER}" "${SIZE}" "${TYPE}" "${SAMPLES}"; then
        if [ -f "${filename}" ]; then
            FILES_GENERATED+=("${filename}")
            echo "      ✓ Generated: ${filename}"
        else
            echo "      ✗ Warning: Expected output file not created"
        fi
    else
        echo "      ✗ Test failed"
    fi
    echo ""
}

# Run all tests
run_test "Black"    "0.0"           "1"
run_test "Random"   "1.0"           "2"
run_test "Gradient" "${GRADIENT}.0" "3"
run_test "Skew"     "${SKEW}.0"     "4"

echo "All tests completed!"
echo ""
echo "Generated files:"
for file in "${FILES_GENERATED[@]}"; do
    echo "  - ${file}"
done
echo ""

# Check if we have all expected files
if [ ${#FILES_GENERATED[@]} -eq 4 ]; then
    echo "Analyzing results and generating plots..."
    echo ""
    
    python3 ./plot_time.py \
        --black "time_${TYPE}_${SIZE}_0.0_${ITER}.txt" \
        --random "time_${TYPE}_${SIZE}_1.0_${ITER}.txt" \
        --gradient "time_${TYPE}_${SIZE}_${GRADIENT}.0_${ITER}.txt" \
        --skew "time_${TYPE}_${SIZE}_${SKEW}.0_${ITER}.txt"
    
    echo "✓ Complete! Results saved in ./plot/time.pdf"
else
    echo "⚠ Warning: Not all tests completed successfully (${#FILES_GENERATED[@]}/4)"
    echo "Plotting available data..."
    
    # Build argument list for available files
    PLOT_ARGS=""
    for file in "${FILES_GENERATED[@]}"; do
        if [[ $file == *"_0.0_"* ]]; then
            PLOT_ARGS="${PLOT_ARGS} --black ${file}"
        elif [[ $file == *"_1.0_"* ]]; then
            PLOT_ARGS="${PLOT_ARGS} --random ${file}"
        elif [[ $file == *"_${GRADIENT}.0_"* ]]; then
            PLOT_ARGS="${PLOT_ARGS} --gradient ${file}"
        elif [[ $file == *"_${SKEW}.0_"* ]]; then
            PLOT_ARGS="${PLOT_ARGS} --skew ${file}"
        fi
    done
    
    if [ -n "$PLOT_ARGS" ]; then
        python plot_time.py ${PLOT_ARGS}
    fi
fi

