// MÁ FAMA - Deck Manager

import { generateDeckData } from "../data/cards.js";

export class DeckManager {
  constructor() {
    this.deck = [];
  }

  reset() {
    this.deck = generateDeckData();
    this.shuffle();
  }

  shuffle() {
    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealHand() {
    this.reset();
    
    // Deal 3 cards to player and 3 to bot alternately
    const playerHand = [];
    const botHand = [];

    for (let i = 0; i < 3; i++) {
      playerHand.push(this.deck.pop());
      botHand.push(this.deck.pop());
    }

    // Next card is the Vira
    const vira = this.deck.pop();

    return {
      playerHand,
      botHand,
      vira,
      remainingStock: this.deck
    };
  }

  // Used by Trampa's Mão Leve: return card to bottom, draw from top
  swapCardWithStock(returnedCard) {
    if (this.deck.length === 0) return null;
    // Put card at bottom (unshift)
    this.deck.unshift(returnedCard);
    // Draw card from top (pop)
    return this.deck.pop();
  }
}
