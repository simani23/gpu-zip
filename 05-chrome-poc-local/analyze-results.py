#!/usr/bin/env python3
"""
GPU Side-Channel Parameter Characterization Analysis
Analyzes JSON results from characterization runs and generates visualizations
"""

import json
import sys
import os
from typing import List, Dict, Any
import statistics

try:
    import matplotlib.pyplot as plt
    import numpy as np
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("Warning: matplotlib not available. Install with: pip install matplotlib numpy")

def load_results(filename: str) -> List[Dict[str, Any]]:
    """Load results from JSON file"""
    with open(filename, 'r') as f:
        return json.load(f)

def analyze_basic_stats(results: List[Dict[str, Any]]):
    """Print basic statistics about the results"""
    print("\n" + "="*60)
    print("BASIC STATISTICS")
    print("="*60)
    
    valid_results = [r for r in results if r.get('results') is not None]
    failed_results = [r for r in results if r.get('results') is None]
    
    print(f"\nTotal tests: {len(results)}")
    print(f"Successful: {len(valid_results)}")
    print(f"Failed: {len(failed_results)}")
    
    if not valid_results:
        print("\nNo valid results to analyze!")
        return
    
    ratios = [r['results']['ratio'] for r in valid_results]
    black_times = [r['results']['blackTime'] for r in valid_results]
    white_times = [r['results']['whiteTime'] for r in valid_results]
    
    print(f"\nRatio Statistics:")
    print(f"  Mean: {statistics.mean(ratios):.3f}")
    print(f"  Median: {statistics.median(ratios):.3f}")
    print(f"  Min: {min(ratios):.3f}")
    print(f"  Max: {max(ratios):.3f}")
    print(f"  Std Dev: {statistics.stdev(ratios):.3f}" if len(ratios) > 1 else "  Std Dev: N/A")
    
    print(f"\nBlack Time Statistics (ms):")
    print(f"  Mean: {statistics.mean(black_times):.2f}")
    print(f"  Min: {min(black_times):.2f}")
    print(f"  Max: {max(black_times):.2f}")
    
    print(f"\nWhite Time Statistics (ms):")
    print(f"  Mean: {statistics.mean(white_times):.2f}")
    print(f"  Min: {min(white_times):.2f}")
    print(f"  Max: {max(white_times):.2f}")

def find_best_configs(results: List[Dict[str, Any]], top_n: int = 10):
    """Find and display the best configurations"""
    print("\n" + "="*60)
    print(f"TOP {top_n} CONFIGURATIONS (by ratio)")
    print("="*60)
    
    valid_results = [r for r in results if r.get('results') is not None]
    valid_results.sort(key=lambda x: x['results']['ratio'], reverse=True)
    
    for i, result in enumerate(valid_results[:top_n]):
        config = result['config']
        res = result['results']
        
        print(f"\n{i+1}. {config['name']}")
        print(f"   Ratio: {res['ratio']:.3f} ({evaluate_quality(res['ratio'])})")
        print(f"   Black: {res['blackTime']:.2f} ms, White: {res['whiteTime']:.2f} ms")
        print(f"   Parameters:")
        
        # Print all config parameters
        for key, value in config.items():
            if key != 'name':
                print(f"     {key}: {value}")

def evaluate_quality(ratio: float) -> str:
    """Evaluate the quality of separation based on ratio"""
    if ratio < 1.1:
        return "POOR (not usable)"
    elif ratio < 1.3:
        return "MARGINAL (unreliable)"
    elif ratio < 1.5:
        return "FAIR (might work)"
    elif ratio < 2.0:
        return "GOOD (should work)"
    elif ratio < 3.0:
        return "EXCELLENT (very reliable)"
    else:
        return "OUTSTANDING (perfect separation)"

