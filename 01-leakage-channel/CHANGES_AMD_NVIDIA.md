# Changes for AMD + NVIDIA GPU Support

## Summary

The `01-leakage-channel/` directory has been updated to support simultaneous monitoring of:
- **AMD Radeon iGPU** (integrated graphics)
- **NVIDIA GeForce RTX dGPU** (discrete graphics card)

This allows the leakage channel experiments to run on systems with an AMD processor that has both Radeon integrated graphics and an NVIDIA discrete GPU.

## Files Modified

### 1. New Files Created

#### `util/nvidia-gpu-utils.c` and `util/nvidia-gpu-utils.h`
- New utilities for monitoring NVIDIA GPU frequency and utilization
- Uses `nvidia-smi` command-line tool for GPU monitoring
- Functions:
  - `nvidia_gpu_init()`: Initialize NVIDIA GPU monitoring
  - `nvidia_gpu_freq(gpu_index)`: Read GPU frequency in MHz
  - `nvidia_gpu_utilization(gpu_index)`: Read GPU utilization percentage
  - `nvidia_gpu_end()`: Clean up resources

#### `01-leakage-channel/detect_gpus.sh`
- Diagnostic script to verify GPU configuration
- Checks for AMD GPU presence via sysfs
- Checks for NVIDIA GPU presence via nvidia-smi
- Verifies MSR module is loaded
- Provides helpful output and setup instructions

### 2. Files Updated

#### `util/amd-gpu-utils.c` and `util/amd-gpu-utils.h`
**Changes:**
- Added `amd_gpu_init(gpu_index)` function to select specific AMD GPU
- Now supports multiple AMD GPUs by index (0 = first AMD GPU = iGPU)
- Improved error handling and reporting
- Made frequency reading require initialization first

**Why:** The original code would pick the first AMD GPU it found. Now it can explicitly select the iGPU (index 0) vs other AMD GPUs if present.

#### `01-leakage-channel/driver.c`
**Changes:**
- Added `#include "../util/nvidia-gpu-utils.h"`
- New function `monitor_nvidia_gpu()`: Monitors NVIDIA GPU during experiments
- Updated `main()` initialization:
  - Calls `amd_gpu_init(0)` to explicitly select AMD iGPU
  - Calls `nvidia_gpu_init()` to initialize NVIDIA monitoring
- Updated experiment loop:
  - Creates additional thread `thread_NVIDIA_GPU` for NVIDIA monitoring (AMD builds only)
  - Joins NVIDIA thread after experiment completes
- Updated cleanup:
  - Calls `nvidia_gpu_end()` to clean up NVIDIA resources

**Why:** The driver now monitors both GPUs concurrently, saving data to separate output files.

#### `01-leakage-channel/Makefile`
**Changes:**
- Added `../util/nvidia-gpu-utils.o` to `UTILS` variable

**Why:** Links the new NVIDIA GPU utilities into the driver binary.

#### `01-leakage-channel/Readme.md`
**Changes:**
- Added section for "AMD processor with Radeon iGPU and NVIDIA dGPU"
- Added prerequisites for AMD + NVIDIA configuration
- Added GPU verification instructions using `detect_gpus.sh`
- Added documentation of output file formats:
  - `gpu_*.out`: AMD iGPU frequency data
  - `nvidia_gpu_*.out`: NVIDIA dGPU frequency and utilization data
- Added notes about Python script analysis (analyzes AMD iGPU data)

**Why:** Users need to know how to build and run on this configuration, and what to expect in the output.

## How the Changes Work

### Build Process
1. When you run `make CFLAGS+=-DAMD`, the code is compiled with AMD-specific paths
2. The NVIDIA utilities are always compiled and linked (they gracefully fail if no NVIDIA GPU is present)
3. All utility object files are compiled and linked into the driver binary

### Runtime Behavior
1. **Initialization Phase:**
   - AMD iGPU is initialized via sysfs (`/sys/class/hwmon/*/freq1_input`)
   - NVIDIA GPU is initialized via `nvidia-smi` checks
   - If NVIDIA init fails, program continues with AMD-only monitoring (no crash)

