import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)

import numpy as np
import matplotlib.pyplot as plt
import os
import argparse
import sys

def parse_file(fn):
    readings = []
    try:
        with open(fn) as f:
            for line in f:
                begin = int(line)
                end = 0
                try:
                    end = next(f)
                except StopIteration:    
                    break
                if(len(end) > 1):
                    readings.append(int(end)-begin)
    except FileNotFoundError:
        print(f"Warning: File {fn} not found, skipping...")
        return None
    except Exception as e:
        print(f"Error parsing {fn}: {e}")
        return None
    
    return readings

def plot(myDict, output_file="./plot/time.pdf"):	
    if not myDict or all(v is None for v in myDict.values()):
        print("Error: No valid data to plot")
        return
    
    # Filter out None values
    myDict = {k: v for k, v in myDict.items() if v is not None and len(v) > 0}
    
    if not myDict:
        print("Error: No valid data after filtering")
        return
    
    # Prepare plot
    minimum = float('inf')
    maximum = float('-inf')
    datas = []
    labels = []
    weights = []
    colors = {
        'Black': 'navy',
        'Random': 'darkorange', 
        'Gradient': 'green',
        'Skew': 'purple',
        'Compressible': 'navy',
        'Non-compressible': 'darkorange'
    }
    pattern_colors = []

    print("\n" + "="*60)
    print("Rendering Time Analysis")
    print("="*60)
    
    # Parse data
    for label, trace in myDict.items():
        # Exclude negative samples (due to counter overflow)
        samples_positive = [x for x in trace if x > 0]
        
        if not samples_positive:
            print(f"Warning: No positive samples for {label}, skipping...")
            continue

        # Filter outliers (for the plot)
        samples_mean = np.mean(samples_positive)
        samples_std = np.std(samples_positive)
        samples_filtered = [s for s in samples_positive 
                          if abs(s - samples_mean) < 4 * samples_std]
        
        if not samples_filtered:
            samples_filtered = samples_positive

        # Store data for bins
        minimum = min(min(samples_filtered), minimum)
        maximum = max(max(samples_filtered), maximum)

        # Store data for bars
        datas.append(samples_filtered)
        labels.append(label)
        weights.append(np.ones_like(samples_filtered)/float(len(samples_filtered)))
        pattern_colors.append(colors.get(label, 'gray'))
            
        # Print statistics
        print(f"{label:>20}: {np.mean(samples_filtered):>10.2f} ± {np.std(samples_filtered):>8.0f} cycles")
        print(f"{'':>20}  (min: {min(samples_filtered):>8.0f}, max: {max(samples_filtered):>8.0f})")
    
    print("="*60 + "\n")
    
    # Plot all data
    fig, ax = plt.subplots(figsize=(10, 6))
    step = (maximum - minimum) / 30
    bins = np.arange(minimum - step, maximum + step*2, step)

    # Plot histogram with colors
    _, bins, patches = ax.hist(datas, alpha=0.6, bins=bins, weights=weights, 
                                label=labels, align="left", edgecolor='black', linewidth=0.5)
    
    # Color the patches
    if len(patches[0]) > 0 and isinstance(patches, list):
        for i, patch_list in enumerate(patches):
            for patch in patch_list:
                patch.set_facecolor(pattern_colors[i])

    # Show grid
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)
    
    # Set labels
    ax.set_xlabel('Rendering time (CPU cycles)', fontsize=12)
    ax.set_ylabel('Probability', fontsize=12)
    ax.set_title('GPU Shader Pattern Rendering Time Distribution', fontsize=14, fontweight='bold')

    # Legend
    ax.legend(loc='upper right', fontsize=10, framealpha=0.9)
    plt.tight_layout()
    
    # Save plot to file
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"Plot saved to: {output_file}")
    plt.clf()
    plt.close()



def main():
    # Prepare clean output directory
    out_dir = 'plot'
    os.makedirs(out_dir, exist_ok=True)

    # Argument parser
    parser = argparse.ArgumentParser(
        description='Plot GPU shader pattern rendering time comparison',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Compare all four patterns:
  python plot_time.py --black time_2_3000_0.0_100.txt --random time_2_3000_1.0_100.txt \\
                      --gradient time_2_3000_100.0_100.txt --skew time_2_3000_101.0_100.txt
  
  # Compare just Black vs Random:
  python plot_time.py time_2_3000_0.0_100.txt time_2_3000_1.0_100.txt
        '''
    )
    
    # New named argument style
    parser.add_argument('--black', help='Black pattern timing file')
    parser.add_argument('--random', help='Random pattern timing file')
    parser.add_argument('--gradient', help='Gradient pattern timing file')
    parser.add_argument('--skew', help='Skew pattern timing file')
    parser.add_argument('-o', '--output', default='./plot/time.pdf', 
                       help='Output PDF file (default: ./plot/time.pdf)')
    
    parser.add_argument('file1', nargs='?', help='First file (Compressible/Black)')
    parser.add_argument('file2', nargs='?', help='Second file (Non-compressible/Random)')

    args = parser.parse_args()

    # Build pattern dictionary
    pattern_dict = {}
    
    if args.black or args.random or args.gradient or args.skew:
        if args.black:
            pattern_dict["Black"] = parse_file(args.black)
        if args.random:
            pattern_dict["Random"] = parse_file(args.random)
        if args.gradient:
            pattern_dict["Gradient"] = parse_file(args.gradient)
        if args.skew:
            pattern_dict["Skew"] = parse_file(args.skew)
    
    elif args.file1 and args.file2:
        pattern_dict["Compressible"] = parse_file(args.file1)
        pattern_dict["Non-compressible"] = parse_file(args.file2)
    
    else:
        print("Error: Please provide timing files using either:")
        print("  1. Named arguments: --black, --random, --gradient, --skew")
        print("  2. Legacy mode: file1 file2")
        parser.print_help()
        sys.exit(1)

    if not pattern_dict or all(v is None for v in pattern_dict.values()):
        print("Error: No valid timing data found")
        sys.exit(1)

    plot(pattern_dict, args.output)

    

if __name__ == "__main__":
    main()
