const video = document.getElementById('video');
const liveCanvas = document.getElementById('liveCanvas');
const liveCtx = liveCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const countdownEl = document.getElementById('countdown');
const aiText = document.getElementById('aiText');
const barFill = document.getElementById('barFill');
const allowBtn = document.getElementById('allowBtn');
const segCanvas = document.createElement('canvas');
const segCtx = segCanvas.getContext('2d');

let stream = null, segmenter = null, rafId = null;
let photoTaken = false, bgReady = false, countingDown = false;
let consecutiveGoodFrames = 0;
let lastMask = null;
let lastResults = null;
let forceTimer = null;

allowBtn.onclick = startApp;

async function startApp() {
  allowBtn.disabled = true;
  allowBtn.textContent = "AI Loading...";
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
    });
    video.srcObject = stream;
    await new Promise(res => video.onloadeddata = res);

    segmenter = new SelfieSegmentation({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${f}`
    });
    segmenter.setOptions({ modelSelection: 1 });
    segmenter.onResults(onSegResult);
    await segmenter.initialize();
    bgReady = true;
    renderLoop();
    speak("Center your face. Head and shoulders only. Keep hands down.");

    forceTimer = setTimeout(() => {
      if (!photoTaken && !countingDown) {
        speak("Taking photo now.");
        beginCountdown();
      }
    }, 12000);

  } catch(e) {
    alert("Camera error: " + e);
    allowBtn.disabled = false;
  }
}

function onSegResult(results) {
  if (photoTaken) return;
  const w = video.videoWidth;
  const h = video.videoHeight;

  segCanvas.width = w;
  segCanvas.height = h;
  segCtx.clearRect(0, 0, w, h);
  segCtx.drawImage(results.segmentationMask, 0, 0, w, h);
  segCtx.globalCompositeOperation = 'source-in';
  segCtx.drawImage(results.image, 0, 0, w, h);
  segCtx.globalCompositeOperation = 'destination-over';
  segCtx.fillStyle = '#ffffff';
  segCtx.fillRect(0, 0, w, h);
  segCtx.globalCompositeOperation = 'source-over';

  lastMask = results.segmentationMask;
  lastResults = results;

  liveCanvas.width = w;
  liveCanvas.height = h;
  liveCtx.clearRect(0, 0, w, h);
  liveCtx.drawImage(segCanvas, 0, 0, w, h);

  validateFrame();
}

function validateFrame() {
  if (photoTaken || countingDown) return;

  const w = video.videoWidth;
  const h = video.videoHeight;

  // CHECK 1: Blur
  const blurScore = detectBlur();
  if (blurScore < 30) {
    setStatus("Hold still — too blurry.", 10);
    consecutiveGoodFrames = 0;
    return;
  }

  // CHECK 2: Full mask analysis
  const mask = analyzeMask(w, h);

  if (!mask.facePresent) {
    setStatus("No face detected. Look at the camera.", 0);
    consecutiveGoodFrames = 0;
    return;
  }

  // HAND CHECK — runs on both mask AND raw pixel color
  if (mask.handsDetected) {
    setStatus("⚠️ Hands visible! Lower your arms completely.", 0);
    consecutiveGoodFrames = 0;
    return;
  }

  if (!mask.properFraming) {
    setStatus(mask.framingMessage, 30);
    consecutiveGoodFrames = 0;
    return;
  }

  consecutiveGoodFrames++;
  const progress = Math.min((consecutiveGoodFrames / 5) * 100, 100);
  setStatus(consecutiveGoodFrames < 5 ? "Good! Hold still..." : "PERFECT. HOLD STILL.", progress);

  if (consecutiveGoodFrames >= 5) {
    beginCountdown();
  }
}

function analyzeMask(w, h) {
  // --- READ MASK PIXELS ---
  const maskOffscreen = document.createElement('canvas');
  maskOffscreen.width = w;
  maskOffscreen.height = h;
  const mCtx = maskOffscreen.getContext('2d');
  mCtx.drawImage(lastMask, 0, 0, w, h);
  const maskData = mCtx.getImageData(0, 0, w, h).data;

  // --- READ RAW VIDEO PIXELS (for skin color detection) ---
  const rawOffscreen = document.createElement('canvas');
  rawOffscreen.width = w;
  rawOffscreen.height = h;
  const rCtx = rawOffscreen.getContext('2d');
  rCtx.drawImage(video, 0, 0, w, h);
  const rawData = rCtx.getImageData(0, 0, w, h).data;

  // Zone boundaries
  const topThird      = Math.floor(h * 0.33);
  const bottomHalf    = Math.floor(h * 0.50); // everything below midpoint
  const leftEdge      = Math.floor(w * 0.20); // left 20%
  const rightEdge     = Math.floor(w * 0.80); // right 80%
  const leftThird     = Math.floor(w * 0.33);
  const rightThird    = Math.floor(w * 0.66);

  let topPersonPixels    = 0;
  let totalPersonPixels  = 0;
  let centerPersonPixels = 0;

  // Hand detection zones — bottom half, and left/right side strips
  let handZonePixels     = 0;  // person pixels in hand-likely zones
  let skinInHandZone     = 0;  // skin-colored pixels in hand zones

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Mask value — use threshold of 100 (not 128) to catch more edge cases
      const isPerson = maskData[idx] > 100;

      if (isPerson) {
        totalPersonPixels++;
        if (y < topThird) topPersonPixels++;
        if (x >= leftThird && x <= rightThird) centerPersonPixels++;

        // HAND ZONE: bottom half of frame + left/right side edges
        const inHandZone = (y > bottomHalf) ||
                           (x < leftEdge && y > topThird) ||
                           (x > rightEdge && y > topThird);

        if (inHandZone) {
          handZonePixels++;

          // Skin color detection in hand zone using raw video pixels
          const r = rawData[idx];
          const g = rawData[idx + 1];
          const b = rawData[idx + 2];

          if (isSkinColor(r, g, b)) {
            skinInHandZone++;
          }
        }
      }
    }
  }

  const personRatio  = totalPersonPixels / (w * h);
  const topRatio     = topPersonPixels / (totalPersonPixels || 1);
  const centerRatio  = centerPersonPixels / (totalPersonPixels || 1);

  // Hand detected if EITHER:
  // 1. Too many person pixels in hand zone (mask-based)
  // 2. Too many skin-colored pixels in hand zone (color-based)
  const handZoneRatio  = handZonePixels / (totalPersonPixels || 1);
  const skinRatio      = skinInHandZone / (w * h);
  const handsDetected  = handZoneRatio > 0.25 || skinInHandZone > (w * h * 0.008);

  const facePresent  = topPersonPixels > (w * topThird * 0.04);
  const properSize   = personRatio > 0.20 && personRatio < 0.75;
  const headAtTop    = topRatio > 0.12;

  let framingMessage = "";
  if (!properSize) {
    framingMessage = personRatio < 0.20 ? "Move closer to the camera." : "Move farther back.";
  } else if (!headAtTop) {
    framingMessage = "Move up — show your head at the top.";
  }

  return {
    facePresent,
    properFraming  : properSize && headAtTop,
    framingMessage,
    faceCenter     : centerRatio > 0.35,
    handsDetected
  };
}

function isSkinColor(r, g, b) {
  // Skin color detection in RGB space
  // Covers a wide range of skin tones — light to dark
  const isRGBSkin = (
    r > 60 && g > 30 && b > 15 &&
    r > g && r > b &&
    Math.abs(r - g) > 10 &&
    r - b > 20
  );

  // YCbCr skin detection — more accurate across skin tones
  const y  =  0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
  const cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;
  const isYCbCrSkin = (cb >= 80 && cb <= 120) && (cr >= 133 && cr <= 173);

  return isRGBSkin || isYCbCrSkin;
}

function detectBlur() {
  const size = 80;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = size;
  sampleCanvas.height = size;
  const ctx = sampleCanvas.getContext('2d');
  const w = video.videoWidth;
  const h = video.videoHeight;
  ctx.drawImage(video, w * 0.25, h * 0.1, w * 0.5, h * 0.5, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size).data;

  const gray = [];
  for (let i = 0; i < pixels.length; i += 4) {
    gray.push(0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2]);
  }

  let sum = 0, sumSq = 0, count = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const lap = -gray[idx - size] - gray[idx - 1] + 4 * gray[idx] - gray[idx + 1] - gray[idx + size];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  const mean = sum / count;
  return (sumSq / count) - (mean * mean);
}

function setStatus(message, progress) {
  aiText.textContent = message;
  barFill.style.width = progress + "%";
  barFill.style.background = progress >= 80 ? '#22c55e' : progress >= 40 ? '#eab308' : '#ef4444';
}

function renderLoop() {
  if (photoTaken) return;
  if (video.readyState >= 2) segmenter.send({ image: video });
  rafId = requestAnimationFrame(renderLoop);
}

function beginCountdown() {
  if (countingDown) return;
  countingDown = true;
  clearTimeout(forceTimer);
  let n = 3;
  countdownEl.textContent = n;
  countdownEl.style.display = 'block';
  speak('3');
  const tick = setInterval(() => {
    n--;
    if (n > 0) {
      countdownEl.textContent = n;
      speak(n.toString());
    } else {
      clearInterval(tick);
      countdownEl.style.display = 'none';
      takePhoto();
    }
  }, 1000);
}

function takePhoto() {
  // Final checks before saving
  const blurScore = detectBlur();
  if (blurScore < 15) {
    countingDown = false;
    consecutiveGoodFrames = 0;
    speak("Too blurry. Hold still, trying again.");
    setStatus("Too blurry! Hold still.", 0);
    setTimeout(() => beginCountdown(), 2000);
    return;
  }

  // Final hand check — if hands still visible abort and retry
  const mask = analyzeMask(video.videoWidth, video.videoHeight);
  if (mask.handsDetected) {
    countingDown = false;
    consecutiveGoodFrames = 0;
    speak("Hands still visible. Lower your arms.");
    setStatus("⚠️ Hands visible! Lower your arms.", 0);
    return; // Don't auto retry — wait for user to fix it
  }

  photoTaken = true;
  document.getElementById('flash').style.opacity = '1';
  setTimeout(() => document.getElementById('flash').style.opacity = '0', 150);

  resultCanvas.width = 600;
  resultCanvas.height = 600;
  const rCtx = resultCanvas.getContext('2d');
  rCtx.fillStyle = '#ffffff';
  rCtx.fillRect(0, 0, 600, 600);

  const w = segCanvas.width;
  const h = segCanvas.height;
  const side = Math.min(w, h) * 0.85;
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  rCtx.drawImage(segCanvas, sx, sy, side, side, 0, 0, 600, 600);
  forceWhiteBackground(rCtx, 600, 600);

  document.getElementById('cameraInterface').style.display = 'none';
  document.getElementById('resultSection').style.display = 'block';
  if (stream) stream.getTracks().forEach(t => t.stop());
  speak("Perfect. Download your passport photo.");
}

function forceWhiteBackground(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
      data[i] = 255;
      data[i+1] = 255;
      data[i+2] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function downloadPhoto() {
  const link = document.createElement('a');
  link.download = 'Passport-Photo.jpg';
  link.href = resultCanvas.toDataURL('image/jpeg', 0.97);
  link.click();
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(u);
}