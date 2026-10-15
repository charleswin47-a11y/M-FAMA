// MÁ FAMA - Submundo Roguelike Jokers & Relics

export const JOKERS_CATALOG = [
  {
    id: "joker_trapaceiro",
    name: "O Trapaceiro",
    cost: 5,
    rarity: "Comum",
    desc: "+40 Fichas e +4 Mult se a mão jogada contiver Dois Pares.",
    image: "assets/art/cards/jokers/joker_trapaceiro.png",
    applyScoring: ({ handType, chips, mult }) => {
      if (handType.name === "Dois Pares") {
        return { chips: chips + 40, mult: mult + 4, triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_sangue_frio",
    name: "Sangue Frio",
    cost: 7,
    rarity: "Incomum",
    desc: "x2 Multiplicador se a mão for uma Sequência (Straight).",
    image: "assets/art/cards/jokers/joker_sangue_frio.png",
    applyScoring: ({ handType, chips, mult }) => {
      if (handType.name === "Sequência" || handType.name === "Straight Flush") {
        return { chips, mult: mult * 2, triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_dona_trambique",
    name: "Dona Trambique",
    cost: 6,
    rarity: "Comum",
    desc: "+5 Mult para cada carta de Ouros (♦) que pontuar.",
    image: "assets/art/cards/jokers/joker_dona_trambique.png",
    applyScoring: ({ scoringCards, chips, mult }) => {
      const diamondsCount = (scoringCards || []).filter(c => c.suit === "diamonds").length;
      if (diamondsCount > 0) {
        return { chips, mult: mult + (diamondsCount * 5), triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_pombo_de_guerra",
    name: "Pombo de Guerra",
    cost: 5,
    rarity: "Comum",
    desc: "+60 Fichas se a mão jogada tiver 3 cartas ou menos.",
    image: "assets/art/cards/jokers/joker_pombo_de_guerra.png",
    applyScoring: ({ playedCards, chips, mult }) => {
      if (playedCards && playedCards.length <= 3) {
        return { chips: chips + 60, mult, triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_dedo_de_gesso",
    name: "Dedo de Gesso",
    cost: 7,
    rarity: "Incomum",
    desc: "+8 Mult se a mão for Trinca ou Full House.",
    image: "assets/art/cards/jokers/joker_dedo_de_gesso.png",
    applyScoring: ({ handType, chips, mult }) => {
      if (handType.name === "Trinca" || handType.name === "Full House") {
        return { chips, mult: mult + 8, triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_cafajeste",
    name: "O Cafajeste",
    cost: 4,
    rarity: "Comum",
    desc: "+4 Mult base fixo para qualquer mão que você jogar.",
    image: "assets/art/cards/jokers/joker_cafajeste.png",
    applyScoring: ({ chips, mult }) => {
      return { chips, mult: mult + 4, triggered: true };
    }
  },
  {
    id: "joker_madruga",
    name: "Madruga Sinistro",
    cost: 6,
    rarity: "Comum",
    desc: "+25 Fichas para cada carta de Espadas (♠) pontuada.",
    image: "assets/art/cards/jokers/joker_madruga.png",
    applyScoring: ({ scoringCards, chips, mult }) => {
      const spadesCount = (scoringCards || []).filter(c => c.suit === "spades").length;
      if (spadesCount > 0) {
        return { chips: chips + (spadesCount * 25), mult, triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_agiota",
    name: "O Agiota",
    cost: 6,
    rarity: "Incomum",
    desc: "Receba +$3 de bônus financeiro ao vencer qualquer rodada.",
    image: "assets/art/cards/jokers/joker_agiota.png",
    applyEndRound: ({ money }) => {
      return { money: money + 3, triggered: true };
    }
  },
  {
    id: "joker_migue",
    name: "Migué do Copas",
    cost: 6,
    rarity: "Comum",
    desc: "+20 Fichas e +2 Mult por carta de Copas (♥) pontuada.",
    image: "assets/art/cards/jokers/joker_migue.png",
    applyScoring: ({ scoringCards, chips, mult }) => {
      const heartsCount = (scoringCards || []).filter(c => c.suit === "hearts").length;
      if (heartsCount > 0) {
        return { chips: chips + (heartsCount * 20), mult: mult + (heartsCount * 2), triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  },
  {
    id: "joker_coronel",
    name: "O Coronel",
    cost: 9,
    rarity: "Raro",
    desc: "x3 Multiplicador se jogado na última mão restante da rodada.",
    image: "assets/art/cards/jokers/joker_coronel.png",
    applyScoring: ({ handsLeft, chips, mult }) => {
      if (handsLeft === 1 || handsLeft === 0) {
        return { chips, mult: mult * 3, triggered: true };
      }
      return { chips, mult, triggered: false };
    }
  }
];
