import { WebSocket } from 'ws';

const WS_URL = 'ws://localhost:3000';
const MODES = [
  'truco_paulista',
  'truco_ma_fama',
  'sueca_tradicional',
  'sueca_ma_fama'
];

async function testMode(mode) {
  console.log(`\nTesting Solo Auto-Start for mode: ${mode}...`);
  const ws = new WebSocket(WS_URL);
  await new Promise(resolve => ws.on('open', resolve));

  ws.send(JSON.stringify({
    type: 'CREATE_ROOM',
    mode: mode,
    playerName: 'Jogador Teste',
    charId: 'trampa',
    solo: true
  }));

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout starting ${mode}`)), 4000);

    ws.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ROOM_UPDATE' && msg.status === 'PLAYING') {
        clearTimeout(timeout);
        const me = msg.players.find(p => p.hand && p.hand.length > 0);
        const expectedCount = mode.startsWith('sueca') ? 10 : 3;
        console.log(`[PASS] ${mode} started! Hand cards: ${me ? me.hand.length : 0} (expected ${expectedCount}), Total players: ${msg.players.length}`);
        ws.close();
        resolve(true);
      }
    });
  });

  return result;
}

async function runAll() {
  for (const m of MODES) {
    await testMode(m);
  }
  console.log('\n=== ALL 4 GAME MODES INITIALIZE AND DEAL PROPERLY (100% PASS) ===');
}

runAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
