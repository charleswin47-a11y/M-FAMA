// MÁ FAMA - Match State Machine

import { DeckManager } from "./deck.js";
import { getManilhaRank, resolveTrick, resolveHandStatus, getNextRaise, getFoldAward, BET_NAMES } from "./rules.js";
import { AbilityManager } from "./abilities.js";
import { TrucoAI } from "./ai.js";

export class GameState {
  constructor(playerChar, botChar, mode = "ma_fama") {
    this.mode = mode; // "classic" or "ma_fama"
    this.playerChar = playerChar;
    this.botChar = botChar;

    this.playerScore = 0;
    this.botScore = 0;
    this.targetScore = 12;

    this.deckManager = new DeckManager();
    this.abilityManager = new AbilityManager(mode);
    this.ai = new TrucoAI(botChar);

    // Hand state
    this.handNumber = 0;
    this.dealer = "bot"; // Dealer alternates: 'bot' or 'player'
    this.handStarter = "player"; // First to act in trick 1
    this.turnPlayer = "player";

    this.currentStake = 1;
    this.pendingRaise = null; // { challenger: 'player'|'bot', proposedStake: number }
    this.lastRaiser = null; // prevents same player from raising consecutively

    this.viraCard = null;
    this.manilhaRank = null;

    this.playerHand = [];
    this.botHand = [];
    this.tableCards = []; // [{ playerId: 'player'|'bot', card: {...} }]

    this.currentTrick = 0; // 0, 1, 2
    this.trickWinners = []; // ['player'|'bot'|'tie']

    this.lastTrickLostByPlayer = false;
    this.lastTrickLostByBot = false;
    this.lastPlayerCardPlayed = null;
    this.lastBotCardPlayed = null;

    this.state = "IDLE"; // IDLE, DEALING, PLAYING, RAISE_PENDING, TRICK_RESOLVE, HAND_RESOLVE, MATCH_OVER
    this.matchWinner = null;
    this.eventLog = [];
  }

  logEvent(text, type = "normal") {
    this.eventLog.push({ text, type, time: new Date().toLocaleTimeString() });
  }

  // Start a new match
  startMatch() {
    this.playerScore = 0;
    this.botScore = 0;
    this.handNumber = 0;
    this.dealer = "bot";
    this.state = "IDLE";
    this.matchWinner = null;
    this.eventLog = [];
    this.logEvent(`Nova partida iniciada! Modo: ${this.mode === 'ma_fama' ? 'MÁ FAMA (Habilidades)' : 'Clássico'}. Alvo: 12 tentos.`);
    this.startNewHand();
  }

  // Deal a new hand
  startNewHand() {
    if (this.playerScore >= this.targetScore || this.botScore >= this.targetScore) {
      this.state = "MATCH_OVER";
      this.matchWinner = this.playerScore >= this.targetScore ? "player" : "bot";
      this.logEvent(`Partida encerrada! Vencedor: ${this.matchWinner === "player" ? this.playerChar.name : this.botChar.name}!`, "win");
      return;
    }

    this.handNumber++;
    this.currentStake = 1;
    this.pendingRaise = null;
    this.lastRaiser = null;
    this.currentTrick = 0;
    this.trickWinners = [];
    this.tableCards = [];
    this.lastTrickLostByPlayer = false;
    this.lastTrickLostByBot = false;
    this.lastPlayerCardPlayed = null;
    this.lastBotCardPlayed = null;

    // Reset abilities for this hand
    this.abilityManager.resetHand();

    // Alternate dealer
    this.dealer = this.dealer === "player" ? "bot" : "player";
    this.handStarter = this.dealer === "player" ? "bot" : "player";
    this.turnPlayer = this.handStarter;

    // Deal cards from deck
    const deal = this.deckManager.dealHand();
    this.playerHand = deal.playerHand;
    this.botHand = deal.botHand;
    this.viraCard = deal.vira;
    this.manilhaRank = getManilhaRank(this.viraCard.rank);

    this.state = "PLAYING";
    this.logEvent(`Mão #${this.handNumber} distribuída. Vira: ${this.viraCard.rank.toUpperCase()} ${this.viraCard.suitSymbol}. Manilha: ${this.manilhaRank.toUpperCase()}. Mão começa com ${this.handStarter === 'player' ? this.playerChar.name : this.botChar.name}.`);
  }

  // Play card from hand
  playCard(playerId, cardIndex) {
    if (this.state !== "PLAYING") return false;
    if (this.turnPlayer !== playerId) return false;

    const hand = playerId === "player" ? this.playerHand : this.botHand;
    if (cardIndex < 0 || cardIndex >= hand.length) return false;

    const playedCard = hand.splice(cardIndex, 1)[0];
    this.tableCards.push({ playerId, card: playedCard });

    if (playerId === "player") {
      this.lastPlayerCardPlayed = playedCard;
      this.logEvent(`${this.playerChar.name} jogou ${playedCard.rank.toUpperCase()} ${playedCard.suitSymbol}`);
    } else {
      this.lastBotCardPlayed = playedCard;
      this.logEvent(`${this.botChar.name} jogou ${playedCard.rank.toUpperCase()} ${playedCard.suitSymbol}`);
    }

    // Switch turn or resolve trick if both played
    if (this.tableCards.length === 2) {
      this.state = "TRICK_RESOLVE";
    } else {
      this.turnPlayer = playerId === "player" ? "bot" : "player";
    }

    return true;
  }

