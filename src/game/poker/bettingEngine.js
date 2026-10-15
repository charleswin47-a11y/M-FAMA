// MÁ FAMA - Texas Hold'em Betting Engine & Table Match Flow

import { DeckFactory } from "../cards/deckFactory.js";
import { HandEvaluator } from "../cards/handEvaluator.js";
import { PotManager } from "./potManager.js";

export const POKER_STAGES = {
  PRE_FLOP: "PRE_FLOP",
  FLOP: "FLOP",
  TURN: "TURN",
  RIVER: "RIVER",
  SHOWDOWN: "SHOWDOWN",
  ROUND_END: "ROUND_END"
};

export class BettingEngine {
  constructor(playerSeats = ["south", "west", "north", "east"]) {
    this.seatOrder = playerSeats;
    this.players = {};
    for (const id of playerSeats) {
      this.players[id] = {
        id,
        chips: 1000,
        holeCards: [],
        folded: false,
        allIn: false,
        currentBet: 0,
        bestHand: null
      };
    }

    this.smallBlind = 10;
    this.bigBlind = 20;
    this.dealerIdx = 0;
    this.currentActorIdx = 0;
    this.stage = POKER_STAGES.PRE_FLOP;
    this.communityCards = [];
    this.deck = [];
    this.potManager = new PotManager();
    this.highestBetThisRound = 0;
    this.lastAction = null;
    this.winnerInfo = null;
  }

  startHand() {
    this.stage = POKER_STAGES.PRE_FLOP;
    this.communityCards = [];
    this.deck = DeckFactory.shuffle(DeckFactory.createDeck("poker_tradicional"));
    this.potManager.reset();
    this.highestBetThisRound = 0;
    this.winnerInfo = null;

    // Reset player round state (eliminate busted players or re-buy)
    for (const id of this.seatOrder) {
      const p = this.players[id];
      if (p.chips < this.bigBlind) {
        p.chips = 1000; // Auto-rebuy virtual chips
      }
      p.holeCards = [];
      p.folded = false;
      p.allIn = false;
      p.currentBet = 0;
      p.bestHand = null;
    }

    // Deal 2 hole cards to each player
    for (let c = 0; c < 2; c++) {
      for (const id of this.seatOrder) {
        this.players[id].holeCards.push(this.deck.pop());
      }
    }

    // Post blinds
    const sbPlayer = this.getPlayerByOffset(this.dealerIdx + 1);
    const bbPlayer = this.getPlayerByOffset(this.dealerIdx + 2);

    this.placeBet(sbPlayer.id, Math.min(this.smallBlind, sbPlayer.chips));
    this.placeBet(bbPlayer.id, Math.min(this.bigBlind, bbPlayer.chips));
    this.highestBetThisRound = this.bigBlind;

    // First action in Pre-flop starts after Big Blind (Under the Gun)
    this.currentActorIdx = (this.dealerIdx + 3) % this.seatOrder.length;
    this.lastAction = { type: "POST_BLINDS", text: "Blinds postados ($10 / $20)" };
  }

  getPlayerByOffset(offset) {
    const idx = (offset) % this.seatOrder.length;
    return this.players[this.seatOrder[idx]];
  }

  getActivePlayers() {
    return this.seatOrder.map(id => this.players[id]).filter(p => !p.folded);
  }

  placeBet(playerId, amount) {
    const p = this.players[playerId];
    const actual = Math.min(p.chips, amount);
    p.chips -= actual;
    p.currentBet += actual;
    if (p.chips === 0) p.allIn = true;
    this.potManager.recordBet(playerId, actual);
    if (p.currentBet > this.highestBetThisRound) {
      this.highestBetThisRound = p.currentBet;
    }
    return actual;
  }

  /**
   * Processes player action
   * @param {string} playerId
   * @param {string} actionType - "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN"
   * @param {number} raiseAmount - Total bet amount if raising
   */
  handleAction(playerId, actionType, raiseAmount = 0) {
    const p = this.players[playerId];
    if (p.folded || p.allIn) return { success: false, reason: "Jogador inativo" };

    const toCall = this.highestBetThisRound - p.currentBet;

    if (actionType === "FOLD") {
      p.folded = true;
      this.lastAction = { playerId, type: "FOLD", text: `${playerId} desistiu (Fold)` };
    } else if (actionType === "CHECK") {
      if (toCall > 0) return { success: false, reason: "Não pode passar com aposta pendente" };
      this.lastAction = { playerId, type: "CHECK", text: `${playerId} passou a vez (Check)` };
    } else if (actionType === "CALL") {
      this.placeBet(playerId, toCall);
      this.lastAction = { playerId, type: "CALL", text: `${playerId} pagou a aposta (Call $${toCall})` };
    } else if (actionType === "RAISE" || actionType === "BET") {
      const targetTotal = Math.max(this.highestBetThisRound + this.bigBlind, raiseAmount);
      const needed = targetTotal - p.currentBet;
      this.placeBet(playerId, needed);
      this.lastAction = { playerId, type: "RAISE", text: `${playerId} aumentou para $${targetTotal}` };
    } else if (actionType === "ALL_IN") {
      const allInAmount = p.chips;
      this.placeBet(playerId, allInAmount);
      this.lastAction = { playerId, type: "ALL_IN", text: `${playerId} apostou TUDO (All-in $${allInAmount})` };
    }

    // Check if only 1 player remains
    const active = this.getActivePlayers();
    if (active.length === 1) {
      this.finishHand();
      return { success: true, finished: true };
    }

    // Advance to next actor or next stage
    this.advanceTurn();
    return { success: true, finished: this.stage === POKER_STAGES.ROUND_END };
  }

