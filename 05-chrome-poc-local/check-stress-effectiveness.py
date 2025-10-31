#!/usr/bin/env python3
"""
Analyze characterization results to check if memory stress is working
and find the best configurations
"""

import json
import sys
import os
from typing import List, Dict, Any

def load_results(filename: str) -> List[Dict[str, Any]]:
    """Load results from JSON file"""
    with open(filename, 'r') as f:
        return json.load(f)

def analyze_stress_effectiveness(results: List[Dict[str, Any]]):
    """Analyze whether memory stress is actually working"""
    print("="*80)
    print("MEMORY STRESS EFFECTIVENESS ANALYSIS")
    print("="*80)
    
    valid_results = [r for r in results if r.get('results') and r.get('results', {}).get('ratio')]
    
    if not valid_results:
        print("No valid results to analyze!")
        return
    
    # Separate stress vs no-stress
    stress_results = [r for r in valid_results if r['config'].get('stress') == 1]
    nostress_results = [r for r in valid_results if r['config'].get('stress') == 0]
    
    print(f"\nTotal valid tests: {len(valid_results)}")
    print(f"  With stress enabled: {len(stress_results)}")
    print(f"  Without stress: {len(nostress_results)}")
    
    if not stress_results:
        print("\n⚠️  WARNING: No tests with stress=1 found!")
        print("   Memory stress may not have been tested.")
        return
    
    if not nostress_results:
        print("\n⚠️  WARNING: No tests without stress found!")
        print("   Cannot compare stress effectiveness.")
        return
    
    # Calculate statistics
    stress_ratios = [r['results']['ratio'] for r in stress_results]
    nostress_ratios = [r['results']['ratio'] for r in nostress_results]
    
    stress_mean = sum(stress_ratios) / len(stress_ratios) if stress_ratios else 0
    nostress_mean = sum(nostress_ratios) / len(nostress_ratios) if nostress_ratios else 0
    stress_max = max(stress_ratios) if stress_ratios else 0
    nostress_max = max(nostress_ratios) if nostress_ratios else 0
    
    print(f"\nRatio Statistics:")
    print(f"  With stress:")
    print(f"    Mean: {stress_mean:.3f}")
    print(f"    Max:  {stress_max:.3f}")
    print(f"    Min:  {min(stress_ratios):.3f}")
    
    print(f"  Without stress:")
    print(f"    Mean: {nostress_mean:.3f}")
    print(f"    Max:  {nostress_max:.3f}")
    print(f"    Min:  {min(nostress_ratios):.3f}")
    
    # Analyze if stress is helping
    print(f"\n{'='*80}")
    print("STRESS EFFECTIVENESS:")
    print("="*80)
    
    if stress_max > nostress_max:
        improvement = ((stress_max - nostress_max) / nostress_max) * 100
        print(f"✅ Stress is HELPING: Best with stress ({stress_max:.3f}) is {improvement:.1f}% better than without ({nostress_max:.3f})")
    elif stress_max < nostress_max:
        degradation = ((nostress_max - stress_max) / nostress_max) * 100
        print(f"❌ Stress is HURTING: Best with stress ({stress_max:.3f}) is {degradation:.1f}% worse than without ({nostress_max:.3f})")
    else:
        print(f"⚠️  Stress has NO EFFECT: Both have same max ratio ({stress_max:.3f})")
    
    if stress_mean > nostress_mean:
        print(f"✅ Stress improves average ratio (+{(stress_mean - nostress_mean):.3f})")
    elif stress_mean < nostress_mean:
        print(f"❌ Stress reduces average ratio ({(stress_mean - nostress_mean):.3f})")
    else:
        print(f"⚠️  Stress has no effect on average ratio")
    
    # Check if ratios are close to 1.0 (bad separation)
    stress_close_to_one = sum(1 for r in stress_ratios if abs(r - 1.0) < 0.01)
    nostress_close_to_one = sum(1 for r in nostress_ratios if abs(r - 1.0) < 0.01)
    
    print(f"\n{'='*80}")
    print("SEPARATION QUALITY:")
    print("="*80)
    
    if stress_close_to_one == len(stress_ratios):
        print(f"⚠️  CRITICAL: All {len(stress_ratios)} stress tests have ratio ≈ 1.0 (NO SEPARATION)")
        print("   This suggests:")
        print("   - Memory stress workers may not be running")
        print("   - Stress is not affecting GPU timing")
        print("   - Attack method may not work on this GPU")
    
    if nostress_close_to_one == len(nostress_ratios):
        print(f"⚠️  CRITICAL: All {len(nostress_ratios)} no-stress tests have ratio ≈ 1.0 (NO SEPARATION)")
    
    # Analyze best stress configurations
    print(f"\n{'='*80}")
    print("TOP 5 STRESS CONFIGURATIONS:")
    print("="*80)
    
    stress_sorted = sorted(stress_results, key=lambda x: x['results']['ratio'], reverse=True)
    for i, r in enumerate(stress_sorted[:5], 1):
        c = r['config']
        res = r['results']
        print(f"\n{i}. Ratio: {res['ratio']:.3f} (Black: {res['blackTime']:.2f}ms, White: {res['whiteTime']:.2f}ms)")
        print(f"   Workers: {c.get('num_workers', 'N/A')}, Digits: {c.get('bigint_digits', 'N/A')}")
        print(f"   div_size: {c.get('div_size')}, layer: {c.get('layer')}")
        print(f"   time_collect: {c.get('time_collect')}ms, repetition: {c.get('repetition')}")

