// MÁ FAMA - Settings Manager
// Handles user preferences with LocalStorage persistence and audio/visual reactivity

const SETTINGS_KEY = "ma_fama_user_settings_v1";

export const DEFAULT_SETTINGS = {
  masterVolume: 80,
  musicVolume: 60,
  sfxVolume: 75,
  ambienceVolume: 45,
  assistantLevel: "estrategico", // "aprendiz" | "estrategico" | "desativado"
  showHintButton: true,
  animations: "normal" // "normal" | "reduced"
};

export class SettingsManager {
  constructor(audioManager) {
    this.audio = audioManager;
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn("Could not load settings from localStorage:", e);
    }
    this.applyAll();
  }

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Could not save settings to localStorage:", e);
    }
    this.notify();
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.applySetting(key, value);
    this.save();
  }

  applyAll() {
    Object.keys(this.settings).forEach(key => {
      this.applySetting(key, this.settings[key]);
    });
    this.notify();
  }

  applySetting(key, value) {
    if (!this.audio) return;

    switch (key) {
      case "masterVolume":
        this.audio.setChannelVolume("master", value / 100);
        break;
      case "musicVolume":
        this.audio.setChannelVolume("music", value / 100);
        break;
      case "sfxVolume": {
        const norm = value / 100;
        this.audio.setChannelVolume("cards", norm);
        this.audio.setChannelVolume("ui", norm);
        this.audio.setChannelVolume("abilities", norm);
        this.audio.setChannelVolume("stingers", norm);
        break;
      }
      case "ambienceVolume":
        this.audio.setChannelVolume("ambience", value / 100);
        break;
      case "animations":
        if (value === "reduced") {
          document.body.classList.add("reduced-motion");
        } else {
          document.body.classList.remove("reduced-motion");
        }
        break;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.settings); } catch (e) { console.error(e); }
    });
  }

  exportConfigString() {
    return JSON.stringify(this.settings, null, 2);
  }
}
