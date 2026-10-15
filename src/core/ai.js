// MÁ FAMA - Intelligent AI Bot with Character Personalities

import { compareCards, isManilha, getSuitPriority, BET_LADDER } from "./rules.js";
import { NORMAL_RANK_STRENGTH } from "../data/cards.js";

export class TrucoAI {
  constructor(character) {
    this.character = character; // e.g. Trampa, Veneno, Calibre, Pixel
  }

  // Calculate score for a card to evaluate strength
  evaluateCardValue(card, manilhaRank) {
    if (isManilha(card, manilhaRank)) {
      const prio = getSuitPriority(card.suit);
      // Zap=100, Copas=90, Espadas=80, Ouros=70
      return 60 + prio * 10;
    }
    const base = NORMAL_RANK_STRENGTH[card.rank.toLowerCase()] || 0;
    return base * 4; // 4=4 to 3=40
  }

  // Calculate total hand power
  evaluateHandPower(hand, manilhaRank) {
    if (!hand || hand.length === 0) return 0;
    return hand.reduce((sum, c) => sum + this.evaluateCardValue(c, manilhaRank), 0);
  }

  /**
   * Decide which card to play in the current trick.
   */
  chooseCardToPlay(hand, tableCards, manilhaRank, trickWinners, trickIndex) {
    if (hand.length === 1) return 0;

    const playerCardPlayed = tableCards.find(tc => tc.playerId === "player");

    // Case 1: Bot is responding to player's card
    if (playerCardPlayed) {
      const targetCard = playerCardPlayed.card;
      const winningCards = [];
      const losingCards = [];
      const tyingCards = [];

      hand.forEach((c, idx) => {
        const cmp = compareCards(c, targetCard, manilhaRank);
        if (cmp === 1) winningCards.push({ index: idx, card: c, val: this.evaluateCardValue(c, manilhaRank) });
        else if (cmp === 0) tyingCards.push({ index: idx, card: c, val: this.evaluateCardValue(c, manilhaRank) });
        else losingCards.push({ index: idx, card: c, val: this.evaluateCardValue(c, manilhaRank) });
      });

      // If we have winning cards, pick the lowest value winner to save high cards
      if (winningCards.length > 0) {
        winningCards.sort((a, b) => a.val - b.val);
        return winningCards[0].index;
      }

      // If tying card and trick 1, tie is viable
      if (tyingCards.length > 0 && trickIndex === 0) {
        return tyingCards[0].index;
      }

      // Cannot win: discard lowest value garbage card
      losingCards.sort((a, b) => a.val - b.val);
      return losingCards[0].index;
    }

    // Case 2: Bot is leading the trick
    const scored = hand.map((c, idx) => ({ index: idx, card: c, val: this.evaluateCardValue(c, manilhaRank) }));
    scored.sort((a, b) => a.val - b.val);

    if (trickIndex === 0) {
      // In trick 1, usually lead with mid card or highest if holding monster
      if (scored[scored.length - 1].val >= 70) {
        // Has a manilha! Play mid or lowest to set trap
        return scored.length >= 2 ? scored[1].index : scored[0].index;
      }
      // Lead with highest non-manilha to contest trick 1
      return scored[scored.length - 1].index;
    }

    if (trickIndex === 1) {
      // Trick 2: if won trick 1, try to close the match with strongest!
      const wonTrick1 = trickWinners[0] === "bot";
      if (wonTrick1) {
        return scored[scored.length - 1].index;
      } else {
        // Lost trick 1: must win trick 2 or game is lost! Play strongest!
        return scored[scored.length - 1].index;
      }
    }

    // Trick 3: Play whatever is left
    return scored[scored.length - 1].index;
  }

