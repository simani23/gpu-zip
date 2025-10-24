#!/usr/bin/env bash

# NVIDIA GPU Memory Stress Utility
# This script creates GPU memory bandwidth stress for NVIDIA dGPUs

NUM_INSTANCES=${1:-4}
DURATION=${2:-60}

echo "Starting $NUM_INSTANCES NVIDIA GPU stress instances for ${DURATION}s"

# Function to check if nvidia-smi is available
check_nvidia() {
    if ! command -v nvidia-smi &> /dev/null; then
        echo "Warning: nvidia-smi not found. NVIDIA GPU stress may not work properly."
        return 1
    fi
    return 0
}

# Function to create GPU memory stress using OpenGL
gpu_stress_opengl() {
    local instance=$1
    # Run multiple glxgears instances to create GPU load
    timeout ${DURATION} glxgears -geometry 1920x1080 &> /dev/null &
}

# Function to create GPU memory stress using CUDA if available
gpu_stress_cuda() {
    # If nvidia-smi is available, try to use it to stress GPU memory
    if check_nvidia; then
        # Set GPU to maximum performance state
        nvidia-smi -pm 1 &> /dev/null
        nvidia-smi -i 0 -pl $(nvidia-smi -i 0 --query-gpu=power.max_limit --format=csv,noheader,nounits | cut -d'.' -f1) &> /dev/null
        
        # Create compute load (if CUDA samples are available)
        if command -v /usr/local/cuda/samples/bin/x86_64/linux/release/bandwidthTest &> /dev/null; then
            timeout ${DURATION} /usr/local/cuda/samples/bin/x86_64/linux/release/bandwidthTest --mode=shmoo --memory=pageable &> /dev/null &
        fi
    fi
}

# Main stress loop
if check_nvidia; then
    echo "NVIDIA GPU detected, creating GPU memory stress..."
    
    # Enable persistence mode for better performance
    sudo nvidia-smi -pm 1 &> /dev/null || nvidia-smi -pm 1 &> /dev/null
    
    # Start GPU stress instances
    for ((i=0; i<NUM_INSTANCES; i++)); do
        gpu_stress_opengl $i
        gpu_stress_cuda
    done
    
    echo "GPU stress instances started (PID: $$)"
else
    echo "NVIDIA tools not available, using basic OpenGL stress..."
    
    # Fallback to OpenGL-only stress
    for ((i=0; i<NUM_INSTANCES; i++)); do
        gpu_stress_opengl $i
    done
fi

# Wait for duration
sleep ${DURATION}

# Cleanup
pkill -f glxgears
echo "GPU stress completed"

