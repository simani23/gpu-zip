# Chrome-Cache PoC Note

## Status: GDone: Complete Implementation

This chrome-cache directory contains the **complete** LLC walk time-based PoC with full calibration and measurement capabilities.

### What's Included:

GDone: **Complete HTML interface** (chrome.html) - Full UI for LLC-based testing
GDone: **Main PoC logic** (chrome.js) - LLC measurement via cache contention
GDone: **Cache contention measurement** (ccm.js) - Web Worker for Prime+Probe
GDone: **Test patterns** (pixel-embed-*.html) - Black, white, and checkerboard targets
GDone: **Shared utilities** (subframe.js from ../shared/)
GDone: **Platform detection** - Warns if GPU is incompatible
GDone: **Calibration system** - Measures black vs white LLC walk time

### Why Chrome-Cache is More Complex:

**LLC walk time measurement** is architecturally dependent:
- Requires understanding of CPU cache hierarchy
- Different behavior on AMD vs Intel
- **Not applicable to NVIDIA dGPU** (separate cache)
- More sensitive to system state and background processes

### How to Use:

1. **Start the local server** (from parent directory):
   ```bash
   ./start-server.sh    # Linux/Mac
   start-server.bat     # Windows
   ```

2. **Open in browser**:
   ```
   http://localhost:8000/chrome-cache/chrome.html
   ```

3. **Configure and Run**:
   - Keep default settings or adjust based on your system
   - Enable "Test mode" (checked by default)
   - Click "Run PoC"
   - Wait for calibration to complete

4. **Interpret Results**:
   - **Black LLC Time**: Time to walk cache with compressible (black) data
   - **White LLC Time**: Time to walk cache with filtered (less compressible) white data
   - **Ratio**: White/Black ratio (higher = better separation)
   - **Good**: Ratio > 1.1
   - **Excellent**: Ratio > 1.5

### Recommendation:

**For most users, start with chrome-pp** (rendering time version):
- More straightforward and reliable
- Works across different GPU types
- Larger timing differences
- Easier to interpret results

**Use chrome-cache** only if:
- GDone: You have Intel or AMD iGPU (shared cache architecture)
- GDone: You want to explore LLC-based side-channel detection
- GDone: chrome-pp successfully demonstrated timing differences

**For NVIDIA dGPU specifically**:
-  **Do NOT use chrome-cache** (dedicated GPU has separate cache)
- GDone: Use `chrome-pp` for browser-based testing
- GDone: Use `../03-llc/` for direct LLC testing (CPU cache only)
- GDone: Use `../poc/gpu-create/` for direct GPU timing

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


