// Automated test suite for WalletManager & Virtual Economy System

import { WalletManager, TABLE_STAKES, INITIAL_PLAYER_BALANCE, EMERGENCY_LOAN_AMOUNT } from "../src/core/economy.js";

// Mock localStorage for Node.js environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();

console.log("=== INICIANDO TESTES DO SISTEMA DE CARTEIRA E VALORES DAS MESAS ===");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`\x1b[31m✖ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

// Test 1: Configuration of Table Stakes
assert(TABLE_STAKES.length === 4, "TABLE_STAKES tem 4 configurações principais");
assert(TABLE_STAKES.some(s => s.chips === 0 && s.id === "treino"), "Mesa Treino Livre configurada com 0 fichas");
assert(TABLE_STAKES.some(s => s.chips === 100 && s.id === "entrada"), "Mesa de Entrada configurada com 100 fichas");
assert(TABLE_STAKES.some(s => s.chips === 500 && s.id === "salao"), "Salão configurado com 500 fichas");
assert(TABLE_STAKES.some(s => s.chips === 2500 && s.id === "altas"), "Altas Apostas configurado com 2.500 fichas");

// Test 2: Initial Player Balance
localStorage.clear();
const wallet = new WalletManager("test_wallet");
assert(wallet.getBalance() === 2500, `Saldo inicial deve ser exatamente 2.500 fichas (obtido: ${wallet.getBalance()})`);
assert(wallet.formatChips(2500) === "2.500", "Formatação de 2500 deve ser '2.500'");

// Test 3: Reserve Stake
const res1 = wallet.reserveStake(500, "match_123", "Salão - Truco Paulista");
assert(res1.success === true, "Reserva de 500 fichas realizada com sucesso");
assert(wallet.getBalance() === 2000, `Saldo disponível após reserva deve ser 2.000 fichas (obtido: ${wallet.getBalance()})`);
assert(wallet.getTotalBalance() === 2500, "Saldo total retém reserva até a resolução da mesa");

// Test 4: Refund Stake
const refundRes = wallet.refundStake("Jogador saiu da sala");
assert(refundRes.success === true, "Estorno da reserva concluído");
assert(wallet.getBalance() === 2500, `Saldo disponível após estorno volta a ser 2.500 fichas (obtido: ${wallet.getBalance()})`);

// Test 5: Victory Settlement (4 Players, 500 stake)
wallet.reserveStake(500, "match_4p_win", "Salão 4P");
const winSettlement = wallet.settleMatch({ won: true, playerCount: 4, mode: "truco_paulista" });
assert(winSettlement.success === true, "Liquidação de vitória concluída com sucesso");
assert(winSettlement.prize === 1000, `Vencedor recebe 1.000 fichas no total (obtido: ${winSettlement.prize})`);
assert(winSettlement.netProfit === 500, `Lucro líquido do vencedor é de +500 fichas (obtido: ${winSettlement.netProfit})`);
assert(wallet.getBalance() === 3000, `Novo saldo deve ser 3.000 fichas (obtido: ${wallet.getBalance()})`);

// Test 6: Loss Settlement (4 Players, 500 stake)
wallet.reserveStake(500, "match_4p_loss", "Salão 4P");
const lossSettlement = wallet.settleMatch({ won: false, playerCount: 4, mode: "truco_paulista" });
assert(lossSettlement.success === true, "Liquidação de derrota concluída com sucesso");
assert(lossSettlement.prize === 0, "Perdedor recebe 0 fichas de prêmio");
assert(lossSettlement.netProfit === -500, "Perdedor registra perda de -500 fichas");
assert(wallet.getBalance() === 2500, `Saldo volta para 2.500 fichas após perda de 500 (obtido: ${wallet.getBalance()})`);

// Test 7: Insufficient Funds Protection
const tooHighRes = wallet.reserveStake(10000, "match_too_high", "Mesa Gigante");
assert(tooHighRes.success === false, "Reserva de valor acima do saldo deve ser rejeitada");
assert(tooHighRes.error === "INSUFFICIENT_FUNDS", "Erro reportado como INSUFFICIENT_FUNDS");

// Test 8: Free Table (0 chips)
const freeRes = wallet.reserveStake(0, "match_free", "Treino Livre");
assert(freeRes.success === true, "Mesa de 0 fichas reservada com sucesso");
const freeSettle = wallet.settleMatch({ won: true, playerCount: 4 });
assert(freeSettle.prize === 0 && freeSettle.netProfit === 0, "Mesa de 0 fichas não altera saldo");
assert(wallet.getBalance() === 2500, "Saldo permanece inalterado");

// Test 9: Emergency Loan when broke
wallet.state.balance = 40;
wallet.saveState();
assert(wallet.getBalance() === 40, "Saldo reduzido para 40 para simular emergência");

const loanAttempt1 = wallet.requestEmergencyLoan();
assert(loanAttempt1.success === true, "Empréstimo de emergência concedido com saldo < 100");
assert(wallet.getBalance() === 540, `Saldo após empréstimo de 500 deve ser 540 (obtido: ${wallet.getBalance()})`);

// Should be rejected now that balance >= 100
const loanAttempt2 = wallet.requestEmergencyLoan();
assert(loanAttempt2.success === false, "Segundo empréstimo rejeitado porque saldo atual >= 100");

// Test 10: Transactions Audit Trail
const txs = wallet.getTransactions();
assert(txs.length >= 5, `Histórico de transações registrou eventos (total: ${txs.length})`);
assert(txs[0].type === "EMERGENCY_LOAN", "Última transação registrada é o empréstimo");

console.log(`\n=== RESUMO: ${passed} APROVADOS, ${failed} FALHAS ===`);
if (failed > 0) process.exit(1);
