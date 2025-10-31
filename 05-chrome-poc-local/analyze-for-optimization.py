#!/usr/bin/env python3
"""Quick analysis to optimize grid search"""
import json

with open('characterization_results_2025-10-31T19-43-07-154Z.json', 'r') as f:
    data = json.load(f)

valid = [r for r in data if r.get('results') and r.get('results', {}).get('ratio')]
valid.sort(key=lambda x: x['results']['ratio'], reverse=True)

print(f"Total tests: {len(data)}, Valid: {len(valid)}")
print(f"Best ratio: {valid[0]['results']['ratio']:.3f}")
print(f"Worst ratio: {valid[-1]['results']['ratio']:.3f}")
print(f"Average ratio: {sum(r['results']['ratio'] for r in valid) / len(valid):.3f}")

# Top 20
print("\nTop 20:")
for i, r in enumerate(valid[:20], 1):
    c = r['config']
    res = r['results']
    print(f"{i}. {res['ratio']:.3f} | div={c.get('div_size')}, layer={c.get('layer')}, stress={c.get('stress')}, w={c.get('num_workers', 'N/A')}, t={c.get('time_collect')}, r={c.get('repetition')}")

