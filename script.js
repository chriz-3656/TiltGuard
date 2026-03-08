const FACE_SCAN_INTERVAL_MS = 900;
const SMOOTHING_ALPHA = 0.22;

const TILT_PROFILES = {
  relaxed: {
    activate: { gammaMax: 40, betaMin: 10, betaMax: 108 },
    clear: { gammaMax: 34, betaMin: 16, betaMax: 100 },
  },
  balanced: {
    activate: { gammaMax: 36, betaMin: 14, betaMax: 102 },
    clear: { gammaMax: 30, betaMin: 20, betaMax: 96 },
  },
  strict: {
    activate: { gammaMax: 30, betaMin: 18, betaMax: 94 },
    clear: { gammaMax: 26, betaMin: 22, betaMax: 90 },
  },
};

const state = {
  tiltGamma: 0,
  tiltBeta: 0,
  facesDetected: 0,
  tiltTriggered: false,
  faceTriggered: false,
  privacyMode: false,
  privacyReason: "None",
  cameraStream: null,
  faceTimerId: null,
  initialized: false,
  faceEngine: "none",
  nativeFaceDetector: null,
  smoothedGamma: 0,
  smoothedBeta: 0,
  sensitivity: "balanced",
  betaOffset: 0,
  gammaOffset: 0,
  cameraPreviewVisible: true,
  systemState: "Idle",
};

const ui = {
  app: document.getElementById("app"),
  enableBtn: document.getElementById("enableBtn"),
  tiltX: document.getElementById("tiltX"),
  tiltY: document.getElementById("tiltY"),
  faces: document.getElementById("faces"),
  privacyStatus: document.getElementById("privacyStatus"),
  privacyReason: document.getElementById("privacyReason"),
  systemState: document.getElementById("systemState"),
  engineState: document.getElementById("engineState"),
  sensitivityState: document.getElementById("sensitivityState"),
  cameraFeed: document.getElementById("cameraFeed"),
  sensitivitySelect: document.getElementById("sensitivitySelect"),
  calibrateBtn: document.getElementById("calibrateBtn"),
  previewToggleBtn: document.getElementById("previewToggleBtn"),
  resetCalibrateBtn: document.getElementById("resetCalibrateBtn"),
};

ui.enableBtn.addEventListener("click", enableProtection);
ui.sensitivitySelect.addEventListener("change", onSensitivityChange);
ui.calibrateBtn.addEventListener("click", calibrateHoldPosition);
ui.previewToggleBtn.addEventListener("click", toggleCameraPreview);
ui.resetCalibrateBtn.addEventListener("click", resetCalibration);
window.addEventListener("beforeunload", cleanup);

registerServiceWorker();

async function enableProtection() {
  if (state.initialized) {
    return;
  }

  ui.enableBtn.disabled = true;
  ui.enableBtn.textContent = "Starting...";
  state.systemState = "Requesting permissions";
  updateDashboard();

  try {
    await requestMotionPermission();
    await initSensors();
    await initCamera();
    await loadFaceModel();
    startFaceDetectionLoop();

    state.initialized = true;
    state.systemState = "Protection active";
    ui.enableBtn.textContent = "Protection Enabled";
    updateDashboard();
  } catch (error) {
    console.error(error);
    state.systemState = "Permission/setup failed";
    ui.enableBtn.disabled = false;
    ui.enableBtn.textContent = "Enable Privacy Protection";
    updateDashboard();
    alert("Could not enable all permissions/features. Please allow camera and motion access.");
  }
}

async function requestMotionPermission() {
  // iOS Safari requires an explicit user gesture + permission call.
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const response = await DeviceOrientationEvent.requestPermission();
    if (response !== "granted") {
      throw new Error("Device orientation permission denied");
    }
  }
}

async function initSensors() {
  if (typeof window.DeviceOrientationEvent === "undefined") {
    throw new Error("Device orientation API unavailable");
  }

  window.addEventListener("deviceorientation", detectTilt, { passive: true });
}

function detectTilt(event) {
  const rawGamma = Number.isFinite(event.gamma) ? event.gamma : 0;
  const rawBeta = Number.isFinite(event.beta) ? event.beta : 0;

  state.tiltGamma = rawGamma;
  state.tiltBeta = rawBeta;

  state.smoothedGamma =
    state.smoothedGamma + SMOOTHING_ALPHA * (rawGamma - state.smoothedGamma);
  state.smoothedBeta = state.smoothedBeta + SMOOTHING_ALPHA * (rawBeta - state.smoothedBeta);

  const adjustedGamma = state.smoothedGamma - state.gammaOffset;
  const adjustedBeta = state.smoothedBeta - state.betaOffset;
  const profile = TILT_PROFILES[state.sensitivity];
  const limits = state.privacyMode ? profile.clear : profile.activate;

  const gammaUnsafe = Math.abs(adjustedGamma) > limits.gammaMax;
  const betaUnsafe = adjustedBeta < limits.betaMin || adjustedBeta > limits.betaMax;
  state.tiltTriggered = gammaUnsafe || betaUnsafe;

  updateDashboard();
  evaluatePrivacyMode();
}

