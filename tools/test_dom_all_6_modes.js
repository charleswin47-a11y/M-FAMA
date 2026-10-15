import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";

console.log("=== RUNNING FULL 6-MODES DOM SIMULATION TEST ===");

const htmlPath = path.resolve("index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

const dom = new JSDOM(htmlContent, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost:3000/"
});

const { window } = dom;
const { document } = window;
global.window = window;
global.document = document;
global.WebSocket = class {
  constructor() { this.readyState = 1; }
  send() {}
  close() {}
};

// Polyfill Audio for JSDOM
window.Audio = class {
  play() { return Promise.resolve(); }
  pause() {}
};

// Import app
const { MaFamaApp } = await import("../src/app.js");
const app = new MaFamaApp();

// Mock Audio functions for test execution
app.audio.playChips = () => {};
app.audio.playCardDeal = () => {};
app.audio.playCardPlay = () => {};
app.audio.playVictoryChime = () => {};
app.audio.playViraReveal = () => {};
app.audio.switchMusicTrack = () => {};

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

// 1. Verify 6 Mode Cards in DOM
const modeTrucoPaulista = document.getElementById("mode-truco-paulista");
const modeTrucoMaFama = document.getElementById("mode-truco-ma-fama");
const modeSuecaTrad = document.getElementById("mode-sueca-tradicional");
const modeSuecaMaFama = document.getElementById("mode-sueca-ma-fama");
const modePokerTrad = document.getElementById("mode-poker-tradicional");
const modePokerSubmundo = document.getElementById("mode-poker-submundo");

assert(modeTrucoPaulista !== null, "Mode Truco Paulista card exists");
assert(modeTrucoMaFama !== null, "Mode Truco MÁ FAMA card exists");
assert(modeSuecaTrad !== null, "Mode Sueca Tradicional card exists");
assert(modeSuecaMaFama !== null, "Mode Sueca MÁ FAMA card exists");
assert(modePokerTrad !== null, "Mode Poker Tradicional card exists");
assert(modePokerSubmundo !== null, "Mode Poker Submundo card exists");

// 2. Test Poker Tradicional Start
modePokerTrad.click();
assert(app.selectedRuleset === "poker_tradicional", "selectedRuleset is poker_tradicional");
app.startNewMatch();

const pokerCommunityZone = document.getElementById("poker-community-zone");
const pokerActionsBar = document.getElementById("poker-actions-bar");
assert(pokerCommunityZone.style.display !== "none", "Poker community cards zone visible");
assert(pokerActionsBar.style.display !== "none", "Poker actions bar visible");
assert(app.pokerGame !== null, "Poker game engine initialized");
assert(app.pokerGame.players.south.holeCards.length === 2, "South dealt 2 hole cards in Poker");
console.log("Texas Hold'em initial pot:", app.pokerGame.potManager.mainPot);
assert(app.pokerGame.potManager.mainPot === 30, "Initial blinds pot is $30");

// 3. Test Poker Submundo (Roguelike) Start
modePokerSubmundo.click();
assert(app.selectedRuleset === "poker_submundo", "selectedRuleset is poker_submundo");
app.startNewMatch();

const submundoHud = document.getElementById("submundo-hud-panel");
const submundoJokersTray = document.getElementById("submundo-jokers-tray");
const submundoActionsBar = document.getElementById("submundo-actions-bar");
assert(submundoHud.style.display !== "none", "Submundo HUD visible");
assert(submundoJokersTray.style.display !== "none", "Submundo Jokers tray visible");
assert(submundoActionsBar.style.display !== "none", "Submundo actions bar visible");
assert(app.submundoRun !== null, "Submundo run manager initialized");
assert(app.submundoRun.hand.length === 8, "Submundo dealt 8 cards in hand");
assert(app.submundoRun.ante === 1, "Submundo started at Ante 1");
assert(app.submundoRun.targetScore === 300, "Submundo initial target score is 300");

// Select 2 cards and test hand detection
app.toggleSubmundoCardSelection(0);
app.toggleSubmundoCardSelection(1);
assert(app.submundoSelectedCardIndices.size === 2, "2 cards selected");
const detectName = document.getElementById("submundo-detect-name").textContent;
console.log("Detected Hand Name for 2 cards:", detectName);
assert(detectName.length > 0 && detectName !== "Selecione até 5 cartas", "Hand detected accurately");

// Test Play Hand
const initialScore = app.submundoRun.currentScore;
app.playSubmundoHand();
assert(app.submundoRun.currentScore > initialScore, "Playing hand increased Submundo score");
assert(app.submundoRun.handsLeft === 3, "Hands remaining decremented to 3");
assert(app.submundoRun.hand.length === 8, "Hand replenished to 8 cards after play");

// Test Open Shop
app.openSubmundoShop();
const shopModal = document.getElementById("submundo-shop-modal");
const shopCards = document.querySelectorAll(".shop-item-card");
assert(shopModal.classList.contains("active"), "Shop modal active");
assert(shopCards.length === 3, "Shop displays 3 items (2 Jokers + 1 Upgrade)");

// Test Leave Table and return to Truco
const btnLeaveTable = document.getElementById("btn-leave-table");
btnLeaveTable.click();
assert(pokerCommunityZone.style.display === "none", "Poker community zone hidden after leaving");
assert(submundoHud.style.display === "none", "Submundo HUD hidden after leaving");

modeTrucoPaulista.click();
app.startNewMatch();
assert(app.gameState !== null, "Truco game state initialized");
assert(app.gameState.playerHand.length === 3, "Truco player has 3 cards");

console.log("=== ALL 6 MODES DOM SIMULATION TESTS PASSED PERFECTLY! ===");
process.exit(0);
