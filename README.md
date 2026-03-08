# TiltGuard

TiltGuard is a mobile-first Progressive Web App (PWA) that simulates a smartphone privacy screen.

The app monitors:

- Device tilt (`gamma`, `beta`) using motion/orientation sensors
- Viewer count using front camera face detection

When unsafe conditions are detected, TiltGuard automatically enables Privacy Mode and obscures visible content.

## What It Does

- Activates privacy protection when:
- `|gamma| > 25` degrees (left/right tilt)
- OR `|beta| > 30` degrees (front/back tilt)
- OR more than one face is detected
- Deactivates privacy protection when tilt is safe and only one (or zero) face is present
- Applies visual protection effects:
- `filter: blur(10px) brightness(0.2)`
- dark overlay with `"🔒 Privacy Mode Active"`
- Includes a realistic fake notification card for demo realism
- Shows live debug dashboard values for tilt, face count, and mode status

## Tech Stack

- HTML5, CSS3, JavaScript (ES6)
- DeviceOrientationEvent API
- MediaDevices `getUserMedia` (front camera)
- `face-api.js` TinyFaceDetector (primary face engine)
- Native `FaceDetector` API fallback when model files are unavailable
- Web App Manifest + Service Worker for installability/offline usage

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

## Core Modules

- `initSensors()`
- Subscribes to `deviceorientation` events
- `detectTilt(event)`
- Updates `gamma`/`beta`, evaluates tilt trigger thresholds
- `initCamera()`
- Requests front camera access and binds stream to hidden preview video
- `loadFaceModel()`
- Loads `face-api.js` TinyFaceDetector from `/models`
- Falls back to native `FaceDetector` where supported
- `detectFaces()`
- Runs periodic face detection and updates trigger state
- `activatePrivacyMode()` / `deactivatePrivacyMode()`
- Toggles blur/dim/overlay UI state

## Permissions Flow

User taps **Enable Privacy Protection** button:

1. Motion/orientation permission request (iOS Safari path included)
2. Front camera permission request
3. Face engine initialization
4. Continuous tilt + face monitoring starts

If permissions are denied, protection is not enabled and user is prompted.

## PWA Details

`manifest.json`:

- `name`: `TiltGuard`
- `short_name`: `TiltGuard`
- `display`: `standalone`
- `theme_color`: `#000000`
- `background_color`: `#000000`
- Icons:
- `192x192`
- `512x512`

`service-worker.js`:

- Pre-caches app shell files:
- `/index.html`
- `/style.css`
- `/script.js`
- `/manifest.json`
- app icons
- Opportunistically caches face model files if present
- Cache-first strategy for offline load after first visit

## Face Model Files (Optional but Recommended)

To use `face-api.js` TinyFaceDetector, download and place these files inside `models/`:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

Source:

- https://github.com/justadudewhohacks/face-api.js/tree/master/weights

If these files are missing, TiltGuard attempts to use the browser's native `FaceDetector` API instead.

## Local Development

From project root:

```bash
python3 -m http.server 8080
```

Open:

- `http://localhost:8080`

Then tap **Enable Privacy Protection** and grant permissions.

## Install on Mobile (PWA)

### Android (Chrome)

1. Host over HTTPS (or use localhost during development)
2. Open app URL in Chrome
3. Tap menu -> **Install app** / **Add to Home screen**
4. Launch from home screen in standalone mode

### iOS (Safari)

1. Host over HTTPS
2. Open app URL in Safari
3. Share -> **Add to Home Screen**
4. Launch from home screen

## Testing Checklist

- Tilt phone past threshold -> Privacy Mode ON
- Return upright -> Privacy Mode OFF (if face count <= 1)
- Add second visible person in frame -> Privacy Mode ON
- Disable second viewer -> Privacy Mode OFF (if tilt safe)
- Reload offline after first load -> app shell still opens

## Browser Notes

- Best target: modern Android Chrome
- iOS Safari motion permission requires user gesture and explicit permission flow
- Camera access requires secure context (`https://` or `localhost`)
- Native `FaceDetector` support varies by browser/version

## Security and Privacy Notes

- Camera stream is processed client-side in browser runtime
- No backend and no data upload in this demo
- Service worker caches static assets for offline use

## Future Improvements

- Adjustable tilt sensitivity controls
- User-defined privacy intensity (blur/brightness)
- Better anti-spoofing face confidence handling
- Battery-aware adaptive scan intervals
- Accessibility settings for overlay and announcements
