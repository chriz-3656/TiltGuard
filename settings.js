const STORAGE_KEY = "tiltguard_notification_v1";

const DEFAULTS = {
  app: "Messages",
  title: "Alex",
  text: "Are we meeting at 5 PM? I can share the location.",
  time: "now",
};

const ui = {
  appInput: document.getElementById("appInput"),
  senderInput: document.getElementById("senderInput"),
  messageInput: document.getElementById("messageInput"),
  timeInput: document.getElementById("timeInput"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  previewApp: document.getElementById("previewApp"),
  previewTitle: document.getElementById("previewTitle"),
  previewText: document.getElementById("previewText"),
  previewTime: document.getElementById("previewTime"),
};

ui.saveBtn.addEventListener("click", saveSettings);
ui.resetBtn.addEventListener("click", resetSettings);
ui.appInput.addEventListener("input", updatePreviewFromInputs);
ui.senderInput.addEventListener("input", updatePreviewFromInputs);
ui.messageInput.addEventListener("input", updatePreviewFromInputs);
ui.timeInput.addEventListener("input", updatePreviewFromInputs);

init();

function init() {
  const settings = loadSettings();
  ui.appInput.value = settings.app;
  ui.senderInput.value = settings.title;
  ui.messageInput.value = settings.text;
  ui.timeInput.value = settings.time;
  applyPreview(settings);
}

function saveSettings() {
  const settings = collectInputs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applyPreview(settings);
}

function resetSettings() {
  localStorage.removeItem(STORAGE_KEY);
  ui.appInput.value = DEFAULTS.app;
  ui.senderInput.value = DEFAULTS.title;
  ui.messageInput.value = DEFAULTS.text;
  ui.timeInput.value = DEFAULTS.time;
  applyPreview(DEFAULTS);
}

function collectInputs() {
  return {
    app: sanitize(ui.appInput.value, DEFAULTS.app),
    title: sanitize(ui.senderInput.value, DEFAULTS.title),
    text: sanitize(ui.messageInput.value, DEFAULTS.text),
    time: sanitize(ui.timeInput.value, DEFAULTS.time),
  };
}

function updatePreviewFromInputs() {
  applyPreview(collectInputs());
}

function applyPreview(settings) {
  ui.previewApp.textContent = settings.app;
  ui.previewTitle.textContent = settings.title;
  ui.previewText.textContent = settings.text;
  ui.previewTime.textContent = settings.time;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }

    const parsed = JSON.parse(raw);
    return {
      app: sanitize(parsed.app, DEFAULTS.app),
      title: sanitize(parsed.title, DEFAULTS.title),
      text: sanitize(parsed.text, DEFAULTS.text),
      time: sanitize(parsed.time, DEFAULTS.time),
    };
  } catch (error) {
    console.error("Failed to parse saved notification settings", error);
    return { ...DEFAULTS };
  }
}

function sanitize(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
