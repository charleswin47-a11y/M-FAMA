// MÁ FAMA - Sueca Tradicional & Sueca MÁ FAMA Rules Engine
// 40 cards, 4 players (2 pairs), 10 cards each, trump suit (trunfo)

export const SUECA_CARD_VALUES = {
  "a": 11,
  "7": 10,
  "k": 4,
  "j": 3,
  "q": 2,
  "6": 0,
  "5": 0,
  "4": 0,
  "3": 0,
  "2": 0
};

export const SUECA_CARD_STRENGTH = {
  "a": 10,
  "7": 9,
  "k": 8,
  "j": 7,
  "q": 6,
  "6": 5,
  "5": 4,
  "4": 3,
  "3": 2,
  "2": 1
};

/**
 * Get card point value in Sueca
 */
export function getSuecaCardValue(card) {
  if (!card || !card.rank) return 0;
  return SUECA_CARD_VALUES[card.rank.toLowerCase()] || 0;
}

/**
 * Get card trick strength in Sueca
 */
export function getSuecaCardStrength(card) {
  if (!card || !card.rank) return 0;
  return SUECA_CARD_STRENGTH[card.rank.toLowerCase()] || 0;
}

/**
 * Validates if a card can be legally played according to the "follow suit" rule in Sueca.
 * A player MUST play a card of the lead suit if they have one in hand.
 */
export function isLegalSuecaPlay(cardToPlay, playerHand, leadSuit) {
  if (!leadSuit) return true; // First card of the trick can be any card
  if (cardToPlay.suit === leadSuit) return true; // Followed suit

  // Check if player has any card of lead suit in hand
  const hasLeadSuit = playerHand.some(c => c.suit === leadSuit);
  return !hasLeadSuit; // If they don't have lead suit, any card is valid
}

/**
 * Resolves the winner of a trick in Sueca given 4 played cards, the lead suit and the trump suit.
 * trickCards: array of { playerId, playerIndex, card }
 * Returns the winning object { playerId, playerIndex, card }
 */
export function resolveSuecaTrick(trickCards, trumpSuit) {
  if (!trickCards || trickCards.length === 0) return null;

  const leadSuit = trickCards[0].card.suit;
  let winningEntry = trickCards[0];

  for (let i = 1; i < trickCards.length; i++) {
    const candidate = trickCards[i];
    const winCard = winningEntry.card;
    const canCard = candidate.card;

    const winIsTrump = winCard.suit === trumpSuit;
    const canIsTrump = canCard.suit === trumpSuit;

    if (canIsTrump && !winIsTrump) {
      winningEntry = candidate;
    } else if (canIsTrump && winIsTrump) {
      if (getSuecaCardStrength(canCard) > getSuecaCardStrength(winCard)) {
        winningEntry = candidate;
      }
    } else if (!canIsTrump && !winIsTrump) {
      // Both non-trump: only cards matching lead suit can compete
      if (canCard.suit === leadSuit && winCard.suit === leadSuit) {
        if (getSuecaCardStrength(canCard) > getSuecaCardStrength(winCard)) {
          winningEntry = candidate;
        }
      }
    }
  }

  return winningEntry;
}

/**
 * Sum points of cards won in tricks
 */
export function calculatePairPoints(wonCards) {
  return wonCards.reduce((sum, card) => sum + getSuecaCardValue(card), 0);
}

/**
 * Resolves match tents from a round of Sueca (120 points total):
 * >= 61 points = 1 game point
 * >= 91 points = 2 game points
 * 120 points (all 10 tricks) = 4 game points (capote / bandeira)
 * 60 x 60 = 0 points (empate)
 */
export function resolveSuecaRoundScore(teamAPoints, teamBPoints) {
  if (teamAPoints > 60) {
    if (teamAPoints === 120) return { teamAWins: 4, teamBWins: 0, reason: "Capote (120 pontos)!" };
    if (teamAPoints >= 91) return { teamAWins: 2, teamBWins: 0, reason: "Vitória de ré (91+ pontos)!" };
    return { teamAWins: 1, teamBWins: 0, reason: "Vitória simples (61+ pontos)" };
  } else if (teamBPoints > 60) {
    if (teamBPoints === 120) return { teamAWins: 0, teamBWins: 4, reason: "Capote (120 pontos)!" };
    if (teamBPoints >= 91) return { teamAWins: 0, teamBWins: 2, reason: "Vitória de ré (91+ pontos)!" };
    return { teamAWins: 0, teamBWins: 1, reason: "Vitória simples (61+ pontos)" };
  }
  return { teamAWins: 0, teamBWins: 0, reason: "Empate a 60 pontos!" };
}
