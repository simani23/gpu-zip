from curses.ascii import isdigit
import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)
import cpuinfo
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import os
import glob
import argparse
from distutils.dir_util import remove_tree
import subprocess
import platform

def parse_files(time, CPUFreq):

    time_total = []
    with open(time) as f:
        for line in f:
            begin = int(line)
            end = 0
            try:
                end = next(f)
            except StopIteration:    
                break
            if(len(end) > 1):
                time_total.append(float(int(end)-begin)/(1000000*CPUFreq))

    return time_total



def plot_single(all_time_black, all_time_random, plot_name, name, unit):

    times_black = {}
    times_black_std = {}
    times_random = {}
    times_random_std = {}

    # Parse data
    for label, trace in all_time_black.items():
        
        # Filter time black outliers 
        time_black_filtered = []
        black_mean = np.mean(trace)
        black_std = np.std(trace)
        for curr_time in trace:
            if ( abs(curr_time-black_mean) <= 4*black_std):
                time_black_filtered.append(curr_time)

        # Filter time random outliers 
        time_random_filtered = []
        random_mean = np.mean(all_time_random[label])
        random_std = np.std(all_time_random[label])
        for curr_time in all_time_random[label]:
            if ( abs(curr_time-random_mean) <= 4*random_std):
                time_random_filtered.append(curr_time)

        # Store data for scatter
        curr_label = int(label)
        num_stressor = curr_label
        
        times_black[num_stressor] = np.mean(time_black_filtered)
        times_random[num_stressor] = np.mean(time_random_filtered)
        times_black_std[num_stressor] = np.std(time_black_filtered)
        times_random_std[num_stressor] = np.std(time_random_filtered)

    
    # Plot all data
    plt_label = []
    plt_time_black = []
    plt_time_black_std = []
    plt_time_random = []
    plt_time_random_std = []

    for layer in times_black:
        plt_label.append(layer)
        plt_time_black.append(times_black[layer])
        plt_time_black_std.append(times_black_std[layer])
        plt_time_random.append(times_random[layer])
        plt_time_random_std.append(times_random_std[layer])
    
    
    fig, a1 = plt.subplots(1, 1, figsize=(3, 2))

    plt.scatter(plt_label, plt_time_black, s=2, c = "navy", label="Compressible")
    markers, caps, bars = plt.errorbar(plt_label, plt_time_black, c = "navy", yerr=plt_time_black_std, fmt=".")
    [bar.set_alpha(0.5) for bar in bars]
    [cap.set_alpha(0.5) for cap in caps]

    plt.scatter(plt_label, plt_time_random, s=2, c = "darkorange", label="Non-compressible")
    markers, caps, bars = plt.errorbar(plt_label, plt_time_random, c = "darkorange", yerr=plt_time_random_std, fmt=".")
    [bar.set_alpha(0.5) for bar in bars]
    [cap.set_alpha(0.5) for cap in caps]
    
    plt.gca().xaxis.set_major_locator(ticker.MultipleLocator(2))
    plt.xlabel('Number of memory stressor', fontsize = 8)
    plt.ylabel('%s (%s)'%(name, unit), fontsize = 8)

    plt.legend(loc='upper center', bbox_to_anchor=(0.42, 1.35), ncol=2, markerscale=4, fontsize=8)
    plt.subplots_adjust(left=0.16,top=0.80,right=0.98,bottom=0.2)

    plt.savefig("./plot/%s.pdf" % plot_name, dpi=300)

    

def get_cpu_frequency():
    """Get CPU frequency in GHz, supporting both Intel and AMD processors"""
    try:
        info = cpuinfo.get_cpu_info()
        # Try to get advertised frequency
        if "hz_advertised" in info and info["hz_advertised"]:
            freq_hz = info["hz_advertised"][0] if isinstance(info["hz_advertised"], list) else info["hz_advertised"]
            return float(freq_hz / 1000000000)
        elif "hz_actual" in info and info["hz_actual"]:
            freq_hz = info["hz_actual"][0] if isinstance(info["hz_actual"], list) else info["hz_actual"]
            return float(freq_hz / 1000000000)
        else:
            # Fallback: try to parse from brand string
            brand = info.get("brand_raw", "")
            import re
            match = re.search(r'(\d+\.?\d*)\s*GHz', brand)
            if match:
                return float(match.group(1))
    except Exception as e:
        print(f"Warning: Could not determine CPU frequency automatically: {e}")
    
    # Default fallback
    print("Using default CPU frequency of 3.0 GHz")
    return 3.0

def detect_gpu_type():
    """Detect GPU type (Intel iGPU, AMD Radeon, or NVIDIA)"""
    try:
        if platform.system() == "Linux":
            result = subprocess.run(['lspci'], capture_output=True, text=True)
            output = result.stdout.lower()
            if 'nvidia' in output and ('vga' in output or '3d' in output):
                return "NVIDIA dGPU"
            elif 'amd' in output or 'radeon' in output:
                if 'vga' in output:
                    return "AMD Radeon iGPU"
            elif 'intel' in output and 'vga' in output:
                return "Intel iGPU"
    except:
        pass
    return "Unknown GPU"

def main():
    # Prepare output directory
    try:
        remove_tree('plot')
    except:
        pass
    try:
        os.makedirs('plot')
    except:
        pass
    
    # Parse arguments
    parser = argparse.ArgumentParser(description='Analyze GPU memory stressor results for Intel/AMD/NVIDIA GPUs')
    parser.add_argument('folder', help='Directory containing timing data')
    parser.add_argument('--cpu-freq', type=float, default=None, 
                       help='CPU frequency in GHz (auto-detected if not specified)')
    args = parser.parse_args()
    in_dir = args.folder
    
    # Get CPU frequency
    if args.cpu_freq:
        CPUFreq = args.cpu_freq
        print(f"Using specified CPU frequency: {CPUFreq} GHz")
    else:
        CPUFreq = get_cpu_frequency()
        print(f"Auto-detected CPU frequency: {CPUFreq} GHz")
    
    # Detect GPU type
    gpu_type = detect_gpu_type()
    print(f"Detected GPU: {gpu_type}")
    
    info = cpuinfo.get_cpu_info()
    cpu_brand = info.get("brand_raw", "Unknown CPU")
    print(f"CPU: {cpu_brand}")

    # Read data
    time_files = sorted(glob.glob(in_dir + "/out*/time*"), reverse=True)
    time_files.sort(key=lambda x: os.path.getmtime(x))

    total = int(len(time_files))
    
    # parse data by num_stressor, and patter (black or random)
    time_all_black = {}
    time_all_random = {}
    for counter in range(total):

        curr_time_file = time_files[counter]
        curr_time_file_bw = int(float(curr_time_file.split("_")[3]))
        curr_time = parse_files(curr_time_file, CPUFreq)

        label = curr_time_file.split("/")[-2]
        selector = int(label.split("out-")[1])
        if(curr_time_file_bw == 0):
            time_all_black.setdefault(selector, []).extend(curr_time)
        else:
            time_all_random.setdefault(selector, []).extend(curr_time)
        
    plot_single(time_all_black, time_all_random, "memory-stressor", "Rendering time", "ms")

if __name__ == "__main__":
    main()
