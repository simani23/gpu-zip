// GPU Compression Side-Channel PoC - Rendering Time Version (Simplified)
// Self-contained local version

// Configuration variables
let timeCollect, repetition, stressType, warmupTime;
let divSize, layerNum;
let thresholdLow, thresholdHigh;
let numWorkers, bigintDigits;
let testMode;
let running = false;

// Worker array for memory stress
let workers = [];

// Platform detection
function detectPlatform() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      document.getElementById('gpu-info').textContent = renderer;
      
      if (renderer.includes('Intel')) {
        return 'intel-igpu';
      } else if (renderer.includes('AMD') || renderer.includes('Radeon')) {
        return 'amd-igpu';
      } else if (renderer.includes('NVIDIA') || renderer.includes('GeForce')) {
        return 'nvidia-dgpu';
      }
    }
  }
  
  document.getElementById('gpu-info').textContent = 'Unknown (WebGL detection failed)';
  return 'unknown';
}

// Update status message
function updateStatus(message) {
  document.getElementById('status').textContent = message;
  console.log('[Status]', message);
}

// Read configuration from UI
function readConfig() {
  timeCollect = parseInt(document.getElementById('time_collect').value);
  repetition = parseInt(document.getElementById('rept').value);
  stressType = parseInt(document.getElementById('stress_type').value);
  warmupTime = parseInt(document.getElementById('warmup').value);
  divSize = parseInt(document.getElementById('div_size').value);
  layerNum = parseInt(document.getElementById('layer').value);
  thresholdLow = parseFloat(document.getElementById('low').value);
  thresholdHigh = parseFloat(document.getElementById('high').value);
  numWorkers = parseInt(document.getElementById('num_workers').value);
  bigintDigits = parseInt(document.getElementById('bigint_digits').value);
  testMode = document.getElementById('test_mode').checked;
  
  console.log('[Config] Read configuration:', {
    timeCollect, repetition, stressType, warmupTime,
    divSize, layerNum, thresholdLow, thresholdHigh,
    numWorkers, bigintDigits, testMode
  });
}