def analyze_by_parameter(results: List[Dict[str, Any]], param_name: str):
    """Analyze effect of a specific parameter"""
    valid_results = [r for r in results if r.get('results') is not None]
    
    param_groups = {}
    for result in valid_results:
        value = result['config'].get(param_name)
        if value is not None:
            if value not in param_groups:
                param_groups[value] = []
            param_groups[value].append(result['results']['ratio'])
    
    if not param_groups:
        return
    
    print(f"\nEffect of {param_name.upper()}:")
    print("-" * 50)
    
    sorted_params = sorted(param_groups.items())
    for value, ratios in sorted_params:
        avg_ratio = statistics.mean(ratios)
        max_ratio = max(ratios)
        min_ratio = min(ratios)
        print(f"  {value:10}: avg={avg_ratio:.3f}, max={max_ratio:.3f}, min={min_ratio:.3f} ({len(ratios)} tests)")

def plot_parameter_analysis(results: List[Dict[str, Any]], output_dir: str = "."):
    """Create visualizations of parameter effects"""
    if not HAS_MATPLOTLIB:
        print("\nSkipping plots (matplotlib not available)")
        return
    
    valid_results = [r for r in results if r.get('results') is not None]
    if not valid_results:
        return
    
    # Determine which parameters to plot
    params_to_plot = []
    sample_config = valid_results[0]['config']
    
    numeric_params = []
    for key in sample_config.keys():
        if key != 'name' and isinstance(sample_config[key], (int, float)):
            # Check if this parameter varies across tests
            values = set(r['config'].get(key) for r in valid_results if key in r['config'])
            if len(values) > 1:
                numeric_params.append(key)
    
    if not numeric_params:
        print("\nNo varying numeric parameters to plot")
        return
    
    # Create figure with subplots
    n_params = len(numeric_params)
    n_cols = min(3, n_params)
    n_rows = (n_params + n_cols - 1) // n_cols
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(6*n_cols, 5*n_rows))
    if n_params == 1:
        axes = [axes]
    else:
        axes = axes.flatten()
    
    for idx, param_name in enumerate(numeric_params):
        ax = axes[idx]
        
        # Group by parameter value
        param_groups = {}
        for result in valid_results:
            value = result['config'].get(param_name)
            if value is not None:
                if value not in param_groups:
                    param_groups[value] = []
                param_groups[value].append(result['results']['ratio'])
        
        if param_groups:
            values = sorted(param_groups.keys())
            means = [statistics.mean(param_groups[v]) for v in values]
            stds = [statistics.stdev(param_groups[v]) if len(param_groups[v]) > 1 else 0 for v in values]
            
            ax.errorbar(values, means, yerr=stds, marker='o', capsize=5, capthick=2)
            ax.set_xlabel(param_name)
            ax.set_ylabel('Ratio (White/Black)')
            ax.set_title(f'Effect of {param_name}')
            ax.grid(True, alpha=0.3)
            
            # Add quality zones
            ax.axhspan(0, 1.1, alpha=0.1, color='red', label='Poor')
            ax.axhspan(1.1, 1.5, alpha=0.1, color='yellow', label='Marginal/Fair')
            ax.axhspan(1.5, 3.0, alpha=0.1, color='green', label='Good/Excellent')
    
    # Hide unused subplots
    for idx in range(n_params, len(axes)):
        axes[idx].set_visible(False)
    
    plt.tight_layout()
    output_file = os.path.join(output_dir, 'parameter_analysis.png')
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"\nSaved plot to: {output_file}")
    
    # Create scatter plot matrix for key parameters
    if len(numeric_params) >= 2:
        fig2, axes2 = plt.subplots(1, 1, figsize=(10, 8))
        
        # Pick top 2 most important parameters (by variance in ratio)
        param_importance = {}
        for param in numeric_params:
            param_groups = {}
            for result in valid_results:
                value = result['config'].get(param)
                if value is not None:
                    if value not in param_groups:
                        param_groups[value] = []
                    param_groups[value].append(result['results']['ratio'])
            
            if len(param_groups) > 1:
                group_means = [statistics.mean(ratios) for ratios in param_groups.values()]
                param_importance[param] = max(group_means) - min(group_means)
        
        if len(param_importance) >= 2:
            top_params = sorted(param_importance.items(), key=lambda x: x[1], reverse=True)[:2]
            param1, param2 = top_params[0][0], top_params[1][0]
            
            x_vals = [r['config'].get(param1) for r in valid_results if param1 in r['config']]
            y_vals = [r['config'].get(param2) for r in valid_results if param2 in r['config']]
            ratios = [r['results']['ratio'] for r in valid_results]
            
            scatter = axes2.scatter(x_vals, y_vals, c=ratios, cmap='RdYlGn', 
                                   s=100, alpha=0.6, edgecolors='black')
            axes2.set_xlabel(param1)
            axes2.set_ylabel(param2)
            axes2.set_title(f'Parameter Interaction: {param1} vs {param2}')
            axes2.grid(True, alpha=0.3)
            
            cbar = plt.colorbar(scatter, ax=axes2)
            cbar.set_label('Ratio (White/Black)')
            
            output_file2 = os.path.join(output_dir, 'parameter_interaction.png')
            plt.savefig(output_file2, dpi=150, bbox_inches='tight')
            print(f"Saved plot to: {output_file2}")

