// MÁ FAMA - Comprehensive Poker & Submundo Engine Tests

import { DeckFactory } from "../src/game/cards/deckFactory.js";
import { HandEvaluator, HAND_TYPES } from "../src/game/cards/handEvaluator.js";
import { ScoringEngine } from "../src/game/poker/scoringEngine.js";
import { JOKERS_CATALOG } from "../src/game/poker/jokerEffects.js";
import { RunManager } from "../src/game/poker/runManager.js";
import { BettingEngine, POKER_STAGES } from "../src/game/poker/bettingEngine.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("=== RUNNING POKER & SUBMUNDO CORE TESTS ===");

// 1. Deck Factory (Official 40-card Baralho of MÁ FAMA)
const deck40 = DeckFactory.createDeck("poker_tradicional");
assert(deck40.length === 40, `Deck should have 40 authentic cards, got ${deck40.length}`);
const uniqueIds = new Set(deck40.map(c => c.id));
assert(uniqueIds.size === 40, `All 40 card IDs must be unique`);

// 2. Hand Evaluator Tests
// Royal Flush (A-K-Q-J-7 suited in 40-card baralho)
const royalCards = [
  { rank: "7", pokerValue: 7, suit: "hearts" },
  { rank: "j", pokerValue: 11, suit: "hearts" },
  { rank: "q", pokerValue: 12, suit: "hearts" },
  { rank: "k", pokerValue: 13, suit: "hearts" },
  { rank: "a", pokerValue: 14, suit: "hearts" }
];
const royalEval = HandEvaluator.evaluate5Cards(royalCards);
assert(royalEval.type.name === "Royal Flush", `Expected Royal Flush, got ${royalEval.type.name}`);

// Two Pair
const twoPairCards = [
  { rank: "k", pokerValue: 13, suit: "clubs" },
  { rank: "k", pokerValue: 13, suit: "diamonds" },
  { rank: "7", pokerValue: 7, suit: "spades" },
  { rank: "7", pokerValue: 7, suit: "hearts" },
  { rank: "4", pokerValue: 4, suit: "clubs" }
];
const twoPairEval = HandEvaluator.evaluate5Cards(twoPairCards);
assert(twoPairEval.type.name === "Dois Pares", `Expected Dois Pares, got ${twoPairEval.type.name}`);

// 7-card best hand
const sevenCards = [
  ...twoPairCards,
  { rank: "2", pokerValue: 2, suit: "hearts" },
  { rank: "3", pokerValue: 3, suit: "clubs" }
];
const best7 = HandEvaluator.evaluate7Cards(sevenCards);
assert(best7.type.name === "Dois Pares", `7-card evaluation should find Dois Pares`);

// 3. Scoring Engine (Submundo Roguelike)
const trapaceiroJoker = JOKERS_CATALOG.find(j => j.id === "joker_trapaceiro");
const scoreResult = ScoringEngine.calculateScore({
  playedCards: twoPairCards,
  equippedJokers: [trapaceiroJoker],
  handsLeft: 3
});
// Dois Pares base: 20 chips, 2 mult. +40 chips, +4 mult from Trapaceiro = 60+ card chips x 6 mult
assert(scoreResult.totalScore > 200, `Submundo score should multiply chips x mult: got ${scoreResult.totalScore}`);
assert(scoreResult.jokerTriggers.length === 1, `Trapaceiro joker should trigger on Dois Pares`);

// 4. Run Manager (Progression & Shop)
const run = new RunManager();
assert(run.ante === 1, "Run starts at Ante 1");
assert(run.hand.length === 8, "Hand starts with 8 cards");
const oldDiscards = run.discardsLeft;
run.discardCards([0, 1]);
assert(run.discardsLeft === oldDiscards - 1, "Discard decrements discards counter");
assert(run.hand.length === 8, "Hand replenished to 8 cards after discard");

// Play hand in run
const playRes = run.playHand([0, 1, 2, 3, 4]);
assert(playRes !== null, "Play hand returned scoring result");
assert(run.currentScore > 0, "Current score updated");

// 5. Betting Engine (Texas Hold'em)
const pokerGame = new BettingEngine();
pokerGame.startHand();
assert(pokerGame.players.south.holeCards.length === 2, "South dealt 2 hole cards");
assert(pokerGame.potManager.mainPot === 30, "Blinds totaled $30 in pot ($10 + $20)");

console.log("=== ALL POKER & SUBMUNDO ENGINE TESTS PASSED! ===");
