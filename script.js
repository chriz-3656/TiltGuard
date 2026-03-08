const TILT_GAMMA_LIMIT = 25;
const TILT_BETA_LIMIT = 30;
const FACE_SCAN_INTERVAL_MS = 900;

const state = {
  tiltGamma: 0,
  tiltBeta: 0,
  facesDetected: 0,
  tiltTriggered: false,
  faceTriggered: false,
  privacyMode: false,
  cameraStream: null,
  faceTimerId: null,
  initialized: false,
  faceEngine: "none",
  nativeFaceDetector: null,
};

const ui = {
  app: document.getElementById("app"),
  enableBtn: document.getElementById("enableBtn"),
  tiltX: document.getElementById("tiltX"),
  tiltY: document.getElementById("tiltY"),
  faces: document.getElementById("faces"),
  privacyStatus: document.getElementById("privacyStatus"),
  cameraFeed: document.getElementById("cameraFeed"),
};

ui.enableBtn.addEventListener("click", enableProtection);
window.addEventListener("beforeunload", cleanup);

registerServiceWorker();

async function enableProtection() {
  if (state.initialized) {
    return;
  }

  ui.enableBtn.disabled = true;
  ui.enableBtn.textContent = "Starting...";

  try {
    await requestMotionPermission();
    await initSensors();
    await initCamera();
    await loadFaceModel();
    startFaceDetectionLoop();

    state.initialized = true;
    ui.enableBtn.textContent = "Protection Enabled";
  } catch (error) {
    console.error(error);
    ui.enableBtn.disabled = false;
    ui.enableBtn.textContent = "Enable Privacy Protection";
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
  state.tiltGamma = Number.isFinite(event.gamma) ? event.gamma : 0;
  state.tiltBeta = Number.isFinite(event.beta) ? event.beta : 0;

  state.tiltTriggered =
    Math.abs(state.tiltGamma) > TILT_GAMMA_LIMIT || Math.abs(state.tiltBeta) > TILT_BETA_LIMIT;

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
      return;
    } catch (error) {
      console.warn("face-api model load failed. Trying native FaceDetector fallback.", error);
    }
  }

  if ("FaceDetector" in window) {
    state.nativeFaceDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    state.faceEngine = "native";
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
