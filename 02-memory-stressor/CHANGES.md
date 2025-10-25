# Changes for Multi-GPU Support

## Overview
Updated the memory stressor tool to support AMD Radeon iGPU and NVIDIA GeForce dGPU in addition to the original Intel iGPU support.

## Files Modified

### 1. `stressor.sh` (Bash Script)
**Changes:**
- Added automatic GPU detection (Intel/AMD/NVIDIA)
- Dynamic adjustment of stressor count based on GPU type and CPU cores
- Added NVIDIA-specific GPU stress function
- Improved output organization and error handling
- Better cross-platform compatibility

**New Features:**
- Detects GPU type using `lspci`
- For NVIDIA dGPU: Uses up to 8 system memory stressors + GPU-specific stress
- For Intel/AMD iGPU: Uses up to 12 system memory stressors (or CPU core count)
- Progress indicators and informative output

### 2. `stressor.py` (Analysis Script)
**Changes:**
- Added robust CPU frequency detection for both Intel and AMD processors
- Added GPU type detection and reporting
- Added command-line argument for manual CPU frequency specification
- Improved error handling and fallback mechanisms
- Better cross-platform support (Linux primarily)

**New Features:**
- `--cpu-freq` argument to manually specify CPU frequency
- Auto-detection with multiple fallback methods
- Displays detected hardware information
- Supports AMD processor frequency detection

### 3. `Readme.md` (Documentation)
**Changes:**
- Complete rewrite to document multi-GPU support
- Added GPU type differences explanation
- Added Windows PowerShell instructions
- Enhanced troubleshooting section
- Added validation script instructions

**New Sections:**
- GPU Type Differences (Intel/AMD/NVIDIA)
- Platform Support (Linux/Windows/WSL)
- Expected Results by GPU type
- Comprehensive troubleshooting guide

## New Files Created

### 4. `nvidia-gpu-stress.sh` (NVIDIA Helper Script)
**Purpose:** Dedicated NVIDIA GPU memory stress utility

**Features:**
- Uses OpenGL (glxgears) for GPU load
- Optional CUDA support if available
- Configurable instance count and duration
- Automatic nvidia-smi detection and configuration

### 5. `check-setup.sh` (Validation Script)
**Purpose:** Pre-flight check for all prerequisites

**Features:**
- Verifies OS compatibility
- Checks for required tools (stress-ng, lspci, Python)
- Validates Python packages
- Detects and reports GPU information
- Checks CPU information
- Verifies PoC binary existence
- Tests OpenGL support

### 6. `CHANGES.md` (This File)
**Purpose:** Document all changes and new features

## GPU Support Matrix

| GPU Type | Memory Architecture | Stressor Approach | Expected Results |
|----------|-------------------|-------------------|------------------|
| Intel iGPU | Shared system RAM | System memory contention (stress-ng) | Clear pattern differences |
| AMD Radeon iGPU | Shared system RAM | System memory contention (stress-ng) | Clear pattern differences |
| NVIDIA dGPU | Dedicated VRAM | System + GPU stress | Different patterns (PCIe bottleneck) |

## Platform Support

| Platform | Script | Status | Notes |
|----------|--------|--------|-------|
| Linux (Ubuntu) | `stressor.sh` | ✓ Full | Tested on Ubuntu 22.04+ |

## Dependencies

### Original:
- stress-ng
- OpenGL/GLFW (via PoC)
- Python: cpuinfo, numpy, matplotlib

### New/Enhanced:
- lspci (Linux GPU detection)
- nvidia-smi (optional, for NVIDIA GPUs)
- glxgears (optional, for GPU stress testing)
- glxinfo (optional, for OpenGL validation)

## Backward Compatibility

All changes are **backward compatible**:
- Original Intel iGPU workflow unchanged
- Can still run on Intel systems without modifications
- Auto-detection falls back gracefully
- Manual overrides available via command-line arguments

## Testing Recommendations

### For Intel iGPU:
```bash
./stressor.sh  # Should work as before
```

### For AMD Radeon iGPU:
```bash
./stressor.sh  # Auto-detects AMD, similar behavior to Intel
```

### For NVIDIA dGPU:
```bash
./stressor.sh  # Auto-detects NVIDIA, uses modified approach
```


## Known Limitations

1. **NVIDIA dGPU**: System memory stress has less direct impact on GPU performance due to dedicated VRAM
2. **NVIDIA Tools**: Some features require sudo/admin privileges (e.g., nvidia-smi persistence mode)
3. **CPU Frequency**: Auto-detection may fail on some AMD systems (use `--cpu-freq` override)
4. **GPU Detection**: Requires `lspci` to be installed and accessible

## Future Enhancements

Possible improvements:
- CUDA-based GPU memory stressor for NVIDIA
- ROCm support for AMD dGPU
- macOS Metal support
- Docker containerization for reproducibility
- Automated result comparison across GPU types

## Migration Guide

### From Original to Updated:

**No changes required!** The scripts are backward compatible.

**Optional enhancements:**
1. Run `./check-setup.sh` to validate environment
2. Use `--cpu-freq` if auto-detection fails
3. Review new documentation for platform-specific tips

## Authors
- Original implementation: [Original authors from paper]
- Multi-GPU updates: [Current contributor]

## License
Same as original project (see LICENSE file)