  /**
   * Decide whether to call Truco / Seis / Nove / Doze.
   */
  shouldChallenge(hand, manilhaRank, currentStake, trickWinners, trickIndex) {
    if (currentStake >= 12) return false;

    const power = this.evaluateHandPower(hand, manilhaRank);
    const hasManilha = hand.some(c => isManilha(c, manilhaRank));
    const wonTrick1 = trickWinners[0] === "bot";

    // Personality factor
    let bluffChance = 0.08;
    let threshold = 55;

    if (this.character.id === "calibre") {
      threshold = 48; // Aggressive intimidator
      bluffChance = 0.15;
    } else if (this.character.id === "pixel") {
      threshold = 42; // Unpredictable gambler
      bluffChance = 0.22;
    } else if (this.character.id === "trampa") {
      threshold = 60; // Calculating, rarely bluffs without backing
      bluffChance = 0.05;
    } else if (this.character.id === "veneno") {
      threshold = 50; // Psychological pressure
      bluffChance = 0.12;
    }

    // Never raise if stake is high unless holding huge power
    if (currentStake >= 6 && power < 90) return false;

    // Conditions to call:
    if (trickIndex === 0 && (hasManilha || Math.random() < bluffChance)) {
      return true;
    }
    if (trickIndex === 1 && wonTrick1 && (power >= threshold || Math.random() < bluffChance)) {
      return true;
    }
    if (trickIndex === 2 && power >= threshold) {
      return true;
    }

    return false;
  }

  /**
   * Decide response to player's challenge (raise).
   * returns: 'accept', 'fold', or 'counter'
   */
  respondToChallenge(hand, manilhaRank, proposedStake, trickWinners, trickIndex) {
    const power = this.evaluateHandPower(hand, manilhaRank);
    const hasZapOrCopas = hand.some(c => isManilha(c, manilhaRank) && (c.suit === "clubs" || c.suit === "hearts"));

    // Can we counter-raise?
    const canCounter = proposedStake < 12;

    if (hasZapOrCopas && power >= 110 && canCounter && Math.random() < 0.6) {
      return "counter";
    }

    // Acceptance thresholds based on proposed stake
    let requiredPower = 30;
    if (proposedStake === 3) requiredPower = 28;
    else if (proposedStake === 6) requiredPower = 55;
    else if (proposedStake === 9) requiredPower = 80;
    else if (proposedStake === 12) requiredPower = 100;

    // Personality adjustment
    if (this.character.id === "calibre") requiredPower -= 8;
    if (this.character.id === "pixel") requiredPower -= 12;

    if (power >= requiredPower) {
      return "accept";
    }

    // Fold if hand is hopeless
    return "fold";
  }

  // Personality dialogue snippets
  getDialogue(action, stake = 3) {
    const quotes = {
      truco: {
        trampa: ["Já calculei seus passos. TRUCO!", "Essa mão não passa de três. TRUCO!"],
        veneno: ["Gosta do perigo, meu bem? TRUCO!", "Sua cara entrega tudo... TRUCO!"],
        calibre: ["A mesa ficou cara. TRUCO!", "Aguenta a pressão? TRUCO!"],
        pixel: ["Surpresa! TRUCO na cabeça!", "Bora bagunçar isso aqui! TRUCO!"]
      },
      accept: {
        trampa: ["Dentro do previsto. Aceito.", "Pode vir."],
        veneno: ["Adoro quando você insiste. Aceito.", "Vem sem medo."],
        calibre: ["Cai pra dentro. Aceito.", "Quero ver sustentar."],
        pixel: ["Demorou! Aceito na hora!", "Tô dentro, manda mais!"]
      },
      fold: {
        trampa: ["Cálculo de risco. Essa eu deixo passar.", "Leva esse tento miúdo."],
        veneno: ["Vou te dar esse gostinho... por enquanto.", "Pode comemorar a migalha."],
        calibre: ["Não pago pra ver lixo. Corre.", "Guardo chumbo pro próximo."],
        pixel: ["Fui! Essa mão tava zicada.", "Pega aí que na próxima eu recupero."]
      },
      counter: {
        trampa: ["Pouco demais. QUERO SEIS!", "Aumenta essa conta!"],
        veneno: ["Acha que manda? QUERO SEIS!", "Subindo o tom!"],
        calibre: ["Aqui não tem covarde! SEIS!", "Dobra a aposta!"],
        pixel: ["Acha que é só você? SEEEIS!", "Glitch na banca! SEIS!"]
      }
    };

    const list = quotes[action]?.[this.character.id] || ["TRUCO!"];
    return list[Math.floor(Math.random() * list.length)];
  }
}
