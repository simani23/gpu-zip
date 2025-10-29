// GPU Side-Channel Parameter Characterization Script
// Automatically tests different parameter combinations to find optimal settings

class ParameterCharacterization {
  constructor() {
    this.results = [];
    this.currentTest = 0;
    this.totalTests = 0;
    this.running = false;
    this.testConfigs = [];
  }

  // Define parameter ranges to test
  generateTestConfigs() {
    const configs = [];
    
    // Parameter ranges for systematic search
    const paramRanges = {
      time_collect: [300, 500, 1000, 2000],
      repetition: [30, 50, 100],
      stress: [0, 1],
      warmup: [2000, 5000, 10000],
      div_size: [1000, 2000, 3000, 4000],
      layer: [5, 10, 15, 20],
      num_workers: [2, 4, 8],
      bigint_digits: [50000, 100000, 200000],
    };

    // Grid search over key parameters (keeping others at defaults)
    // Test 1: Vary div_size and layer (most important for black/white separation)
    for (let div_size of paramRanges.div_size) {
      for (let layer of paramRanges.layer) {
        configs.push({
          name: `divsize_${div_size}_layer_${layer}`,
          time_collect: 500,
          repetition: 50,
          stress: 0,
          warmup: 5000,
          div_size: div_size,
          layer: layer,
          num_workers: 4,
          bigint_digits: 100000,
          low: 0.3,
          high: 0.7
        });
      }
    }

    // Test 2: Vary time_collect and repetition
    for (let time of paramRanges.time_collect) {
      for (let rept of paramRanges.repetition) {
        configs.push({
          name: `time_${time}_rept_${rept}`,
          time_collect: time,
          repetition: rept,
          stress: 0,
          warmup: 5000,
          div_size: 2000,
          layer: 10,
          num_workers: 4,
          bigint_digits: 100000,
          low: 0.3,
          high: 0.7
        });
      }
    }

    // Test 3: With memory stress enabled
    for (let stress of paramRanges.stress) {
      if (stress === 0) continue; // Already tested above
      for (let workers of paramRanges.num_workers) {
        for (let digits of paramRanges.bigint_digits) {
          configs.push({
            name: `stress_workers_${workers}_digits_${digits}`,
            time_collect: 500,
            repetition: 50,
            stress: stress,
            warmup: 5000,
            div_size: 2000,
            layer: 10,
            num_workers: workers,
            bigint_digits: digits,
            low: 0.3,
            high: 0.7
          });
        }
      }
    }

    // Test 4: Combined optimal parameters (after finding good ranges)
    const optimalCandidates = [
      { div_size: 3000, layer: 15, stress: 0 },
      { div_size: 3000, layer: 20, stress: 0 },
      { div_size: 4000, layer: 15, stress: 0 },
      { div_size: 2000, layer: 15, stress: 1, num_workers: 8, bigint_digits: 200000 },
    ];

    for (let candidate of optimalCandidates) {
      configs.push({
        name: `optimal_candidate_${configs.length}`,
        time_collect: 500,
        repetition: 100,
        stress: candidate.stress || 0,
        warmup: 5000,
        div_size: candidate.div_size,
        layer: candidate.layer,
        num_workers: candidate.num_workers || 4,
        bigint_digits: candidate.bigint_digits || 100000,
        low: 0.3,
        high: 0.7
      });
    }

    return configs;
  }

  // Apply configuration to UI
  applyConfig(config) {
    document.getElementById('time_collect').value = config.time_collect;
    document.getElementById('rept').value = config.repetition;
    document.getElementById('stress_type').value = config.stress;
    document.getElementById('warmup').value = config.warmup;
    document.getElementById('div_size').value = config.div_size;
    document.getElementById('layer').value = config.layer;
    document.getElementById('num_workers').value = config.num_workers;
    document.getElementById('bigint_digits').value = config.bigint_digits;
    document.getElementById('low').value = config.low;
    document.getElementById('high').value = config.high;
    document.getElementById('test_mode').checked = true; // Always test mode
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
    console.log(`[CHARACTERIZATION] Test ${this.currentTest + 1}/${this.totalTests}`);
    console.log(`[CHARACTERIZATION] Config: ${config.name}`);
    console.log(`[CHARACTERIZATION] Parameters:`, config);
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
        if (message.includes('Done') || message.includes('complete') || message.includes('Accuracy')) {
          if (!testCompleted) {
            testCompleted = true;
            // Restore original function
            window.updateStatus = originalUpdateStatus;
            resolve();
          }
        }
      };

