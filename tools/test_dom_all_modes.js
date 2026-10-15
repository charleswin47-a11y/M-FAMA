import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import WebSocket from "ws";

const htmlContent = fs.readFileSync(path.resolve("index.html"), "utf-8");

async function runDomTest() {
  console.log("==================================================");
  console.log("MÁ FAMA - IN-DEPTH DOM & CLIENT SIMULATION TEST");
  console.log("==================================================");

  // Set up JSDOM with WebSocket and audio stubs
  const dom = new JSDOM(htmlContent, {
    url: "http://localhost:3000/",
    runScripts: "dangerously",
    resources: "usable"
  });

  const { window } = dom;
  const { document } = window;
  global.window = window;
  global.document = document;
  Object.defineProperty(global, "navigator", { value: window.navigator, configurable: true, writable: true });
  global.HTMLElement = window.HTMLElement;
  global.localStorage = window.localStorage;
  global.WebSocket = WebSocket;
  window.WebSocket = WebSocket;
  const mockParam = () => ({
    value: 1,
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    linearRampToValueAtTime: () => {}
  });

  window.AudioContext = class {
    constructor() { this.destination = {}; this.currentTime = 0; }
    createGain() { return { gain: mockParam(), connect: () => {} }; }
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: mockParam() }; }
    createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {}, loop: false, buffer: null }; }
    createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
    createBiquadFilter() { return { connect: () => {}, frequency: mockParam(), Q: mockParam() }; }
  };
  global.AudioContext = window.AudioContext;
  window.webkitAudioContext = window.AudioContext;
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.load = () => {};

  // Import app
  const { MaFamaApp } = await import("../src/app.js");
  const app = new MaFamaApp();

  console.log("1. App initialized.");
  const menuScreen = document.getElementById("menu-screen");
  const tableScreen = document.getElementById("table-screen");
  const btnStartGame = document.getElementById("btn-start-game");
  const hintBtn = document.getElementById("btn-show-hint");
  const hintPanel = document.getElementById("hint-panel");
  const btnSettingsLobby = document.getElementById("btn-open-settings-menu");
  const settingsModal = document.getElementById("settings-modal");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const btnLeaveTable = document.getElementById("btn-leave-table");

  if (!menuScreen.classList.contains("active")) {
    throw new Error("Lobby screen should be active on startup!");
  }
  console.log("2. Lobby screen is active.");

  // Test Settings modal
  btnSettingsLobby.click();
  if (!settingsModal.classList.contains("active")) {
    throw new Error("Settings modal should open on click!");
  }
  console.log("3. Settings modal opened successfully.");
  btnCloseSettings.click();
  if (settingsModal.classList.contains("active")) {
    throw new Error("Settings modal should close on close click!");
  }
  console.log("4. Settings modal closed.");

  // Wait 1s for WS connection
  await new Promise(r => setTimeout(r, 1200));

  const modesToTest = [
    { id: "truco_paulista", el: document.getElementById("mode-truco-paulista"), expectedCards: 3 },
    { id: "truco_ma_fama", el: document.getElementById("mode-truco-ma-fama"), expectedCards: 3, hasAbility: true },
    { id: "sueca_tradicional", el: document.getElementById("mode-sueca-tradicional"), expectedCards: 10 },
    { id: "sueca_ma_fama", el: document.getElementById("mode-sueca-ma-fama"), expectedCards: 10, hasAbility: true }
  ];

  for (const mode of modesToTest) {
    console.log(`\n--- TESTING CLIENT START FOR: ${mode.id} ---`);
    mode.el.click();
    console.log(`Selected mode: ${app.selectedRuleset}`);

    // Click INICIAR PARTIDA
    btnStartGame.click();
    console.log("Clicked 'INICIAR PARTIDA'");

    // Wait for room setup and hand deal
    await new Promise(r => setTimeout(r, 1500));

    if (!tableScreen.classList.contains("active")) {
      throw new Error(`Failed to enter table screen for mode: ${mode.id}`);
    }
    console.log(`[PASS] Table screen is active for ${mode.id}!`);

    const handCards = document.querySelectorAll("#player-hand-cards .hand-card-wrapper");
    console.log(`Player hand cards rendered: ${handCards.length} (expected ${mode.expectedCards})`);
    if (handCards.length !== mode.expectedCards) {
      throw new Error(`Expected ${mode.expectedCards} cards in hand for ${mode.id}, got ${handCards.length}`);
    }
    console.log(`[PASS] Correct hand cards count rendered for ${mode.id}!`);

    // Test DICA (Conselheiro)
    hintBtn.click();
    const advisorPanel = document.getElementById("hint-advisor-panel");
    if (!advisorPanel || !advisorPanel.classList.contains("visible")) {
      throw new Error(`Hint panel did not open for mode ${mode.id}`);
    }
    const hintTitle = document.getElementById("hint-suggestion-title")?.textContent;
    const hintBody = document.getElementById("hint-suggestion-main")?.textContent;
    console.log(`[PASS] Hint panel opened with advice: "${hintTitle}" -> ${hintBody?.slice(0, 50)}...`);
    app.hintPanel.hide();

    // Test Ability button if Má Fama mode
    if (mode.hasAbility) {
      const btnAbility = document.getElementById("btn-ability-action");
      if (btnAbility && btnAbility.style.display !== "none") {
        console.log(`[PASS] Ability button '${btnAbility.textContent.trim()}' is visible for ${mode.id}`);
        btnAbility.click();
        const abilityModal = document.getElementById("ability-modal");
        if (abilityModal.classList.contains("active")) {
          console.log(`[PASS] Ability modal opened successfully for ${mode.id}`);
          document.getElementById("btn-close-ability")?.click();
        }
      }
    }

    // Leave table back to lobby
    btnLeaveTable.click();
    if (!menuScreen.classList.contains("active") || tableScreen.classList.contains("active")) {
      throw new Error("Failed to return to lobby menu!");
    }
    console.log(`[PASS] Returned to lobby successfully.`);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\n==================================================");
  console.log("ALL 4 MODES VERIFIED AND PASSING 100% IN CLIENT DOM!");
  console.log("==================================================");
  process.exit(0);
}

runDomTest().catch(err => {
  console.error("DOM TEST FAILED:", err);
  process.exit(1);
});
