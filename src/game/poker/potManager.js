// MÁ FAMA - Pot & Side Pot Manager for Poker Texas Hold'em

export class PotManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.mainPot = 0;
    this.sidePots = []; // [{ amount: 100, eligiblePlayers: ["south", "west"] }]
    this.playerBetsThisRound = {};
    this.playerTotalCommitted = {};
  }

  recordBet(playerId, amount) {
    this.playerBetsThisRound[playerId] = (this.playerBetsThisRound[playerId] || 0) + amount;
    this.playerTotalCommitted[playerId] = (this.playerTotalCommitted[playerId] || 0) + amount;
    this.mainPot += amount;
  }

  resetRoundBets() {
    this.playerBetsThisRound = {};
  }

  /**
   * Distributes pot(s) to winner(s) based on evaluated hand results
   * @param {Array} contenders - [{ id: "south", handResult: {...}, folded: false }]
   * @param {Function} comparator - HandEvaluator.compareHands
   */
  distributePots(contenders, comparator) {
    const activeContenders = contenders.filter(c => !c.folded);
    if (activeContenders.length === 0) return {};

    const payouts = {};
    for (const c of contenders) {
      payouts[c.id] = 0;
    }

    if (activeContenders.length === 1) {
      // Everyone else folded
      payouts[activeContenders[0].id] = this.mainPot;
      return payouts;
    }

    // Find highest ranked hands
    let bestHand = activeContenders[0].handResult;
    for (let i = 1; i < activeContenders.length; i++) {
      if (comparator(activeContenders[i].handResult, bestHand) > 0) {
        bestHand = activeContenders[i].handResult;
      }
    }

    // All players who tied for the best hand
    const winners = activeContenders.filter(c => comparator(c.handResult, bestHand) === 0);
    const splitAmount = Math.floor(this.mainPot / winners.length);

    for (const w of winners) {
      payouts[w.id] = splitAmount;
    }

    return payouts;
  }
}
