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
    
    // OPTIMIZED RANGES based on analysis:
    // - Current results show ratios ~1.0 (no separation)
    // - Need longer collection times and more repetitions
    // - Focus on higher div_size and layer values
    // - Test stress more strategically
    const paramRanges = {
      time_collect: [500, 1000, 2000, 5000],  // Reduced: focus on longer times
      repetition: [50, 100, 200],  // Reduced: focus on higher repetitions
      stress: [0, 1],
      warmup: [5000, 10000],  // Reduced: reasonable warmup values
      div_size: [2000, 3000, 4000, 6000, 8000],  // Removed very small/large extremes
      layer: [10, 15, 20, 25, 30, 40, 50],  // Removed very low layers (1, 3, 5)
      num_workers: [4, 8, 16, 32],  // Focus on moderate to high worker counts
      bigint_digits: [100000, 200000, 500000],  // Focus on meaningful stress levels
    };

    // OPTIMIZED Test 1: Focused div_size × layer search
    // Based on results: remove very small div_size (500, 1000) and very low layers (1, 3, 5)
    // Focus on combinations that might actually work
    const focusedDivSizes = [2000, 3000, 4000, 6000, 8000];
    const focusedLayers = [15, 20, 25, 30, 40, 50];
    
    for (let div_size of focusedDivSizes) {
      for (let layer of focusedLayers) {
        configs.push({
          name: `divsize_${div_size}_layer_${layer}`,
          time_collect: 1000,  // Increased from 500
          repetition: 100,  // Increased from 50
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

    // OPTIMIZED Test 2: Focus on longer collection times (current tests too short)
    // Higher time_collect and repetition should help with timing separation
    const longerTimes = [1000, 2000, 5000];
    const higherRepetitions = [100, 200];
    
    for (let time of longerTimes) {
      for (let rept of higherRepetitions) {
        configs.push({
          name: `time_${time}_rept_${rept}`,
          time_collect: time,
          repetition: rept,
          stress: 0,
          warmup: 5000,
          div_size: 4000,  // Increased from 2000
          layer: 30,  // Increased from 10
          num_workers: 4,
          bigint_digits: 100000,
          low: 0.3,
          high: 0.7
        });
      }
    }

    // OPTIMIZED Test 3: Strategic stress testing
    // Focus on fewer, more meaningful combinations with longer collection times
    const stressWorkers = [4, 8, 16, 32];  // Removed 1, 2 (too low)
    const stressDigits = [200000, 500000];  // Focus on higher stress
    const stressLayers = [20, 30, 40, 50];  // Focus on higher layers
    
    // Test 3a: Workers × Digits (with good base params)
    for (let workers of stressWorkers) {
      for (let digits of stressDigits) {
        configs.push({
          name: `stress_workers_${workers}_digits_${digits}`,
          time_collect: 2000,  // Increased from 500
          repetition: 100,  // Increased from 50
          stress: 1,
          warmup: 5000,
          div_size: 4000,  // Increased from 2000
          layer: 30,  // Increased from 10
          num_workers: workers,
          bigint_digits: digits,
          low: 0.3,
          high: 0.7
        });
      }
    }
    
    // Test 3b: Strategic workers × layers (reduced combinations)
    // Only test key combinations, not full grid
    const keyWorkers = [8, 16, 32];
    const keyLayers = [25, 30, 40, 50];
    const keyDigits = [200000, 500000];
    
    console.log('[CHARACTERIZATION] Generating strategic stress workers × SVG layers combinations...');
    for (let workers of keyWorkers) {
      for (let layer of keyLayers) {
        for (let digits of keyDigits) {
          configs.push({
            name: `stress_workers_${workers}_layer_${layer}_digits_${digits}`,
            time_collect: 2000,  // Longer collection
            repetition: 100,  // More repetitions
            stress: 1,
            warmup: 5000,
            div_size: 4000,  // Higher div_size
            layer: layer,
            num_workers: workers,
            bigint_digits: digits,
            low: 0.3,
            high: 0.7
          });
        }
      }
    }

    // OPTIMIZED Test 4: Focused optimal candidates
    // Removed low div_size and low layer tests (didn't work)
    // Focus on combinations with longer collection times
    const optimalCandidates = [
      // High layer, high div_size (no stress)
      { div_size: 6000, layer: 40, stress: 0, time_collect: 2000, repetition: 100 },
      { div_size: 8000, layer: 50, stress: 0, time_collect: 2000, repetition: 100 },
      { div_size: 4000, layer: 50, stress: 0, time_collect: 2000, repetition: 100 },
      
      // High layer, high div_size WITH stress (key test)
      { div_size: 4000, layer: 30, stress: 1, num_workers: 16, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      { div_size: 4000, layer: 40, stress: 1, num_workers: 16, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      { div_size: 4000, layer: 50, stress: 1, num_workers: 16, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      { div_size: 6000, layer: 30, stress: 1, num_workers: 16, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      { div_size: 6000, layer: 40, stress: 1, num_workers: 16, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      
      // Worker count variation with high layer
      { div_size: 4000, layer: 40, stress: 1, num_workers: 8, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      { div_size: 4000, layer: 40, stress: 1, num_workers: 32, bigint_digits: 500000, time_collect: 2000, repetition: 100 },
      
      // Very long collection times (might help)
      { div_size: 4000, layer: 30, stress: 0, time_collect: 5000, repetition: 200 },
      { div_size: 4000, layer: 40, stress: 0, time_collect: 5000, repetition: 200 },
      { div_size: 4000, layer: 30, stress: 1, num_workers: 16, bigint_digits: 500000, time_collect: 5000, repetition: 200 },
      
      // Extended warmup
      { div_size: 4000, layer: 30, stress: 0, warmup: 10000, time_collect: 2000, repetition: 100 },
      { div_size: 4000, layer: 40, stress: 1, num_workers: 16, bigint_digits: 500000, warmup: 10000, time_collect: 2000, repetition: 100 },
    ];

    for (let candidate of optimalCandidates) {
      configs.push({
        name: `optimal_candidate_${configs.length}`,
        time_collect: candidate.time_collect || 500,
        repetition: candidate.repetition || 100,
        stress: candidate.stress || 0,
        warmup: candidate.warmup || 5000,
        div_size: candidate.div_size,
        layer: candidate.layer,
        num_workers: candidate.num_workers || 4,
        bigint_digits: candidate.bigint_digits || 100000,
        low: 0.3,
        high: 0.7
      });
    }
    
    // OPTIMIZED Test 5: Threshold testing (reduced - thresholds don't help if ratio is ~1.0)
    // Only test a few key threshold combinations
    const thresholdCombos = [
      { low: 0.3, high: 0.7 },  // Default
      { low: 0.2, high: 0.8 },  // Wider
      { low: 0.4, high: 0.6 },  // Narrower
    ];
    
    for (let thresh of thresholdCombos) {
      configs.push({
        name: `threshold_low_${thresh.low}_high_${thresh.high}`,
        time_collect: 2000,  // Increased
        repetition: 100,
        stress: 0,
        warmup: 5000,
        div_size: 4000,
        layer: 30,  // Increased from 20
        num_workers: 4,
        bigint_digits: 100000,
        low: thresh.low,
        high: thresh.high
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
      console.warn('[CHARACTERIZATION] Results not ready or invalid:', {
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
      console.error('[CHARACTERIZATION] Failed to parse results:', {
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
    console.log(`[CHARACTERIZATION] Test ${this.currentTest + 1}/${this.totalTests}`);
    console.log(`[CHARACTERIZATION] Config: ${config.name}`);
    console.log(`[CHARACTERIZATION] Parameters:`, config);
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
        if (message.includes('Done') || message.includes('complete') || message.includes('Accuracy')) {
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
        
        // Extract results - retry if needed
        let results = this.extractResults();
        let retries = 0;
        while (results === null && retries < 5) {
          console.warn(`[CHARACTERIZATION] Results not ready, retrying... (${retries + 1}/5)`);
          await this.sleep(500);
          results = this.extractResults();
          retries++;
        }
        
        if (results === null) {
          console.error(`[CHARACTERIZATION] Test ${i + 1} failed: Could not extract valid results after retries`);
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
          console.log(`[CHARACTERIZATION] Test ${i + 1} Results:`);
          console.log(`  Black: ${results.blackTime.toFixed(2)} ms`);
          console.log(`  White: ${results.whiteTime.toFixed(2)} ms`);
          console.log(`  Ratio: ${results.ratio.toFixed(3)}`);
          console.log(`  Quality: ${this.evaluateQuality(results.ratio)}`);
        }

        // Wait between tests to ensure clean state
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