// Start memory stress workers
function startStressWorkers() {
  if (stressType === 0) return;
  
  console.log(`[Stress] Starting ${numWorkers} memory stress workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    try {
      const worker = new Worker('../shared/worker_big.js');
      worker.postMessage({ digits: bigintDigits });
      workers.push(worker);
    } catch (e) {
      console.error('[Stress] Failed to start worker:', e);
    }
  }
  
  updateStatus(`Stress workers: ${workers.length} active`);
}

// Stop memory stress workers
function stopStressWorkers() {
  workers.forEach(w => w.terminate());
  workers = [];
  console.log('[Stress] Stopped all workers');
}

// Measure rendering time
async function measureRenderingTime(iframe, duration, sampleCount) {
  return new Promise((resolve) => {
    const times = [];
    let lastTime = performance.now();
    let startTime = lastTime;
    let count = 0;
    
    function measure() {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed < duration && count < sampleCount) {
        const frameTime = currentTime - lastTime;
        times.push(frameTime);
        lastTime = currentTime;
        count++;
        requestAnimationFrame(measure);
      } else {
        resolve(times);
      }
    }
    
    requestAnimationFrame(measure);
  });
}

// Calculate statistics
function calculateStats(times) {
  if (!times || times.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0 };
  }
  
  // Filter outliers (simple method: remove top/bottom 10%)
  const sorted = times.slice().sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  const variance = trimmed.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / trimmed.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...trimmed);
  const max = Math.max(...trimmed);
  
  return { mean, std, min, max };
}

// Main calibration function
async function runCalibration() {
  updateStatus('Warming up...');
  await new Promise(resolve => setTimeout(resolve, warmupTime));
  
  updateStatus('Measuring BLACK pattern...');
  const blackIframe = document.getElementById('iframe-black');
  const blackTimes = await measureRenderingTime(blackIframe, timeCollect, repetition);
  const blackStats = calculateStats(blackTimes);
  
  console.log('[Calibration] Black stats:', blackStats);
  document.getElementById('black-time').textContent = blackStats.mean.toFixed(2);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  updateStatus('Measuring WHITE pattern...');
  const whiteIframe = document.getElementById('iframe-white');
  const whiteTimes = await measureRenderingTime(whiteIframe, timeCollect, repetition);
  const whiteStats = calculateStats(whiteTimes);
  
  console.log('[Calibration] White stats:', whiteStats);
  document.getElementById('white-time').textContent = whiteStats.mean.toFixed(2);
  
  const ratio = whiteStats.mean / blackStats.mean;
  document.getElementById('timing-ratio').textContent = ratio.toFixed(3);
  
  console.log(`[Calibration] Black: ${blackStats.mean.toFixed(2)}ms, White: ${whiteStats.mean.toFixed(2)}ms, Ratio: ${ratio.toFixed(3)}`);
  
  if (ratio < 1.2) {
    updateStatus('⚠️ Warning: Small timing difference. Try enabling stress or increasing layers.');
    console.warn('[Calibration] Timing difference too small for reliable detection');
  } else if (ratio > 2.0) {
    updateStatus('✓ Excellent timing separation! Ready for attack.');
  } else {
    updateStatus('✓ Good timing separation. Should work.');
  }
  
  return { blackStats, whiteStats, ratio };
}

// Main test function
async function runTest() {
  if (running) {
    console.warn('[Test] Already running');
    return;
  }
  
  running = true;
  document.getElementById('run-button').disabled = true;
  
  try {
    readConfig();
    
    // Start stress workers if enabled
    if (stressType === 1) {
      startStressWorkers();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Run calibration
    const calibration = await runCalibration();
    
    if (testMode) {
      updateStatus('✓ Test mode complete. Check results above.');
    } else {
      updateStatus('✓ Calibration complete. Full attack not implemented in this simplified version.');
      console.log('[Info] This is a simplified PoC. Full pixel stealing would continue here.');
    }
    
  } catch (error) {
    console.error('[Error] Test failed:', error);
    updateStatus('❌ Error: ' + error.message);
  } finally {
    stopStressWorkers();
    running = false;
    document.getElementById('run-button').disabled = false;
  }
}

// Stop function
function stopTest() {
  running = false;
  stopStressWorkers();
  updateStatus('Stopped');
  document.getElementById('run-button').disabled = false;
}

// Pattern selector handler
function updatePattern() {
  const pattern = document.getElementById('pattern-select').value;
  const iframe = document.getElementById('iframe-target');
  iframe.src = `pixel-embed-${pattern}.html`;
  console.log('[Pattern] Switched to:', pattern);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Init] GPU Compression PoC - Rendering Time Version');
  console.log('[Init] Self-contained local version');
  
  // Detect platform
  const platform = detectPlatform();
  document.getElementById('platform-info').textContent = platform.toUpperCase();
  
  if (platform === 'nvidia-dgpu') {
    document.getElementById('info-panel').style.background = '#fff3cd';
    document.getElementById('info-panel').innerHTML += '<br><strong>⚠️ Note:</strong> NVIDIA dGPU detected. This PoC may show minimal timing differences due to dedicated memory. Consider using chrome-cache or direct GPU timing tests instead.';
  } else if (platform === 'amd-igpu') {
    document.getElementById('info-panel').innerHTML += '<br><strong>✓ AMD Radeon iGPU:</strong> Should work well. May need to adjust layer count and enable memory stress.';
  } else if (platform === 'intel-igpu') {
    document.getElementById('info-panel').innerHTML += '<br><strong>✓ Intel iGPU:</strong> Optimal platform for this PoC.';
  }
  
  // Attach event handlers
  document.getElementById('run-button').addEventListener('click', runTest);
  document.getElementById('stop-button').addEventListener('click', stopTest);
  document.getElementById('pattern-select').addEventListener('change', updatePattern);
  
  // Set window size-based div size
  const windowHeight = window.outerHeight * window.devicePixelRatio;
  const windowWidth = window.outerWidth * window.devicePixelRatio;
  document.getElementById('div_size').value = Math.max(windowHeight, windowWidth);
  
  updateStatus('Ready. Configure parameters and click Run.');
  console.log('[Init] Initialization complete');
});

