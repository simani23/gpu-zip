# Quick Start Guide: AMD + NVIDIA GPU Setup

## System Requirements
- AMD processor with Radeon iGPU
- NVIDIA GeForce RTX discrete GPU
- NVIDIA drivers installed
- Linux OS (Ubuntu/Debian recommended)

## Quick Setup (5 minutes)

### Step 1: Verify Your GPUs
```bash
cd 01-leakage-channel
./detect_gpus.sh
```

**Expected:** Both AMD and NVIDIA GPUs should be detected.

### Step 2: Build
```bash
make clean
make CFLAGS+=-DAMD
```

**Expected:** No errors, creates `bin/driver` executable.

### Step 3: Build the Graphics PoC
```bash
cd ../poc/gpu-create
make
cd ../../01-leakage-channel
```

**Expected:** Creates `../poc/gpu-create/bin/texture` executable.

### Step 4: Run Test Experiment
```bash
cd scripts/exp1
./exp1.sh
```

**Expected:**
- Runs for ~27 minutes (4 patterns × 400 seconds + overhead)
- Creates data directories in `../../data/`

### Step 5: Verify Results
```bash
# Check output files were created
ls -lh ../../data/exp1-*/

# Should see:
# - gpu_*.out (AMD iGPU)
# - nvidia_gpu_*.out (NVIDIA dGPU)
# - imc_*.out (Memory)
# - mem_*.out (Memory utilization)
```

### Step 6: Parse Results
```bash
# Install Python dependencies if needed
pip install numpy py-cpuinfo

# Parse the data
python exp1.py ../../data/exp1-<DATE>/ ../../data/time-exp1-<DATE>/

# Replace <DATE> with actual timestamp, e.g., 1024-1530
```

**Expected:** Output showing statistics for Black, Random, Gradient, and Skew patterns.

## Output File Formats

### AMD iGPU Data (`gpu_*.out`)
```
<frequency_MHz>, <timestamp_ns>
350, 1234567890123456
375, 1234567895123456
...
```

### NVIDIA dGPU Data (`nvidia_gpu_*.out`)
```
<frequency_MHz>, <utilization_%>, <timestamp_ns>
1500, 45, 1234567890123456
1650, 52, 1234567895123456
...
```

### Memory Traffic (`imc_*.out`)
```
<traffic_MiB>, <timestamp_ns>
125.5, 1234567890123456
...
```

## Common Commands

### Check AMD GPU
```bash
ls /sys/class/hwmon/*/name | xargs grep -l amdgpu
cat /sys/class/hwmon/hwmon*/freq1_input  # Current frequency
```

### Check NVIDIA GPU
```bash
nvidia-smi -L  # List GPUs
nvidia-smi     # Full status
nvidia-smi --query-gpu=clocks.gr,utilization.gpu --format=csv
```

### Load MSR Module (required for memory monitoring)
```bash
sudo modprobe msr
lsmod | grep msr  # Verify loaded
```

### Clean Build
```bash
make clean
rm -rf ../util/*.o
make CFLAGS+=-DAMD
```

## Experiment Configurations

### Experiment 1 (exp1.sh) - Table 2 Reproduction
- **Duration:** ~27 minutes
- **Workload:** write-read
- **Patterns:** Black, Random, Gradient, Skew
- **Complexity:** Fixed (20 layers, 3000x3000 texture)
- **Output:** DRAM traffic vs pattern

### Experiment 2 (exp2.sh) - Figure 2 & 3 Reproduction
- **Duration:** ~20+ hours (much longer!)
- **Workload:** read-only and write-only
- **Patterns:** Black, Random, Gradient, Skew
- **Complexity:** Variable (1 to 44 layers)
- **Output:** DRAM traffic vs complexity, bandwidth analysis

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `detect_gpus.sh` shows no AMD GPU | Check AMD drivers: `lsmod \| grep amdgpu` |
| `detect_gpus.sh` shows no NVIDIA GPU | Install NVIDIA drivers, verify with `nvidia-smi` |
| Build error: "nvidia-gpu-utils.h not found" | Make sure you're in `01-leakage-channel/` directory |
| No `nvidia_gpu_*.out` files created | Check nvidia-smi works, rebuild with `-DAMD` flag |
| Permission denied errors | Run exp1.sh with `sudo`, it needs MSR access |
| Texture process hangs | Check OpenGL works: `glxinfo \| grep OpenGL` |

## Performance Tips

1. **Close other applications** - GPU monitoring is sensitive to background activity
2. **Use dedicated GPU for display** - Configure NVIDIA as display GPU to reduce iGPU interference
3. **Disable GPU boost** - For consistent frequency measurements:
   ```bash
   # NVIDIA (optional, for reproducibility)
   sudo nvidia-smi -lgc <FREQ>  # Lock GPU clock
   ```
4. **Monitor system load** - Use `htop` to ensure CPU isn't throttling
5. **Check thermals** - High temperature can cause frequency throttling

## File Structure
```
01-leakage-channel/
├── bin/driver              # Built executable
├── data/                   # Results (created at runtime)
│   ├── exp1-MMDD-HHMM/    # Experiment 1 results
│   └── time-exp1-MMDD-HHMM/
├── scripts/
│   ├── exp1/
│   │   ├── exp1.sh        # Run experiment 1
│   │   └── exp1.py        # Parse results
│   └── exp2/
│       ├── exp2.sh        # Run experiment 2
│       └── exp2.py        # Parse results
├── driver.c               # Main monitoring code
├── Makefile
├── detect_gpus.sh         # GPU detection tool
├── Readme.md              # Full documentation
├── QUICKSTART_AMD_NVIDIA.md  # This file
└── CHANGES_AMD_NVIDIA.md  # Detailed change log
```

## Next Steps

1. **Understand the data:**
   - Read the paper (GPU-zip.pdf) to understand the leakage channel
   - Compare compressible (Black, Gradient) vs non-compressible (Random, Skew)
   - Look for differences in DRAM traffic patterns

2. **Experiment:**
   - Try different texture patterns
   - Modify complexity parameters in the shell scripts
   - Analyze both AMD iGPU and NVIDIA dGPU data

3. **Analyze NVIDIA data:**
   - The Python scripts currently analyze AMD iGPU data
   - NVIDIA data is in `nvidia_gpu_*.out` files
   - You can create custom analysis scripts or modify exp1.py

## Support

For issues specific to:
- **AMD GPU monitoring:** Check `util/amd-gpu-utils.c`
- **NVIDIA GPU monitoring:** Check `util/nvidia-gpu-utils.c`
- **Build issues:** Check Makefile and gcc version
- **Runtime issues:** Check driver.c and run with verbose output

## Additional Resources

- Original README: `Readme.md`
- Change documentation: `CHANGES_AMD_NVIDIA.md`
- GPU PoC documentation: `../poc/gpu-create/Readme.md`
- Research paper: `../GPU-zip.pdf`

