# TiltGuard

TiltGuard is a mobile-first Progressive Web App (PWA) that protects sensitive on-screen content by monitoring phone orientation and front-camera face count.

When risk is detected (unsafe tilt or multiple viewers), the app enters Privacy Mode and blacks out the notification card while keeping the debug dashboard visible.

## Key Features

- Real-time tilt detection using `DeviceOrientationEvent` (`gamma`, `beta`)
- Real-time face counting from front camera
- Face engine fallback strategy:
  - Primary: `face-api.js` TinyFaceDetector
  - Fallback: browser-native `FaceDetector` API
- Privacy trigger logic based on either:
  - unsafe tilt, or
  - more than one detected face
- Privacy Mode UX:
  - notification card is blacked out
  - persistent privacy pill: `🔒 Privacy Mode Active`
  - debug dashboard remains readable
- Calibration and control tools:
  - Sensitivity presets: `Relaxed`, `Balanced`, `Strict`
  - `Calibrate Hold` button for natural hand posture
  - `Reset Calibration` button
  - `Camera Preview: ON/OFF` toggle
- Rich dashboard status fields:
  - `System`
  - `Face Engine`
  - `Sensitivity`
  - `Tilt X`, `Tilt Y`
  - `Faces Detected`
  - `Privacy Mode`
  - `Privacy Reason`
- Installable PWA with offline caching

## Current Tilt Model

TiltGuard now uses a handheld-friendly mid-range tilt model instead of strict absolute thresholds.

- Smoothed orientation input (`SMOOTHING_ALPHA`)
- Sensitivity profiles with hysteresis:
  - `activate` thresholds (enter Privacy Mode)
  - `clear` thresholds (exit Privacy Mode)
- Optional hold calibration offsets to normalize to user grip

This prevents false positives where natural handheld `beta` values were previously treated as unsafe.

## Project Structure

```text
.
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── models/
│   └── .gitkeep
├── index.html
├── manifest.json
├── README.md
├── script.js
├── service-worker.js
└── style.css
```

## Core JavaScript Functions

- `initCamera()`
- `initSensors()`
- `detectTilt()`
- `detectFaces()`
- `activatePrivacyMode()`
- `deactivatePrivacyMode()`

Supporting controls:

- `onSensitivityChange()`
- `calibrateHoldPosition()`
- `resetCalibration()`
- `toggleCameraPreview()`

## Permission Flow

User taps **Enable Privacy Protection**:

1. Motion/orientation permission is requested (including iOS Safari flow)
2. Front camera permission is requested
3. Face engine is initialized (`face-api.js` or native fallback)
4. Continuous tilt + face checks begin

If permission/setup fails, app state updates in dashboard and the enable button resets.

## PWA Configuration

### `manifest.json`

- `name`: `TiltGuard`
- `short_name`: `TiltGuard`
- `id`: `/`
- `start_url`: `/`
- `scope`: `/`
- `display`: `standalone`
- `theme_color`: `#000000`
- `background_color`: `#000000`
- icons: `192x192`, `512x512`

### `service-worker.js`

- Cache version: `tiltguard-v5`
- Pre-caches app shell:
  - `/`
  - `/index.html`
  - `/style.css`
  - `/script.js`
  - `/manifest.json`
  - `/icons/icon-192.png`
  - `/icons/icon-512.png`
- Opportunistically caches face model files
- Navigation fallback returns cached app shell when network fails

## Face Model Files (Optional, Recommended)

To enable `face-api.js` TinyFaceDetector fully, add these files into `models/`:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

Download source:

- https://github.com/justadudewhohacks/face-api.js/tree/master/weights

If unavailable, TiltGuard attempts native `FaceDetector`.

## Local Development

Run a local server from project root:

```bash
python3 -m http.server 8080
```

Open:

- `http://localhost:8080`

Tap **Enable Privacy Protection** and allow camera + motion permissions.

## Install as PWA

### Android (Chrome)

1. Open hosted HTTPS URL
2. Chrome menu -> **Install app** / **Add to Home screen**
3. Launch from home screen

### iOS (Safari)

1. Open hosted HTTPS URL
2. Share -> **Add to Home Screen**
3. Launch from home screen

If an older installed version behaves incorrectly after updates, uninstall and reinstall the PWA to refresh manifest/start URL behavior.

## Validation Checklist

- App enables after permissions are granted
- Natural handheld posture remains visible
- Extreme tilt triggers Privacy Mode
- Multiple faces trigger Privacy Mode
- Notification card blacks out in Privacy Mode
- Dashboard remains visible in all states
- Camera preview toggle affects only preview visibility, not detection loop
- App opens offline after first successful load

## Browser Notes

- Best target: Android Chrome (latest)
- iOS Safari requires user gesture for sensor permission
- Camera requires secure context (`https://` or `localhost`)
- Native `FaceDetector` support varies by browser

## Privacy Notes

- Processing is client-side in browser
- No backend in this project
- No camera data is uploaded by app logic
