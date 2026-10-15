// Automated End-to-End Test for Multiplayer WebSocket Rooms
import { WebSocket } from 'ws';

const WS_URL = 'ws://localhost:3000';

async function runMultiplayerTest() {
  console.log('--- STARTING MULTIPLAYER TEST ---');

  // Client 1: Host (Trampa)
  const client1 = new WebSocket(WS_URL);
  let roomCode = null;
  let client1Id = null;
  let client2Id = null;

  await new Promise(resolve => client1.on('open', resolve));
  console.log('Client 1 connected to server');

  // Client 1 creates room
  client1.send(JSON.stringify({
    type: 'CREATE_ROOM',
    mode: 'sueca_tradicional',
    playerName: 'Host Trampa',
    charId: 'trampa'
  }));

  // Wait for room creation response
  await new Promise(resolve => {
    client1.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ROOM_CREATED') {
        roomCode = msg.roomCode;
        client1Id = msg.playerId;
        console.log(`[PASS] Room created successfully! Code: ${roomCode}, HostId: ${client1Id}`);
        resolve();
      }
    });
  });

  // Client 2: Friend (Veneno)
  const client2 = new WebSocket(WS_URL);
  await new Promise(resolve => client2.on('open', resolve));
  console.log('Client 2 connected to server');

  // Client 2 joins room with code
  client2.send(JSON.stringify({
    type: 'JOIN_ROOM',
    roomCode: roomCode,
    playerName: 'Friend Veneno',
    charId: 'veneno'
  }));

  // Wait for join response
  await new Promise(resolve => {
    client2.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ROOM_JOINED') {
        client2Id = msg.playerId;
        console.log(`[PASS] Client 2 joined room! Code: ${msg.roomCode}, PlayerId: ${client2Id}`);
        resolve();
      }
    });
  });

  // Client 1 fills remaining seats with bots
  console.log('Filling remaining seats with bots...');
  client1.send(JSON.stringify({ type: 'FILL_BOTS' }));

  // Client 1 starts match
  console.log('Host starts match...');
  client1.send(JSON.stringify({ type: 'START_MATCH' }));

  // Verify match start on Client 1 and Client 2
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for match start')), 5000);

    let c1Ready = false;
    let c2Ready = false;

    client1.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ROOM_UPDATE' && msg.status === 'PLAYING') {
        const me = msg.players.find(p => p.id === client1Id);
        console.log(`[PASS] Client 1 received hand! Cards count: ${me.hand.length}, Trump: ${msg.trumpSuit}`);
        c1Ready = true;
        if (c1Ready && c2Ready) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });

    client2.on('message', data => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ROOM_UPDATE' && msg.status === 'PLAYING') {
        const me = msg.players.find(p => p.id === client2Id);
        console.log(`[PASS] Client 2 received hand! Cards count: ${me.hand.length}, Trump: ${msg.trumpSuit}`);
        c2Ready = true;
        if (c1Ready && c2Ready) {
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  console.log('--- ALL MULTIPLAYER TESTS PASSED (100% SUCCESS) ---');
  client1.close();
  client2.close();
  process.exit(0);
}

runMultiplayerTest().catch(err => {
  console.error('[FAIL] Multiplayer test error:', err);
  process.exit(1);
});
