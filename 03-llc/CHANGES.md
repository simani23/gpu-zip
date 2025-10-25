# Changes for Multi-CPU/GPU Support

## Overview

Updated the LLC (Last Level Cache) walk time test to support AMD Ryzen processors and handle NVIDIA GeForce dGPU systems appropriately, in addition to the original Intel iGPU support.

## Key Insight

**LLC tests are most relevant for integrated GPUs (iGPU) that share system cache with the CPU.**

- **Intel iGPU**: Shares LLC with CPU ✓
- **AMD Radeon iGPU (APU)**: Shares L3 cache with CPU ✓
- **NVIDIA dGPU**: Has dedicated VRAM and L2 cache, does NOT share CPU LLC ⚠️

## What Changed

### Modified Files

#### 1. `Makefile`
**Changes:**
- Added `-lm` flag for math library (required for log2 in auto-detection)
- New target: `texture-auto` (auto-detection binary)
- Builds both original and auto-detection versions

**Benefits:**
- Backward compatible with original Intel version
- New auto-detection for AMD/other Intel CPUs

#### 2. `Readme.md`
**Complete rewrite with:**
- Multi-platform support documentation
- GPU/CPU architecture differences explained
- Auto-detection mode instructions
- Platform-specific notes for AMD/Intel/NVIDIA
- Enhanced troubleshooting section
- Expected behavior descriptions

### New Files

#### 3. `pputil_detect.c`
**Purpose:** Runtime cache parameter detection for multiple CPU architectures

**Features:**
- Detects LLC size from `/sys/devices/system/cpu/.../cache/`
- Identifies CPU vendor (AMD/Intel/Other)
- Calculates appropriate cache parameters:
  - Associativity (16-20 way)
  - Set index position
  - All-set offset
- Dynamic memory allocation for eviction arrays
- Graceful fallback to conservative defaults

**Supported CPUs:**
- AMD Ryzen (16-way, various L3 sizes)
- Intel Core (12-20 way, various LLC sizes)
- Generic CPUs (conservative defaults)

**Detection output:**
```
[LLC Detection] CPU: AMD Ryzen 7 5800X
[LLC Detection] LLC Size: 32.00 MiB
[LLC Detection] Associativity: 16-way
[LLC Detection] Sets: 32768
[LLC Detection] All-set offset: 21
```

#### 4. `texture-auto.cpp`
**Purpose:** Modified texture.cpp that uses pputil_detect.c

**Differences from texture.cpp:**
- Includes `pputil_detect.c` instead of `pputil.c`
- Calls `cleanup_cache_detection()` on exit
- Otherwise functionally identical

#### 5. `scripts/llc-auto.sh`
**Purpose:** Intelligent test script with auto-configuration

**Features:**
- Runs binary once to detect CPU and LLC size
- Calculates optimal texture size range:
  - Minimum: ~0.3x LLC size
  - Maximum: ~2.3x LLC size
  - Step size: covers range in ~35 steps
- Rounds values to nice numbers (multiples of 50)
- Displays comprehensive configuration info
- Progress indicators
- Works with any LLC size (8 MiB to 64+ MiB)

**Example configurations:**

| CPU | LLC | Min Size | Max Size | Min MiB | Max MiB |
|-----|-----|----------|----------|---------|---------|
| Intel i7-8700 | 12 MB | 1050 | 2750 | 4.2 | 28.8 |
| AMD Ryzen 5 3600 | 32 MB | 1750 | 4850 | 11.7 | 89.7 |
| Intel i5-9400 | 9 MB | 900 | 2400 | 3.1 | 21.9 |

### Preserved Files (Backward Compatibility)

- `texture.cpp` - Original version
- `pputil.c` - Original Intel i7-8700 parameters
- `scripts/llc.sh` - Original test script
- `scripts/plot_llc_size.py` - Unchanged (works with both modes)

## Architecture Comparison

### Intel iGPU Architecture
```
CPU <-> Shared LLC <-> iGPU
         (12 MiB)
```
- LLC is shared resource
- GPU compression reduces LLC pressure
- LLC walk time reflects GPU activity

### AMD APU Architecture
```
CPU <-> Shared L3 <-> Radeon iGPU
        (16-32 MiB)
```
- L3 cache is shared resource
- Similar behavior to Intel
- Often has larger cache (more test range)

### NVIDIA dGPU Architecture
```
CPU <-> CPU LLC      VRAM <-> GPU L2 <-> NVIDIA GPU
        (separate)            (separate)
```
- CPU and GPU caches are independent
- LLC walk time measures CPU cache only
- GPU compression doesn't affect CPU LLC
- **Results may not show clear patterns**

## Usage Comparison

### Original Mode (Intel i7-8700)
```bash
cd scripts
./llc.sh
```
- Fixed range: 1000-2700 (3.8-27.8 MiB)
- Hardcoded Intel parameters
- Reproducible for paper

