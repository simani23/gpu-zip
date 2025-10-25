# GPU Security Research - Complete Setup Guide

One-page quick reference for setting up this repository on a fresh Ubuntu system.

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install all dependencies
chmod +x install-dependencies.sh check-system.sh
./install-dependencies.sh

# 2. Verify installation
./check-system.sh

# 3. Build binaries
cd poc/gpu-create && make && cd ../..
cd 03-llc && make && cd ..
```

## 📦 What Gets Installed

| Category | Packages | Purpose |
|----------|----------|---------|
| **Build Tools** | build-essential, make, g++, gcc | Compiling C/C++ code |
| **Graphics** | libglfw3-dev, libgl1-mesa-dev, libglu1-mesa-dev | OpenGL/GLFW support |
| **Python** | python3, python3-pip, python3-numpy, python3-matplotlib | Data analysis and plotting |
| **Utilities** | pciutils, bc, stress-ng, git | System utilities |
| **Monitoring** | msr-tools | Hardware performance monitoring |

**Total Install Size:** ~500MB
**Install Time:** 5-10 minutes (depending on connection)

## 🎯 GPU-Specific Quick Start

### Intel iGPU

```bash
# After installation and build:
cd 02-memory-stressor && ./stressor.sh
cd ../03-llc/scripts && ./llc-auto.sh
cd ../../poc/gpu-create/scripts && ./time-all.sh
cd ../../05-chrome-poc-local && ./start-server.sh
```

### AMD Radeon iGPU

```bash
# After installation and build:
cd 02-memory-stressor && ./stressor.sh
cd ../03-llc/scripts && ./llc-auto.sh
cd ../../poc/gpu-create/scripts && ./time-all.sh
cd ../../05-chrome-poc-local && ./start-server.sh
```

### NVIDIA GeForce dGPU

```bash
# After installation and build:
cd 02-memory-stressor && ./stressor.sh
cd ../poc/gpu-create/scripts && ./time-all.sh
cd ../05-chrome-poc-local && ./start-server.sh
# Note: Skip 03-llc (not applicable for dGPU)
```

## 📋 Installation Scripts

### `install-dependencies.sh`
- **Purpose:** Install all required packages
- **Usage:** `./install-dependencies.sh`
- **Root required:** No (uses sudo when needed)
- **Time:** 5-10 minutes
- **What it does:**
  - Updates package lists
  - Installs build tools
  - Installs graphics libraries
  - Installs Python packages
  - Installs system utilities
  - Loads MSR kernel module
  - Displays summary

### `check-system.sh`
- **Purpose:** Verify all dependencies are installed
- **Usage:** `./check-system.sh`
- **Root required:** No
- **Time:** < 1 minute
- **What it checks:**
  - Build tools (gcc, g++, make)
  - Graphics libraries (GLFW, OpenGL)
  - Python environment
  - System utilities
  - MSR module
  - Built binaries
  - GPU detection
  - Cache information

### `package.json` (Optional - if you have npm)
- **Purpose:** npm script shortcuts
- **Usage:**
  - `npm run setup` - Run installation
  - `npm run check` - Check system
  - `npm run build` - Build all binaries
  - `npm run test:poc` - Run GPU PoC tests
  - `npm run test:llc` - Run LLC tests
  - `npm run test:memory` - Run memory tests
  - `npm run server:chrome` - Start Chrome PoC server

## 🔍 Verification Checklist

After running `./check-system.sh`, you should see:

```
GDone: GCC compiler
GDone: G++ compiler  
GDone: Make
GDone: GLFW library
GDone: OpenGL library
GDone: GLU library
GDone: Python 3
GDone: Python module: numpy
GDone: Python module: matplotlib
GDone: Python module: cpuinfo
GDone: lspci (PCI utilities)
GDone: bc (calculator)
GDone: stress-ng
GDone: rdmsr (MSR tools)
GDone: wrmsr (MSR tools)
GDone: MSR module is loaded
```

**GPU Detection:**
- Intel: `Intel Corporation ...`
- AMD: `AMD/ATI ... Radeon ...`
- NVIDIA: `NVIDIA Corporation ... GeForce ...`

## 🛠️ Manual Installation (Alternative)

If automatic installation fails, install packages manually:

```bash
# Core packages
sudo apt update
sudo apt install -y build-essential make g++ gcc
sudo apt install -y libglfw3-dev libgl1-mesa-dev libglu1-mesa-dev
sudo apt install -y python3 python3-pip python3-numpy python3-matplotlib
sudo apt install -y pciutils bc stress-ng git msr-tools

# Python package
pip3 install --user py-cpuinfo

# Load MSR module
sudo modprobe msr
```

## 🏗️ Build Instructions

### Build All

```bash
# GPU texture PoC
cd poc/gpu-create
make
cd ../..

# LLC tests (both versions)
cd 03-llc
make
cd ..
```

### Verify Builds

```bash
# Check binaries exist
ls -lh poc/gpu-create/bin/texture
ls -lh 03-llc/bin/texture
ls -lh 03-llc/bin/texture-auto
```

### Clean and Rebuild

```bash
# Clean
cd poc/gpu-create && make clean && cd ../..
cd 03-llc && make clean && cd ..