def show_best_configs(results: List[Dict[str, Any]], top_n: int = 10):
    """Show best configurations overall"""
    print(f"\n{'='*80}")
    print(f"TOP {top_n} CONFIGURATIONS (ALL)")
    print("="*80)
    
    valid_results = [r for r in results if r.get('results') and r.get('results', {}).get('ratio')]
    valid_results.sort(key=lambda x: x['results']['ratio'], reverse=True)
    
    for i, r in enumerate(valid_results[:top_n], 1):
        c = r['config']
        res = r['results']
        stress_info = ""
        if c.get('stress') == 1:
            stress_info = f" | Stress: {c.get('num_workers')} workers, {c.get('bigint_digits')} digits"
        else:
            stress_info = " | No stress"
        
        print(f"\n{i}. Ratio: {res['ratio']:.3f} (Black: {res['blackTime']:.2f}ms, White: {res['whiteTime']:.2f}ms)")
        print(f"   div_size: {c.get('div_size')}, layer: {c.get('layer')}{stress_info}")
        print(f"   time_collect: {c.get('time_collect')}ms, repetition: {c.get('repetition')}")

def verify_stress_worker_counts(results: List[Dict[str, Any]]):
    """Check if different worker counts were tested"""
    print(f"\n{'='*80}")
    print("STRESS CONFIGURATION VARIETY")
    print("="*80)
    
    stress_results = [r for r in results if r.get('config', {}).get('stress') == 1]
    
    if not stress_results:
        print("❌ No stress configurations found!")
        return
    
    worker_counts = set()
    digit_counts = set()
    
    for r in stress_results:
        worker_counts.add(r['config'].get('num_workers', 'unknown'))
        digit_counts.add(r['config'].get('bigint_digits', 'unknown'))
    
    print(f"\nWorker counts tested: {sorted(worker_counts)}")
    print(f"BigInt digits tested: {sorted(digit_counts)}")
    
    if len(worker_counts) == 1:
        print(f"⚠️  Only {list(worker_counts)[0]} worker(s) tested - may need more variety")
    if len(digit_counts) == 1:
        print(f"⚠️  Only {list(digit_counts)[0]} digits tested - may need more variety")

def main():
    if len(sys.argv) < 2:
        # Try to find the most recent results file
        results_dir = os.path.dirname(os.path.abspath(__file__))
        json_files = [f for f in os.listdir(results_dir) if f.startswith('characterization_results_') and f.endswith('.json')]
        
        if json_files:
            json_files.sort(reverse=True)
            filename = os.path.join(results_dir, json_files[0])
            print(f"Using most recent results file: {json_files[0]}")
        else:
            print("Usage: python check-stress-effectiveness.py <results.json>")
            print("\nOr place a characterization_results_*.json file in the same directory")
            sys.exit(1)
    else:
        filename = sys.argv[1]
    
    if not os.path.exists(filename):
        print(f"Error: File not found: {filename}")
        sys.exit(1)
    
    print(f"Loading results from: {filename}")
    results = load_results(filename)
    
    # Run analyses
    analyze_stress_effectiveness(results)
    verify_stress_worker_counts(results)
    show_best_configs(results, top_n=10)
    
    print(f"\n{'='*80}")
    print("RECOMMENDATIONS")
    print("="*80)
    
    valid_results = [r for r in results if r.get('results') and r.get('results', {}).get('ratio')]
    best_ratio = max([r['results']['ratio'] for r in valid_results]) if valid_results else 0
    
    if best_ratio < 1.1:
        print("\n❌ CRITICAL: No good separation found (best ratio < 1.1)")
        print("   Recommendations:")
        print("   1. Verify memory stress workers are actually running:")
        print("      - Open test-stress.html in browser")
        print("      - Check browser console for [Stress] messages")
        print("      - Check Task Manager/Activity Monitor for CPU usage")
        print("   2. Try different GPU (iGPU vs dGPU)")
        print("   3. Check if this attack method works on your hardware")
        print("   4. Try the chrome-cache version instead")
    
    elif best_ratio < 1.3:
        print("\n⚠️  Marginal separation (best ratio < 1.3)")
        print("   Attack may be unreliable")
        print("   Try:")
        print("   - More extreme parameter values")
        print("   - Higher memory stress (more workers, more digits)")
        print("   - Longer time_collect and repetition")
    
    elif best_ratio < 1.5:
        print("\n⚠️  Fair separation (best ratio < 1.5)")
        print("   Attack might work but could be unreliable")
    
    else:
        print(f"\n✅ Good separation found (best ratio: {best_ratio:.3f})")
        print("   Attack should be usable!")
    
    print(f"\n{'='*80}")

if __name__ == '__main__':
    main()

