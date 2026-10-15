// Comprehensive Multi-mode WebSocket Verification Test
import WebSocket from "ws";

const MODES = [
  "truco_paulista",
  "truco_ma_fama",
  "sueca_tradicional",
  "sueca_ma_fama"
];

async function testMode(mode) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`TESTING MODE: ${mode}`);
    console.log(`========================================`);

    const ws = new WebSocket("ws://localhost:3000");
    let roomCode = null;
    let playerId = null;
    let myHand = [];
    let passed = false;

    const timeout = setTimeout(() => {
      ws.close();
      if (!passed) reject(new Error(`Timeout testing mode ${mode}`));
    }, 10000);

    ws.on("open", () => {
      console.log(`[WS] Connected. Sending CREATE_ROOM (solo: true, mode: ${mode})`);
      ws.send(JSON.stringify({
        type: "CREATE_ROOM",
        mode: mode,
        solo: true,
        playerName: "Trampa",
        charId: "trampa"
      }));
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw);
      console.log(`[WS RCV] ${msg.type}${msg.status ? ` (status: ${msg.status})` : ""}`);

      if (msg.type === "ROOM_CREATED") {
        roomCode = msg.roomCode;
        playerId = msg.playerId;
        console.log(`  -> Room created: ${roomCode}, PlayerId: ${playerId}, solo: ${msg.solo}`);
        if (!msg.solo) {
          clearTimeout(timeout);
          ws.close();
          return reject(new Error(`Expected msg.solo === true for solo room!`));
        }
      }

      if (msg.type === "ROOM_UPDATE") {
        console.log(`  -> Status: ${msg.status}, Mode: ${msg.mode}`);
        console.log(`  -> Players: ${msg.players.length} seated`);
        
        const me = msg.players.find(p => p.id === playerId);
        if (me && me.hand) {
          myHand = me.hand;
          console.log(`  -> My hand: ${myHand.length} cards (expected: ${mode.startsWith("sueca") ? 10 : 3})`);
        }

        if (mode.startsWith("sueca")) {
          if (myHand.length !== 10) {
            clearTimeout(timeout);
            ws.close();
            return reject(new Error(`Sueca hand must have 10 cards, got ${myHand.length}`));
          }
          if (!msg.trumpCard || !msg.trumpSuit) {
            clearTimeout(timeout);
            ws.close();
            return reject(new Error(`Sueca must have trumpCard and trumpSuit`));
          }
          console.log(`  -> Trump: ${msg.trumpCard.rank} of ${msg.trumpSuit}`);
        } else {
          if (myHand.length !== 3) {
            clearTimeout(timeout);
            ws.close();
            return reject(new Error(`Truco hand must have 3 cards, got ${myHand.length}`));
          }
          if (!msg.viraCard || !msg.manilhaRank) {
            clearTimeout(timeout);
            ws.close();
            return reject(new Error(`Truco must have viraCard and manilhaRank`));
          }
          console.log(`  -> Vira: ${msg.viraCard.rank} of ${msg.viraCard.suit}, Manilha: ${msg.manilhaRank}`);
        }

        // If it's my turn in PLAYING status, play card index 0
        if (msg.status === "PLAYING" && msg.turnPlayerId === playerId && myHand.length > 0) {
          console.log(`  -> It's my turn! Playing card index 0: ${myHand[0].rank} ${myHand[0].suit}`);
          ws.send(JSON.stringify({
            type: "PLAY_CARD",
            cardIndex: 0
          }));
        }

        // If card was played and on table, test succeeded!
        if (msg.tableCards && msg.tableCards.length > 0) {
          console.log(`  -> Card successfully placed on table! Table cards: ${msg.tableCards.length}`);
          passed = true;
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function runAll() {
  console.log("STARTING FULL MODES WEBSOCKET VALIDATION...");
  for (const mode of MODES) {
    await testMode(mode);
    await new Promise(r => setTimeout(r, 600));
  }
  console.log("\n========================================");
  console.log("ALL 4 MODES INITIALIZED & PLAYED SUCCESSFULLY!");
  console.log("========================================\n");
  process.exit(0);
}

runAll().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
