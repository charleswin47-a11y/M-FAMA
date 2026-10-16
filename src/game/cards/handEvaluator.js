// MÁ FAMA - Poker Hand Evaluator (Texas Hold'em 7-card best hand + Roguelike 5-card scoring)

export const HAND_TYPES = {
  ROYAL_FLUSH: { rank: 10, name: "Royal Flush", baseChips: 100, baseMult: 8 },
  STRAIGHT_FLUSH: { rank: 9, name: "Straight Flush", baseChips: 100, baseMult: 8 },
  FOUR_OF_A_KIND: { rank: 8, name: "Quadra", baseChips: 60, baseMult: 7 },
  FULL_HOUSE: { rank: 7, name: "Full House", baseChips: 40, baseMult: 4 },
  FLUSH: { rank: 6, name: "Flush", baseChips: 35, baseMult: 4 },
  STRAIGHT: { rank: 5, name: "Sequência", baseChips: 30, baseMult: 4 },
  THREE_OF_A_KIND: { rank: 4, name: "Trinca", baseChips: 30, baseMult: 3 },
  TWO_PAIR: { rank: 3, name: "Dois Pares", baseChips: 20, baseMult: 2 },
  ONE_PAIR: { rank: 2, name: "Par", baseChips: 10, baseMult: 2 },
  HIGH_CARD: { rank: 1, name: "Carta Alta", baseChips: 5, baseMult: 1 }
};

export class HandEvaluator {
  /**
   * Evaluates any hand of up to 5 cards (for Balatro/Submundo play)
   * @param {Array} cards - Array of card objects {pokerValue, suit, ...}
   */
  static evaluate5Cards(cards) {
    if (!cards || cards.length === 0) {
      return { type: HAND_TYPES.HIGH_CARD, tieBreakers: [0], scoringCards: [] };
    }

    // Sort descending by pokerValue (14 down to 2)
    const sorted = [...cards].sort((a, b) => b.pokerValue - a.pokerValue);
    const values = sorted.map(c => c.pokerValue);
    const suits = sorted.map(c => c.suit);

    const isFlush = sorted.length >= 5 && suits.every(s => s === suits[0]);

    // Check straight (supporting both standard and 40-card Brazilian baralho)
    let isStraight = false;
    let straightHigh = 0;
    if (sorted.length >= 5) {
      const uniqueVals = [...new Set(values)];
      if (uniqueVals.length >= 5) {
        // Consecutive sequences in 40-card baralho (A-K-Q-J-7-6-5-4-3-2)
        const baralhoStraights = [
          [14, 13, 12, 11, 7], // Royal / Ace High
          [13, 12, 11, 7, 6],
          [12, 11, 7, 6, 5],
          [11, 7, 6, 5, 4],
          [7, 6, 5, 4, 3],
          [6, 5, 4, 3, 2],
          [14, 5, 4, 3, 2]    // Wheel
        ];

        for (const seq of baralhoStraights) {
          if (seq.every(val => uniqueVals.includes(val))) {
            isStraight = true;
            straightHigh = seq[0];
            break;
          }
        }

        // Standard consecutive numbers fallback
        if (!isStraight &&
          uniqueVals[0] - uniqueVals[1] === 1 &&
          uniqueVals[1] - uniqueVals[2] === 1 &&
          uniqueVals[2] - uniqueVals[3] === 1 &&
          uniqueVals[3] - uniqueVals[4] === 1
        ) {
          isStraight = true;
          straightHigh = uniqueVals[0];
        }
      }
    }

    // Group counts
    const counts = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }
    const groups = Object.entries(counts)
      .map(([val, count]) => ({ val: parseInt(val), count }))
      .sort((a, b) => b.count - a.count || b.val - a.val);

    // 1. Royal / Straight Flush
    if (isFlush && isStraight) {
      if (straightHigh === 14 && (sorted.some(c => c.pokerValue === 10) || sorted.some(c => c.pokerValue === 7))) {
        return { type: HAND_TYPES.ROYAL_FLUSH, tieBreakers: [14], scoringCards: sorted };
      }
      return { type: HAND_TYPES.STRAIGHT_FLUSH, tieBreakers: [straightHigh], scoringCards: sorted };
    }