# Rebuild
cd poc/gpu-create && make && cd ../..
cd 03-llc && make && cd ..
```

## smallWarning: Common Issues

### MSR Module Won't Load

**Problem:** `modprobe: ERROR: could not insert 'msr'`

**Solutions:**
1. Disable Secure Boot in BIOS/UEFI
2. Install kernel modules:
   ```bash
   sudo apt install linux-modules-extra-$(uname -r)
   ```
3. Reboot and try again

### Build Fails: "GLFW not found"

**Problem:** `fatal error: GLFW/glfw3.h: No such file or directory`

**Solution:**
```bash
sudo apt install libglfw3-dev
sudo ldconfig
```

### Python Import Errors

**Problem:** `ModuleNotFoundError: No module named 'numpy'`

**Solution:**
```bash
sudo apt install python3-numpy python3-matplotlib
# Or
pip3 install --user numpy matplotlib
```

### Permission Denied

**Problem:** `bash: ./install-dependencies.sh: Permission denied`

**Solution:**
```bash
chmod +x install-dependencies.sh check-system.sh
```

## 📊 Test Execution Order

Recommended order for running tests:

1. **System Check** (Always first)
   ```bash
   ./check-system.sh
   ```

2. **Simple GPU Test** (Verify GPU works)
   ```bash
   cd poc/gpu-create/scripts
   ./time.sh 50 2000 2  # Quick test
   ```

3. **Memory Stressor** (Works on all GPUs)
   ```bash
   cd ../../02-memory-stressor
   ./check-setup.sh  # Optional
   ./stressor.sh
   ```

4. **LLC Tests** (iGPU only)
   ```bash
   cd ../03-llc/scripts
   ./check-setup.sh  # Optional
   ./llc-auto.sh
   ```

5. **Comprehensive GPU Tests**
   ```bash
   cd ../../poc/gpu-create/scripts
   ./time-all.sh 100 3000 2
   ```

6. **Chrome PoCs** (Browser-based)
   ```bash
   cd ../../05-chrome-poc-local
   ./start-server.sh
   # Open: http://localhost:8000/chrome-pp/chrome.html
   ```

## 📚 Documentation Index

| File | Purpose |
|------|---------|
| **SETUP-GUIDE.md** | This file - quick setup reference |
| **INSTALL.md** | Detailed installation guide |
| **install-dependencies.sh** | Automatic installation script |
| **check-system.sh** | System verification script |
| **package.json** | npm script shortcuts |
| **02-memory-stressor/Readme.md** | Memory stressor documentation |
| **03-llc/Readme.md** | LLC test documentation |
| **poc/gpu-create/Readme.md** | GPU PoC documentation |
| **05-chrome-poc-local/README.md** | Chrome PoC documentation |

## 🎓 Learning Path

For first-time users:

1. **Read:** SETUP-GUIDE.md (this file)
2. **Install:** `./install-dependencies.sh`
3. **Verify:** `./check-system.sh`
4. **Build:** Build binaries
5. **Understand:** Read individual test READMEs
6. **Test:** Run simple tests first
7. **Experiment:** Try different parameters
8. **Analyze:** Review results and plots

## 💾 Disk Space Requirements

| Component | Size |
|-----------|------|
| Installed packages | ~500 MB |
| Built binaries | ~5 MB |
| Test results (typical) | ~50-100 MB |
| **Total** | **~600 MB** |

Clean up test results periodically:
```bash
# Clean result directories
rm -rf 02-memory-stressor/time/*
rm -rf 03-llc/scripts/data/*
rm -rf poc/gpu-create/scripts/time_*
rm -rf 05-chrome-poc-local/test-results/*
```

## 🔧 Environment Setup (Optional)

### Performance Mode (Recommended for Tests)

```bash
# Disable CPU frequency scaling
sudo apt install cpufrequtils
sudo cpupower frequency-set -g performance

# Check
cpupower frequency-info
```

### Revert to Normal Mode

```bash
sudo cpupower frequency-set -g powersave
```

## GDone: Success Criteria

Your system is ready when:

- GDone: `./check-system.sh` passes all checks
- GDone: GPU is detected correctly
- GDone: Binaries build without errors
- GDone: Simple test runs successfully
- GDone: Python can import numpy and matplotlib

## 🎯 Next Steps

After successful setup:

1. Choose tests based on your GPU type
2. Read relevant documentation
3. Run tests with default parameters first
4. Experiment with different configurations
5. Review and analyze results

## 📞 Getting Help

If you encounter issues:

1. Run `./check-system.sh` and review output
2. Check `INSTALL.md` for detailed troubleshooting
3. Review error messages carefully
4. Ensure Ubuntu version is 20.04+
5. Check individual test README files

## 🏁 Summary

**TL;DR:**
```bash
# Complete setup in 3 commands:
./install-dependencies.sh  # Install
./check-system.sh          # Verify  
npm run build              # Build (or manual make)
```

Then run tests based on your GPU type!


