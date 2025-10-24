# Pattern-dependent last level cache utilization

This folder tests that compressible versus non-compressible textures leave pattern-dependent *LLC walk time* (metric for contention over the last level cache. See paper S3.4).
Scripts generate data for reproducing Figure 5 in the paper.

**Updated**: Now supports Intel, AMD Ryzen (APU), and handles NVIDIA dGPU with appropriate notes.

## Preliminaries

- Compiler: g++ with the C++17 standard.
- Required shared libraries: OpenGL library (-lgl), GLFW library (-lglfw), Math library (-lm).
- OpenGL version: core profile 3.3. Corresponding GLAD (OpenGL Loader Generator) locates at `../poc/library/glad`.
- Linux utilities: bc (for bash calculations)

## GPU/CPU Architecture Differences

### Intel iGPU & AMD Radeon iGPU (APU)
- **Share system LLC** with CPU
- LLC contention directly observable
- Pattern-dependent compression affects LLC walk time
- **Use**: `texture-auto` binary with `llc-auto.sh`

### NVIDIA GeForce dGPU
- **Has dedicated VRAM** and separate L2 cache
- Does NOT share CPU LLC
- LLC walk time test measures CPU cache only
- GPU compression may not show in LLC metrics
- **Note**: Results may not demonstrate GPU compression effects as clearly

## Tested Machines

- **Intel**: i7-8700 (12 MiB LLC) running Ubuntu 22.04
- **AMD**: Ryzen 5/7 with Radeon iGPU (various LLC sizes)
- **NVIDIA**: dGPU systems (results differ due to dedicated memory)

## How to Build

```bash
make
```

This builds two binaries:
- `bin/texture` - Original version (Intel i7-8700 hardcoded params)
- `bin/texture-auto` - Auto-detection version (Intel/AMD/other CPUs)

## How to Run

### Auto-Detection Mode (Recommended for AMD/Different Intel CPUs):

```bash
cd scripts
chmod +x llc-auto.sh
./llc-auto.sh
```

**What it does:**
- Automatically detects your CPU and LLC size
- Calculates appropriate texture size range (~0.3x to ~2.3x LLC size)
- Adjusts test parameters accordingly
- Runs 2000 samples per test

**Example output:**
```
Detecting system cache configuration...
[LLC Detection] CPU: AMD Ryzen 7 5800X
[LLC Detection] LLC Size: 32.00 MiB
[LLC Detection] Associativity: 16-way
...
Test Configuration:
  Texture size range: 1750x1750 to 4850x4850
  Approximate texture size: 11.7 MiB to 89.7 MiB
```

### Original Mode (Intel i7-8700):

```bash
cd scripts
chmod +x llc.sh
./llc.sh
```

Fixed texture size range: 1000×1000 to 2700×2700 (3.8 MiB to 27.8 MiB).

## Analyzing Results

To plot the collected data:

```bash
python plot_llc_size.py ./data/
```

The plot will be saved in `./plot/llc_size.pdf`.

**Plot interpretation:**
- **X-axis**: Texture size (MiB)
- **Y-axis**: LLC walk time (ms)
- **Blue (Compressible)**: Should show lower/stable LLC walk time
- **Orange (Non-compressible)**: Should show higher LLC walk time as size increases

**Expected behavior (iGPU):**
- When texture fits in LLC: Both patterns show similar walk times
- When texture exceeds LLC: Non-compressible shows higher walk time
- Compressible pattern may fit longer due to compression

## Understanding LLC Walk Time

**LLC Walk Time** measures cache contention by:
1. Creating eviction sets that span all LLC sets
2. Measuring time to traverse these sets
3. Higher time = more cache misses = more contention

**Why it matters for GPU compression:**
- Compressed GPU data uses less LLC space
- More data can fit in LLC
- Reduced CPU-GPU memory traffic
- Observable as lower LLC walk times

## Platform-Specific Notes

### AMD Ryzen APUs
- Typically have 16-32 MiB L3 cache
- 16-way set associative
- Auto-detection works well
- May need longer cooldown between tests (adjust sleep in script)

### Intel CPUs
- Varies: 8-20 MiB LLC typical
- 12-20 way set associative
- Both original and auto-detection modes work
- i7-8700 specific: use `llc.sh` for exact reproduction

### NVIDIA dGPU Systems
- Test measures **CPU LLC only**, not GPU L2
- GPU compression won't show in these results
- May still see CPU-side memory effects
- Consider using other tests (memory-stressor, etc.) for GPU analysis

## Troubleshooting

### "Failed to detect LLC size"
- Check if `/sys/devices/system/cpu/cpu0/cache/` exists
- Install `bc` utility: `sudo apt install bc`
- Manually specify LLC size by editing `llc-auto.sh`

### Large LLC requires long tests
- AMD Ryzen with 32 MiB LLC tests larger texture range
- Consider reducing sample count in script (2000 → 1000)
- Or reduce texture size range

### Results look noisy
- Close background applications
- Run with higher priority: `sudo nice -n -20 ./llc-auto.sh`
- Increase sample count for better statistics
- Ensure system is cool (thermal throttling affects results)

### NVIDIA dGPU shows no clear pattern
- Expected behavior (GPU has separate memory/cache)
- Use `02-memory-stressor/` for memory bandwidth tests instead
- Or test with iGPU if available

## Files

### Source Files
- `texture.cpp` - Original (includes `pputil.c`)
- `texture-auto.cpp` - Auto-detection (includes `pputil_detect.c`)
- `pputil.c` - Intel i7-8700 hardcoded cache parameters
- `pputil_detect.c` - Runtime cache detection for multiple CPUs

### Scripts
- `scripts/llc.sh` - Original test script (Intel i7-8700)
- `scripts/llc-auto.sh` - Auto-detection test script (AMD/Intel/other)
- `scripts/plot_llc_size.py` - Analysis and plotting

### Build
- `Makefile` - Builds both versions
