## Quick Start Guide

### 1. Start the Server

**Linux/Mac:**
```bash
chmod +x start-server.sh
./start-server.sh
```

**Windows:**
```
start-server.bat
```

**Manual:**
```bash
python3 -m http.server 8000
```

### 2. Open in Browser

**Option A - Rendering Time (chrome-pp):**
```
http://localhost:8000/chrome-pp/chrome.html
```
- Best for: Intel iGPU, AMD Radeon iGPU, NVIDIA dGPU (may work)
- Method: Direct GPU rendering time measurement

**Option B - LLC Walk Time (chrome-cache):**
```
http://localhost:8000/chrome-cache/chrome.html
```
- Best for: Intel iGPU, AMD Radeon iGPU only
- Not recommended for: NVIDIA dGPU (separate LLC)
- Method: CPU cache contention measurement

### 3. Basic Test

1. Keep default settings
2. Enable "Test Mode" checkbox
3. Click "Run PoC"
4. Wait for calibration
5. Check results:
   - **Good**: White time > Black time (ratio > 1.5)
   - **Excellent**: Ratio > 2.0
   - **Problem**: Ratio < 1.2 (see troubleshooting)

### 4. Troubleshooting

**Small timing difference (ratio < 1.2):**
- Enable "Stress" (set to 1)
- Increase "Div Size" (try 3000 or 4000)
- Increase "Layer" (try 15 or 20)
- Close other applications

**NVIDIA dGPU:**
- Use chrome-pp only (not chrome-cache)
- Expect smaller differences
- Consider alternative tests in `../poc/` directory

**Browser freezes:**
- Reduce "Div Size"
- Reduce "Layer"
- Reduce "Num Workers"

### 5. Platform-Specific Settings

**Intel iGPU:**
```
Time: 500ms
Repetition: 50
Stress: 0
Div Size: 2000
Layer: 10
```

**AMD Radeon iGPU:**
```
Time: 500ms
Repetition: 50
Stress: 1
Div Size: 3000
Layer: 15
Num Workers: 6
```

**NVIDIA dGPU:**
```
Time: 1000ms
Repetition: 100
Stress: 1
Div Size: 4000
Layer: 20
Num Workers: 8
```

### 6. What Success Looks Like

**Console Output:**
```
[Calibration] Black: 12.34ms, White: 25.67ms, Ratio: 2.081
✓ Excellent timing separation! Ready for attack.
```

**Interpretation:**
- Black (compressible) renders faster
- White (non-compressible after filter) renders slower
- Clear separation = GPU compression is observable

### 7. Next Steps

After successful calibration:
- Disable "Test Mode"
- Adjust thresholds if needed
- Run full test (simplified in this version)
- See full README.md for advanced usage

### Test Patterns

All patterns available in `test-patterns/`:
- **checkerboard.html** - Default test (alternating black/white)
- **solid-black.html** - Highly compressible baseline
- **solid-white.html** - Compressible baseline (becomes turbulent in filter)
- **gradient.html** - Moderately compressible
- **noise.html** - Non-compressible random data

Access directly: `http://localhost:8000/test-patterns/[pattern].html`

### Important Notes

- ⚠️ This is research code for educational purposes
- Do not use on actual websites without permission
- Works completely offline (no external dependencies)
- Self-contained and customizable

For detailed documentation, see README.md

