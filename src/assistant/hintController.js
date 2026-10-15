// MÁ FAMA - Hint Controller (Coordenador do Conselheiro de Mesa)

import { TrucoAdvisor } from "./trucoAdvisor.js";
import { SuecaAdvisor } from "./suecaAdvisor.js";

export class HintController {
  constructor(settingsManager) {
    this.settings = settingsManager;
  }

  /**
   * Evaluates the current game context and returns advice
   * @param {Object} context
   * {
   *   mode: string, // "truco_paulista", "truco_ma_fama", "sueca_tradicional", "sueca_ma_fama"
   *   playerHand: Array,
   *   tableCards: Array,
   *   viraCard: Object,
   *   manilhaRank: string,
   *   leadSuit: string,
   *   trumpSuit: string,
   *   currentTrick: number,
   *   trickWinners: Array,
   *   currentStake: number
   * }
   */
  getAdvice(context) {
    const level = this.settings.get("assistantLevel") || "estrategico";
    if (level === "desativado") return null;

    const mode = context.mode || "truco_paulista";
    const enhancedContext = { ...context, level };

    if (mode.startsWith("sueca")) {
      return SuecaAdvisor.getAdvice(enhancedContext);
    } else {
      return TrucoAdvisor.getAdvice(enhancedContext);
    }
  }
}
