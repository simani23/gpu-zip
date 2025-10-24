# Changes to GPU Shader Pattern Testing Scripts

## Overview

Enhanced the testing and plotting scripts to support **all four shader patterns** (Black, Random, Gradient, Skew) instead of just Black vs Random comparison.

## What Changed

### Modified Files

#### 1. `scripts/time.sh`
**Before:**
- Only tested Black (0.0) and Random (1.0) patterns
- Hardcoded 500 samples
- Basic output

**After:**
- Tests all 4 patterns: Black, Random, Gradient, Skew
- Configurable samples (4th parameter)
- Auto-calculates Gradient/Skew values based on texture size
- Informative progress output
- Better organized

**New Features:**
- Automatic pattern value calculation
- Support for custom sample counts
- Progress indicators
- Enhanced error handling

#### 2. `scripts/plot_time.py`
**Before:**
- Only compared 2 files (positional arguments)
- Simple histogram
- Limited customization

**After:**
- Supports up to 4 patterns with named arguments
- Backward compatible with old 2-file mode
- Color-coded patterns:
  - Black: Navy blue
  - Random: Orange
  - Gradient: Green
  - Skew: Purple
- Enhanced statistics output
- Better plot formatting (title, grid, larger figure)
- Custom output file option (`-o` flag)
- Robust error handling

**New Features:**
- Named arguments: `--black`, `--random`, `--gradient`, `--skew`
- Flexible subset plotting (any combination of patterns)
- Enhanced visualization (colors, grid, title)
- Detailed statistics with min/max values
- Better error messages

### New Files

#### 3. `scripts/time-all.sh`
**Purpose:** Comprehensive test runner with validation

**Features:**
- Tests all 4 shader patterns automatically
- Validates binary exists before running
- Tracks generated files
- Provides detailed progress output
- Generates summary report
- Handles partial failures gracefully
- Uses checkmarks (✓) and warnings (✗) for clarity

**Benefits:**
- One command to test everything
- Clear feedback on what succeeded/failed
- Automatic plot generation
- Easy to customize

#### 4. `scripts/USAGE.md`
**Purpose:** Comprehensive user guide

**Contents:**
- Quick start guide
- Detailed parameter explanations
- Pattern descriptions with compression info
- Usage examples for all scripts
- Troubleshooting section
- Tips for best results
- Advanced usage patterns
- Integration notes

#### 5. `CHANGES.md` (this file)
**Purpose:** Document all changes

### Updated Documentation

#### 6. `Readme.md`
**Changes:**
- New "Testing scripts" section
- Documented all 4 patterns
- Added script usage examples
- Explained different modes
- Added customization tips
- Better organization

## Backward Compatibility

✅ **Fully backward compatible!**

Old command still works:
```bash
./time.sh 100 3000 2
python plot_time.py file1.txt file2.txt
```

## Migration Guide

### If you were using the old scripts:

**No changes required!** Your existing workflows will continue to work.

**To use new features:**

```bash
# Old way (still works)
./time.sh 100 3000 2

# New way (tests all 4 patterns)
./time-all.sh 100 3000 2 500

# Or use enhanced time.sh (same result)
./time.sh 100 3000 2 500
```

## Feature Comparison

| Feature | Old Scripts | New Scripts |
|---------|-------------|-------------|
| Patterns tested | 2 (Black, Random) | 4 (Black, Random, Gradient, Skew) |
| Argument style | Positional only | Named + Positional |
| Sample configuration | Fixed 500 | Configurable |
| Plot colors | Default | Custom per pattern |
| Error handling | Basic | Robust |
| Progress output | Minimal | Detailed |
| Documentation | Basic | Comprehensive |
| Backward compatible | N/A | ✅ Yes |

## Usage Examples

### Basic Usage (All Patterns)

```bash
cd scripts
./time-all.sh
```

### Custom Configuration

```bash
# 200 iterations, 4096x4096 texture, write-only mode, 1000 samples
./time-all.sh 200 4096 1 1000
```

### Plotting Subsets

```bash
# Just Black and Random (like old behavior)
python plot_time.py \
    --black time_2_3000_0.0_100.txt \
    --random time_2_3000_1.0_100.txt

# All 4 patterns
python plot_time.py \
    --black time_2_3000_0.0_100.txt \
    --random time_2_3000_1.0_100.txt \
    --gradient time_2_3000_100.0_100.txt \
    --skew time_2_3000_101.0_100.txt
```

### Legacy Mode

```bash
# Old style still works
python plot_time.py compressible.txt non-compressible.txt
```

## Benefits

1. **Comprehensive Testing**: Test all compression behaviors, not just extremes
2. **Better Insights**: Gradient and Skew patterns show intermediate compression
3. **Flexibility**: Test any combination of patterns
4. **Clarity**: Color-coded plots make patterns easy to distinguish
5. **Usability**: Progress output and error handling
6. **Documentation**: Extensive guides and examples

## Pattern Insights

### Why Test All 4 Patterns?

- **Black**: Maximum compression (baseline best case)
- **Random**: No compression (baseline worst case)
- **Gradient**: Shows how smooth data compresses (real-world scenario)
- **Skew**: Shows irregular pattern behavior (real-world scenario)

Testing all 4 gives a complete picture of GPU compression capabilities.

## File Structure

```
poc/gpu-create/scripts/
├── time.sh              # Enhanced: tests all 4 patterns
├── time-all.sh          # New: comprehensive test runner
├── plot_time.py         # Enhanced: supports all patterns
├── USAGE.md             # New: user guide
└── plot/                # Output directory
    └── time.pdf         # Generated plot
```

## Testing Matrix

The scripts now support testing across multiple dimensions:

| Dimension | Options | Impact |
|-----------|---------|--------|
| Pattern | Black, Random, Gradient, Skew | Compression behavior |
| Workload | Read-only (0), Write-only (1), Write-read (2) | Memory access pattern |
| Size | 2048, 3000, 4096, etc. | Data volume |
| Iterations | 50, 100, 200, etc. | Workload complexity |
| Samples | 100, 500, 1000, etc. | Statistical precision |

## Future Enhancements

Possible future additions:
- CSV export for statistical analysis
- Multiple texture sizes in one run
- Time-series plots showing performance over time
- Automated regression detection
- Comparison mode (before/after driver updates)
- JSON output for programmatic analysis

## Notes

- All scripts maintain the original file naming convention
- Plot quality improved (300 DPI, better sizing)
- Statistics calculation unchanged (4-sigma outlier filtering)
- CPU cycle measurement unchanged
- Compatible with existing analysis workflows

## Questions?

See `USAGE.md` for detailed usage instructions and examples.

