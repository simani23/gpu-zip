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
    
    // Parameter ranges for systematic search - EXTENDED RANGES for better separation
    const paramRanges = {
      time: [500, 1000, 2000, 3000, 5000, 10000],
      repetition: [20, 50, 100, 150, 200, 300, 500],
      warmup_time: [0, 5, 10, 15, 20, 30, 60],
      div_size: [250, 500, 1000, 1500, 2000, 3000, 4000, 5000], // Extended range
      layer: [1, 3, 5, 10, 15, 20, 30, 40, 50],
      low: [0.1, 0.2, 0.3, 0.4, 0.5],
      high: [0.5, 0.6, 0.7, 0.8, 0.9]
    };

    // Test 1: Vary div_size and layer (most important for LLC pressure) - use extreme values
    const extremeDivSizes = [250, 500, 1000, 2000, 3000, 4000, 5000];
    const extremeLayers = [1, 3, 5, 10, 15, 20, 30, 40, 50];
    
    for (let div_size of extremeDivSizes) {
      for (let layer of extremeLayers) {
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

    // Test 2: Vary time and repetition with more extreme values
    const extremeTimes = [500, 1000, 2000, 5000, 10000];
    const extremeRepetitions = [20, 50, 100, 200, 300, 500];
    
    for (let time of extremeTimes) {
      for (let rept of extremeRepetitions) {
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

    // Test 3: Vary thresholds with more extreme values
    const thresholdCombos = [
      { low: 0.1, high: 0.3 },
      { low: 0.1, high: 0.5 },
      { low: 0.1, high: 0.7 },
      { low: 0.1, high: 0.9 },
      { low: 0.2, high: 0.4 },
      { low: 0.2, high: 0.6 },
      { low: 0.2, high: 0.8 },
      { low: 0.3, high: 0.5 },
      { low: 0.3, high: 0.7 },
      { low: 0.3, high: 0.9 },
      { low: 0.4, high: 0.6 },
      { low: 0.4, high: 0.8 },
      { low: 0.5, high: 0.7 },
      { low: 0.5, high: 0.9 },
      { low: 0.6, high: 0.8 },
      { low: 0.7, high: 0.9 },
    ];
    
    for (let thresh of thresholdCombos) {
      configs.push({
        name: `threshold_low_${thresh.low}_high_${thresh.high}`,
        time: 2000,
        repetition: 100,
        warmup_time: 10,
        div_size: 1000,
        layer: 10,
        low: thresh.low,
        high: thresh.high
      });
    }

    // Test 4: Optimal candidates with extreme values
    const optimalCandidates = [
      // Low layer, high div_size
      { div_size: 5000, layer: 1 },
      { div_size: 4000, layer: 3 },
      { div_size: 3000, layer: 5 },
      // High layer, high div_size
      { div_size: 3000, layer: 40 },
      { div_size: 4000, layer: 50 },
      { div_size: 2000, layer: 50 },
      // High layer, low div_size
      { div_size: 250, layer: 50 },
      { div_size: 500, layer: 40 },
      { div_size: 500, layer: 30 },
      // Medium combinations
      { div_size: 2000, layer: 20 },
      { div_size: 3000, layer: 30 },
      // Extreme warmup
      { div_size: 2000, layer: 20, warmup_time: 0 },
      { div_size: 2000, layer: 20, warmup_time: 60 },
      { div_size: 4000, layer: 30, warmup_time: 30 },
    ];

    for (let candidate of optimalCandidates) {
      configs.push({
        name: `optimal_candidate_${configs.length}`,
        time: candidate.time || 3000,
        repetition: candidate.repetition || 150,
        warmup_time: candidate.warmup_time || 15,
        div_size: candidate.div_size,
        layer: candidate.layer,
        low: candidate.low || 0.5,
        high: candidate.high || 0.8
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
    const blackTimeEl = document.getElementById('black-time');
    const whiteTimeEl = document.getElementById('white-time');
    const ratioEl = document.getElementById('timing-ratio');
    
    // Get text content and validate
    const blackTimeText = blackTimeEl.textContent.trim();
    const whiteTimeText = whiteTimeEl.textContent.trim();
    const ratioText = ratioEl.textContent.trim();
    
    // Validate that we have actual results (not '-' or empty)
    if (blackTimeText === '-' || blackTimeText === '' || 
        whiteTimeText === '-' || whiteTimeText === '' ||
        ratioText === '-' || ratioText === '') {
      console.warn('[LLC-CHARACTERIZATION] Results not ready or invalid:', {
        blackTime: blackTimeText,
        whiteTime: whiteTimeText,
        ratio: ratioText
      });
      return null;
    }
    
    const blackTime = parseFloat(blackTimeText);
    const whiteTime = parseFloat(whiteTimeText);
    const ratio = parseFloat(ratioText);
    
    // Validate parsed numbers
    if (isNaN(blackTime) || isNaN(whiteTime) || isNaN(ratio)) {
      console.error('[LLC-CHARACTERIZATION] Failed to parse results:', {
        blackTime: blackTimeText,
        whiteTime: whiteTimeText,
        ratio: ratioText
      });
      return null;
    }
    
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

    // Reset any previous results to ensure we don't read stale data
    document.getElementById('black-time').textContent = '-';
    document.getElementById('white-time').textContent = '-';
    document.getElementById('timing-ratio').textContent = '-';

    // Apply configuration
    this.applyConfig(config);

    // Wait for UI to update - ensure all inputs are set
    await this.sleep(1000);

    // Run the test by triggering the run button
    return new Promise((resolve, reject) => {
      // Hook into the global test completion
      const originalUpdateStatus = window.updateStatus;
      let testCompleted = false;

      window.updateStatus = function(message) {
        originalUpdateStatus.call(this, message);
        
        // Check if test is complete - look for Done or complete messages
        if (message.includes('Done') || message.includes('complete') || message.includes('LLC timing separation')) {
          if (!testCompleted) {
            testCompleted = true;
            // Restore original function
            window.updateStatus = originalUpdateStatus;
            
            // Wait additional time to ensure DOM is fully updated and measurements are complete
            setTimeout(() => {
              resolve();
            }, 500);
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
        
        // Extract results - retry if needed
        let results = this.extractResults();
        let retries = 0;
        while (results === null && retries < 5) {
          console.warn(`[LLC-CHARACTERIZATION] Results not ready, retrying... (${retries + 1}/5)`);
          await this.sleep(500);
          results = this.extractResults();
          retries++;
        }
        
        if (results === null) {
          console.error(`[LLC-CHARACTERIZATION] Test ${i + 1} failed: Could not extract valid results after retries`);
          this.results.push({
            testNumber: i + 1,
            config: config,
            results: null,
            error: 'Failed to extract results'
          });
        } else {
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
        }

        // Wait between tests to ensure clean state
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


