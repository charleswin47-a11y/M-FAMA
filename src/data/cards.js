// MÁ FAMA - Cards & Hierarchy Data Definitions

export const SUITS = [
  { id: "clubs", name: "Paus", symbol: "♣", color: "#245247", manilhaPriority: 4 }, // Zap (Highest)
  { id: "hearts", name: "Copas", symbol: "♥", color: "#74263A", manilhaPriority: 3 },
  { id: "spades", name: "Espadas", symbol: "♠", color: "#49385B", manilhaPriority: 2 },
  { id: "diamonds", name: "Ouros", symbol: "♦", color: "#B97732", manilhaPriority: 1 } // (Lowest)
];

// Circular cycle for Manilha (next rank after Vira)
export const MANILHA_CYCLE = ["4", "5", "6", "7", "q", "j", "k", "a", "2", "3"];

// Normal strength hierarchy (from weakest 4 to strongest 3)
export const NORMAL_RANK_STRENGTH = {
  "4": 1,
  "5": 2,
  "6": 3,
  "7": 4,
  "q": 5,
  "j": 6,
  "k": 7,
  "a": 8,
  "2": 9,
  "3": 10
};

export const RANK_NAMES = {
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "q": "Dama (Q)",
  "j": "Valete (J)",
  "k": "Rei (K)",
  "a": "Ás (A)",
  "2": "2",
  "3": "3"
};

// Generate list of 40 cards
export function generateDeckData() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of MANILHA_CYCLE) {
      deck.push({
        id: `${rank}_${suit.id}`,
        rank: rank,
        suit: suit.id,
        suitName: suit.name,
        suitSymbol: suit.symbol,
        suitColor: suit.color,
        faceAsset: `assets/art/cards/faces/${rank}_${suit.id}.png`,
        backAsset: `assets/art/cards/card_back_main.png`
      });
    }
  }
  return deck;
}