def generate_recommendations(results: List[Dict[str, Any]]):
    """Generate configuration recommendations"""
    print("\n" + "="*60)
    print("RECOMMENDATIONS")
    print("="*60)
    
    valid_results = [r for r in results if r.get('results') is not None]
    if not valid_results:
        print("\nNo valid results to generate recommendations")
        return
    
    # Find best overall configuration
    best = max(valid_results, key=lambda x: x['results']['ratio'])
    
    print("\nBEST CONFIGURATION FOUND:")
    print("-" * 50)
    print(f"Name: {best['config']['name']}")
    print(f"Ratio: {best['results']['ratio']:.3f} ({evaluate_quality(best['results']['ratio'])})")
    print(f"\nRecommended parameters:")
    for key, value in best['config'].items():
        if key != 'name':
            print(f"  {key}: {value}")
    
    # Find configurations that work reliably (ratio >= 1.5)
    good_configs = [r for r in valid_results if r['results']['ratio'] >= 1.5]
    
    if good_configs:
        print(f"\n{len(good_configs)} configurations achieve GOOD or better separation (ratio >= 1.5)")
        
        # Find common patterns
        print("\nCommon patterns in successful configurations:")
        
        sample_config = good_configs[0]['config']
        for param in sample_config.keys():
            if param == 'name':
                continue
            
            values = [r['config'][param] for r in good_configs if param in r['config']]
            if all(isinstance(v, (int, float)) for v in values):
                avg_val = statistics.mean(values)
                print(f"  {param}: avg={avg_val:.1f}, range=[{min(values)}, {max(values)}]")
    else:
        print("\nWARNING: No configurations achieved GOOD separation (ratio >= 1.5)")
        print("Consider:")
        print("  1. Testing with more extreme parameter values")
        print("  2. Enabling memory stress (if not already enabled)")
        print("  3. Verifying GPU type (iGPU works better than dGPU)")
        print("  4. Trying the alternate method (chrome-cache vs chrome-pp)")

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze-results.py <results.json> [output_dir]")
        print("\nExample: python analyze-results.py characterization_results_2025-10-27.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    
    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    
    print(f"Loading results from: {input_file}")
    results = load_results(input_file)
    
    # Run analyses
    analyze_basic_stats(results)
    find_best_configs(results)
    
    # Analyze effect of each parameter
    print("\n" + "="*60)
    print("PARAMETER ANALYSIS")
    print("="*60)
    
    valid_results = [r for r in results if r.get('results') is not None]
    if valid_results:
        sample_config = valid_results[0]['config']
        for param in sample_config.keys():
            if param != 'name':
                analyze_by_parameter(results, param)
    
    # Generate visualizations
    if HAS_MATPLOTLIB:
        print("\n" + "="*60)
        print("GENERATING VISUALIZATIONS")
        print("="*60)
        plot_parameter_analysis(results, output_dir)
    
    # Generate recommendations
    generate_recommendations(results)
    
    print("\n" + "="*60)
    print("ANALYSIS COMPLETE")
    print("="*60)

if __name__ == '__main__':
    main()


