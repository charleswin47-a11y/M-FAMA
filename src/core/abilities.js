// MÁ FAMA - Master Abilities Manager for Truco MÁ FAMA and Sueca MÁ FAMA
// Implements Trampa (Carta Marcada), Veneno (Dossiê), Calibre (Pressão / Aposta de Sangue), and Pixel (Improviso)

export class AbilityManager {
  constructor(mode = "classic") {
    this.mode = mode; // "truco_paulista", "truco_ma_fama", "sueca_tradicional", "sueca_ma_fama"
    this.playerAbilityUsed = false;
    this.botAbilityUsed = false;
    this.calibreMatchPowerUsed = false; // 1x per match
  }

  resetHand() {
    this.playerAbilityUsed = false;
    this.botAbilityUsed = false;
  }

  isAbilityEnabled() {
    return this.mode === "truco_ma_fama" || this.mode === "sueca_ma_fama" || this.mode === "ma_fama" || this.mode.includes("ma_fama");
  }

  canUsePlayerAbility(characterId, timingContext) {
    if (!this.isAbilityEnabled() || this.playerAbilityUsed) return false;

    switch (characterId) {
      case "trampa":
        // 1x per hand: can peek any time before hand ends
        return timingContext.trickIndex < 3;

      case "veneno":
        // 1x per hand: can check dossier on opponent
        return timingContext.trickIndex < 3;

      case "calibre":
        // 1x per match or per hand: intimidation
        return timingContext.trickIndex < 3;

      case "pixel":
        // 1x per hand: can swap card in hand
        return timingContext.trickIndex < 3;

      default:
        return false;
    }
  }

  // Trampa: Carta Marcada (reveals 1 random card from opponent hand)
  executeCartaMarcada(opponentHand) {
    if (!opponentHand || opponentHand.length === 0) return null;
    const randIdx = Math.floor(Math.random() * opponentHand.length);
    return opponentHand[randIdx];
  }

  // Backward compatibility alias for Trampa
  executeLeituraFria(opponentHand) {
    return this.executeCartaMarcada(opponentHand);
  }

  // Veneno: Dossiê
  // In Truco: checks if opponent has at least 1 manilha
  // In Sueca: checks if opponent has at least 1 trump card
  executeDossie(opponentHand, checkType, targetRankOrSuit) {
    if (!opponentHand || opponentHand.length === 0) return false;

    if (checkType === "manilha") {
      const manilhaRank = targetRankOrSuit.toLowerCase();
      return opponentHand.some(c => c.rank.toLowerCase() === manilhaRank);
    } else if (checkType === "trunfo") {
      const trumpSuit = targetRankOrSuit.toLowerCase();
      return opponentHand.some(c => c.suit.toLowerCase() === trumpSuit);
    }
    return false;
  }

  // Pixel: Improviso (Swap 1 card with partner)
  executeImproviso(myHand, myCardIndex, partnerHand) {
    if (myCardIndex < 0 || myCardIndex >= myHand.length || !partnerHand || partnerHand.length === 0) {
      return null;
    }
    const myOldCard = myHand.splice(myCardIndex, 1)[0];
    const randPartnerIdx = Math.floor(Math.random() * partnerHand.length);
    const partnerCard = partnerHand.splice(randPartnerIdx, 1)[0];

    myHand.push(partnerCard);
    partnerHand.push(myOldCard);

    return {
      success: true,
      sentCard: myOldCard,
      receivedCard: partnerCard
    };
  }

  // Pixel: Plano B Deck Swap (Replaces 1 chosen card in hand with fresh card from deck)
  executePlanoBDeckSwap(myHand, myCardIndex, deck) {
    if (myCardIndex < 0 || myCardIndex >= myHand.length) return null;
    const oldCard = myHand[myCardIndex];
    let newCard = null;
    if (deck && deck.length > 0) {
      newCard = deck.pop();
    } else {
      // Fallback generator from standard ranks/suits if deck was fully dealt
      const ranks = ["4", "5", "6", "7", "q", "j", "k", "a", "2", "3"];
      const suits = ["clubs", "hearts", "spades", "diamonds"];
      const rRank = ranks[Math.floor(Math.random() * ranks.length)];
      const rSuit = suits[Math.floor(Math.random() * suits.length)];
      newCard = {
        id: `${rRank}_${rSuit}`,
        rank: rRank,
        suit: rSuit,
        faceAsset: `assets/cards/${rRank}_${rSuit}.svg`
      };
    }
    myHand[myCardIndex] = newCard;
    return {
      success: true,
      oldCard,
      newCard
    };
  }

  // Calibre: Pressão (Skip ladder directly to 6 in Truco)
  executePressao() {
    this.calibreMatchPowerUsed = true;
    return 6; // Proposed stake
  }
}
