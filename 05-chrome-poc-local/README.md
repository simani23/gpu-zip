# Self-Contained GPU Compression Side-Channel PoCs

This directory contains **fully self-contained, local-only** versions of the Chrome GPU compression side-channel proof-of-concepts. Unlike the original `04-chrome-poc/`, these PoCs work entirely offline without any external dependencies.

## What's Different from `04-chrome-poc/`

### Original (04-chrome-poc/)
- ❌ Depends on external websites (UW, Wikipedia, etc.)
- ❌ Requires internet connection
- ❌ External sites may change or go offline
- ❌ More complex CSP configuration

### This Version (05-chrome-poc-local/)
- ✅ Completely self-contained
- ✅ Works 100% offline
- ✅ Local test patterns included
- ✅ Simpler setup and testing
- ✅ Better for learning and experimentation
- ✅ Customizable test patterns

## Directory Structure

```
05-chrome-poc-local/
├── README.md                   # This file
├── test-patterns/              # Local test patterns (no external dependencies)
│   ├── checkerboard.html      # Checkerboard pattern (default test)
│   ├── solid-black.html       # Solid black (highly compressible)
│   ├── solid-white.html       # Solid white (highly compressible)
│   ├── gradient.html          # Gradient (moderately compressible)
│   └── noise.html             # Random noise (non-compressible)
├── shared/                     # Shared utilities
│   ├── subframe.js            # Iframe communication handler
│   └── worker_big.js          # Memory stress worker
├── chrome-pp/                  # Prime+Probe via rendering time
│   ├── chrome.html            # Main PoC interface
│   ├── chrome.js              # PoC logic
│   ├── pixel-embed-checkerboard.html
│   ├── pixel-embed-black.html
│   └── pixel-embed-white.html
└── chrome-cache/               # LLC walk time measurement
    ├── chrome.html            # Main PoC interface
    ├── chrome.js              # PoC logic (with LLC detection)
    ├── ccm.js                 # Cache contention measurement
    ├── pixel-embed-checkerboard.html
    ├── pixel-embed-black.html
    └── pixel-embed-white.html
```

## Two PoC Variants

### 1. chrome-pp (Prime+Probe via Rendering Time)
- **Method**: Measures direct GPU rendering time
- **Best for**: Intel iGPU, AMD Radeon iGPU
- **Principle**: Compressible vs non-compressible textures have different rendering times
- **Use case**: Systems where rendering time clearly differentiates patterns

### 2. chrome-cache (LLC Walk Time)
- **Method**: Measures Last Level Cache (LLC) contention
- **Best for**: Intel iGPU, AMD Radeon iGPU (APUs)
- **Principle**: GPU compression affects CPU LLC utilization
- **Note**: Less effective on NVIDIA dGPU (separate memory hierarchy)
- **Requirement**: Shared CPU-GPU LLC (iGPU architectures)

## GPU Platform Guidance

### ✅ Intel iGPU (Integrated Graphics)
- **Both PoCs**: Should work well
- **Recommended**: Try both chrome-pp and chrome-cache
- **Reason**: Shares system memory and LLC with CPU

### ✅ AMD Radeon iGPU (APU)
- **Both PoCs**: Should work well
- **Recommended**: Try chrome-pp first, then chrome-cache
- **Reason**: Shares L3 cache with CPU
- **Note**: May need to adjust parameters (larger cache = different thresholds)

### ⚠️ NVIDIA GeForce dGPU
- **chrome-pp**: May work (measures GPU rendering time)
- **chrome-cache**: Limited effectiveness (separate memory/cache)
- **Recommended**: Focus on chrome-pp only
- **Reason**: Dedicated VRAM and L2 cache, doesn't share CPU LLC
- **Alternative**: Use direct GPU timing tests from `poc/` directory

## Prerequisites

### Software
- **Modern web browser**: Chrome, Chromium, or Edge (Chromium-based)
- **Local web server**: Python 3 built-in server (recommended)
- **Operating System**: Linux (Ubuntu recommended), Windows with appropriate GPU drivers

### Hardware
- **GPU**: Intel iGPU, AMD Radeon iGPU, or NVIDIA dGPU
- **RAM**: 4GB+ recommended
- **Display**: Any (PoC works off-screen)

## Quick Start

### 1. Start Local Web Server

From the `05-chrome-poc-local/` directory:

```bash
python3 -m http.server 8000
```

Or from the repository root:

```bash
cd 05-chrome-poc-local
python3 -m http.server 8000
```

