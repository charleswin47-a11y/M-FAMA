import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import WebSocket from "ws";

const htmlContent = fs.readFileSync(path.resolve("index.html"), "utf-8");

async function testCharacterSelection() {
  console.log("==================================================");
  console.log("TESTING CHARACTER SELECTION & OFFICIAL AVATARS");
  console.log("==================================================");

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

  const { CHARACTERS } = await import("../src/data/characters.js");
  await import("../src/app.js");
  const app = window.app;

  await new Promise(r => setTimeout(r, 1200));

  const charsToTest = [
    { id: "veneno", name: "Veneno" },
    { id: "calibre", name: "Calibre" },
    { id: "pixel", name: "Pixel" },
    { id: "trampa", name: "Trampa" }
  ];

  for (const c of charsToTest) {
    console.log(`\nTesting selection of: ${c.name} (${c.id})`);

    // Find and click the character card in carousel
    const charCards = document.querySelectorAll(".char-card-item");
    const targetCard = Array.from(charCards).find(card => card.textContent.includes(c.name));
    if (!targetCard) throw new Error(`Could not find card for ${c.name}`);
    targetCard.click();

    const activeApp = window.app || app;
    if (activeApp.selectedPlayerChar.id !== c.id) {
      throw new Error(`Expected selectedPlayerChar.id === ${c.id}, got ${activeApp.selectedPlayerChar.id}`);
    }
    console.log(`  -> Selected in app state: ${activeApp.selectedPlayerChar.name}`);

    // Click INICIAR PARTIDA
    document.getElementById("btn-start-game").click();

    // Wait for room and game deal
    await new Promise(r => setTimeout(r, 1400));

    // Check table screen is active
    const tableScreen = document.getElementById("table-screen");
    if (!tableScreen.classList.contains("active")) {
      throw new Error("Table screen did not open!");
    }

    // Check South seat (You)
    const playerAvatar = document.getElementById("player-avatar-img");
    const playerName = document.getElementById("player-name-txt");

    console.log(`  -> South Seat Name rendered: "${playerName.textContent}" (expected: "${c.name}")`);
    console.log(`  -> South Seat Avatar src: "${playerAvatar.src}"`);

    if (playerName.textContent !== c.name) {
      throw new Error(`Player name rendered was ${playerName.textContent}, expected ${c.name}!`);
    }

    const expectedAvatar = CHARACTERS.find(x => x.id === c.id).avatar;
    if (!playerAvatar.src.includes(expectedAvatar)) {
      throw new Error(`Player avatar was ${playerAvatar.src}, expected ${expectedAvatar}!`);
    }
    console.log(`[PASS] Character ${c.name} properly seated at South!`);

    // Leave table back to lobby
    document.getElementById("btn-leave-table").click();
    await new Promise(r => setTimeout(r, 600));
  }

  console.log("\n==================================================");
  console.log("ALL 4 CHARACTERS TESTED AND VERIFIED 100%!");
  console.log("==================================================");
  process.exit(0);
}

testCharacterSelection().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