  advanceTurn() {
    // Check if betting round is settled (all active non-allin players matched highestBetThisRound)
    const active = this.getActivePlayers();
    const canAct = active.filter(p => !p.allIn);

    const roundSettled = canAct.every(p => p.currentBet === this.highestBetThisRound);

    if (roundSettled && this.lastAction.type !== "POST_BLINDS") {
      this.advanceStage();
    } else {
      // Move to next active player
      let tries = 0;
      do {
        this.currentActorIdx = (this.currentActorIdx + 1) % this.seatOrder.length;
        tries++;
      } while (
        (this.players[this.seatOrder[this.currentActorIdx]].folded ||
         this.players[this.seatOrder[this.currentActorIdx]].allIn) &&
        tries < this.seatOrder.length
      );
    }
  }

  advanceStage() {
    // Reset round bets
    for (const id of this.seatOrder) {
      this.players[id].currentBet = 0;
    }
    this.highestBetThisRound = 0;
    this.potManager.resetRoundBets();

    if (this.stage === POKER_STAGES.PRE_FLOP) {
      this.stage = POKER_STAGES.FLOP;
      this.deck.pop(); // Burn card
      this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    } else if (this.stage === POKER_STAGES.FLOP) {
      this.stage = POKER_STAGES.TURN;
      this.deck.pop(); // Burn card
      this.communityCards.push(this.deck.pop());
    } else if (this.stage === POKER_STAGES.TURN) {
      this.stage = POKER_STAGES.RIVER;
      this.deck.pop(); // Burn card
      this.communityCards.push(this.deck.pop());
    } else if (this.stage === POKER_STAGES.RIVER) {
      this.stage = POKER_STAGES.SHOWDOWN;
      this.finishHand();
      return;
    }

    // Action starts left of dealer
    this.currentActorIdx = (this.dealerIdx + 1) % this.seatOrder.length;
    // Skip folded/allin
    while (
      this.players[this.seatOrder[this.currentActorIdx]].folded ||
      this.players[this.seatOrder[this.currentActorIdx]].allIn
    ) {
      this.currentActorIdx = (this.currentActorIdx + 1) % this.seatOrder.length;
    }
  }

  finishHand() {
    this.stage = POKER_STAGES.ROUND_END;
    const contenders = [];

    for (const id of this.seatOrder) {
      const p = this.players[id];
      if (!p.folded) {
        const full7 = [...p.holeCards, ...this.communityCards];
        p.bestHand = HandEvaluator.evaluate7Cards(full7);
        contenders.push({ id: p.id, handResult: p.bestHand, folded: false });
      } else {
        contenders.push({ id: p.id, handResult: null, folded: true });
      }
    }

    const payouts = this.potManager.distributePots(contenders, HandEvaluator.compareHands);
    for (const [id, wonAmount] of Object.entries(payouts)) {
      this.players[id].chips += wonAmount;
    }

    const winners = Object.entries(payouts).filter(([_, amt]) => amt > 0);
    this.winnerInfo = {
      payouts,
      winners: winners.map(([id, amt]) => ({
        id,
        amount: amt,
        handName: this.players[id].bestHand ? this.players[id].bestHand.type.name : "Vencedor por desistência"
      }))
    };

    // Advance dealer for next hand
    this.dealerIdx = (this.dealerIdx + 1) % this.seatOrder.length;
  }

  /**
   * Simple bot AI decision for Texas Hold'em
   */
  computeBotAction(botId) {
    const p = this.players[botId];
    if (p.folded || p.allIn) return { action: "CHECK" };

    const toCall = this.highestBetThisRound - p.currentBet;
    const cards = [...p.holeCards, ...this.communityCards];
    const evaluation = cards.length >= 5 ? HandEvaluator.evaluate7Cards(cards) : HandEvaluator.evaluate5Cards(cards);
    const tier = evaluation ? evaluation.type.rank : 1;

    // High rank (Trinca, Straight, Flush+) -> Bet or Raise
    if (tier >= 4) {
      if (Math.random() < 0.6) {
        return { action: "RAISE", amount: this.highestBetThisRound + this.bigBlind * 2 };
      }
      return { action: toCall > 0 ? "CALL" : "CHECK" };
    }

    // Medium rank (Pair, Two pair) -> Call reasonable bets, or Check
    if (tier >= 2) {
      if (toCall <= this.bigBlind * 2) {
        return { action: toCall > 0 ? "CALL" : "CHECK" };
      }
      return Math.random() < 0.4 ? { action: "CALL" } : { action: "FOLD" };
    }

    // Low rank (High Card)
    if (toCall === 0) {
      return { action: "CHECK" };
    }
    // Occasional bluff (10% chance)
    if (Math.random() < 0.1 && p.chips > this.bigBlind * 3) {
      return { action: "RAISE", amount: this.highestBetThisRound + this.bigBlind };
    }

    return { action: "FOLD" };
  }
}
