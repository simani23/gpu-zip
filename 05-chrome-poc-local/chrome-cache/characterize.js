// GPU Side-Channel Parameter Characterization Script (LLC Cache Version)
// Automatically tests different parameter combinations to find optimal settings

class CacheCharacterization {
  constructor() {
    this.results = [];
    this.currentTest = 0;
    this.totalTests = 0;
    this.running = false;
    this.testConfigs = [];
  }

  // Define parameter ranges to test for LLC-based attack
  generateTestConfigs() {
    const configs = [];
    
    // Parameter ranges for systematic search
    const paramRanges = {
      time: [1000, 2000, 3000, 5000],
      repetition: [50, 100, 150, 200],
      warmup_time: [5, 10, 15, 20],
      div_size: [500, 1000, 1500, 2000], // Smaller than rendering time version
      layer: [5, 10, 15, 20, 30],
      low: [0.3, 0.4, 0.5],
      high: [0.6, 0.7, 0.8]
    };

    // Test 1: Vary div_size and layer (most important for LLC pressure)
    for (let div_size of paramRanges.div_size) {
      for (let layer of paramRanges.layer) {
        configs.push({
          name: `divsize_${div_size}_layer_${layer}`,
          time: 2000,
          repetition: 100,
          warmup_time: 10,
          div_size: div_size,
          layer: layer,
          low: 0.5,
          high: 0.8
        });
      }
    }

    // Test 2: Vary time and repetition
    for (let time of paramRanges.time) {
      for (let rept of paramRanges.repetition) {
        configs.push({
          name: `time_${time}_rept_${rept}`,
          time: time,
          repetition: rept,
          warmup_time: 10,
          div_size: 1000,
          layer: 10,
          low: 0.5,
          high: 0.8
        });
      }
    }

    // Test 3: Vary thresholds
    for (let low of paramRanges.low) {
      for (let high of paramRanges.high) {
        if (low >= high) continue;
        configs.push({
          name: `threshold_low_${low}_high_${high}`,
          time: 2000,
          repetition: 100,
          warmup_time: 10,
          div_size: 1000,
          layer: 10,
          low: low,
          high: high
        });
      }
    }

    // Test 4: Optimal candidates
    const optimalCandidates = [
      { div_size: 1000, layer: 15 },
      { div_size: 1000, layer: 20 },
      { div_size: 1500, layer: 15 },
      { div_size: 1500, layer: 20 },
      { div_size: 500, layer: 30 }
    ];

    for (let candidate of optimalCandidates) {
      configs.push({
        name: `optimal_candidate_${configs.length}`,
        time: 3000,
        repetition: 150,
        warmup_time: 15,
        div_size: candidate.div_size,
        layer: candidate.layer,
        low: 0.5,
        high: 0.8
      });
    }

    return configs;
  }

  // Apply configuration to UI
  applyConfig(config) {
    document.getElementById('time').value = config.time;
    document.getElementById('repetition').value = config.repetition;
    document.getElementById('warmup_time').value = config.warmup_time;
    document.getElementById('div_size').value = config.div_size;
    document.getElementById('layer').value = config.layer;
    document.getElementById('low').value = config.low;
    document.getElementById('high').value = config.high;
    document.getElementById('test-mode').checked = true; // Always test mode
  }

  // Extract results after test
  extractResults() {
    const blackTime = parseFloat(document.getElementById('black-time').textContent);
    const whiteTime = parseFloat(document.getElementById('white-time').textContent);
    const ratio = parseFloat(document.getElementById('timing-ratio').textContent);
    
    return {
      blackTime,
      whiteTime,
      ratio,
      timestamp: new Date().toISOString()
    };
  }

