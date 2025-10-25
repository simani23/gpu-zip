# Installation Guide

Complete installation guide for GPU compression side-channel research tools.

## Quick Start (Fresh Ubuntu Installation)

```bash
# 1. Clone or download this repository
git clone <repository-url>
cd gpu-zip

# 2. Run installation script
chmod +x install-dependencies.sh check-system.sh
./install-dependencies.sh

# 3. Verify installation
./check-system.sh

# 4. Build binaries
cd poc/gpu-create && make && cd ../..
cd 03-llc && make && cd ..

# 5. Run tests (choose based on your GPU)
```

## System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04 or later (22.04 recommended)
- **CPU**: Any modern x86_64 processor
- **RAM**: 4GB minimum, 8GB recommended
- **GPU**: Intel iGPU, AMD Radeon iGPU, or NVIDIA GeForce dGPU
- **Disk**: 2GB free space

### Recommended for Best Results
- **OS**: Ubuntu 22.04 LTS
- **CPU**: Intel Core i5/i7 or AMD Ryzen 5/7
- **RAM**: 16GB
- **GPU**: Intel iGPU or AMD Radeon iGPU for full test suite

## Installation Methods

### Method 1: Automatic Installation (Recommended)

```bash
./install-dependencies.sh
```

This script installs:
- ✅ Build tools (gcc, g++, make)
- ✅ OpenGL/GLFW libraries
- ✅ Python 3 + NumPy + Matplotlib
- ✅ System utilities (stress-ng, bc, lspci)
- ✅ MSR tools (for hardware monitoring)

### Method 2: Manual Installation

If you prefer to install manually or need specific versions:

```bash
# Update package lists
sudo apt update

# Build essentials
sudo apt install -y build-essential make g++ gcc

# OpenGL and graphics libraries
sudo apt install -y libglfw3-dev libgl1-mesa-dev libglu1-mesa-dev mesa-utils

# Python and scientific libraries
sudo apt install -y python3 python3-pip python3-numpy python3-matplotlib

# System utilities
sudo apt install -y pciutils bc stress-ng git

# MSR tools (for performance monitoring)
sudo apt install -y msr-tools

# Load MSR kernel module
sudo modprobe msr

# Install py-cpuinfo
pip3 install --user py-cpuinfo
```

### Method 3: Using npm (if Node.js is installed)

```bash
# Check system and install
npm run check   # Check what's installed
npm run setup   # Run installation script

# Build binaries
npm run build

# Run tests
npm run test:poc
npm run test:llc
npm run test:memory
```

## Verification

After installation, verify everything is set up correctly:

```bash
./check-system.sh
```

Expected output:
```
✅ GCC compiler
✅ G++ compiler
✅ Make
✅ GLFW library
✅ OpenGL library
✅ Python 3
✅ Python module: numpy
✅ Python module: matplotlib
✅ lspci (PCI utilities)
...
✅ System is ready for GPU security research!
```

## Building Binaries

### Build All

```bash
# Build GPU texture PoC
cd poc/gpu-create
make
cd ../..

# Build LLC tests
cd 03-llc
make
cd ..
```

### Build Individually

**GPU Texture PoC:**
```bash
cd poc/gpu-create
make
# Creates: bin/texture
```

**LLC Tests:**
```bash
cd 03-llc
make
# Creates: bin/texture (original) and bin/texture-auto (auto-detect)
```

## Platform-Specific Notes

### Intel iGPU

**Additional Setup:**
- None required - should work out of the box
- All tests applicable

**Verify:**
```bash
lspci | grep -i vga
# Should show: Intel Corporation ...
```

### AMD Radeon iGPU (APU)

**Additional Setup:**
- May need AMD drivers for optimal performance
- All tests applicable

**Install AMD drivers (optional):**
```bash
# For Ubuntu
sudo apt install -y mesa-vulkan-drivers mesa-va-drivers
```

**Verify:**
```bash
lspci | grep -i vga
# Should show: AMD/ATI or Advanced Micro Devices
```

### NVIDIA GeForce dGPU

**Additional Setup:**
- NVIDIA drivers recommended
- LLC tests have limited applicability