### Auto-Detection Mode (AMD/Other Intel)
```bash
cd scripts
./llc-auto.sh
```
- Adaptive range based on LLC size
- Runtime CPU detection
- Optimal for your system

### For NVIDIA dGPU Systems
```bash
# LLC test available but less relevant
./llc-auto.sh  # Will work but may not show GPU compression

# Better alternatives:
cd ../../02-memory-stressor
./stressor.sh  # Memory bandwidth testing

cd ../../poc/gpu-create/scripts
./time-all.sh  # Direct GPU timing tests
```

## Technical Details

### Cache Parameter Heuristics

**AMD Ryzen:**
- L3 cache typically 16-way associative
- Sizes: 16-32 MiB (desktop), 4-16 MiB (mobile)
- Set count calculation: `L3_size / (16 * 64)`
- All-set offset: `log2(sets) + 6`

**Intel Core (modern):**
- LLC typically 12-20 way associative
- Newer CPUs (10th gen+): 20-way
- Older CPUs (8th-9th gen): 12-16 way
- Same calculation method as AMD

**Generic/Unknown:**
- Conservative: 16-way, detected size
- May be less accurate but safe

### Prime+Probe Implementation

The LLC walk time test uses a Prime+Probe technique:

1. **Prime Phase**: Fill all LLC sets with eviction sets
2. **GPU Activity**: GPU writes compressed/uncompressed texture
3. **Probe Phase**: Walk eviction sets, measure time
4. **Analysis**: Higher time = more cache misses = more LLC usage

**Why it works for iGPU:**
- Compressed textures use less cache
- Less eviction of probe sets
- Faster walk time

**Why it may not work for dGPU:**
- GPU has own cache/memory
- CPU LLC not involved in GPU operations
- Walk time unchanged

## Backward Compatibility

✅ **Fully backward compatible**

- Original binaries and scripts unchanged
- Can still reproduce paper results exactly
- New features are additive

## Migration Guide

### If you have Intel iGPU:
**No changes needed!** Use original or new version:
```bash
./llc.sh          # Original (works)
./llc-auto.sh     # Auto-detection (also works, may adjust range)
```

### If you have AMD APU:
**Use new version:**
```bash
./llc-auto.sh     # Automatically adapts to your L3 size
```

### If you have NVIDIA dGPU:
**Consider alternatives:**
- LLC test measures CPU cache only
- Use memory-stressor or direct GPU timing tests
- Or test with iGPU if available (e.g., Ryzen with Radeon)

## Expected Results

### Intel/AMD iGPU Systems
Clear divergence when texture exceeds LLC:
```
Texture Size    Compressible    Non-Compressible
   8 MiB           ~100 µs           ~100 µs
  12 MiB           ~110 µs           ~150 µs
  16 MiB           ~115 µs           ~200 µs
  24 MiB           ~120 µs           ~300 µs
```

### NVIDIA dGPU Systems
May see minimal or no divergence:
```
Texture Size    Compressible    Non-Compressible
   8 MiB           ~100 µs           ~100 µs
  12 MiB           ~105 µs           ~105 µs
  16 MiB           ~110 µs           ~110 µs
  24 MiB           ~115 µs           ~115 µs
```
(Both track CPU LLC, not GPU activity)

## Build Requirements

### Original Version
- g++ with C++17
- OpenGL/GLFW libraries
- Standard C libraries

### Auto-Detection Version
**Additional:**
- Math library (-lm) for log2()
- `/sys/devices/system/cpu/` filesystem (Linux)
- `bc` utility for bash calculations

Install on Ubuntu:
```bash
sudo apt install bc build-essential libgl1-mesa-dev libglfw3-dev
```

## Testing Matrix

| CPU Type | GPU Type | LLC Shared? | Use | Expected Results |
|----------|----------|-------------|-----|------------------|
| Intel Core | Intel iGPU | Yes | llc-auto.sh | Clear pattern |
| AMD Ryzen | Radeon iGPU | Yes | llc-auto.sh | Clear pattern |
| Intel Core | NVIDIA dGPU | No | Alternative tests | Minimal pattern |
| AMD Ryzen | NVIDIA dGPU | No | Alternative tests | Minimal pattern |
| Intel Core | Both | Mixed | llc-auto.sh + others | Varies by active GPU |

## Future Enhancements

Possible improvements:
- ARM CPU support (Apple M1, etc.)
- Automatic GPU selection (if multiple GPUs)
- Web-based visualization
- CSV export for statistical analysis
- Cross-platform support (macOS, Windows/WSL)

## Notes

- All changes maintain scientific reproducibility
- Original Intel setup unchanged for paper reproduction
- New features enable broader research applicability
- Clear documentation of limitations (NVIDIA dGPU)

## Questions?

See `Readme.md` for detailed usage instructions and troubleshooting.


