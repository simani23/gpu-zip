# GPU Shader Pattern Timing - Quick Reference Guide

## Overview

These scripts test and analyze rendering performance across all 4 shader patterns to demonstrate GPU data compression effects.

## Quick Start

```bash
cd poc/gpu-create/scripts
chmod +x time.sh time-all.sh

# Test all patterns with defaults
./time-all.sh

# View results
ls -lh plot/time.pdf
```

## The Four Shader Patterns

| Pattern   | Color Value | Compression | Description |
|-----------|-------------|-------------|-------------|
| **Black** | 0.0 | High | All pixels identical (solid black) |
| **Random** | 1.0 | None | Random pixel values |
| **Gradient** | Divides size | Medium | Smooth color gradients |
| **Skew** | Doesn't divide size | Low | Irregular patterns |

## Scripts

### `time-all.sh` - Complete Test Suite

**Purpose:** Run all 4 patterns automatically

**Usage:**
```bash
./time-all.sh [iterations] [size] [type] [samples]
```

**Parameters:**
- `iterations`: Workload complexity (default: 100)
- `size`: Texture width/height (default: 3000)
- `type`: Workload type (default: 2)
  - 0 = read-only
  - 1 = write-only
  - 2 = write-read
- `samples`: Number of timing samples (default: 500)

**Examples:**
```bash
# Use all defaults (100 iterations, 3000x3000, write-read, 500 samples)
./time-all.sh

# Custom configuration
./time-all.sh 200 4096 1 1000

# Quick test (fewer samples)
./time-all.sh 50 2048 2 100
```

### `time.sh` - Flexible Testing

**Purpose:** Same as time-all.sh, tests all patterns

**Usage:**
```bash
./time.sh [iterations] [size] [type] [samples]
```

Same parameters and behavior as `time-all.sh`.

### `plot_time.py` - Analysis Tool

**Purpose:** Generate comparison plots and statistics

**All Patterns Mode (Recommended):**
```bash
python plot_time.py \
    --black time_2_3000_0.0_100.txt \
    --random time_2_3000_1.0_100.txt \
    --gradient time_2_3000_100.0_100.txt \
    --skew time_2_3000_101.0_100.txt
```

**Subset of Patterns:**
```bash
# Just Black vs Random
python plot_time.py \
    --black time_2_3000_0.0_100.txt \
    --random time_2_3000_1.0_100.txt

# Any combination works
python plot_time.py \
    --black file1.txt \
    --gradient file2.txt
```

**Legacy Mode (Backward Compatible):**
```bash
python plot_time.py compressible.txt non-compressible.txt
```

**Custom Output Location:**
```bash
python plot_time.py --black f1.txt --random f2.txt -o results/my_plot.pdf
```

## Understanding Results

### Terminal Output

```
============================================================
Rendering Time Analysis
============================================================
               Black:   12345.67 ±     234 cycles
                        (min:    12000, max:    13000)
              Random:   15678.90 ±     456 cycles
                        (min:    15000, max:    16500)
            Gradient:   13456.78 ±     345 cycles
                        (min:    13000, max:    14000)
                Skew:   14567.89 ±     389 cycles
                        (min:    14000, max:    15000)
============================================================
```

### Plot Interpretation

- **X-axis:** Rendering time in CPU cycles
- **Y-axis:** Probability (normalized histogram)
- **Colors:**
  - Navy: Black pattern
  - Orange: Random pattern
  - Green: Gradient pattern
  - Purple: Skew pattern

**What to look for:**
- Patterns shifted left = faster rendering (better compression)
- Patterns shifted right = slower rendering (less compression)
- Tighter distributions = more consistent performance

## Common Use Cases

### 1. Quick Compression Test
```bash
# Test if your GPU supports compression
./time-all.sh 50 2048 1 200
```
If Black renders significantly faster than Random, compression is active.

### 2. Detailed Analysis
```bash
# High-precision test
./time-all.sh 200 4096 2 2000
```
More samples = more reliable statistics.

### 3. Different Workload Types

```bash
# Read-only test
./time-all.sh 100 3000 0 500

# Write-only test
./time-all.sh 100 3000 1 500

# Write-read test
./time-all.sh 100 3000 2 500
```

### 4. Re-analyze Existing Data

```bash
# If you already have timing files
python plot_time.py \
    --black old_time_2_3000_0.0_100.txt \
    --random old_time_2_3000_1.0_100.txt \
    -o reanalysis.pdf
```

## File Naming Convention

Generated timing files follow this pattern:
```
time_<type>_<size>_<color>_<iterations>.txt
```

Examples:
- `time_2_3000_0.0_100.txt` - Write-read, 3000x3000, Black, 100 iterations
- `time_1_4096_1.0_200.txt` - Write-only, 4096x4096, Random, 200 iterations
- `time_0_2048_100.0_50.txt` - Read-only, 2048x2048, Gradient, 50 iterations

## Troubleshooting

### "texture binary not found"
```bash
cd ../
make
cd scripts
```

### "No valid timing data found"
Check that the timing files were generated:
```bash
ls -lh time_*.txt
```

### Plots look strange
- Ensure enough samples (>100 recommended)
- Check for errors during texture execution
- Try simpler configuration (smaller size, fewer iterations)

### Different machines show different results
This is expected! GPU compression behavior varies by:
- GPU architecture (Intel vs AMD vs NVIDIA)
- GPU driver version
- System memory speed
- Workload type

## Tips for Best Results

1. **Close other applications** before testing
2. **Run multiple times** and average results
3. **Use consistent parameters** for comparisons
4. **Test different sizes** (2048, 3000, 4096) to see scaling
5. **Check CPU/GPU usage** during tests (should be consistent)

## Integration with Other Tools

These scripts work seamlessly with:
- `02-memory-stressor/` - Test with memory contention
- `03-llc/` - Test with LLC pressure
- Custom workloads - Modify the scripts as needed

## Advanced Usage

### Custom Color Values

Edit `time.sh` or `time-all.sh` to test specific patterns:
```bash
# Test a specific gradient
../bin/texture 75.0 100 3000 2 500
```

### Batch Testing

```bash
# Test multiple configurations
for size in 2048 3000 4096; do
    ./time-all.sh 100 $size 2 500
done
```

### Pattern-Specific Testing

```bash
# Only test Black pattern
../bin/texture 0.0 100 3000 2 500
python plot_time.py --black time_2_3000_0.0_100.txt -o black_only.pdf
```

