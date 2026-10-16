// MÁ FAMA - Virtual Economy, Player Wallet & Table Stakes System
// Authoritative calculation of table buy-ins, stakes, prize distribution, and transaction audit.

export const TABLE_STAKES = [
  {
    id: "treino",
    name: "Treino Livre",
    subtitle: "Para praticar sem fichas apostadas",
    chips: 0,
    badge: "Grátis",
    description: "Sem aposta de fichas. Ideal para testar jogadas, treinar parceiros e conhecer as regras."
  },
  {
    id: "entrada",
    name: "Mesa de Entrada",
    subtitle: "Para começar",
    chips: 100,
    badge: "100 fichas",
    description: "Entrada acessível de 100 fichas por jogador. Pote de 400 fichas em 4P ou 200 em duelo."
  },
  {
    id: "salao",
    name: "Salão",
    subtitle: "Partidas intermediárias",
    chips: 500,
    badge: "500 fichas",
    isDefault: true,
    description: "Mesa clássica do submundo. Entrada de 500 fichas por jogador (Pote de 2.000 fichas em 4P)."
  },
  {
    id: "altas",
    name: "Altas Apostas",
    subtitle: "Para quem acumulou fichas",
    chips: 2500,
    badge: "2.500 fichas",
    description: "Mesa VIP para veteranos. Entrada de 2.500 fichas por jogador (Pote de 10.000 fichas em 4P)."
  }
];

export const INITIAL_PLAYER_BALANCE = 2500;
export const EMERGENCY_LOAN_AMOUNT = 500;
export const STORAGE_KEY_WALLET = "ma_fama_wallet_v1";

export class WalletManager {
  constructor(storageKey = STORAGE_KEY_WALLET) {
    this.storageKey = storageKey;
    this.listeners = new Set();
    this.state = this.loadState();
  }

  loadState() {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.balance === "number") {
            // If there was an old hanging reservation from an ungraceful close/crash, refund it
            if (parsed.activeReservation) {
              const ageMs = Date.now() - (parsed.activeReservation.timestamp || 0);
              if (ageMs > 300000) { // older than 5 min
                parsed.activeReservation = null;
              }
            }
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Error loading wallet state, using defaults:", e);
    }

