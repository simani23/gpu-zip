# OpenGL PoC for iGPU graphical data lossless compression

This OpenGL PoC creates textures with 4 distinct patterns: `Black`, `Random`, `Gradient` and `Skew` (Figure 1 in the paper).
We use this PoC to demonstrate the existence of iGPU graphical data lossless compression.

## Preliminaries

- Compiler: g++ with the C++17 standard.
- Required shared libraries: OpenGL library (-lgl), GLFW library (-lglfw).
- OpenGL version: core profile 3.3. Corresponding GLAD (OpenGL Loader Generator) locates at `./library/glad`.

## How to build

```bash
make
```

## PoC detail

The PoC takes in 5 parameters:

1. `color` specifies the pattern.
    1. `color` = `0` generates pattern `Black`.
    2. `color` = `1` generates pattern `Random`.
    3. `color` &mid; `SCR_WIDTH` such that `color` divides `SCR_WIDTH` (see below) generates pattern `Gradient`.
    4. `color` &nmid; `SCR_WIDTH` such that `color` does not divide `SCR_WIDTH` (see below) generates pattern `Skew`.
2. `iterations` is the workload complexity (See Algorithm 1 in the paper).
3. `SCR_WIDTH` defines the width of created texture. By default, the height of the created texture `SCR_HEIGHT` equals to `SCR_WIDTH`.
4. `read_write` determines the workload type.
    1. If `read_write` = `0`, the workload is `read-only`. During each frame update, it renders the gpu-created texture with specified pattern to the screen for `iterations` times.
    2. If `read_write` = `1`, the workload is `write-only`. During each frame update, it asks the gpu to create a texture with specified pattern for `iterations` times, and renders nothing.
    3. If `read_write` = `2`, the workload is `write-read`. During each frame update, it first asks the gpu to create a texture with specified pattern and then renders the gpu-created texture to the screen, and performs the two operations back-to-back for `iterations` times.
5. `print_time` logs *Rendering time per frame*.
    1. `print_time` = `0` logs nothing and the workload never terminates.
    2. `print_time` &ne; `0` logs the *Rendering time per frame* for `print_time` frame updates and terminates the workload. The logging result is saved into a file formatted as `time_${read_write}_${SCR_WIDTH}_${color}_${iterations}.txt`

## How to run

For example, the command:

```bash
./bin/texture 0.0 10 3000 0 500
```

renders a `Black` texture of size `3000x3000` to the screen for `10` iterations during each frame update, and collects the rendering time of `500` frame updates.

## Testing scripts

### Enhanced Testing (All Shader Patterns)

We provide enhanced scripts to test **all four shader patterns**: `Black`, `Random`, `Gradient`, and `Skew`.

#### Quick Start - Test All Patterns:

```bash
cd scripts
chmod +x time.sh time-all.sh
./time-all.sh [iterations] [SCR_WIDTH] [read_write] [samples]
```

**Default values:** `iterations=100`, `SCR_WIDTH=3000`, `read_write=2`, `samples=500`

**Example:**
```bash
./time-all.sh 100 3000 2 500
```

This will:
1. Test all 4 shader patterns (Black, Random, Gradient, Skew)
2. Collect timing data for each pattern
3. Generate statistical analysis
4. Create a comparison plot in `./plot/time.pdf`

#### Flexible Testing Script:

```bash
./time.sh [iterations] [SCR_WIDTH] [read_write] [samples]
```

This script tests all 4 patterns and automatically:
- Calculates appropriate Gradient/Skew values based on `SCR_WIDTH`
- Generates timing files for each pattern
- Creates comparison plots with color-coded histograms

### Analysis Script

The `plot_time.py` script supports multiple modes:

#### All Patterns Mode (New):
```bash
python plot_time.py --black file1.txt --random file2.txt --gradient file3.txt --skew file4.txt
```

#### Legacy Mode (Backward Compatible):
```bash
python plot_time.py compressible.txt non-compressible.txt
```

#### Custom Output:
```bash
python plot_time.py --black file1.txt --random file2.txt -o custom_output.pdf
```

### Shader Pattern Details

On most machines tested:
- **Black** (`color=0.0`): Highly compressible (all pixels same color)
- **Random** (`color=1.0`): Non-compressible (random pixel values)
- **Gradient** (`color` divides `SCR_WIDTH`): Moderately compressible (smooth gradients)
- **Skew** (`color` doesn't divide `SCR_WIDTH`): Low compressibility (irregular patterns)

### Output

The scripts generate:
- **Timing files**: `time_${type}_${size}_${color}_${iterations}.txt`
- **Statistical summary**: Mean, std dev, min, max rendering times (CPU cycles)
- **Histogram plot**: `./plot/time.pdf` showing distribution comparison

### Customization

You can modify the scripts to:
- Test different pattern combinations
- Adjust sample counts
- Change plot colors and styles
- Test custom color values
