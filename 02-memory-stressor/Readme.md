# Memory bus contention

The `write-only` workload in our graphical PoC (See `../poc/gpu-create` for details about the PoC) features pattern-dependent *DRAM traffic per frame* but not pattern-dependent *Rendering time per frame* because it cannot saturate the iGPU memory subsystem.
This folder tests that adding extra memory contention alongside `write-only` to saturate the memory controller can manifest rendering time differences (Figure 4 in the paper).

**Updated**: Now supports Intel iGPU, AMD Radeon iGPU, and NVIDIA GeForce dGPU.

## Preliminaries

### Required tools:
- **stress-ng**: For system memory contention testing
- **lspci**: For GPU detection (usually pre-installed on Linux)
- **Python packages**: `cpuinfo`, `numpy`, `matplotlib` (for analysis)

### Platform Support:
- **Linux**: Fully supported (tested on Ubuntu 22.04 and later)

## GPU Type Differences

This tool automatically detects your GPU type and adjusts the testing accordingly:

### Intel iGPU (Integrated Graphics)
- Shares system memory (RAM) with CPU
- Memory contention directly affects GPU performance
- Uses system memory stressors (`stress-ng --memcpy`)

### AMD Radeon iGPU (APU)
- Similar to Intel iGPU, shares system memory
- Memory contention directly affects GPU performance
- Uses system memory stressors (`stress-ng --memcpy`)

### NVIDIA GeForce dGPU (Discrete GPU)
- Has dedicated VRAM (separate from system RAM)
- System memory contention has less direct impact on GPU memory
- Uses both system and GPU-based stressors
- Results may show different patterns due to PCIe bandwidth considerations

## Tested Machines

- **Intel**: i7-8700 running Ubuntu 22.04
- **AMD**: Ryzen with Radeon iGPU
- **NVIDIA**: GeForce RTX/GTX series with dGPU

## How to Build

To build the graphical PoC: follow the instruction in `../poc/gpu-create`.

## How to Run

The script automatically detects your GPU type and CPU core count:

```bash
chmod +x stressor.sh check-setup.sh
./check-setup.sh  # Optional: verify prerequisites
./stressor.sh
```

The script will:
1. Auto-detect GPU type (Intel/AMD/NVIDIA)
2. Determine optimal number of memory stressors based on CPU cores
3. Run the graphic PoC (`write-only`) with patterns `Black` and `Random`
4. Test with workload complexity `iterations` = `10`, and `SCR_WIDTH` = `3000`
5. Incrementally add memory contention workers
6. Collect 10000 *Rendering time per frame* data points per test

Results are saved in `./time/` directory.

**Note**: 
- For AMD/Intel iGPU systems with many cores, the script automatically scales stressor count up to 12
- For NVIDIA dGPU systems, fewer system memory stressors are used (default: up to 8)

## Analyzing Results

To plot the collected data:

```bash
python stressor.py ./time/
```

Optional: Manually specify CPU frequency (in GHz) if auto-detection fails:

```bash
python stressor.py ./time/ --cpu-freq 3.6
```

The analysis script will:
- Auto-detect GPU and CPU type
- Display detected hardware information
- Generate plots showing rendering time vs. memory contention

The plot similar to Figure 4 in the paper can be found in the plot subfolder (`./plot/memory-stressor.pdf`).

## Expected Results

### Intel/AMD iGPU:
You should see clear rendering time differences between compressible (Black) and non-compressible (Random) patterns as memory contention increases, due to shared memory bandwidth.

### NVIDIA dGPU:
Results may show less pronounced differences or different patterns, as the GPU has dedicated VRAM. The bottleneck shifts from memory bandwidth to PCIe transfer rates and system-GPU communication.

## Troubleshooting

### Validation:
Run the setup checker to diagnose issues:
```bash
./check-setup.sh
```

### GPU not detected:
- Ensure `lspci` is installed: `sudo apt install pciutils`
- Run `lspci | grep -i vga` to manually check GPU detection
- Ensure GPU drivers are installed (AMD/NVIDIA)

### CPU frequency detection issues:
- Specify manually using `--cpu-freq` parameter
- Check with: `lscpu | grep MHz` or `cat /proc/cpuinfo`

### Insufficient memory stressors:
- Edit `stressor.sh` and increase `MAX_STRESSOR` value manually

### PoC binary not found:
- Build the texture PoC first: `cd ../poc/gpu-create && make`

### Missing dependencies:
```bash
# Install stress-ng
sudo apt install stress-ng

# Install Python packages
pip install cpuinfo numpy matplotlib

# Install optional GPU tools
sudo apt install mesa-utils  # For glxinfo, glxgears
```
