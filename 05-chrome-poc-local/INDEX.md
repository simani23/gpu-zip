# 05-Chrome-PoC-Local - File Index

Quick reference for all files in this self-contained PoC directory.

## 📖 Documentation (Start Here!)

| File | Purpose | Read First? |
|------|---------|-------------|
| **QUICKSTART.md** | Get running in 5 minutes | GDone: YES |
| **README.md** | Complete documentation | After quickstart |
| **SUMMARY.md** | What was created and why | For overview |
| **INDEX.md** | This file - navigation help | Reference |

## 🚀 Launch Scripts

| File | Platform | Usage |
|------|----------|-------|
| **start-server.sh** | Linux/Mac | `./start-server.sh` |
| **start-server.bat** | Windows | Double-click or `start-server.bat` |

## 🎨 Test Patterns (test-patterns/)

All test patterns are self-contained HTML files:

| File | Description | Compressibility |
|------|-------------|-----------------|
| **checkerboard.html** | Black/white checkerboard (48px squares) | Depends on pixel |
| **solid-black.html** | Solid black screen | High |
| **solid-white.html** | Solid white screen | High (but filter adds turbulence) |
| **gradient.html** | Black to white gradient | Medium |
| **noise.html** | Random grayscale noise | Low (non-compressible) |

Access: `http://localhost:8000/test-patterns/[filename]`

## 🔧 Shared Utilities (shared/)

| File | Purpose |
|------|---------|
| **subframe.js** | Iframe-parent communication handler |
| **worker_big.js** | Memory stress web worker (BigInt arithmetic) |

## 🎯 Chrome-PP PoC (chrome-pp/) - PRIMARY

**Status:** GDone: Complete and functional

| File | Type | Description |
|------|------|-------------|
| **chrome.html** | Interface | Main PoC web interface |
| **chrome.js** | Logic | Complete implementation |
| **pixel-embed-checkerboard.html** | Embed | Checkerboard pixel target |
| **pixel-embed-black.html** | Embed | Black pixel target (calibration) |
| **pixel-embed-white.html** | Embed | White pixel target (calibration) |

**Access:** `http://localhost:8000/chrome-pp/chrome.html`

**Method:** Measures GPU rendering time differences

**Works on:**
- GDone: Intel iGPU - Excellent
- GDone: AMD Radeon iGPU - Good (may need tuning)
- smallWarning: NVIDIA dGPU - Limited (try it anyway)

## 🔐 Chrome-Cache PoC (chrome-cache/) - OPTIONAL

**Status:** smallWarning: Partial implementation (structure only)

| File | Type | Description |
|------|------|-------------|
| **NOTE.md** | Doc | smallWarning: **READ THIS FIRST** |
| **ccm.js** | Utility | Cache contention measurement (simplified) |
| **pixel-embed-*.html** | Embed | 3 embed files (copied from chrome-pp) |

**Method:** Measures LLC walk time differences

**Works on:**
- smallWarning: Intel iGPU - Requires full implementation
- smallWarning: AMD Radeon iGPU - Requires full implementation  
-  NVIDIA dGPU - Not applicable (separate LLC)

**Recommendation:** Use chrome-pp instead, or use original `../04-chrome-poc/chrome-cache/` if needed.

## 📊 File Statistics

```
Total Files: 24
├── Documentation: 4 (README, QUICKSTART, SUMMARY, INDEX)
├── Launch Scripts: 2 (sh, bat)
├── Test Patterns: 5 (HTML)
├── Shared Utils: 2 (JS)
├── Chrome-PP: 5 (complete)
└── Chrome-Cache: 6 (partial + NOTE)

Lines of Code: ~2,500+
Lines of Documentation: ~1,200+
```

## 🗺️ Navigation Guide

### Just Want to Test?
1. Read: **QUICKSTART.md**
2. Run: **start-server.sh** or **start-server.bat**
3. Open: `http://localhost:8000/chrome-pp/chrome.html`

### Want to Understand?
1. Read: **README.md** (comprehensive)
2. Check: **SUMMARY.md** (creation details)
3. Explore: Test patterns in browser

