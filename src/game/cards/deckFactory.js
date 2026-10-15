// MÁ FAMA - Deck Factory (40 cards for Truco/Sueca, 52 cards for Poker, Jokers for Submundo)

export const SUITS = [
  { id: "clubs", name: "Paus", symbol: "♣", color: "#245247", manilhaPriority: 4 },
  { id: "hearts", name: "Copas", symbol: "♥", color: "#74263A", manilhaPriority: 3 },
  { id: "spades", name: "Espadas", symbol: "♠", color: "#49385B", manilhaPriority: 2 },
  { id: "diamonds", name: "Ouros", symbol: "♦", color: "#B97732", manilhaPriority: 1 }
];

// 40-card cycle (Truco & Sueca)
export const DECK_40_RANKS = ["4", "5", "6", "7", "q", "j", "k", "a", "2", "3"];

// Full 52-card standard deck (Poker)
export const DECK_52_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k", "a"];

// Poker standard numerical rank value (2=2 ... A=14)
export const POKER_RANK_VALUES = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "j": 11, "q": 12, "k": 13, "a": 14
};

export const POKER_RANK_LABELS = {
  "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "10": "10",
  "j": "Valete", "q": "Dama", "k": "Rei", "a": "Ás"
};

export class DeckFactory {
  /**
   * Generates deck appropriate for requested mode
   * @param {string} mode - "truco_paulista" | "truco_ma_fama" | "sueca_tradicional" | "sueca_ma_fama" | "poker_tradicional" | "poker_submundo"
   */
  static createDeck(mode = "truco_paulista") {
    const isPoker = mode.includes("poker");
    const ranks = isPoker ? DECK_52_RANKS : DECK_40_RANKS;
    const cards = [];

    for (const suit of SUITS) {
      for (const rank of ranks) {
        cards.push({
          id: `${rank}_${suit.id}`,
          rank: rank,
          pokerValue: POKER_RANK_VALUES[rank] || 0,
          pokerLabel: POKER_RANK_LABELS[rank] || rank.toUpperCase(),
          suit: suit.id,
          suitName: suit.name,
          suitSymbol: suit.symbol,
          suitColor: suit.color,
          chips: POKER_RANK_VALUES[rank] ? Math.min(POKER_RANK_VALUES[rank], 10) : 5, // Card chip value in Submundo
          faceAsset: `assets/art/cards/faces/${rank}_${suit.id}.png`,
          backAsset: `assets/art/cards/card_back_main.png`
        });
      }
    }

    return cards;
  }

  /**
   * Fisher-Yates array shuffle
   */
  static shuffle(deck) {
    const arr = [...deck];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
