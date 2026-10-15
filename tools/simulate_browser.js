import fs from 'fs';
import { JSDOM } from 'jsdom';

console.log('--- TESTING JSDOM BROWSER SIMULATION ---');

const html = fs.readFileSync('index.html', 'utf8');

// Create JSDOM with virtual console
const virtualConsole = new (await import('jsdom')).VirtualConsole();
virtualConsole.on('error', (err) => {
  console.error('[BROWSER ERROR]', err);
});
virtualConsole.on('log', (msg) => {
  console.log('[BROWSER LOG]', msg);
});

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost:3000/',
  virtualConsole
});

const { window } = dom;

// Polyfill AudioContext and WebSocket
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(100) };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
      loop: false
    };
  }
  createBiquadFilter() {
    return {
      type: '',
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: () => {}
    };
  }
  resume() {}
}

window.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;

// Import app.js dynamically inside JSDOM environment
import('ws').then(async ({ WebSocket }) => {
  window.WebSocket = WebSocket;

  // Now import app.js in this context
  const appModule = await import('../src/app.js');
  console.log('App loaded in JSDOM!');

  const app = window.app;
  console.log('App initialized:', !!app);

  const modes = [
    'mode-truco-paulista',
    'mode-truco-ma-fama',
    'mode-sueca-tradicional',
    'mode-sueca-ma-fama'
  ];

  for (const modeId of modes) {
    console.log(`\nTesting click on mode: ${modeId}...`);
    const modeBtn = window.document.getElementById(modeId);
    modeBtn.click();
    console.log(`Selected ruleset: ${app.selectedRuleset}`);

    // Click INICIAR PARTIDA
    const startBtn = window.document.getElementById('btn-start-game');
    console.log('Clicking INICIAR PARTIDA...');
    startBtn.click();

    // Wait 500ms
    await new Promise(r => setTimeout(r, 600));

    // Check table screen visibility
    const tableScreen = window.document.getElementById('table-screen');
    const menuScreen = window.document.getElementById('menu-screen');
    const handCards = window.document.getElementById('player-hand-cards');

    console.log('Menu screen active:', menuScreen.classList.contains('active'));
    console.log('Table screen active:', tableScreen.classList.contains('active'));
    console.log('Player hand cards rendered:', handCards.children.length);

    if (!tableScreen.classList.contains('active') || handCards.children.length === 0) {
      console.error(`[FAILURE] Mode ${modeId} did NOT start or render cards!`);
    } else {
      console.log(`[SUCCESS] Mode ${modeId} started with ${handCards.children.length} cards!`);
    }
  }

  process.exit(0);
}).catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
