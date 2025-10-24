#!/usr/bin/env bash

# Supports: Intel iGPU, AMD Radeon iGPU, NVIDIA GeForce dGPU

# Detect GPU type
detect_gpu() {
    if lspci | grep -i "VGA.*Intel" > /dev/null 2>&1; then
        echo "intel"
    elif lspci | grep -i "VGA.*AMD\|VGA.*Radeon" > /dev/null 2>&1; then
        echo "amd"
    elif lspci | grep -i "VGA.*NVIDIA\|3D.*NVIDIA" > /dev/null 2>&1; then
        echo "nvidia"
    else
        echo "unknown"
    fi
}

GPU_TYPE=$(detect_gpu)
echo "Detected GPU: $GPU_TYPE"

# Set maximum stressor count based on GPU type and available cores
CORES=$(nproc)
if [ "$GPU_TYPE" = "nvidia" ]; then
    # For NVIDIA dGPU, fewer system memory stressors needed (use GPU memory instead)
    MAX_STRESSOR=8
else
    # For iGPUs (Intel/AMD), use more system memory stressors
    MAX_STRESSOR=$((CORES < 12 ? CORES : 12))
fi

echo "Running tests with up to $MAX_STRESSOR memory stressors"

mkdir -p time

# Function to create GPU memory stress for NVIDIA
nvidia_gpu_stress() {
    local count=$1
    # Use dedicated NVIDIA stress script if available
    if [ -f "./nvidia-gpu-stress.sh" ]; then
        bash ./nvidia-gpu-stress.sh $count 60 &
    else
        # Fallback to basic OpenGL stress
        for ((j=0; j<count; j++)); do
            timeout 60 glxgears -geometry 1920x1080 &> /dev/null &
        done
    fi
}

# Run memory contention tests
for i in $(seq 1 $MAX_STRESSOR)
do
    echo "Running test with $i memory stressor(s)..."
    
    # Start system memory stressor
    stress-ng --memcpy $i &
    STRESS_PID=$!
    
    # For NVIDIA dGPU, also add GPU-specific stress if possible
    if [ "$GPU_TYPE" = "nvidia" ]; then
        nvidia_gpu_stress $i
    fi
    
    # Wait for stressors to ramp up
    sleep 30
    
    # Run GPU texture tests
    ../poc/gpu-create/bin/texture 0.0 10 3000 1 10000
    ../poc/gpu-create/bin/texture 1.0 10 3000 1 10000
    
    # Stop all stressors
    pkill -f stress-ng
    pkill -f glxgears
    
    # Organize output
    mkdir -p ./time/out-${i}
    if [ -f time_* ]; then
        mv time_* ./time/out-${i}/ 2>/dev/null || sudo mv time_* ./time/out-${i}/ 2>/dev/null
    fi
    
    echo "Completed test $i/$MAX_STRESSOR"
done

echo "All tests completed. Results saved in ./time/"
echo "Run: python stressor.py ./time/ to generate plots"
