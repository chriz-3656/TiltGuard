# TiltGuard

TiltGuard is a mobile-first Progressive Web App (PWA) that simulates a privacy screen for sensitive content.
It uses device tilt + front camera face count to determine when Privacy Mode should activate.

When risk is detected, the app blacks out the notification card and shows a privacy status pill while keeping debug information visible.

## Latest Upgrades and Fixes

- Added **fullscreen toggle** (`Fullscreen: ON/OFF`) with browser fallback support
- Switched UI to **single-page, no-scroll layout** (`100dvh`, compact controls)
- Redesigned notification card to look more realistic:
  - app label + time meta row
  - sender line
  - message preview body
- Added a **custom notification settings page** (`/settings.html`)
- Added navigation button on home page: **Customize Notification**
- Added persistent custom notification storage via `localStorage`
- Added live preview + save/reset behavior on settings page
- Improved PWA launch reliability:
  - manifest `id` + `start_url` use root `/`
  - service worker navigation fallback to app shell
- Updated service-worker cache to include new page/assets (`tiltguard-v7`)

## Core Features

- Real-time tilt detection (`gamma`, `beta`) via `DeviceOrientationEvent`
- Real-time face counting via front camera
- Face detection engine strategy:
  - primary: `face-api.js` TinyFaceDetector
  - fallback: native `FaceDetector`
- Privacy mode triggers when:
  - tilt is unsafe, or
  - multiple faces are detected
- Privacy mode behavior:
  - notification card blacked out
  - privacy badge visible
  - debug dashboard remains visible

## Tilt Logic (Handheld Friendly)

TiltGuard uses a mid-range model (not strict absolute thresholds) to better match natural phone grip.

- Smoothed sensor values (`SMOOTHING_ALPHA`)
- Sensitivity profiles with hysteresis:
  - `Relaxed`
  - `Balanced`
  - `Strict`
- Separate enter/exit ranges (`activate` / `clear`)
- Hold posture calibration with offset support

## Runtime Controls

Main page controls:

- `Enable Privacy Protection`
- `Sensitivity` selector
- `Calibrate Hold`
- `Camera Preview: ON/OFF`
- `Reset Calibration`
- `Fullscreen: ON/OFF`
- `Customize Notification` (navigation to settings page)

Settings page controls:

- App name
- Sender
- Message
- Time label
- Save
- Reset Default
- Back to main

## Debug Dashboard Fields

- System
- Face Engine
- Sensitivity
- Tilt X (gamma)
- Tilt Y (beta)
- Faces Detected
- Privacy Mode
- Privacy Reason

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
├── settings.html
├── settings.js
└── style.css
```

## Key JavaScript Functions

Detection and privacy:

- `initCamera()`
- `initSensors()`
- `detectTilt()`
- `detectFaces()`
- `activatePrivacyMode()`
- `deactivatePrivacyMode()`

Controls and UX:

- `onSensitivityChange()`
- `calibrateHoldPosition()`
- `resetCalibration()`
- `toggleCameraPreview()`
- `toggleFullscreen()`

Notification settings:

- `loadNotificationSettings()`
- `applyNotificationSettings()`

## Permission Flow

After tapping **Enable Privacy Protection**:

1. Motion permission (including iOS request flow)
2. Camera permission
3. Face engine initialization
4. Continuous tilt + face detection loop

If setup fails, system state is shown in dashboard and user can retry.

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

- Cache version: `tiltguard-v7`
- Pre-caches:
  - `/`
  - `/index.html`
  - `/settings.html`
  - `/style.css`
  - `/script.js`
  - `/settings.js`
  - `/manifest.json`
  - app icons
- Opportunistically caches face model files
- Navigation fallback serves cached shell when network fails

## Face Model Files (Optional)

For `face-api.js` TinyFaceDetector, place in `models/`:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

Source:

- https://github.com/justadudewhohacks/face-api.js/tree/master/weights

If not present, app attempts native `FaceDetector`.

## Local Run

```bash
python3 -m http.server 8080
```

Open:

- `http://localhost:8080`

## Install as PWA

Android Chrome:

1. Open hosted HTTPS URL
2. Menu -> Install app / Add to Home screen
3. Launch from home screen

iOS Safari:

1. Open hosted HTTPS URL
2. Share -> Add to Home Screen
3. Launch from home screen

If old installs behave incorrectly after updates, uninstall and reinstall.

## Test Checklist

- Permissions granted and protection starts
- Natural handheld posture stays visible
- Extreme tilt triggers Privacy Mode
- Multiple faces trigger Privacy Mode
- Notification card blackouts in Privacy Mode
- Dashboard always remains visible
- Fullscreen toggle works
- Notification customization persists across reloads
- Settings page works offline after first cache

## Privacy Notes

- Processing is client-side only
- No backend required
- Camera data is not uploaded by app code