async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });

  state.cameraStream = stream;
  ui.cameraFeed.srcObject = stream;
  await ui.cameraFeed.play();
}

async function loadFaceModel() {
  if (window.faceapi) {
    try {
      // TinyFaceDetector is lightweight and works well on mobile for basic counting.
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      state.faceEngine = "face-api";
      updateDashboard();
      return;
    } catch (error) {
      console.warn("face-api model load failed. Trying native FaceDetector fallback.", error);
    }
  }

  if ("FaceDetector" in window) {
    state.nativeFaceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    state.faceEngine = "native";
    updateDashboard();
    return;
  }

  throw new Error("No supported face detection engine available");
}

function startFaceDetectionLoop() {
  detectFaces();
  state.faceTimerId = window.setInterval(detectFaces, FACE_SCAN_INTERVAL_MS);
}

async function detectFaces() {
  if (!state.cameraStream || ui.cameraFeed.readyState < 2) {
    return;
  }

  try {
    let detections = [];

    if (state.faceEngine === "face-api") {
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.45,
      });
      detections = await faceapi.detectAllFaces(ui.cameraFeed, detectorOptions);
    } else if (state.faceEngine === "native" && state.nativeFaceDetector) {
      detections = await state.nativeFaceDetector.detect(ui.cameraFeed);
    }

    state.facesDetected = detections.length;
    state.faceTriggered = state.facesDetected > 1;
  } catch (error) {
    console.error("Face detection failed:", error);
    state.facesDetected = 0;
    state.faceTriggered = false;
  }

  updateDashboard();
  evaluatePrivacyMode();
}

function evaluatePrivacyMode() {
  if (state.faceTriggered) {
    state.privacyReason = "Multiple faces";
  } else if (state.tiltTriggered) {
    state.privacyReason = "Unsafe tilt angle";
  } else {
    state.privacyReason = "None";
  }

  if (state.tiltTriggered || state.faceTriggered) {
    activatePrivacyMode();
    return;
  }

  deactivatePrivacyMode();
}

function activatePrivacyMode() {
  if (state.privacyMode) {
    return;
  }

  state.privacyMode = true;
  ui.app.classList.add("privacy-active");
  updateDashboard();
}

function deactivatePrivacyMode() {
  if (!state.privacyMode) {
    return;
  }

  state.privacyMode = false;
  ui.app.classList.remove("privacy-active");
  updateDashboard();
}

function updateDashboard() {
  ui.tiltX.textContent = state.tiltGamma.toFixed(1);
  ui.tiltY.textContent = state.tiltBeta.toFixed(1);
  ui.faces.textContent = String(state.facesDetected);
  ui.privacyStatus.textContent = state.privacyMode ? "ON" : "OFF";
  ui.privacyReason.textContent = state.privacyReason;
  ui.systemState.textContent = state.systemState;
  ui.engineState.textContent =
    state.faceEngine === "none" ? "Not loaded" : state.faceEngine.toUpperCase();
  ui.sensitivityState.textContent =
    state.sensitivity.charAt(0).toUpperCase() + state.sensitivity.slice(1);
  ui.previewToggleBtn.textContent = `Camera Preview: ${state.cameraPreviewVisible ? "ON" : "OFF"}`;
}

function onSensitivityChange(event) {
  state.sensitivity = event.target.value in TILT_PROFILES ? event.target.value : "balanced";
  updateDashboard();
}

function calibrateHoldPosition() {
  // Offsets around current posture so natural holding angles are treated as neutral.
  state.gammaOffset = state.smoothedGamma;
  state.betaOffset = state.smoothedBeta - 35;
  state.systemState = "Calibrated for current hold";
  updateDashboard();
}

function resetCalibration() {
  state.gammaOffset = 0;
  state.betaOffset = 0;
  state.systemState = "Calibration reset";
  updateDashboard();
}

function toggleCameraPreview() {
  state.cameraPreviewVisible = !state.cameraPreviewVisible;
  ui.cameraFeed.classList.toggle("preview-hidden", !state.cameraPreviewVisible);
  updateDashboard();
}

function cleanup() {
  window.removeEventListener("deviceorientation", detectTilt);

  if (state.faceTimerId) {
    clearInterval(state.faceTimerId);
    state.faceTimerId = null;
  }

  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}