**Install NVIDIA drivers:**
```bash
# Check available drivers
ubuntu-drivers devices

# Install recommended driver
sudo ubuntu-drivers autoinstall

# Or install specific version
sudo apt install nvidia-driver-XXX

# Reboot
sudo reboot
```

**Verify:**
```bash
nvidia-smi
lspci | grep -i nvidia
```

**Note:** Some tests (03-llc) are less effective on dGPU systems.

## MSR Tools Setup

MSR (Model-Specific Registers) tools are needed for some hardware monitoring.

### Load MSR Module

```bash
# Load module
sudo modprobe msr

# Verify
lsmod | grep msr

# Check device
ls /dev/cpu/0/msr
```

### Make MSR Module Load on Boot

```bash
# Add to modules
echo "msr" | sudo tee -a /etc/modules

# Verify on next boot
sudo reboot
lsmod | grep msr
```

### Troubleshooting MSR

**If MSR module won't load:**
1. Disable Secure Boot in BIOS/UEFI
2. Install linux-modules-extra:
   ```bash
   sudo apt install linux-modules-extra-$(uname -r)
   ```
3. Reboot and try again

## Python Environment Setup

### System Python (Recommended)

```bash
sudo apt install python3 python3-pip python3-numpy python3-matplotlib
pip3 install --user py-cpuinfo
```

### Virtual Environment (Alternative)

```bash
# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install packages
pip install numpy matplotlib py-cpuinfo

# Use this environment when running tests
```

## Troubleshooting

### "GLFW library not found"

```bash
sudo apt install libglfw3-dev
sudo ldconfig
```

### "OpenGL library not found"

```bash
sudo apt install libgl1-mesa-dev libglu1-mesa-dev mesa-utils
```

### "Python module numpy not found"

```bash
sudo apt install python3-numpy
# Or
pip3 install --user numpy
```

### "make: command not found"

```bash
sudo apt install build-essential
```

### "Cannot access MSR"

```bash
# Load module
sudo modprobe msr

# Check BIOS settings
# - Disable Secure Boot
# - Enable CPU MSR access (if available)
```

### "lspci: command not found"

```bash
sudo apt install pciutils
```

### Build Errors

**If you see compilation errors:**

1. Ensure build tools are installed:
   ```bash
   sudo apt install build-essential
   ```

2. Check library dependencies:
   ```bash
   ldconfig -p | grep glfw
   ldconfig -p | grep GL
   ```

3. Clean and rebuild:
   ```bash
   make clean
   make
   ```

## Uninstallation

To remove installed packages:

```bash
# Remove build tools (if not needed)
sudo apt remove build-essential make g++ gcc

# Remove graphics libraries
sudo apt remove libglfw3-dev libgl1-mesa-dev libglu1-mesa-dev

# Remove Python scientific libraries
sudo apt remove python3-numpy python3-matplotlib

# Remove utilities
sudo apt remove stress-ng bc msr-tools

# Clean up
sudo apt autoremove
```

**Note:** Only remove packages you don't need for other projects.

## Next Steps

After successful installation:

1. **Verify System:**
   ```bash
   ./check-system.sh
   ```

2. **Build Binaries:**
   ```bash
   cd poc/gpu-create && make && cd ../..
   cd 03-llc && make && cd ..
   ```

3. **Choose Tests Based on GPU:**
   - **Intel/AMD iGPU:** All tests applicable
   - **NVIDIA dGPU:** Use 02-memory-stressor and poc tests

4. **Read Test Documentation:**
   - `02-memory-stressor/Readme.md`
   - `03-llc/Readme.md`
   - `poc/gpu-create/Readme.md`
   - `05-chrome-poc-local/README.md`

## Getting Help

If installation fails:

1. Check `./check-system.sh` output
2. Review error messages carefully
3. Ensure Ubuntu version is 20.04 or later
4. Check system logs: `dmesg | tail`
5. Verify hardware compatibility

## Additional Resources

- **OpenGL**: https://www.khronos.org/opengl/
- **GLFW**: https://www.glfw.org/
- **NumPy**: https://numpy.org/
- **Matplotlib**: https://matplotlib.org/
- **Ubuntu Packages**: https://packages.ubuntu.com/

## License

See LICENSE file in repository root.


