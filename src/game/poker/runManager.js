// MÁ FAMA - Submundo Roguelike Run Manager

import { DeckFactory } from "../cards/deckFactory.js";
import { JOKERS_CATALOG } from "./jokerEffects.js";
import { ScoringEngine } from "./scoringEngine.js";

export const BOSS_BLINDS = [
  { id: "boss_spades", name: "Olho do Coronel", desc: "Cartas de Espadas (♠) perdem suas fichas.", disabledSuit: "spades" },
  { id: "boss_hearts", name: "Veneno Rubro", desc: "Cartas de Copas (♥) não pontuam fichas.", disabledSuit: "hearts" },
  { id: "boss_discards", name: "Cerco Policial", desc: "Apenas 1 descarte disponível nesta rodada.", maxDiscards: 1 },
  { id: "boss_high_stake", name: "Aposta Máxima", desc: "Meta de pontuação aumentada em +50%.", scoreMult: 1.5 },
  { id: "boss_clubs", name: "Floresta Queimada", desc: "Cartas de Paus (♣) perdem suas fichas.", disabledSuit: "clubs" }
];

export const UPGRADES_CATALOG = [
  { handName: "Par", name: "Mercúrio (Par)", cost: 4, addChips: 15, addMult: 1 },
  { handName: "Dois Pares", name: "Urano (Dois Pares)", cost: 4, addChips: 20, addMult: 1 },
  { handName: "Trinca", name: "Vênus (Trinca)", cost: 5, addChips: 25, addMult: 2 },
  { handName: "Sequência", name: "Saturno (Sequência)", cost: 6, addChips: 30, addMult: 3 },
  { handName: "Flush", name: "Júpiter (Flush)", cost: 6, addChips: 35, addMult: 2 },
  { handName: "Full House", name: "Terra (Full House)", cost: 6, addChips: 35, addMult: 3 },
  { handName: "Quadra", name: "Marte (Quadra)", cost: 7, addChips: 40, addMult: 3 }
];