### 2. Open PoC in Browser

**For chrome-pp (Rendering Time):**
```
http://localhost:8000/chrome-pp/chrome.html
```

**For chrome-cache (LLC Walk Time):**
```
http://localhost:8000/chrome-cache/chrome.html
```

### 3. Configure Parameters

Both PoCs have similar configuration options:

- **Time**: Duration for SVG filter rendering (lower = faster, less accurate)
- **Repetition**: Number of calibration iterations (higher = more accurate threshold)
- **Stress**: Enable memory stress workers (recommended for powerful systems)
- **Warmup Time**: GPU warmup duration (ms)
- **Div Size**: Width of intermediate surfaces
- **Layer**: Number of SVG filter layers
- **Threshold Low/High**: Classification boundaries
- **Test Mode**: Calibration-only mode (no actual attack)

### 4. Run Test

1. Click **"Run"** to start
2. Wait for calibration phase
3. Observe timing differences between black/white targets
4. Check results in browser console

## How It Works

### Attack Principle

1. **Embed Target**: iframe contains a test pattern (checkerboard, black, white)
2. **Isolate Pixel**: Zoom and clip to single pixel
3. **SVG Filter**: Apply SVG filter that amplifies compression differences
   - If pixel is black → All intermediate surfaces are black (compressible)
   - If pixel is white → Intermediate surfaces have turbulence (non-compressible)
4. **Measure**: Detect compression via:
   - **chrome-pp**: Rendering time difference
   - **chrome-cache**: LLC walk time difference
5. **Infer**: Classify pixel as black or white based on threshold

### Why Compression Matters

**Compressible Content (Black):**
- Less memory bandwidth used
- Fits better in caches
- Faster rendering time (chrome-pp)
- Lower LLC contention (chrome-cache)

**Non-Compressible Content (Random/Turbulence):**
- More memory bandwidth used
- Less cache-friendly
- Slower rendering time (chrome-pp)
- Higher LLC contention (chrome-cache)

## Test Patterns

### Checkerboard (Default)
- **Purpose**: Simulates real cross-origin content
- **Compressibility**: Depends on pixel position
- **Use**: Primary test for pixel stealing demo

### Solid Black
- **Purpose**: Calibration (highly compressible)
- **Compressibility**: Maximum
- **Use**: Establish baseline "fast" threshold

### Solid White
- **Purpose**: Calibration (compressible, but filter adds turbulence)
- **Compressibility**: Low after SVG filter applied
- **Use**: Establish baseline "slow" threshold

### Gradient
- **Purpose**: Test intermediate compression
- **Compressibility**: Medium
- **Use**: Experimental testing

### Noise
- **Purpose**: Test non-compressible content
- **Compressibility**: Minimum
- **Use**: Worst-case scenario testing

## Recommended Testing Workflow

### 1. Initial Calibration (Test Mode)

```
1. Enable "Test Mode" checkbox
2. Set Time = 500ms, Repetition = 50
3. Set Stress = 0 (no memory stress)
4. Click "Run"
5. Observe black vs white timing difference
```

**Expected Results (iGPU):**
- Black: Lower rendering time (e.g., 10-15ms)
- White: Higher rendering time (e.g., 20-30ms)
- Clear separation indicates GPU compression is working

### 2. Optimize Parameters

If difference is small or inconsistent:
- ✅ **Increase Div Size** (e.g., 2000 → 4000)
- ✅ **Increase Layer count** (e.g., 10 → 20)
- ✅ **Enable Stress mode** (Stress = 1)
- ✅ **Adjust number of workers** (e.g., 4-8)

### 3. Full Attack Test

```
1. Disable "Test Mode"
2. Use optimized parameters from calibration
3. Set appropriate thresholds (e.g., Low=0.3, High=0.7)
4. Click "Run"
5. Watch pixel reconstruction
```

## Platform-Specific Tips

### Intel iGPU

**Recommended Settings:**
```
Time: 500ms
Repetition: 50
Stress: 0 or 1 (try both)
Div Size: 2000-3000
Layer: 10-15
```

**Expected Behavior:**
- Clear timing differences
- Both PoCs should work
- May not need memory stress

### AMD Radeon iGPU (APU)

**Recommended Settings:**
```
Time: 500ms
Repetition: 50
Stress: 1 (recommended)
Div Size: 2000-4000
Layer: 10-20
Workers: 4-8
```

**Expected Behavior:**
- May need higher layer count
- Memory stress helps
- chrome-pp typically more reliable than chrome-cache

### NVIDIA dGPU

