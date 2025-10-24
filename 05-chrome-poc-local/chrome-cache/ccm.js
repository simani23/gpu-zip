// Simplified Cache Contention Measurement (CCM)
// Based on Prime+Probe technique for LLC measurement

class CacheContentionMeasurement {
  constructor() {
    this.evictionArray = null;
    this.cacheSize = 8 * 1024 * 1024; // Default 8 MB
    this.initialized = false;
  }

  // Initialize eviction sets (simplified version)
  initialize() {
    try {
      // Allocate large array for cache eviction
      const arraySize = this.cacheSize / 4; // 4 bytes per element
      this.evictionArray = new Uint32Array(arraySize);
      
      // Fill with pseudo-random access pattern
      for (let i = 0; i < this.evictionArray.length; i++) {
        this.evictionArray[i] = (i * 2654435761) % this.evictionArray.length;
      }
      
      this.initialized = true;
      console.log('[CCM] Initialized with cache size:', this.cacheSize);
      return true;
    } catch (e) {
      console.error('[CCM] Initialization failed:', e);
      return false;
    }
  }

  // Probe all cache sets (simplified)
  probeAllSets() {
    if (!this.initialized) return 0;
    
    let sum = 0;
    const iterations = Math.min(10000, this.evictionArray.length / 64);
    
    // Walk through eviction array to probe cache
    for (let i = 0; i < iterations; i++) {
      const index = this.evictionArray[i];
      sum += this.evictionArray[index];
    }
    
    return sum; // Return sum to prevent optimization
  }

  // Measure LLC walk time
  measureOnce() {
    if (!this.initialized) {
      console.warn('[CCM] Not initialized');
      return 0;
    }

    const startTime = performance.now();
    
    // Perform cache probing
    this.probeAllSets();
    
    const endTime = performance.now();
    return (endTime - startTime) * 1000; // Return microseconds
  }

  // Measure multiple times and return array
  measureMultiple(count) {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      results.push(this.measureOnce());
    }
    
    return results;
  }

  // Prime the cache (fill all sets)
  prime() {
    if (!this.initialized) return;
    
    // Fill cache by accessing eviction array
    let sum = 0;
    for (let i = 0; i < this.evictionArray.length; i += 16) {
      sum += this.evictionArray[i];
    }
    
    return sum; // Prevent optimization
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheContentionMeasurement;
}

