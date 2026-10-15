// MÁ FAMA - Hint Panel UI (Conselheiro de Mesa)
// Pergaminho vintage noir, bordas vinho, detalhes em ouro e tipografia serifada

import { ICONS } from "./icons.js";

export class HintPanel {
  constructor(containerEl, onCardHighlight) {
    this.container = containerEl;
    this.onCardHighlight = onCardHighlight;
    this.isOpen = false;
    this.currentAdvice = null;

    this.render();
  }

  render() {
    this.panelEl = document.createElement("div");
    this.panelEl.className = "hint-advisor-panel";
    this.panelEl.id = "hint-advisor-panel";
    this.panelEl.innerHTML = `
      <div class="hint-parchment-box">
        <div class="hint-header">
          <div class="hint-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span id="hint-level-tag">CONSELHEIRO DE MESA</span>
          </div>
          <button class="hint-close-btn" id="hint-close-btn" title="Fechar Conselheiro">×</button>
        </div>
        <div class="hint-body">
          <h4 class="hint-suggestion-title" id="hint-suggestion-title">SUGESTÃO</h4>
          <p class="hint-suggestion-main" id="hint-suggestion-main">Selecione o botão de dica para analisar a mesa.</p>
          <div class="hint-divider"></div>
          <p class="hint-reason-text" id="hint-reason-text">O conselheiro avalia apenas as cartas da sua mão e as jogadas públicas da partida.</p>
        </div>
      </div>
    `;

    document.body.appendChild(this.panelEl);

    this.titleEl = this.panelEl.querySelector("#hint-suggestion-title");
    this.mainEl = this.panelEl.querySelector("#hint-suggestion-main");
    this.reasonEl = this.panelEl.querySelector("#hint-reason-text");
    this.levelEl = this.panelEl.querySelector("#hint-level-tag");
    this.closeBtn = this.panelEl.querySelector("#hint-close-btn");

    this.closeBtn.addEventListener("click", () => this.hide());
  }

  showAdvice(advice) {
    if (!advice) return;
    this.currentAdvice = advice;

    this.levelEl.textContent = advice.level === "aprendiz" ? "MODO APRENDIZ" : "CONSELHEIRO ESTRATÉGICO";
    this.titleEl.textContent = advice.title || "SUGESTÃO";
    this.mainEl.textContent = advice.suggestion;
    this.reasonEl.textContent = advice.reason;

    this.panelEl.classList.add("visible");
    this.isOpen = true;

    // Optional card highlight in player's hand
    if (this.onCardHighlight && advice.cardIndex >= 0) {
      this.onCardHighlight(advice.cardIndex);
    }
  }

  hide() {
    this.panelEl.classList.remove("visible");
    this.isOpen = false;
    if (this.onCardHighlight) {
      this.onCardHighlight(-1);
    }
  }

  toggle(advice) {
    if (this.isOpen) {
      this.hide();
    } else {
      this.showAdvice(advice);
    }
  }
}