**Recommended Settings:**
```
Time: 1000ms
Repetition: 100
Stress: 1
Div Size: 4000-6000
Layer: 20-30
Workers: 8-12
```

**Expected Behavior:**
- ⚠️ Timing differences may be very small or absent
- **chrome-cache** likely won't work (no shared LLC)
- **chrome-pp** might show minimal effect
- Consider using `poc/gpu-create` tests instead

**Why dGPU is Different:**
- Separate VRAM (not shared with system RAM)
- Separate L2 cache (not shared with CPU LLC)
- Compression happens in GPU domain, invisible to CPU
- PCIe bandwidth may be bottleneck, not memory compression

## Troubleshooting

### No Timing Difference Observed

**Possible Causes:**
1. **GPU doesn't support compression** (unlikely on modern GPUs)
2. **Parameters too small** → Increase Div Size and Layer count
3. **System too fast** → Enable memory stress
4. **NVIDIA dGPU** → Expected behavior, try alternatives

**Solutions:**
- Increase workload complexity (Div Size, Layers)
- Enable memory stress (Stress = 1)
- Try different test patterns
- Check browser console for errors

### Browser Freezes or Crashes

**Causes:**
- Too many layers or too large div size
- Too many memory stress workers

**Solutions:**
- Reduce Layer count
- Reduce Div Size
- Reduce number of workers
- Close other applications

### Inconsistent Results

**Causes:**
- Background processes interfering
- Thermal throttling
- Other browser tabs active

**Solutions:**
- Close unnecessary applications
- Let system cool down
- Use dedicated browser instance
- Increase repetition count

### CSP (Content Security Policy) Errors

**Should not occur** in this local version (all resources are local)

If you see CSP errors:
- Ensure you're accessing via `http://localhost:8000` or `http://127.0.0.1:8000`
- Check that Python server is running
- Don't open HTML files directly (file:// protocol won't work)

## Customization

### Creating Custom Test Patterns

You can create your own test patterns in `test-patterns/`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Custom Pattern</title>
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <!-- Your pattern here -->
  <canvas id="mypattern"></canvas>
  <script>
    // Generate your pattern
    // ...
    
    // Notify parent
    if (window.parent !== window) {
      window.parent.postMessage({type: 'pattern-loaded', pattern: 'custom'}, '*');
    }
  </script>
</body>
</html>
```

Then create a corresponding `pixel-embed-custom.html` that references it.

### Modifying SVG Filters

The SVG filter is defined in the embed HTML files. You can experiment with:
- Different `feTurbulence` parameters
- Additional filter operations
- Color transformations
- Blending modes

## Security and Ethics

⚠️ **This is research code for educational purposes**

- These PoCs demonstrate a **side-channel vulnerability**
- Do NOT use on real websites without permission
- Do NOT attempt to steal actual user data
- Use only on local test patterns
- Understand implications before deploying

The vulnerability has been disclosed and mitigations are being implemented by browser vendors.

## Performance Benchmarking

To measure PoC effectiveness:

**chrome-pp:**
```javascript
// In browser console after running test mode:
console.log("Black mean:", /* value from UI */);
console.log("White mean:", /* value from UI */);
console.log("Ratio:", whiteTime / blackTime);
```

Good ratio: > 1.5 (50% slower for white)
Excellent ratio: > 2.0 (100% slower for white)

**chrome-cache:**
```javascript
// Check LLC walk time in console
// Similar analysis as chrome-pp but with LLC metrics
```

## Comparison with Original

| Feature | 04-chrome-poc | 05-chrome-poc-local |
|---------|---------------|---------------------|
| External Dependencies | Yes (UW, Wikipedia) | None |
| Internet Required | Yes | No |
| Setup Complexity | Medium | Low |
| Customization | Hard | Easy |
| Pattern Variety | Limited | 5+ patterns |
| CSP Configuration | Complex | Simple |
| Educational Value | Good | Better |
| Research Use | Production | Development/Testing |

## License

Same as parent project. See root LICENSE file.

## References

- Original paper and code: `../04-chrome-poc/`
- GPU timing tests: `../poc/gpu-create/`
- LLC tests: `../03-llc/`
- Memory stress tests: `../02-memory-stressor/`

## Support

For platform-specific issues:
- Intel iGPU: Should work out of the box
- AMD APU: May need parameter tuning
- NVIDIA dGPU: Check GPU-specific notes above, consider alternative tests

For technical questions, refer to original paper and `../04-chrome-poc/Readme.md`.

