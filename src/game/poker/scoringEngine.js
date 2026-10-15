// MÁ FAMA - Submundo Roguelike Scoring Engine

import { HandEvaluator } from "../cards/handEvaluator.js";

export class ScoringEngine {
  /**
   * Calculates detailed scoring breakdown for a played poker hand
   * @param {Object} params
   * @param {Array} params.playedCards - The 1 to 5 selected cards
   * @param {Object} params.handLevels - Upgraded level per hand { "Par": { level: 1, bonusChips: 0, bonusMult: 0 } }
   * @param {Array} params.equippedJokers - Currently active jokers
   * @param {Object} params.bossBlind - Current boss rule debuffs
   * @param {number} params.handsLeft - Hands remaining in this round
   */
  static calculateScore({ playedCards, handLevels = {}, equippedJokers = [], bossBlind = null, handsLeft = 1 }) {
    const evaluation = HandEvaluator.evaluate5Cards(playedCards);
    const handType = evaluation.type;
    const scoringCards = evaluation.scoringCards;

    // 1. Base Values (with upgrades if any)
    const levelData = handLevels[handType.name] || { level: 1, bonusChips: 0, bonusMult: 0 };
    let currentChips = handType.baseChips + levelData.bonusChips;
    let currentMult = handType.baseMult + levelData.bonusMult;

    const breakdownSteps = [];
    breakdownSteps.push({
      phase: "base",
      text: `${handType.name} (Nível ${levelData.level || 1})`,
      chips: currentChips,
      mult: currentMult
    });

    // 2. Card Chips Contribution (checking Boss Blind debuffs)
    const scoredCardsDetails = [];
    for (const card of scoringCards) {
      let isCardDisabled = false;
      if (bossBlind) {
        if (bossBlind.disabledSuit && card.suit === bossBlind.disabledSuit) {
          isCardDisabled = true;
        }
      }

      const cardChipValue = isCardDisabled ? 0 : (card.chips || 5);
      currentChips += cardChipValue;

      scoredCardsDetails.push({
        card,
        chipsAdded: cardChipValue,
        disabled: isCardDisabled
      });
    }

    breakdownSteps.push({
      phase: "cards",
      text: `Cartas Pontuadas (+${scoringCards.length})`,
      chips: currentChips,
      mult: currentMult
    });

    // 3. Trigger Equipped Jokers in Left-to-Right order
    const jokerTriggers = [];
    for (const joker of equippedJokers) {
      if (typeof joker.applyScoring === "function") {
        const prevChips = currentChips;
        const prevMult = currentMult;
        const res = joker.applyScoring({
          handType,
          playedCards,
          scoringCards,
          chips: currentChips,
          mult: currentMult,
          handsLeft
        });

        if (res && res.triggered) {
          currentChips = res.chips;
          currentMult = res.mult;
          jokerTriggers.push({
            joker,
            chipsDiff: currentChips - prevChips,
            multDiff: currentMult - prevMult
          });
          breakdownSteps.push({
            phase: "joker",
            jokerName: joker.name,
            chips: currentChips,
            mult: currentMult
          });
        }
      }
    }

    const totalScore = Math.floor(currentChips * currentMult);

    return {
      handType,
      level: levelData.level || 1,
      scoringCards,
      scoredCardsDetails,
      jokerTriggers,
      breakdownSteps,
      finalChips: currentChips,
      finalMult: currentMult,
      totalScore
    };
  }
}