### Want to Modify?
1. **Test Patterns**: Edit files in `test-patterns/`
2. **PoC Logic**: Edit `chrome-pp/chrome.js`
3. **UI**: Edit `chrome-pp/chrome.html`
4. **Memory Stress**: Edit `shared/worker_big.js`

### Need Full Chrome-Cache?
1. Read: **chrome-cache/NOTE.md**
2. Option A: Implement based on structure
3. Option B: Use original `../04-chrome-poc/chrome-cache/`

## 🔗 Related Directories

| Directory | What It Tests | When to Use |
|-----------|---------------|-------------|
| **../04-chrome-poc/** | Original PoC (external deps) | Need full chrome-cache implementation |
| **../poc/gpu-create/** | Direct GPU rendering time | Alternative GPU compression test |
| **../03-llc/** | CPU LLC walk time | iGPU cache behavior |
| **../02-memory-stressor/** | Memory bandwidth | Memory contention effects |

## 📋 Quick Reference

### URLs When Server Running:

**Main PoC:**
- http://localhost:8000/chrome-pp/chrome.html

**Test Patterns:**
- http://localhost:8000/test-patterns/checkerboard.html
- http://localhost:8000/test-patterns/solid-black.html
- http://localhost:8000/test-patterns/solid-white.html
- http://localhost:8000/test-patterns/gradient.html
- http://localhost:8000/test-patterns/noise.html

**Pixel Embeds (not directly accessible, used by PoC):**
- http://localhost:8000/chrome-pp/pixel-embed-checkerboard.html
- http://localhost:8000/chrome-pp/pixel-embed-black.html
- http://localhost:8000/chrome-pp/pixel-embed-white.html

### Key Configuration Files:

- **chrome-pp/chrome.html** - UI layout and controls
- **chrome-pp/chrome.js** - Core PoC logic
- **shared/worker_big.js** - Memory stress behavior

## 🎓 Learning Path

1. **Start:** QUICKSTART.md
2. **Run:** chrome-pp with default settings
3. **Observe:** Black vs White timing difference
4. **Experiment:** Try different test patterns
5. **Tune:** Adjust parameters for your GPU
6. **Understand:** Read README.md sections
7. **Compare:** Test on different machines/GPUs
8. **Explore:** Try other PoCs in parent directories

## ⚡ Common Tasks

### Change Default Test Pattern:
Edit `chrome-pp/chrome.html`, find `<select id="pattern-select">`, change default option.

### Add New Test Pattern:
1. Create `test-patterns/mypattern.html`
2. Create `chrome-pp/pixel-embed-mypattern.html`
3. Add option to pattern selector in `chrome.html`

### Adjust Memory Stress:
Edit `shared/worker_big.js` to change BigInt computation behavior.

### Change Default Parameters:
Edit `chrome-pp/chrome.html` input default values.

## 🐛 Troubleshooting Index

Problem? Check:
- **Server won't start** → README.md "Troubleshooting" section
- **No timing difference** → QUICKSTART.md "Troubleshooting" section
- **Browser freezes** → README.md "Troubleshooting" section
- **NVIDIA dGPU issues** → README.md "NVIDIA dGPU" section
- **CSP errors** → Ensure using localhost, not file://

## 📦 Self-Contained

This directory is **completely self-contained**:
- GDone: No external website dependencies
- GDone: No internet required
- GDone: All resources local
- GDone: Works offline
- GDone: Portable (copy entire directory)

## 🎯 Goals Achieved

GDone: AMD Radeon iGPU support
GDone: NVIDIA GeForce dGPU awareness
GDone: Fully offline-capable
GDone: Easy to customize
GDone: Educational value
GDone: Production-quality documentation
GDone: Cross-platform support

---

**Quick Links:**
- [QUICKSTART.md](QUICKSTART.md) - Start here
- [README.md](README.md) - Full documentation
- [SUMMARY.md](SUMMARY.md) - What was created
- [chrome-cache/NOTE.md](chrome-cache/NOTE.md) - Chrome-cache status


