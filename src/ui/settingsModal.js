// MÁ FAMA - Settings Modal UI
// Elegant noir settings panel with live sliders, audio control, assistant preferences, and animations

import { ICONS } from "./icons.js";

export class SettingsModal {
  constructor(settingsManager, audioManager) {
    this.settings = settingsManager;
    this.audio = audioManager;
    this.modalEl = null;

    this.render();
    this.bindEvents();
    this.updateValues();
  }

  render() {
    this.modalEl = document.createElement("div");
    this.modalEl.className = "modal-overlay settings-modal-overlay";
    this.modalEl.id = "settings-modal";
    this.modalEl.innerHTML = `
      <div class="settings-modal-box">
        <div class="settings-header">
          <div class="settings-title-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--gold-bright)" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <h2>CONFIGURAÇÕES</h2>
          </div>
          <button class="settings-close-btn" id="btn-close-settings" title="Fechar">×</button>
        </div>

        <div class="settings-content-scroll">
          <!-- Áudio Section -->
          <div class="settings-section">
            <h3 class="section-title">ÁUDIO E ACÚSTICA CLANDESTINA</h3>
            
            <div class="setting-slider-row">
              <div class="slider-info">
                <span class="slider-label">Volume geral</span>
                <span class="slider-val" id="val-master">80%</span>
              </div>
              <input type="range" class="settings-range" id="slider-master" min="0" max="100" value="80">
            </div>

            <div class="setting-slider-row">
              <div class="slider-info">
                <span class="slider-label">Música (Jazz Noir & Clássica)</span>
                <span class="slider-val" id="val-music">60%</span>
              </div>
              <input type="range" class="settings-range" id="slider-music" min="0" max="100" value="60">
            </div>

            <div class="setting-slider-row">
              <div class="slider-info">
                <span class="slider-label">Efeitos sonoros (Cartas & Fichas)</span>
                <span class="slider-val" id="val-sfx">75%</span>
              </div>
              <input type="range" class="settings-range" id="slider-sfx" min="0" max="100" value="75">
            </div>

            <div class="setting-slider-row">
              <div class="slider-info">
                <span class="slider-label">Som ambiente (Chuva & Vinil)</span>
                <span class="slider-val" id="val-ambience">45%</span>
              </div>
              <input type="range" class="settings-range" id="slider-ambience" min="0" max="100" value="45">
            </div>
          </div>

          <!-- Assistente de Jogadas Section -->
          <div class="settings-section">
            <h3 class="section-title">CONSELHEIRO DE MESA</h3>
            
            <div class="radio-options-grid">
              <label class="setting-radio-card" id="card-asst-aprendiz">
                <input type="radio" name="assistant-level" value="aprendiz">
                <div class="radio-card-body">
                  <div class="r-title">Aprendiz</div>
                  <div class="r-desc">Explica as regras, hierarquia, valores de cartas e manilhas passo a passo.</div>
                </div>
              </label>

              <label class="setting-radio-card" id="card-asst-estrategico">
                <input type="radio" name="assistant-level" value="estrategico" checked>
                <div class="radio-card-body">
                  <div class="r-title">Estratégico</div>
                  <div class="r-desc">Recomenda a melhor carta e explica a tática da vaza e blefe.</div>
                </div>
              </label>

              <label class="setting-radio-card" id="card-asst-desativado">
                <input type="radio" name="assistant-level" value="desativado">
                <div class="radio-card-body">
                  <div class="r-title">Desativado</div>
                  <div class="r-desc">A mesa fica limpa, sem sugestões ou explicações adicionais.</div>
                </div>
              </label>
            </div>

            <label class="setting-checkbox-row">
              <input type="checkbox" id="check-show-hint" checked>
              <span>Mostrar o botão DICA durante a partida</span>
            </label>
          </div>

          <!-- Animações Section -->
          <div class="settings-section">
            <h3 class="section-title">ANIMAÇÕES E FLUIDEZ</h3>
            <div class="radio-options-row">
              <label class="setting-radio-pill" id="pill-anim-normal">
                <input type="radio" name="anim-speed" value="normal" checked>
                <span>Normais (Pouso de cartas e leque orgânico)</span>
              </label>
              <label class="setting-radio-pill" id="pill-anim-reduced">
                <input type="radio" name="anim-speed" value="reduced">
                <span>Reduzidas (Mais rápido e acessível)</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="settings-footer">
          <button class="btn-copy-config" id="btn-copy-config">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span id="btn-copy-txt">Copiar esta configuração</span>
          </button>
          <button class="btn-primary" id="btn-save-settings">CONCLUÍDO</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
  }

  bindEvents() {
    const el = this.modalEl;

    // Sliders
    const sMaster = el.querySelector("#slider-master");
    const sMusic = el.querySelector("#slider-music");
    const sSfx = el.querySelector("#slider-sfx");
    const sAmbience = el.querySelector("#slider-ambience");

    const vMaster = el.querySelector("#val-master");
    const vMusic = el.querySelector("#val-music");
    const vSfx = el.querySelector("#val-sfx");
    const vAmbience = el.querySelector("#val-ambience");

    sMaster.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      vMaster.textContent = `${val}%`;
      this.settings.set("masterVolume", val);
    });

    sMusic.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      vMusic.textContent = `${val}%`;
      this.settings.set("musicVolume", val);
    });

    sSfx.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      vSfx.textContent = `${val}%`;
      this.settings.set("sfxVolume", val);
      if (this.audio) this.audio.playChips();
    });

    sAmbience.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      vAmbience.textContent = `${val}%`;
      this.settings.set("ambienceVolume", val);
    });

    // Radios Assistant
    const radiosAsst = el.querySelectorAll('input[name="assistant-level"]');
    radiosAsst.forEach(r => {
      r.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.settings.set("assistantLevel", e.target.value);
          this.updateActiveRadioStyles();
          if (this.audio) this.audio.playCardSelect();
        }
      });
    });

    // Checkbox Hint
    const checkHint = el.querySelector("#check-show-hint");
    checkHint.addEventListener("change", (e) => {
      this.settings.set("showHintButton", e.target.checked);
      if (this.audio) this.audio.playChips();
    });

    // Radios Animations
    const radiosAnim = el.querySelectorAll('input[name="anim-speed"]');
    radiosAnim.forEach(r => {
      r.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.settings.set("animations", e.target.value);
          if (this.audio) this.audio.playCardSelect();
        }
      });
    });

    // Copy Config
    const btnCopy = el.querySelector("#btn-copy-config");
    const txtCopy = el.querySelector("#btn-copy-txt");
    btnCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(this.settings.exportConfigString()).then(() => {
        txtCopy.textContent = "Configuração copiada!";
        if (this.audio) this.audio.playChips();
        setTimeout(() => {
          txtCopy.textContent = "Copiar esta configuração";
        }, 2200);
      });
    });

    // Close / Save
    el.querySelector("#btn-close-settings").addEventListener("click", () => this.hide());
    el.querySelector("#btn-save-settings").addEventListener("click", () => {
      if (this.audio) this.audio.playChips();
      this.hide();
    });
  }

  updateValues() {
    const el = this.modalEl;
    if (!el) return;

    el.querySelector("#slider-master").value = this.settings.get("masterVolume");
    el.querySelector("#val-master").textContent = `${this.settings.get("masterVolume")}%`;

    el.querySelector("#slider-music").value = this.settings.get("musicVolume");
    el.querySelector("#val-music").textContent = `${this.settings.get("musicVolume")}%`;

    el.querySelector("#slider-sfx").value = this.settings.get("sfxVolume");
    el.querySelector("#val-sfx").textContent = `${this.settings.get("sfxVolume")}%`;

    el.querySelector("#slider-ambience").value = this.settings.get("ambienceVolume");
    el.querySelector("#val-ambience").textContent = `${this.settings.get("ambienceVolume")}%`;

    const asstLevel = this.settings.get("assistantLevel");
    const radioAsst = el.querySelector(`input[name="assistant-level"][value="${asstLevel}"]`);
    if (radioAsst) radioAsst.checked = true;

    el.querySelector("#check-show-hint").checked = this.settings.get("showHintButton");

    const animSpeed = this.settings.get("animations");
    const radioAnim = el.querySelector(`input[name="anim-speed"][value="${animSpeed}"]`);
    if (radioAnim) radioAnim.checked = true;

    this.updateActiveRadioStyles();
  }

  updateActiveRadioStyles() {
    const el = this.modalEl;
    const asstLevel = this.settings.get("assistantLevel");
    ["aprendiz", "estrategico", "desativado"].forEach(lvl => {
      const card = el.querySelector(`#card-asst-${lvl}`);
      if (card) {
        if (lvl === asstLevel) card.classList.add("active");
        else card.classList.remove("active");
      }
    });
  }

  show() {
    this.updateValues();
    this.modalEl.classList.add("active");
  }

  hide() {
    this.modalEl.classList.remove("active");
  }
}