    // 2. Four of a kind
    if (groups[0].count === 4) {
      const fourVal = groups[0].val;
      const kicker = groups[1] ? groups[1].val : 0;
      return {
        type: HAND_TYPES.FOUR_OF_A_KIND,
        tieBreakers: [fourVal, kicker],
        scoringCards: sorted.filter(c => c.pokerValue === fourVal)
      };
    }

    // 3. Full House
    if (groups[0].count === 3 && groups[1] && groups[1].count >= 2) {
      const threeVal = groups[0].val;
      const pairVal = groups[1].val;
      return {
        type: HAND_TYPES.FULL_HOUSE,
        tieBreakers: [threeVal, pairVal],
        scoringCards: sorted
      };
    }

    // 4. Flush
    if (isFlush) {
      return { type: HAND_TYPES.FLUSH, tieBreakers: values, scoringCards: sorted };
    }

    // 5. Straight
    if (isStraight) {
      return { type: HAND_TYPES.STRAIGHT, tieBreakers: [straightHigh], scoringCards: sorted };
    }

    // 6. Three of a kind
    if (groups[0].count === 3) {
      const threeVal = groups[0].val;
      const kickers = groups.slice(1).map(g => g.val);
      return {
        type: HAND_TYPES.THREE_OF_A_KIND,
        tieBreakers: [threeVal, ...kickers],
        scoringCards: sorted.filter(c => c.pokerValue === threeVal)
      };
    }

    // 7. Two Pair
    if (groups[0].count === 2 && groups[1] && groups[1].count === 2) {
      const highPair = Math.max(groups[0].val, groups[1].val);
      const lowPair = Math.min(groups[0].val, groups[1].val);
      const kicker = groups[2] ? groups[2].val : 0;
      return {
        type: HAND_TYPES.TWO_PAIR,
        tieBreakers: [highPair, lowPair, kicker],
        scoringCards: sorted.filter(c => c.pokerValue === highPair || c.pokerValue === lowPair)
      };
    }

    // 8. One Pair
    if (groups[0].count === 2) {
      const pairVal = groups[0].val;
      const kickers = groups.slice(1).map(g => g.val);
      return {
        type: HAND_TYPES.ONE_PAIR,
        tieBreakers: [pairVal, ...kickers],
        scoringCards: sorted.filter(c => c.pokerValue === pairVal)
      };
    }

    // 9. High Card
    return {
      type: HAND_TYPES.HIGH_CARD,
      tieBreakers: values,
      scoringCards: [sorted[0]]
    };
  }

  /**
   * Generates all 5-card combinations from a set of cards (e.g. 7 cards in Texas Hold'em)
   */
  static getCombinations5(cards) {
    const results = [];
    const n = cards.length;
    for (let i = 0; i < n - 4; i++) {
      for (let j = i + 1; j < n - 3; j++) {
        for (let k = j + 1; k < n - 2; k++) {
          for (let l = k + 1; l < n - 1; l++) {
            for (let m = l + 1; m < n; m++) {
              results.push([cards[i], cards[j], cards[k], cards[l], cards[m]]);
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * Evaluates the best 5-card hand out of 7 cards (2 private + 5 community)
   * @param {Array} sevenCards
   */
  static evaluate7Cards(sevenCards) {
    if (!sevenCards || sevenCards.length < 5) {
      return this.evaluate5Cards(sevenCards || []);
    }
    const combos = this.getCombinations5(sevenCards);
    let best = null;

    for (const combo of combos) {
      const evalResult = this.evaluate5Cards(combo);
      if (!best || this.compareHands(evalResult, best) > 0) {
        best = evalResult;
      }
    }
    return best;
  }

  /**
   * Compares two evaluated hands.
   * Returns > 0 if handA wins, < 0 if handB wins, 0 if tie
   */
  static compareHands(handA, handB) {
    if (handA.type.rank !== handB.type.rank) {
      return handA.type.rank - handB.type.rank;
    }
    // Compare tiebreakers sequentially
    const len = Math.max(handA.tieBreakers.length, handB.tieBreakers.length);
    for (let i = 0; i < len; i++) {
      const tbA = handA.tieBreakers[i] || 0;
      const tbB = handB.tieBreakers[i] || 0;
      if (tbA !== tbB) {
        return tbA - tbB;
      }
    }
    return 0;
  }
}
