// MÁ FAMA - Truco Paulista Rules Engine

import { MANILHA_CYCLE, NORMAL_RANK_STRENGTH, SUITS } from "../data/cards.js";

// Returns the manilha rank given the Vira rank (circular sequence)
export function getManilhaRank(viraRank) {
  const normalized = viraRank.toLowerCase();
  const idx = MANILHA_CYCLE.indexOf(normalized);
  if (idx === -1) {
    throw new Error(`Invalid vira rank: ${viraRank}`);
  }
  const nextIdx = (idx + 1) % MANILHA_CYCLE.length;
  return MANILHA_CYCLE[nextIdx];
}

// Checks if a card is a manilha
export function isManilha(card, manilhaRank) {
  if (!card || !card.rank) return false;
  return card.rank.toLowerCase() === manilhaRank.toLowerCase();
}

// Returns suit priority for manilhas: Paus (4) > Copas (3) > Espadas (2) > Ouros (1)
export function getSuitPriority(suitId) {
  const suit = SUITS.find(s => s.id === suitId);
  return suit ? suit.manilhaPriority : 0;
}

// Numerical card power under Truco Paulista rules (Common: 1-10, Manilhas: 101-104)
export function getCardPower(card, manilhaRank) {
  if (!card || !card.rank) return 0;
  if (isManilha(card, manilhaRank)) {
    return 100 + getSuitPriority(card.suit);
  }
  return NORMAL_RANK_STRENGTH[card.rank.toLowerCase()] || 0;
}

/**
 * Compare two cards under Truco Paulista rules.
 * Returns:
 *   1 if cardA beats cardB
 *  -1 if cardB beats cardA
 *   0 if cards tie (cangou)
 */
export function compareCards(cardA, cardB, manilhaRank) {
  if (!cardA || !cardB) throw new Error("Both cards must be provided for comparison");

  const aIsManilha = isManilha(cardA, manilhaRank);
  const bIsManilha = isManilha(cardB, manilhaRank);

  // Both are manilhas: broken by suit (Paus > Copas > Espadas > Ouros)
  if (aIsManilha && bIsManilha) {
    const prioA = getSuitPriority(cardA.suit);
    const prioB = getSuitPriority(cardB.suit);
    if (prioA > prioB) return 1;
    if (prioB > prioA) return -1;
    return 0; // Should not happen in standard deck as all 4 manilhas have unique suits
  }

  // One is manilha: manilha always wins over common cards
  if (aIsManilha && !bIsManilha) return 1;
  if (!aIsManilha && bIsManilha) return -1;

  // Neither is manilha: compare common rank strength (4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3)
  const strengthA = NORMAL_RANK_STRENGTH[cardA.rank.toLowerCase()];
  const strengthB = NORMAL_RANK_STRENGTH[cardB.rank.toLowerCase()];

  if (strengthA > strengthB) return 1;
  if (strengthB > strengthA) return -1;

  // Equal rank for common cards -> Tie (empate / canga). Suits DO NOT break ties for common cards!
  return 0;
}

/**
 * Resolves a single trick between played cards.
 * playedCards: [{ playerId: 'player', card: {...} }, { playerId: 'bot', card: {...} }]
 */
export function resolveTrick(playedCards, manilhaRank) {
  if (playedCards.length < 2) return null;
  const c1 = playedCards[0];
  const c2 = playedCards[1];

  const cmp = compareCards(c1.card, c2.card, manilhaRank);
  if (cmp === 1) {
    return { winner: c1.playerId, winningCard: c1.card, isTie: false };
  } else if (cmp === -1) {
    return { winner: c2.playerId, winningCard: c2.card, isTie: false };
  } else {
    return { winner: "tie", winningCard: null, isTie: true };
  }
}

/**
 * Resolves the state of the hand after 1, 2, or 3 tricks.
 * trickWinners: array of 'player', 'bot', or 'tie' for completed tricks (e.g. ['player', 'tie'])
 * Returns: { finished: boolean, winner: 'player'|'bot'|'none'|null, reason: string }
 */
export function resolveHandStatus(trickWinners) {
  const pWins = trickWinners.filter(w => w === "player").length;
  const bWins = trickWinners.filter(w => w === "bot").length;
  const ties = trickWinners.filter(w => w === "tie").length;
  const count = trickWinners.length;

  // Case 1: Someone already won 2 tricks
  if (pWins >= 2) return { finished: true, winner: "player", reason: "Venceu duas vazas" };
  if (bWins >= 2) return { finished: true, winner: "bot", reason: "Venceu duas vazas" };

  // Case 2: Trick 1 won, Trick 2 tied -> winner of trick 1 wins hand
  if (count === 2 && trickWinners[1] === "tie" && trickWinners[0] !== "tie") {
    return { finished: true, winner: trickWinners[0], reason: "Venceu a 1ª vaza e a 2ª empatou" };
  }

  // Case 3: Trick 1 tied, Trick 2 won -> winner of trick 2 wins hand
  if (count === 2 && trickWinners[0] === "tie" && trickWinners[1] !== "tie") {
    return { finished: true, winner: trickWinners[1], reason: "Primeira vaza empatou e venceu a 2ª" };
  }

  // Case 4: Both Trick 1 and Trick 2 tied -> Trick 3 decides
  if (count === 2 && trickWinners[0] === "tie" && trickWinners[1] === "tie") {
    return { finished: false, winner: null, reason: "Duas primeiras vazas empatadas; 3ª decide" };
  }

  // If 3 tricks played
  if (count === 3) {
    // 3.1: All 3 tied -> no winner, redistribute
    if (trickWinners[0] === "tie" && trickWinners[1] === "tie" && trickWinners[2] === "tie") {
      return { finished: true, winner: "none", reason: "Três vazas empatadas: ninguém pontua" };
    }

    // 3.2: Trick 1 tied, Trick 2 tied, Trick 3 won
    if (trickWinners[0] === "tie" && trickWinners[1] === "tie" && trickWinners[2] !== "tie") {
      return { finished: true, winner: trickWinners[2], reason: "Venceu a 3ª vaza após empates" };
    }

    // 3.3: Trick 1 won by A, Trick 2 won by B, Trick 3 tied -> winner of first trick (A) takes hand
    if (trickWinners[2] === "tie") {
      return { finished: true, winner: trickWinners[0], reason: "3ª vaza empatou: vence quem ganhou a 1ª" };
    }

    // 3.4: Trick 1 won by A, Trick 2 won by B, Trick 3 won by whoever took it
    if (trickWinners[2] !== "tie") {
      return { finished: true, winner: trickWinners[2], reason: "Venceu a 3ª vaza decisiva" };
    }
  }

  // Not finished yet (e.g. after 1 trick)
  return { finished: false, winner: null, reason: "Mão em andamento" };
}

// Betting Ladder
export const BET_LADDER = [1, 3, 6, 9, 12];
export const BET_NAMES = {
  1: "Normal",
  3: "TRUCO!",
  6: "SEIS!",
  9: "NOVE!",
  12: "DOZE!"
};

// Returns next raise value on ladder
export function getNextRaise(currentStake) {
  const idx = BET_LADDER.indexOf(currentStake);
  if (idx === -1 || idx >= BET_LADDER.length - 1) return null;
  return BET_LADDER[idx + 1];
}

// Award when opponent folds/runs away from a challenge
export function getFoldAward(currentStake, proposedRaise) {
  // If proposing Truco (3) from 1, folding gives 1.
  // If proposing Seis (6) from 3, folding gives 3.
  // If proposing Nove (9) from 6, folding gives 6.
  // If proposing Doze (12) from 9, folding gives 9.
  return currentStake;
}
