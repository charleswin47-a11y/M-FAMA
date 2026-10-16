// End-to-End JSDOM Integration Test for Virtual Economy & Table Stakes

import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const htmlContent = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");

const dom = new JSDOM(htmlContent, {
  url: "http://localhost:3000",
  runScripts: "outside-only"
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.alert = (msg) => console.log("[ALERT]:", msg);

global.localStorage = window.localStorage;

// Import app
const { MaFamaApp } = await import("../src/app.js");

console.log("=== INICIANDO TESTE E2E DA CARTEIRA E VALORES DAS MESAS ===");
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

const app = new MaFamaApp();
app.audio = new Proxy({}, { get: () => () => {} });

// 1. Initial State
assert(app.wallet.getBalance() === 2500, `Saldo inicial é 2.500 fichas (obtido: ${app.wallet.getBalance()})`);
assert(app.headerChipsVal.textContent.includes("2.500"), `Header exibe '2.500 fichas' (obtido: ${app.headerChipsVal.textContent})`);
assert(app.profileChipsVal.textContent.includes("2.500"), `Perfil exibe '2.500 fichas' (obtido: ${app.profileChipsVal.textContent})`);

// 2. Table Stakes Selection
const salaoPill = document.querySelector('.stake-card-pill[data-stake-id="salao"]');
const entradaPill = document.querySelector('.stake-card-pill[data-stake-id="entrada"]');
const altasPill = document.querySelector('.stake-card-pill[data-stake-id="altas"]');
const treinoPill = document.querySelector('.stake-card-pill[data-stake-id="treino"]');

assert(salaoPill && salaoPill.classList.contains("active"), "Salão (500) é a mesa padrão ativa no lobby");

// Switch to Entrada
entradaPill.click();
assert(app.selectedStake.chips === 100, "Mesa de Entrada (100) selecionada com sucesso");
assert(entradaPill.classList.contains("active"), "Pill da Entrada agora está ativa");

// Switch to Altas Apostas
altasPill.click();
assert(app.selectedStake.chips === 2500, "Altas Apostas (2.500) selecionada com sucesso");

// Switch back to Salão
salaoPill.click();
assert(app.selectedStake.chips === 500, "Salão (500) reativado");

// 3. Wallet Modal
app.openWalletModal();
assert(app.walletModal.classList.contains("active"), "Modal da Carteira abre com sucesso");
assert(app.walletModalBalance.textContent === "2.500", "Modal da Carteira exibe saldo de 2.500");
app.closeWalletModal();
assert(!app.walletModal.classList.contains("active"), "Modal da Carteira fecha com sucesso");

// 4. Start Match with Stake (500)
app.startNewMatch();
assert(app.wallet.getActiveReservation() !== null, "Reserva de buy-in ativada ao entrar na mesa");
assert(app.wallet.getActiveReservation().amount === 500, "Reserva de buy-in é exatamente 500 fichas");
assert(app.wallet.getBalance() === 2000, `Saldo disponível deduz reserva durante o jogo: 2.000 fichas (obtido: ${app.wallet.getBalance()})`);

// 5. Table HUD Economy
const potNum = document.getElementById("hud-pot-num");
const stakeVal = document.getElementById("hud-stake-val");
assert(potNum && potNum.textContent === "2.000", `HUD exibe Pote da Mesa de 2.000 fichas (obtido: ${potNum ? potNum.textContent : null})`);
assert(stakeVal && stakeVal.textContent === "500", `HUD exibe Entrada de 500 fichas (obtido: ${stakeVal ? stakeVal.textContent : null})`);

// 6. Match Victory Settlement
app.gameState.matchWinner = "player";
app.showMatchOverModal();

assert(app.wallet.getActiveReservation() === null, "Reserva liberada após liquidação da partida");
assert(app.wallet.getBalance() === 3000, `Vencedor recebe 1.000 fichas (recupera 500 e lucra +500). Saldo final: 3.000 (obtido: ${app.wallet.getBalance()})`);

const banner = document.getElementById("match-settlement-banner");
const numsEl = document.getElementById("settlement-nums");
assert(banner && banner.style.display === "flex", "Banner de liquidação financeira exibido no modal de fim de jogo");
assert(numsEl && numsEl.textContent.includes("+1.000"), `Banner informa prêmio de +1.000 fichas (obtido: ${numsEl ? numsEl.textContent : null})`);
assert(numsEl && numsEl.textContent.includes("+500"), `Banner informa lucro líquido de +500 fichas (obtido: ${numsEl ? numsEl.textContent : null})`);

// 7. Match Defeat Settlement
app.startNewMatch(); // Reserves 500 again
assert(app.wallet.getBalance() === 2500, "Nova partida: reserva 500 do saldo de 3000 (disponível: 2500)");
app.gameState.matchWinner = "bot";
app.showMatchOverModal();
assert(app.wallet.getBalance() === 2500, "Derrota: perde a entrada de 500 fichas. Saldo restante: 2500");
assert(numsEl && numsEl.textContent.includes("-500"), `Banner de derrota informa perda de -500 fichas (obtido: ${numsEl ? numsEl.textContent : null})`);

// 8. Emergency Loan when balance < 100
app.wallet.state.balance = 50;
app.wallet.saveState();
app.updateWalletUI(50);

assert(app.btnRequestLoan && !app.btnRequestLoan.disabled, "Botão de empréstimo ativado quando saldo < 100");
app.btnRequestLoan.click();
assert(app.wallet.getBalance() === 550, `Saldo após empréstimo da Vila do Azar é de 550 fichas (obtido: ${app.wallet.getBalance()})`);
assert(app.btnRequestLoan.disabled, "Botão de empréstimo desativado após receber fundos");

console.log(`\n=== FIM DO TESTE E2E: ${passed} APROVADOS, ${failed} FALHAS ===`);
process.exit(failed > 0 ? 1 : 0);