  // Resolve current trick
  resolveCurrentTrick() {
    if (this.tableCards.length < 2) return null;

    const trickResult = resolveTrick(this.tableCards, this.manilhaRank);
    this.trickWinners.push(trickResult.winner);

    let winnerName = "Empate (Cangou)";
    if (trickResult.winner === "player") {
      winnerName = this.playerChar.name;
      this.lastTrickLostByPlayer = false;
      this.lastTrickLostByBot = true;
      this.turnPlayer = "player";
    } else if (trickResult.winner === "bot") {
      winnerName = this.botChar.name;
      this.lastTrickLostByPlayer = true;
      this.lastTrickLostByBot = false;
      this.turnPlayer = "bot";
    } else {
      // Tie: leader of next trick remains the one who led this trick
      this.lastTrickLostByPlayer = false;
      this.lastTrickLostByBot = false;
      this.turnPlayer = this.tableCards[0].playerId;
    }

    this.logEvent(`Vaza ${this.currentTrick + 1} resolvida: ${winnerName}!`, trickResult.isTie ? "tie" : "win");

    // Check if hand is concluded
    const handStatus = resolveHandStatus(this.trickWinners);
    if (handStatus.finished) {
      this.state = "HAND_RESOLVE";
      this.finishHand(handStatus.winner, handStatus.reason);
      return { trickResult, handStatus };
    } else {
      // Advance to next trick
      this.currentTrick++;
      this.tableCards = [];
      this.state = "PLAYING";
      return { trickResult, handStatus };
    }
  }

  // Finish hand and award points
  finishHand(winner, reason) {
    if (winner === "player") {
      this.playerScore += this.currentStake;
      this.logEvent(`${this.playerChar.name} venceu a mão (+${this.currentStake} tentos)! Motivo: ${reason}`, "win");
    } else if (winner === "bot") {
      this.botScore += this.currentStake;
      this.logEvent(`${this.botChar.name} venceu a mão (+${this.currentStake} tentos)! Motivo: ${reason}`, "lose");
    } else {
      this.logEvent(`Mão empatada em 3 vazas: nenhum tento concedido.`, "tie");
    }

    if (this.playerScore >= this.targetScore || this.botScore >= this.targetScore) {
      this.state = "MATCH_OVER";
      this.matchWinner = this.playerScore >= this.targetScore ? "player" : "bot";
      this.logEvent(`Partida encerrada! ${this.matchWinner === "player" ? this.playerChar.name : this.botChar.name} é o campeão da Última Ficha!`, "win");
    }
  }

  // Propose a raise (Truco / Seis / Nove / Doze)
  proposeRaise(challengerId) {
    if (this.state !== "PLAYING") return false;
    if (this.lastRaiser === challengerId) return false; // cannot raise consecutively

    const nextStake = getNextRaise(this.currentStake);
    if (!nextStake) return false;

    this.pendingRaise = { challenger: challengerId, proposedStake: nextStake };
    this.lastRaiser = challengerId;
    this.state = "RAISE_PENDING";

    const challengerName = challengerId === "player" ? this.playerChar.name : this.botChar.name;
    const betName = BET_NAMES[nextStake] || `${nextStake} TENTOS!`;
    this.logEvent(`${challengerName} pediu ${betName}!`, "raise");

    return true;
  }

  // Respond to a raise
  respondToRaise(responderId, decision) {
    // decision: 'accept', 'fold', 'raise'
    if (this.state !== "RAISE_PENDING") return false;
    if (!this.pendingRaise || this.pendingRaise.challenger === responderId) return false;

    const challenger = this.pendingRaise.challenger;
    const proposed = this.pendingRaise.proposedStake;

    if (decision === "accept") {
      this.currentStake = proposed;
      this.pendingRaise = null;
      this.state = "PLAYING";
      const responderName = responderId === "player" ? this.playerChar.name : this.botChar.name;
      this.logEvent(`${responderName} aceitou o desafio! A mão agora vale ${this.currentStake} tentos.`, "accept");
      return { result: "accepted", stake: this.currentStake };
    } else if (decision === "fold") {
      const award = getFoldAward(this.currentStake, proposed);
      this.pendingRaise = null;
      this.state = "HAND_RESOLVE";
      const responderName = responderId === "player" ? this.playerChar.name : this.botChar.name;
      this.logEvent(`${responderName} correu do desafio!`, "fold");
      this.finishHand(challenger, `Adversário correu do pedido de ${proposed}`);
      return { result: "folded", winner: challenger, award };
    } else if (decision === "raise") {
      // Counter-raise
      const nextLadder = getNextRaise(proposed);
      if (!nextLadder) return false;

      this.pendingRaise = { challenger: responderId, proposedStake: nextLadder };
      this.lastRaiser = responderId;
      const responderName = responderId === "player" ? this.playerChar.name : this.botChar.name;
      const betName = BET_NAMES[nextLadder] || `${nextLadder} TENTOS!`;
      this.logEvent(`${responderName} retrucou: PEDIU ${betName}!`, "raise");
      return { result: "counter_raised", nextStake: nextLadder };
    }

    return false;
  }
}