export class RunManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.ante = 1;
    this.roundInAnte = 1; // 1: Small Blind, 2: Big Blind, 3: Boss Blind
    this.money = 10;
    this.currentScore = 0;
    this.targetScore = 300;
    this.maxHands = 4;
    this.handsLeft = 4;
    this.maxDiscards = 3;
    this.discardsLeft = 3;
    this.handSize = 8;
    this.deck = [];
    this.hand = [];
    this.equippedJokers = [];
    this.jokerSlots = 5;
    this.handLevels = {};
    this.currentBoss = null;
    this.shopItems = [];
    this.state = "RUNNING"; // "RUNNING" | "ROUND_WON" | "GAME_OVER" | "VICTORY" | "SHOP"
    this.lastScoreResult = null;

    this.startAnte(1);
  }

  startAnte(anteNum) {
    this.ante = anteNum;
    this.roundInAnte = 1;
    this.setupRound();
  }

  setupRound() {
    this.currentScore = 0;
    this.handsLeft = this.maxHands;
    this.discardsLeft = this.maxDiscards;
    this.currentBoss = null;

    // Calculate Target Score based on Ante & Round
    // Base Ante targets: Ante 1 (300, 450, 600), Ante 2 (800, 1200, 2000), Ante 3 (2800, 4000, 6000)
    const baseAnteScore = [300, 800, 2600, 6000, 14000, 32000, 75000, 180000][this.ante - 1] || (this.ante * 30000);
    const roundMults = [1.0, 1.5, 2.0];
    let target = Math.round(baseAnteScore * roundMults[this.roundInAnte - 1]);

    if (this.roundInAnte === 3) {
      // Pick random Boss Blind
      const bossIdx = (this.ante - 1) % BOSS_BLINDS.length;
      this.currentBoss = { ...BOSS_BLINDS[bossIdx] };
      if (this.currentBoss.maxDiscards !== undefined) {
        this.discardsLeft = this.currentBoss.maxDiscards;
      }
      if (this.currentBoss.scoreMult) {
        target = Math.round(target * this.currentBoss.scoreMult);
      }
    }

    this.targetScore = target;
    this.deck = DeckFactory.shuffle(DeckFactory.createDeck("poker_submundo"));
    this.hand = [];
    this.drawCards(this.handSize);
    this.state = "RUNNING";
  }

  drawCards(count) {
    while (this.hand.length < this.handSize && this.deck.length > 0 && count > 0) {
      this.hand.push(this.deck.pop());
      count--;
    }
  }

  discardCards(cardIndices) {
    if (this.discardsLeft <= 0 || !cardIndices || cardIndices.length === 0) {
      return false;
    }
    this.discardsLeft--;
    // Remove discarded cards from hand in reverse order
    const sortedDesc = [...cardIndices].sort((a, b) => b - a);
    for (const idx of sortedDesc) {
      this.hand.splice(idx, 1);
    }
    this.drawCards(sortedDesc.length);
    return true;
  }

  playHand(cardIndices) {
    if (this.handsLeft <= 0 || !cardIndices || cardIndices.length === 0 || cardIndices.length > 5) {
      return null;
    }

    const playedCards = cardIndices.map(i => this.hand[i]);
    this.handsLeft--;

    // Calculate score
    const result = ScoringEngine.calculateScore({
      playedCards,
      handLevels: this.handLevels,
      equippedJokers: this.equippedJokers,
      bossBlind: this.currentBoss,
      handsLeft: this.handsLeft
    });

    this.lastScoreResult = result;
    this.currentScore += result.totalScore;

    // Remove played cards from hand
    const sortedDesc = [...cardIndices].sort((a, b) => b - a);
    for (const idx of sortedDesc) {
      this.hand.splice(idx, 1);
    }
    this.drawCards(sortedDesc.length);

    // Check round victory or defeat
    if (this.currentScore >= this.targetScore) {
      this.money += 4 + (this.handsLeft * 1); // Reward base money + remaining hands interest
      // Apply Jokers end round trigger
      for (const j of this.equippedJokers) {
        if (typeof j.applyEndRound === "function") {
          const res = j.applyEndRound({ money: this.money });
          if (res && res.triggered) {
            this.money = res.money;
          }
        }
      }
      this.state = "ROUND_WON";
    } else if (this.handsLeft <= 0) {
      this.state = "GAME_OVER";
    }

    return result;
  }

  generateShop() {
    this.shopItems = [];
    // 2 Random Jokers not already equipped
    const availableJokers = JOKERS_CATALOG.filter(j => !this.equippedJokers.some(eq => eq.id === j.id));
    const shuffledJokers = [...availableJokers].sort(() => Math.random() - 0.5);
    const shopJokers = shuffledJokers.slice(0, 2).map(j => ({ type: "joker", item: j, cost: j.cost }));

    // 1 Planet hand upgrade
    const shuffledUpgrades = [...UPGRADES_CATALOG].sort(() => Math.random() - 0.5);
    const shopUpgrade = { type: "upgrade", item: shuffledUpgrades[0], cost: shuffledUpgrades[0].cost };

    this.shopItems = [...shopJokers, shopUpgrade];
    this.state = "SHOP";
  }

  buyItem(shopItemIdx) {
    const itemEntry = this.shopItems[shopItemIdx];
    if (!itemEntry || this.money < itemEntry.cost) return false;

    if (itemEntry.type === "joker") {
      if (this.equippedJokers.length >= this.jokerSlots) return false;
      this.money -= itemEntry.cost;
      this.equippedJokers.push(itemEntry.item);
      this.shopItems.splice(shopItemIdx, 1);
      return true;
    } else if (itemEntry.type === "upgrade") {
      this.money -= itemEntry.cost;
      const up = itemEntry.item;
      if (!this.handLevels[up.handName]) {
        this.handLevels[up.handName] = { level: 1, bonusChips: 0, bonusMult: 0 };
      }
      this.handLevels[up.handName].level += 1;
      this.handLevels[up.handName].bonusChips += up.addChips;
      this.handLevels[up.handName].bonusMult += up.addMult;
      this.shopItems.splice(shopItemIdx, 1);
      return true;
    }
    return false;
  }

  advanceNextRound() {
    if (this.roundInAnte < 3) {
      this.roundInAnte++;
      this.setupRound();
    } else {
      if (this.ante >= 8) {
        this.state = "VICTORY";
      } else {
        this.startAnte(this.ante + 1);
      }
    }
  }
}