  // Run single test
  async runSingleTest(config) {
    console.log(`\n========================================`);
    console.log(`[LLC-CHARACTERIZATION] Test ${this.currentTest + 1}/${this.totalTests}`);
    console.log(`[LLC-CHARACTERIZATION] Config: ${config.name}`);
    console.log(`[LLC-CHARACTERIZATION] Parameters:`, config);
    console.log(`========================================\n`);

    // Apply configuration
    this.applyConfig(config);

    // Wait for UI to update
    await this.sleep(500);

    // Run the test by triggering the run button
    return new Promise((resolve, reject) => {
      // Hook into the global test completion
      const originalUpdateStatus = window.updateStatus;
      let testCompleted = false;

      window.updateStatus = function(message) {
        originalUpdateStatus.call(this, message);
        
        // Check if test is complete
        if (message.includes('Done') || message.includes('complete') || message.includes('LLC timing separation')) {
          if (!testCompleted) {
            testCompleted = true;
            // Restore original function
            window.updateStatus = originalUpdateStatus;
            
            // Wait a bit for results to be displayed
            setTimeout(() => resolve(), 1000);
          }
        }
      };

      // Start the test
      document.getElementById('runButton').click();

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!testCompleted) {
          window.updateStatus = originalUpdateStatus;
          reject(new Error('Test timeout'));
        }
      }, 300000);
    });
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run full characterization
  async runCharacterization(testConfigs = null) {
    if (this.running) {
      console.warn('[LLC-CHARACTERIZATION] Already running!');
      return;
    }

    this.running = true;
    this.results = [];
    this.currentTest = 0;

    // Generate or use provided test configs
    if (testConfigs === null) {
      this.testConfigs = this.generateTestConfigs();
    } else {
      this.testConfigs = testConfigs;
    }

    this.totalTests = this.testConfigs.length;

    console.log(`[LLC-CHARACTERIZATION] Starting characterization with ${this.totalTests} tests`);
    console.log(`[LLC-CHARACTERIZATION] Estimated time: ${Math.round(this.totalTests * 2)} minutes`);

    const startTime = performance.now();

    // Run each test
    for (let i = 0; i < this.testConfigs.length; i++) {
      if (!this.running) {
        console.log('[LLC-CHARACTERIZATION] Stopped by user');
        break;
      }

      this.currentTest = i;
      const config = this.testConfigs[i];

      try {
        await this.runSingleTest(config);
        
        // Extract results
        const results = this.extractResults();
        
        // Store combined result
        const testResult = {
          testNumber: i + 1,
          config: config,
          results: results
        };
        
        this.results.push(testResult);

        // Log result
        console.log(`[LLC-CHARACTERIZATION] Test ${i + 1} Results:`);
        console.log(`  Black: ${results.blackTime.toFixed(2)} μs`);
        console.log(`  White: ${results.whiteTime.toFixed(2)} μs`);
        console.log(`  Ratio: ${results.ratio.toFixed(3)}`);
        console.log(`  Quality: ${this.evaluateQuality(results.ratio)}`);

        // Wait between tests
        await this.sleep(3000);

      } catch (error) {
        console.error(`[LLC-CHARACTERIZATION] Test ${i + 1} failed:`, error);
        this.results.push({
          testNumber: i + 1,
          config: config,
          results: null,
          error: error.message
        });
      }
    }

    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000 / 60;

    console.log(`\n========================================`);
    console.log(`[LLC-CHARACTERIZATION] COMPLETE!`);
    console.log(`[LLC-CHARACTERIZATION] Total tests: ${this.results.length}`);
    console.log(`[LLC-CHARACTERIZATION] Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`========================================\n`);

    // Analyze and display results
    this.analyzeResults();

    this.running = false;
  }

  // Evaluate quality of separation
  evaluateQuality(ratio) {
    if (ratio < 1.05) return 'POOR (not usable)';
    if (ratio < 1.15) return 'MARGINAL (unreliable)';
    if (ratio < 1.3) return 'FAIR (might work)';
    if (ratio < 1.5) return 'GOOD (should work)';
    if (ratio < 2.0) return 'EXCELLENT (very reliable)';
    return 'OUTSTANDING (perfect separation)';
  }

  // Analyze all results
  analyzeResults() {
    console.log('\n========================================');
    console.log('LLC CHARACTERIZATION ANALYSIS');
    console.log('========================================\n');

    // Sort by ratio (best first)
    const validResults = this.results.filter(r => r.results !== null && !isNaN(r.results.ratio));
    validResults.sort((a, b) => b.results.ratio - a.results.ratio);

    console.log('TOP 10 CONFIGURATIONS (by ratio):');
    console.log('----------------------------------');
    
    for (let i = 0; i < Math.min(10, validResults.length); i++) {
      const test = validResults[i];
      const r = test.results;
      const c = test.config;
      
      console.log(`\n${i + 1}. ${c.name}`);
      console.log(`   Ratio: ${r.ratio.toFixed(3)} (${this.evaluateQuality(r.ratio)})`);
      console.log(`   Black: ${r.blackTime.toFixed(2)} μs, White: ${r.whiteTime.toFixed(2)} μs`);
      console.log(`   Parameters: div_size=${c.div_size}, layer=${c.layer}`);
      console.log(`               time=${c.time}ms, rept=${c.repetition}, warmup=${c.warmup_time}s`);
      console.log(`               thresholds: low=${c.low}, high=${c.high}`);
    }

    // Additional analysis for LLC
    console.log('\n\nANALYSIS BY PARAMETER:');
    console.log('----------------------');
    this.analyzeByParameter('div_size', validResults);
    this.analyzeByParameter('layer', validResults);

    // Save results to JSON
    this.saveResults();
  }

  // Analyze effect of specific parameter
  analyzeByParameter(paramName, validResults) {
    const paramGroups = {};
    
    for (let result of validResults) {
      const value = result.config[paramName];
      if (!paramGroups[value]) {
        paramGroups[value] = [];
      }
      paramGroups[value].push(result.results.ratio);
    }

    console.log(`\n${paramName.toUpperCase()}:`);
    for (let value in paramGroups) {
      const ratios = paramGroups[value];
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const maxRatio = Math.max(...ratios);
      console.log(`  ${value}: avg=${avgRatio.toFixed(3)}, max=${maxRatio.toFixed(3)} (${ratios.length} tests)`);
    }
  }

  // Save results to console as JSON (can be copied)
  saveResults() {
    console.log('\n========================================');
    console.log('FULL RESULTS (JSON)');
    console.log('========================================');
    console.log('Copy the following JSON to save results:');
    console.log('----------------------------------');
    console.log(JSON.stringify(this.results, null, 2));
    console.log('----------------------------------');
  }

  // Stop characterization
  stop() {
    console.log('[LLC-CHARACTERIZATION] Stopping...');
    this.running = false;
  }

  // Quick test with single configuration
  async quickTest(customConfig) {
    const config = {
      name: 'quick_test',
      time: 2000,
      repetition: 100,
      warmup_time: 10,
      div_size: 1000,
      layer: 10,
      low: 0.5,
      high: 0.8,
      ...customConfig
    };

    console.log('[LLC-CHARACTERIZATION] Running quick test with config:', config);
    await this.runCharacterization([config]);
  }
}

// Global instance
window.cacheCharacterization = new CacheCharacterization();

// Convenience functions
window.runCacheCharacterization = function() {
  window.cacheCharacterization.runCharacterization();
};

window.stopCacheCharacterization = function() {
  window.cacheCharacterization.stop();
};

window.quickCacheTest = function(config) {
  window.cacheCharacterization.quickTest(config);
};

// Export results as downloadable JSON
window.downloadCacheResults = function() {
  const dataStr = JSON.stringify(window.cacheCharacterization.results, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `llc_characterization_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

console.log('[LLC-CHARACTERIZATION] Script loaded!');
console.log('[LLC-CHARACTERIZATION] Available commands:');
console.log('  - runCacheCharacterization() : Run full parameter sweep for LLC');
console.log('  - stopCacheCharacterization(): Stop current characterization');
console.log('  - quickCacheTest({...})      : Run single test with custom parameters');
console.log('  - downloadCacheResults()     : Download results as JSON');
console.log('');
console.log('Example: quickCacheTest({ div_size: 1000, layer: 15 })');


