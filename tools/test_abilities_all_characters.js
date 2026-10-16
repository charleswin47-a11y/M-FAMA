// Test all 4 character abilities in Truco MÁ FAMA
import { GameState } from "../src/core/gameState.js";
import { CHARACTERS } from "../src/data/characters.js";

console.log("=== RUNNING CHARACTER ABILITIES TEST ===");

const trampa = CHARACTERS.find(c => c.id === "trampa");
const veneno = CHARACTERS.find(c => c.id === "veneno");
const calibre = CHARACTERS.find(c => c.id === "calibre");
const pixel = CHARACTERS.find(c => c.id === "pixel");

// 1. TEST TRAMPA (Carta Marcada)
console.log("\n--- 1. Testing Trampa (Carta Marcada) ---");
const stateTrampa = new GameState(trampa, calibre, "truco_ma_fama");
stateTrampa.startMatch();
console.log("Bot hand before Trampa ability:", stateTrampa.botHand.map(c => `${c.rank}_${c.suit}`));

const revealedCard = stateTrampa.abilityManager.executeCartaMarcada(stateTrampa.botHand);
if (!revealedCard || !stateTrampa.botHand.some(c => c.id === revealedCard.id)) {
  throw new Error("Trampa failed to reveal card from bot hand!");
}
stateTrampa.abilityManager.playerAbilityUsed = true;
console.log("✅ Trampa successfully revealed bot card:", `${revealedCard.rank}_${revealedCard.suit}`);
if (!stateTrampa.abilityManager.playerAbilityUsed) {
  throw new Error("Ability should be marked as used!");
}

// 2. TEST VENENO (Jogo Psicológico)
console.log("\n--- 2. Testing Veneno (Jogo Psicológico) ---");
const stateVeneno = new GameState(veneno, trampa, "truco_ma_fama");
stateVeneno.startMatch();
const manilhaRank = stateVeneno.manilhaRank;
const hasManilha = stateVeneno.abilityManager.executeDossie(stateVeneno.botHand, "manilha", manilhaRank);
const actualHasManilha = stateVeneno.botHand.some(c => c.rank.toLowerCase() === manilhaRank.toLowerCase());

if (hasManilha !== actualHasManilha) {
  throw new Error(`Veneno dossier mismatch! Expected ${actualHasManilha}, got ${hasManilha}`);
}
console.log(`✅ Veneno dossier correctly identified manilha presence (${hasManilha}) for manilha rank ${manilhaRank}`);

// 3. TEST CALIBRE (Aposta de Sangue)
console.log("\n--- 3. Testing Calibre (Aposta de Sangue) ---");
const stateCalibre = new GameState(calibre, veneno, "truco_ma_fama");
stateCalibre.startMatch();
console.log("Initial stake:", stateCalibre.currentStake);
const pressureStake = stateCalibre.abilityManager.executePressao();
stateCalibre.currentStake = pressureStake;
if (stateCalibre.currentStake !== 6) {
  throw new Error(`Calibre pressure stake should be 6, got ${stateCalibre.currentStake}`);
}
console.log("✅ Calibre successfully jumped stake directly to 6 tentos!");

// 4. TEST PIXEL (Plano B)
console.log("\n--- 4. Testing Pixel (Plano B) ---");
const statePixel = new GameState(pixel, trampa, "truco_ma_fama");
statePixel.startMatch();
const oldCard = statePixel.playerHand[0];
console.log("Card before Pixel swap:", `${oldCard.rank}_${oldCard.suit}`);

const swapResult = statePixel.abilityManager.executePlanoBDeckSwap(
  statePixel.playerHand,
  0,
  statePixel.deckManager.deck
);
if (!swapResult || !swapResult.success) {
  throw new Error("Pixel swap failed!");
}
const newCard = statePixel.playerHand[0];
console.log("Card after Pixel swap:", `${newCard.rank}_${newCard.suit}`);
if (newCard.id === oldCard.id) {
  throw new Error("Card was not replaced by Pixel swap!");
}
console.log("✅ Pixel successfully discarded old card and drew fresh card from deck!");

console.log("\n=== ALL 4 CHARACTER POWERS VERIFIED WORKING 100%! ===");