      // Start the test
      document.getElementById('run-button').click();

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
      console.warn('[CHARACTERIZATION] Already running!');
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

    console.log(`[CHARACTERIZATION] Starting characterization with ${this.totalTests} tests`);
    console.log(`[CHARACTERIZATION] Estimated time: ${Math.round(this.totalTests * 2)} minutes`);

    const startTime = performance.now();

    // Run each test
    for (let i = 0; i < this.testConfigs.length; i++) {
      if (!this.running) {
        console.log('[CHARACTERIZATION] Stopped by user');
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
        console.log(`[CHARACTERIZATION] Test ${i + 1} Results:`);
        console.log(`  Black: ${results.blackTime.toFixed(2)} ms`);
        console.log(`  White: ${results.whiteTime.toFixed(2)} ms`);
        console.log(`  Ratio: ${results.ratio.toFixed(3)}`);
        console.log(`  Quality: ${this.evaluateQuality(results.ratio)}`);

        // Wait between tests
        await this.sleep(2000);

      } catch (error) {
        console.error(`[CHARACTERIZATION] Test ${i + 1} failed:`, error);
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
    console.log(`[CHARACTERIZATION] COMPLETE!`);
    console.log(`[CHARACTERIZATION] Total tests: ${this.results.length}`);
    console.log(`[CHARACTERIZATION] Total time: ${totalTime.toFixed(1)} minutes`);
    console.log(`========================================\n`);

    // Analyze and display results
    this.analyzeResults();

    this.running = false;
  }

  // Evaluate quality of separation
  evaluateQuality(ratio) {
    if (ratio < 1.1) return 'POOR (not usable)';
    if (ratio < 1.3) return 'MARGINAL (unreliable)';
    if (ratio < 1.5) return 'FAIR (might work)';
    if (ratio < 2.0) return 'GOOD (should work)';
    if (ratio < 3.0) return 'EXCELLENT (very reliable)';
    return 'OUTSTANDING (perfect separation)';
  }

  // Analyze all results
  analyzeResults() {
    console.log('\n========================================');
    console.log('CHARACTERIZATION ANALYSIS');
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
      console.log(`   Black: ${r.blackTime.toFixed(2)} ms, White: ${r.whiteTime.toFixed(2)} ms`);
      console.log(`   Parameters: div_size=${c.div_size}, layer=${c.layer}, stress=${c.stress}`);
      console.log(`               time=${c.time_collect}ms, rept=${c.repetition}`);
      if (c.stress === 1) {
        console.log(`               workers=${c.num_workers}, digits=${c.bigint_digits}`);
      }
    }

    // Save results to JSON
    this.saveResults();
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
    console.log('[CHARACTERIZATION] Stopping...');
    this.running = false;
    
    // Stop any running test
    if (window.running) {
      document.getElementById('stop-button').click();
    }
  }

  // Quick test with single configuration
  async quickTest(customConfig) {
    const config = {
      name: 'quick_test',
      time_collect: 500,
      repetition: 50,
      stress: 0,
      warmup: 5000,
      div_size: 2000,
      layer: 10,
      num_workers: 4,
      bigint_digits: 100000,
      low: 0.3,
      high: 0.7,
      ...customConfig
    };

    console.log('[CHARACTERIZATION] Running quick test with config:', config);
    await this.runCharacterization([config]);
  }
}

// Global instance
window.characterization = new ParameterCharacterization();

// Convenience functions
window.runCharacterization = function() {
  window.characterization.runCharacterization();
};

window.stopCharacterization = function() {
  window.characterization.stop();
};

window.quickTest = function(config) {
  window.characterization.quickTest(config);
};

// Export results as downloadable JSON
window.downloadResults = function() {
  const dataStr = JSON.stringify(window.characterization.results, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `characterization_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

console.log('[CHARACTERIZATION] Script loaded!');
console.log('[CHARACTERIZATION] Available commands:');
console.log('  - runCharacterization()     : Run full parameter sweep');
console.log('  - stopCharacterization()    : Stop current characterization');
console.log('  - quickTest({...})          : Run single test with custom parameters');
console.log('  - downloadResults()         : Download results as JSON');
console.log('');
console.log('Example: quickTest({ div_size: 3000, layer: 15 })');


