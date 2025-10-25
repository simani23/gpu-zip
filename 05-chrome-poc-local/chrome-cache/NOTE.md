# Chrome-Cache PoC Note

## Status: Simplified Implementation

This chrome-cache directory contains the **basic structure** for the LLC walk time-based PoC, but requires additional implementation to be fully functional.

### What's Included:

✅ **Test patterns** (shared from test-patterns/)
✅ **Pixel embed HTML files** (copied from chrome-pp)
✅ **Cache contention measurement utility** (ccm.js - simplified)
✅ **Shared utilities** (subframe.js, worker_big.js)

### What Needs Implementation:

The full chrome-cache PoC requires:

1. **Complete HTML interface** (chrome.html) - Similar to chrome-pp but adapted for LLC metrics
2. **Main PoC logic** (chrome.js) - LLC measurement instead of rendering time
3. **Integration with ccm.js** - Proper LLC walk time measurement
4. **Calibration for LLC** - Different thresholds than rendering time

### Why Chrome-Cache is More Complex:

**LLC walk time measurement** is architecturally dependent:
- Requires understanding of CPU cache hierarchy
- Different behavior on AMD vs Intel
- **Not applicable to NVIDIA dGPU** (separate cache)
- More sensitive to system state and background processes

### Recommendation:

For **AMD Radeon iGPU** and **NVIDIA GeForce dGPU** testing, we recommend:

1. **Start with chrome-pp** (rendering time version)
   - More straightforward
   - Works across different GPU types
   - Easier to interpret results

2. **Use chrome-cache** only if:
   - You have Intel or AMD iGPU (not dGPU)
   - You want to explore LLC-based detection
   - chrome-pp shows clear timing differences

3. **For NVIDIA dGPU specifically**:
   - **Skip chrome-cache entirely** (won't work - separate LLC)
   - Use chrome-pp for browser-based testing
   - Use `../03-llc/` for direct LLC testing (CPU cache only)
   - Use `../poc/gpu-create/` for direct GPU timing

### To Create Full chrome-cache PoC:

If you need the complete chrome-cache implementation:

1. **Copy chrome-pp/chrome.html to chrome-cache/** and modify:
   - Change title to "LLC Walk Time"
   - Add LLC-specific UI elements
   - Remove rendering time specific elements

2. **Create chrome-cache/chrome.js** based on chrome-pp/chrome.js:
   - Replace `measureRenderingTime()` with LLC measurement
   - Use `ccm.js` for cache probing
   - Adapt calibration for LLC walk time (microseconds vs milliseconds)

3. **Test and calibrate**:
   - LLC walk time is typically in microseconds
   - Expect smaller absolute differences than rendering time
   - May need more samples for statistical significance

### Alternative: Use Original

If you need a complete, production-ready chrome-cache PoC:
- See `../04-chrome-poc/chrome-cache/` (original version)
- Note: Requires external website dependencies
- More complex but fully implemented

### For This Self-Contained Version:

**chrome-pp is the primary PoC** and should work well for:
- Intel iGPU ✓
- AMD Radeon iGPU ✓  
- NVIDIA dGPU (limited) ⚠️

**chrome-cache is optional** and only recommended for:
- Intel iGPU ✓
- AMD Radeon iGPU ✓
- NVIDIA dGPU ✗ (not applicable)

## Quick Decision Guide:

```
Do you have Intel or AMD iGPU?
├─ YES → Try chrome-pp first
│        └─ If successful, optionally try chrome-cache
│
└─ NO (NVIDIA dGPU) → Use chrome-pp only
                      (chrome-cache won't work)
```

For most users, **chrome-pp provides sufficient demonstration** of the GPU compression side-channel.