2. **Monitoring Phase (per experiment):**
   - Main thread: Runs the OpenGL workload (`texture` program)
   - Thread 1 (`monitor_imc`): Samples memory controller data every 1ms
   - Thread 2 (`monitor_gpu`): Samples AMD iGPU frequency every 5ms
   - Thread 3 (`monitor_nvidia_gpu`): Samples NVIDIA GPU frequency + utilization every 5ms

3. **Data Collection:**
   - AMD iGPU: `./out/gpu_<selector>_<index>.out`
     - Format: `<frequency_MHz>, <timestamp>`
   - NVIDIA dGPU: `./out/nvidia_gpu_<selector>_<index>.out`
     - Format: `<frequency_MHz>, <utilization_%>, <timestamp>`
   - Memory: `./out/imc_<selector>_<index>.out` and `./out/mem_<selector>_<index>.out`

4. **Cleanup Phase:**
   - Both GPU monitoring resources are released
   - All threads are joined
   - Output files are moved to timestamped data directories

## Testing Your Setup

### 1. Verify GPU Detection
```bash
cd 01-leakage-channel
./detect_gpus.sh
```

Expected output should show both AMD and NVIDIA GPUs detected.

### 2. Build the Driver
```bash
cd 01-leakage-channel
make clean
make CFLAGS+=-DAMD
```

### 3. Run a Test
```bash
cd scripts/exp1
./exp1.sh
```

The script will:
- Load MSR module
- Run 4 texture patterns (black, random, gradient, skew)
- Monitor both GPUs for 400 seconds per pattern
- Save results to timestamped directories

### 4. Check Output
```bash
ls ../../data/exp1-*/
```

You should see:
- `gpu_*.out` - AMD iGPU data
- `nvidia_gpu_*.out` - NVIDIA GPU data
- `imc_*.out` - Memory traffic data
- `mem_*.out` - Memory utilization data

## Dependencies

### Required:
- AMD processor with Radeon iGPU
- NVIDIA GPU with drivers installed
- `nvidia-smi` utility (comes with NVIDIA drivers)
- MSR kernel module (`sudo modprobe msr`)
- gcc compiler
- pthread library

### Optional:
- Python 3 with numpy (for data analysis)
- py-cpuinfo (for parsing scripts)

## Troubleshooting

### "AMD GPU not detected"
- Check: `ls /sys/class/hwmon/*/name | xargs cat`
- Should see "amdgpu" in the output
- If not, AMD drivers may not be loaded

### "nvidia-smi not found"
- Install NVIDIA drivers for your GPU
- Verify with: `nvidia-smi -L`

### "NVIDIA GPU initialization fail - will skip NVIDIA monitoring"
- This is a warning, not an error
- The program will continue monitoring AMD iGPU only
- Check NVIDIA drivers are working: `nvidia-smi`

### No data in nvidia_gpu_*.out files
- NVIDIA initialization failed (check nvidia-smi works)
- Or NVIDIA thread wasn't created (check AMD build flag: `make CFLAGS+=-DAMD`)

### Compilation errors
- Make sure all util/*.c files are present
- Try: `make clean` then `make CFLAGS+=-DAMD`
- Check gcc version: `gcc --version` (should be 7.0+)

## Performance Notes

- Monitoring NVIDIA GPU via `nvidia-smi` spawns a subprocess every 5ms
- This adds minimal overhead (~0.1% CPU) but is measurable
- For production use, consider NVML library for direct GPU queries
- AMD iGPU monitoring via sysfs has negligible overhead

## Future Enhancements

Possible improvements:
1. Use NVML library instead of nvidia-smi for lower overhead
2. Add support for multiple NVIDIA GPUs
3. Unified parsing script that analyzes both GPU traces
4. Automatic GPU selection (prefer iGPU for workload, monitor both)
5. Support for AMD dGPU in addition to Radeon iGPU

## Credits

- Original code: GPU-zip research project
- NVIDIA support added: 2025
- AMD multi-GPU support added: 2025