    // Default initial state
    const initialState = {
      balance: INITIAL_PLAYER_BALANCE,
      activeReservation: null,
      transactions: [
        {
          id: `tx_${Date.now()}_init`,
          type: "INITIAL_BONUS",
          amount: INITIAL_PLAYER_BALANCE,
          balanceAfter: INITIAL_PLAYER_BALANCE,
          description: "Bônus inicial de boas-vindas na Vila do Azar",
          timestamp: Date.now()
        }
      ]
    };
    this.saveState(initialState);
    return initialState;
  }

  saveState(state = this.state) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
      }
    } catch (e) {
      console.error("Failed to save wallet state:", e);
    }
    this.notify();
  }

  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getBalance(), this.state);
      } catch (e) {
        console.error("Error in wallet listener:", e);
      }
    });
  }

  // Returns available balance (after deducting any active reservation)
  getBalance() {
    const reserved = this.state.activeReservation ? this.state.activeReservation.amount : 0;
    return Math.max(0, this.state.balance - reserved);
  }

  getTotalBalance() {
    return this.state.balance;
  }

  getActiveReservation() {
    return this.state.activeReservation;
  }

  canAfford(amount) {
    if (!amount || amount <= 0) return true;
    return this.getBalance() >= amount;
  }

  // Reserve table buy-in when confirming seat or starting match
  reserveStake(amount, matchId = "solo", description = "Entrada de mesa") {
    if (amount <= 0) {
      this.state.activeReservation = {
        id: `res_${Date.now()}`,
        amount: 0,
        matchId,
        description: "Treino livre (sem fichas)",
        timestamp: Date.now()
      };
      this.saveState();
      return { success: true, reservation: this.state.activeReservation };
    }

    if (!this.canAfford(amount)) {
      return {
        success: false,
        error: "INSUFFICIENT_FUNDS",
        message: `Saldo insuficiente (${this.formatChips(this.getBalance())} fichas). A mesa exige ${this.formatChips(amount)} fichas.`
      };
    }

    // If an existing reservation exists, refund it first to avoid locks
    if (this.state.activeReservation && this.state.activeReservation.amount > 0) {
      this.refundStake("Substituição de mesa");
    }

    const reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      amount,
      matchId,
      description,
      timestamp: Date.now()
    };

    this.state.activeReservation = reservation;
    this.saveState();

    return {
      success: true,
      reservation,
      availableBalance: this.getBalance()
    };
  }

  // Refund stake if room is cancelled, player leaves, or match aborted before ending
  refundStake(reason = "Cancelamento da partida") {
    const res = this.state.activeReservation;
    if (!res || res.amount <= 0) {
      this.state.activeReservation = null;
      this.saveState();
      return { success: true, refunded: 0 };
    }

    const refundedAmount = res.amount;
    this.state.activeReservation = null;

    this.state.transactions.unshift({
      id: `tx_${Date.now()}_refund`,
      type: "REFUND",
      amount: refundedAmount,
      balanceAfter: this.state.balance,
      description: `Estorno de reserva (${reason}): +${this.formatChips(refundedAmount)} fichas`,
      timestamp: Date.now()
    });

    this.saveState();
    return {
      success: true,
      refunded: refundedAmount,
      balance: this.getBalance()
    };
  }

  // Settle match when officially completed
  // In 4-player games: Pot = 4 * stake. Winning pair splits pot: (4 * stake)/2 = 2 * stake each. Net profit = +stake. Losers lose stake (-stake).
  // In 2-player games: Pot = 2 * stake. Winner gets 2 * stake. Net profit = +stake. Loser loses stake (-stake).
  settleMatch({ won, playerCount = 4, mode = "truco" } = {}) {
    const res = this.state.activeReservation;
    if (!res) {
      return { success: false, error: "NO_ACTIVE_RESERVATION" };
    }

    const stake = res.amount;
    this.state.activeReservation = null;

    if (stake === 0) {
      this.saveState();
      return {
        success: true,
        stake: 0,
        prize: 0,
        netProfit: 0,
        balance: this.state.balance
      };
    }

    let prize = 0;
    let netProfit = 0;

    if (won) {
      // Winning pair / player formula
      if (playerCount >= 4) {
        // 4 players: Total pot = 4 * stake. Pair receives 2 * stake each.
        prize = stake * 2;
        netProfit = prize - stake; // Net +stake
      } else {
        // 2 players: Total pot = 2 * stake. Winner takes all: 2 * stake.
        prize = stake * 2;
        netProfit = prize - stake; // Net +stake
      }

      // Player had already reserved `stake`.
      // Balance updates: balance = balance - stake + prize = balance + netProfit
      this.state.balance = this.state.balance - stake + prize;

      this.state.transactions.unshift({
        id: `tx_${Date.now()}_win`,
        type: "VICTORY_PAYOUT",
        amount: prize,
        netProfit: netProfit,
        balanceAfter: this.state.balance,
        description: `Vitória na mesa (${res.description}): Prêmio de ${this.formatChips(prize)} fichas (Lucro: +${this.formatChips(netProfit)})`,
        timestamp: Date.now()
      });
    } else {
      // Loser: loses their reserved stake
      this.state.balance = Math.max(0, this.state.balance - stake);
      prize = 0;
      netProfit = -stake;

      this.state.transactions.unshift({
        id: `tx_${Date.now()}_loss`,
        type: "MATCH_LOSS",
        amount: -stake,
        netProfit: -stake,
        balanceAfter: this.state.balance,
        description: `Derrota na mesa (${res.description}): -${this.formatChips(stake)} fichas`,
        timestamp: Date.now()
      });
    }

    // Keep transaction history limited to last 50 entries
    if (this.state.transactions.length > 50) {
      this.state.transactions = this.state.transactions.slice(0, 50);
    }

    this.saveState();

    return {
      success: true,
      won,
      stake,
      prize,
      netProfit,
      balance: this.state.balance
    };
  }

  // Emergency loan for broke players so they can keep playing
  requestEmergencyLoan() {
    const curBalance = this.getBalance();
    if (curBalance >= 100) {
      return {
        success: false,
        error: "NOT_ELIGIBLE",
        message: "O empréstimo de emergência só está disponível quando o saldo for inferior a 100 fichas."
      };
    }

    const loanAmount = EMERGENCY_LOAN_AMOUNT;
    this.state.balance += loanAmount;

    this.state.transactions.unshift({
      id: `tx_${Date.now()}_loan`,
      type: "EMERGENCY_LOAN",
      amount: loanAmount,
      balanceAfter: this.state.balance,
      description: `Empréstimo da Vila do Azar: +${this.formatChips(loanAmount)} fichas de cortesia`,
      timestamp: Date.now()
    });

    this.saveState();
    return {
      success: true,
      amount: loanAmount,
      balance: this.state.balance
    };
  }

  getTransactions() {
    return this.state.transactions || [];
  }

  formatChips(amount) {
    if (typeof amount !== "number" || isNaN(amount)) return "0";
    return amount.toLocaleString("pt-BR");
  }
}
