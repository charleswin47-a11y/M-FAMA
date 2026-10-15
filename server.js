// MÁ FAMA - Master Authoritative Multiplayer Server (Node.js + WebSockets)
// Supports Sueca Tradicional (4 players, 2 pairs, 10 cards each, trump suit),
// Sueca MÁ FAMA (powers), and Truco Paulista with real-time private rooms.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 3000;

// MIME types for static files
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg"
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split("?")[0];
  if (reqUrl === "/") reqUrl = "/index.html";

  const safePath = path.normalize(decodeURIComponent(reqUrl)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

// =========================================================================
// Real-time Authoritative Game Engine for Rooms
// =========================================================================
const wss = new WebSocketServer({ server });
const rooms = new Map();

const SUITS = [
  { id: "clubs", name: "Paus", symbol: "♣", manilhaPriority: 4 },
  { id: "hearts", name: "Copas", symbol: "♥", manilhaPriority: 3 },
  { id: "spades", name: "Espadas", symbol: "♠", manilhaPriority: 2 },
  { id: "diamonds", name: "Ouros", symbol: "♦", manilhaPriority: 1 }
];

const MANILHA_CYCLE = ["4", "5", "6", "7", "q", "j", "k", "a", "2", "3"];
const TRUCO_STRENGTH = { "4": 1, "5": 2, "6": 3, "7": 4, "q": 5, "j": 6, "k": 7, "a": 8, "2": 9, "3": 10 };

// SUECA card values and trick strength
const SUECA_VALUES = { "a": 11, "7": 10, "k": 4, "j": 3, "q": 2, "6": 0, "5": 0, "4": 0, "3": 0, "2": 0 };
const SUECA_STRENGTH = { "a": 10, "7": 9, "k": 8, "j": 7, "q": 6, "6": 5, "5": 4, "4": 3, "3": 2, "2": 1 };

const BOT_PRESETS = [
  { name: "Veneno", charId: "veneno" },
  { name: "Calibre", charId: "calibre" },
  { name: "Pixel", charId: "pixel" },
  { name: "Dona Trambique", charId: "trambique" }
];

function generateRoomCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MAFAMA-${num}`;
}

function buildFreshDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of MANILHA_CYCLE) {
      deck.push({
        id: `${rank}_${suit.id}`,
        rank,
        suit: suit.id,
        suitSymbol: suit.symbol,
        faceAsset: `assets/art/cards/faces/${rank}_${suit.id}.png`
      });
    }
  }
  // Shuffle Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getTrucoCardPower(card, manilhaRank) {
  if (!card || !card.rank) return 0;
  if (card.rank.toLowerCase() === (manilhaRank || "").toLowerCase()) {
    const p = card.suit === "clubs" ? 4 : card.suit === "hearts" ? 3 : card.suit === "spades" ? 2 : 1;
    return 100 + p;
  }
  return TRUCO_STRENGTH[card.rank.toLowerCase()] || 0;
}

// Broadcast room state with hidden cards for opponents
function broadcastRoom(room) {
  if (!rooms.has(room.code)) return;
  room.players.forEach((p, idx) => {
    if (p.isBot || !p.ws || p.ws.readyState !== WebSocket.OPEN) return;

    const sanitizedPlayers = room.players.map((other, otherIdx) => ({
      id: other.id,
      index: otherIdx,
      name: other.name,
      charId: other.charId,
      isHost: other.isHost,
      isReady: other.isReady,
      isBot: other.isBot,
      team: otherIdx % 2 === 0 ? "teamA" : "teamB", // 0 & 2 (Team A), 1 & 3 (Team B)
      cardsCount: other.hand ? other.hand.length : 0,
      // Hand is strictly secret: only the player themselves receives their own cards
      hand: other.id === p.id ? other.hand : null
    }));

    const msg = {
      type: "ROOM_UPDATE",
      roomCode: room.code,
      mode: room.mode, // "sueca_tradicional", "sueca_ma_fama", "truco_paulista", "truco_ma_fama"
      status: room.status, // "LOBBY", "PLAYING", "RAISE_PENDING", "TRICK_RESOLVED", "ROUND_OVER", "MATCH_OVER"
      trumpSuit: room.trumpSuit,
      trumpCard: room.trumpCard,
      viraCard: room.viraCard,
      manilhaRank: room.manilhaRank,
      turnPlayerId: room.turnPlayerId,
      turnPlayerIndex: room.turnPlayerIndex,
      leadSuit: room.leadSuit,
      currentTrick: room.currentTrick,
      tableCards: room.tableCards,
      teamAScore: room.teamAScore, // Match Tentos (Target: 12 no Truco, 4 na Sueca)
      teamBScore: room.teamBScore,
      teamAPoints: room.teamAPoints, // Round card points in Sueca (out of 120)
      teamBPoints: room.teamBPoints,
      currentStake: room.currentStake || 1,
      trickWinners: room.trickWinners || [],
      pendingRaise: room.pendingRaise || null,
      lastTrickWinner: room.lastTrickWinner,
      players: sanitizedPlayers,
      winner: room.matchWinner,
      announcement: room.announcement
    };

    p.ws.send(JSON.stringify(msg));
  });
}

// Start a new hand in the room
function startRoomHand(room) {
  room.status = "PLAYING";
  room.currentTrick = 0;
  room.tableCards = [];
  room.leadSuit = null;
  room.teamAPoints = 0;
  room.teamBPoints = 0;
  room.teamAWonCards = [];
  room.teamBWonCards = [];
  room.currentStake = 1;
  room.trickWinners = [];
  room.pendingRaise = null;
  room.lastRaiserTeam = null;
  room.announcement = "Nova mão distribuída!";

  const deck = buildFreshDeck();

  if (room.mode.startsWith("sueca")) {
    // SUECA: 40 cards dealt entirely (10 cards for each of the 4 players)
    room.trumpCard = deck[deck.length - 1]; // Carteador turns the trump
    room.trumpSuit = room.trumpCard.suit;
    room.viraCard = room.trumpCard;

    room.players.forEach(p => {
      p.hand = [];
      for (let i = 0; i < 10; i++) {
        p.hand.push(deck.pop());
      }
      p.hand.sort((a, b) => {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return (SUECA_STRENGTH[b.rank.toLowerCase()] || 0) - (SUECA_STRENGTH[a.rank.toLowerCase()] || 0);
      });
    });
  } else {
    // TRUCO: 3 cards per player, 1 vira
    room.trumpCard = null;
    room.trumpSuit = null;
    room.players.forEach(p => {
      p.hand = [deck.pop(), deck.pop(), deck.pop()];
    });
    room.viraCard = deck.pop();
    const vRank = room.viraCard.rank.toLowerCase();
    const idx = MANILHA_CYCLE.indexOf(vRank);
    room.manilhaRank = MANILHA_CYCLE[(idx + 1) % MANILHA_CYCLE.length];
  }

  // Rotate dealer
  room.dealerIndex = (room.dealerIndex !== undefined ? room.dealerIndex + 1 : 0) % room.players.length;
  room.turnPlayerIndex = (room.dealerIndex + 1) % room.players.length;
  room.turnPlayerId = room.players[room.turnPlayerIndex].id;

  broadcastRoom(room);

  // If current player is bot, trigger play
  triggerBotTurnIfNeeded(room);
}

// Bot auto-play logic
function triggerBotTurnIfNeeded(room) {
  if (!rooms.has(room.code) || room.status !== "PLAYING") return;
  const currentP = room.players[room.turnPlayerIndex];
  if (!currentP || !currentP.isBot) return;

  setTimeout(() => {
    executeBotPlay(room, currentP);
  }, 900 + Math.random() * 400);
}

function executeBotPlay(room, botPlayer) {
  if (!rooms.has(room.code) || room.status !== "PLAYING" || room.turnPlayerId !== botPlayer.id || !botPlayer.hand.length) return;

  let chosenIdx = 0;
  if (room.mode.startsWith("sueca") && room.leadSuit) {
    const leadCards = [];
    botPlayer.hand.forEach((c, idx) => {
      if (c.suit === room.leadSuit) leadCards.push(idx);
    });

    if (leadCards.length > 0) {
      chosenIdx = leadCards[Math.floor(Math.random() * leadCards.length)];
    } else {
      chosenIdx = Math.floor(Math.random() * botPlayer.hand.length);
    }
  } else {
    chosenIdx = Math.floor(Math.random() * botPlayer.hand.length);
  }

  handlePlayerCardPlay(room, botPlayer.id, chosenIdx);
}

// Card play handler
function handlePlayerCardPlay(room, playerId, cardIndex) {
  if (room.status !== "PLAYING" || room.turnPlayerId !== playerId) return;

  const pIdx = room.players.findIndex(x => x.id === playerId);
  const p = room.players[pIdx];
  if (!p || !p.hand || cardIndex < 0 || cardIndex >= p.hand.length) return;

  const playedCard = p.hand[cardIndex];

  // In Sueca, check rule of following suit (assistir)
  if (room.mode.startsWith("sueca") && room.leadSuit) {
    if (playedCard.suit !== room.leadSuit) {
      const hasLead = p.hand.some(c => c.suit === room.leadSuit);
      if (hasLead) {
        if (!p.isBot && p.ws) {
          p.ws.send(JSON.stringify({ type: "ERROR", message: "Você é obrigado a assistir ao naipe da puxada!" }));
        }
        return;
      }
    }
  }

  // Remove card from player's hand
  p.hand.splice(cardIndex, 1);

  if (room.tableCards.length === 0) {
    room.leadSuit = playedCard.suit;
  }

  room.tableCards.push({
    playerId: p.id,
    playerIndex: pIdx,
    playerName: p.name,
    card: playedCard
  });

  // If all 4 players played, resolve trick
  if (room.tableCards.length === room.players.length) {
    resolveTrick(room);
  } else {
    // Advance to next player
    room.turnPlayerIndex = (room.turnPlayerIndex + 1) % room.players.length;
    room.turnPlayerId = room.players[room.turnPlayerIndex].id;
    broadcastRoom(room);
    triggerBotTurnIfNeeded(room);
  }
}

// Resolve trick completion
function resolveTrick(room) {
  let winningEntry = room.tableCards[0];
  let isTie = false;

  if (room.mode.startsWith("sueca")) {
    const leadSuit = room.leadSuit;
    const trumpSuit = room.trumpSuit;

    for (let i = 1; i < room.tableCards.length; i++) {
      const candidate = room.tableCards[i];
      const winCard = winningEntry.card;
      const canCard = candidate.card;

      const winIsTrump = winCard.suit === trumpSuit;
      const canIsTrump = canCard.suit === trumpSuit;

      if (canIsTrump && !winIsTrump) {
        winningEntry = candidate;
      } else if (canIsTrump && winIsTrump) {
        if (SUECA_STRENGTH[canCard.rank.toLowerCase()] > SUECA_STRENGTH[winCard.rank.toLowerCase()]) {
          winningEntry = candidate;
        }
      } else if (!canIsTrump && !winIsTrump) {
        if (canCard.suit === leadSuit && winCard.suit === leadSuit) {
          if (SUECA_STRENGTH[canCard.rank.toLowerCase()] > SUECA_STRENGTH[winCard.rank.toLowerCase()]) {
            winningEntry = candidate;
          }
        }
      }
    }

    room.lastTrickWinner = winningEntry.playerName;
    const isTeamA = winningEntry.playerIndex % 2 === 0;

    let trickPoints = 0;
    room.tableCards.forEach(tc => {
      const val = SUECA_VALUES[tc.card.rank.toLowerCase()] || 0;
      trickPoints += val;
      if (isTeamA) room.teamAWonCards.push(tc.card);
      else room.teamBWonCards.push(tc.card);
    });

    if (isTeamA) room.teamAPoints += trickPoints;
    else room.teamBPoints += trickPoints;

    room.announcement = `${winningEntry.playerName} levou a vaza (+${trickPoints} pts)!`;
    room.turnPlayerIndex = winningEntry.playerIndex;
    room.turnPlayerId = winningEntry.playerId;

  } else {
    // TRUCO PAULISTA Trick Resolution (4 players)
    let highestPower = getTrucoCardPower(room.tableCards[0].card, room.manilhaRank);
    winningEntry = room.tableCards[0];

    for (let i = 1; i < room.tableCards.length; i++) {
      const tc = room.tableCards[i];
      const pwr = getTrucoCardPower(tc.card, room.manilhaRank);
      if (pwr > highestPower) {
        highestPower = pwr;
        winningEntry = tc;
        isTie = false;
      } else if (pwr === highestPower) {
        // Tied between opposing teams (canga)
        if (tc.playerIndex % 2 !== winningEntry.playerIndex % 2) {
          isTie = true;
        }
      }
    }

    if (isTie) {
      room.trickWinners.push("tie");
      room.lastTrickWinner = "Empate (Canga)";
      room.announcement = "Vaza empatada (cangou)!";
      // On tie, starter of previous trick remains or rotates
    } else {
      const isTeamA = winningEntry.playerIndex % 2 === 0;
      room.trickWinners.push(isTeamA ? "teamA" : "teamB");
      room.lastTrickWinner = winningEntry.playerName;
      room.announcement = `${winningEntry.playerName} fez a vaza!`;
      room.turnPlayerIndex = winningEntry.playerIndex;
      room.turnPlayerId = winningEntry.playerId;
    }
  }

  room.status = "TRICK_RESOLVED";
  broadcastRoom(room);

  // Clear trick and evaluate next step
  setTimeout(() => {
    room.tableCards = [];
    room.leadSuit = null;
    room.currentTrick++;
    room.status = "PLAYING";

    if (room.mode.startsWith("sueca")) {
      if (room.currentTrick >= 10) {
        finishHand(room);
      } else {
        broadcastRoom(room);
        triggerBotTurnIfNeeded(room);
      }
    } else {
      // Truco hand resolution check (up to 3 tricks)
      const handResult = checkTrucoHandStatus(room.trickWinners);
      if (handResult.finished || room.currentTrick >= 3) {
        finishTrucoHand(room, handResult.winner);
      } else {
        broadcastRoom(room);
        triggerBotTurnIfNeeded(room);
      }
    }
  }, 1400);
}

function checkTrucoHandStatus(winners) {
  const teamAWins = winners.filter(w => w === "teamA").length;
  const teamBWins = winners.filter(w => w === "teamB").length;
  const ties = winners.filter(w => w === "tie").length;
  const count = winners.length;

  if (teamAWins >= 2) return { finished: true, winner: "teamA" };
  if (teamBWins >= 2) return { finished: true, winner: "teamB" };

  if (count === 2 && winners[1] === "tie" && winners[0] !== "tie") {
    return { finished: true, winner: winners[0] };
  }
  if (count === 2 && winners[0] === "tie" && winners[1] !== "tie") {
    return { finished: true, winner: winners[1] };
  }
  if (count === 3) {
    if (teamAWins > teamBWins) return { finished: true, winner: "teamA" };
    if (teamBWins > teamAWins) return { finished: true, winner: "teamB" };
    if (winners[0] !== "tie") return { finished: true, winner: winners[0] };
    return { finished: true, winner: null };
  }

  return { finished: false, winner: null };
}

function finishTrucoHand(room, winnerTeam) {
  room.status = "ROUND_OVER";
  const stake = room.currentStake || 1;

  if (winnerTeam === "teamA") {
    room.teamAScore += stake;
    room.announcement = `Sua Dupla venceu a mão (+${stake} tentos)!`;
  } else if (winnerTeam === "teamB") {
    room.teamBScore += stake;
    room.announcement = `Adversários venceram a mão (+${stake} tentos)!`;
  } else {
    room.announcement = `Mão empatada! Nenhum ponto concedido.`;
  }

  if (room.teamAScore >= 12) {
    room.status = "MATCH_OVER";
    room.matchWinner = "Sua Dupla (12 Tentos)";
  } else if (room.teamBScore >= 12) {
    room.status = "MATCH_OVER";
    room.matchWinner = "Adversários (12 Tentos)";
  } else {
    setTimeout(() => {
      startRoomHand(room);
    }, 2800);
  }

  broadcastRoom(room);
}

// Finish round and award match tentos in Sueca
function finishHand(room) {
  room.status = "ROUND_OVER";

  if (room.teamAPoints > 60) {
    const tents = room.teamAPoints === 120 ? 4 : room.teamAPoints >= 91 ? 2 : 1;
    room.teamAScore += tents;
    room.announcement = `Sua Dupla venceu a mão com ${room.teamAPoints} pts (+${tents} tentos)!`;
  } else if (room.teamBPoints > 60) {
    const tents = room.teamBPoints === 120 ? 4 : room.teamBPoints >= 91 ? 2 : 1;
    room.teamBScore += tents;
    room.announcement = `Adversários venceram com ${room.teamBPoints} pts (+${tents} tentos)!`;
  } else {
    room.announcement = `Empate a 60 pontos! Ninguém pontua.`;
  }

  const targetTentos = 4;
  if (room.teamAScore >= targetTentos) {
    room.status = "MATCH_OVER";
    room.matchWinner = "Sua Dupla (Sul & Norte)";
  } else if (room.teamBScore >= targetTentos) {
    room.status = "MATCH_OVER";
    room.matchWinner = "Adversários (Oeste & Leste)";
  } else {
    setTimeout(() => {
      startRoomHand(room);
    }, 2800);
  }

  broadcastRoom(room);
}


function handleServerRaiseResponse(room, responderId, decision) {
  if (!room.pendingRaise) return;
  const responder = room.players.find(x => x.id === responderId) || room.players[0];

  if (decision === "accept") {
    room.currentStake = room.pendingRaise.proposedStake;
    room.announcement = `${responder.name} aceitou o desafio! Mão vale ${room.currentStake} tentos.`;
    room.pendingRaise = null;
    room.status = "PLAYING";
    broadcastRoom(room);
    triggerBotTurnIfNeeded(room);
  } else if (decision === "fold") {
    const winningTeam = room.pendingRaise.challengerTeam;
    room.announcement = `${responder.name} correu! ${winningTeam === "teamA" ? "Sua Dupla" : "Adversários"} leva a mão.`;
    finishTrucoHand(room, winningTeam);
  } else if (decision === "raise") {
    const nextStake = room.pendingRaise.proposedStake + 3;
    if (nextStake <= 12) {
      const respIdx = room.players.findIndex(x => x.id === responderId);
      const respTeam = respIdx % 2 === 0 ? "teamA" : "teamB";
      room.pendingRaise = {
        challengerId: responderId,
        challengerName: responder.name,
        challengerTeam: respTeam,
        proposedStake: nextStake
      };
      room.lastRaiserTeam = respTeam;
      room.announcement = `${responder.name} retrucou: pediu ${nextStake === 6 ? "SEIS!" : nextStake === 9 ? "NOVE!" : "DOZE!"}`;
      broadcastRoom(room);
    }
  }
}

// WebSocket Connection handling
wss.on("connection", ws => {
  let playerRoomCode = null;
  let playerId = null;

  ws.on("message", raw => {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        // 1. Create Room (Solo or Multiplayer)
        case "CREATE_ROOM": {
          if (playerRoomCode && rooms.has(playerRoomCode)) {
            rooms.delete(playerRoomCode);
          }

          const code = generateRoomCode();
          playerId = `p_${Math.random().toString(36).substr(2, 6)}`;
          playerRoomCode = code;

          const room = {
            code,
            mode: data.mode || "sueca_tradicional",
            status: "LOBBY",
            players: [
              {
                id: playerId,
                name: data.playerName || "Você",
                charId: data.charId || "trampa",
                isHost: true,
                isReady: true,
                isBot: false,
                hand: [],
                ws
              }
            ],
            teamAScore: 0,
            teamBScore: 0,
            teamAPoints: 0,
            teamBPoints: 0,
            teamAWonCards: [],
            teamBWonCards: [],
            tableCards: []
          };

          rooms.set(code, room);
          ws.send(JSON.stringify({ type: "ROOM_CREATED", roomCode: code, playerId, solo: !!data.solo }));

          if (data.solo) {
            const allChars = [
              { name: "Trampa", charId: "trampa" },
              { name: "Veneno", charId: "veneno" },
              { name: "Calibre", charId: "calibre" },
              { name: "Pixel", charId: "pixel" }
            ];
            const chosenCharId = data.charId || "trampa";
            const remaining = allChars.filter(c => c.charId !== chosenCharId);

            // West (Rival 1), North (Partner), East (Rival 2)
            const botList = [
              { name: remaining[0].name, charId: remaining[0].charId },
              { name: `${remaining[1].name} (Parceiro)`, charId: remaining[1].charId },
              { name: remaining[2].name, charId: remaining[2].charId }
            ];
            botList.forEach(b => {
              room.players.push({
                id: `bot_${Math.random().toString(36).substr(2, 6)}`,
                name: b.name,
                charId: b.charId,
                isHost: false,
                isReady: true,
                isBot: true,
                hand: [],
                ws: null
              });
            });
            startRoomHand(room);
          } else {
            broadcastRoom(room);
          }
          break;
        }

        // 1b. Truco Raise
        case "PROPOSE_RAISE": {
          const room = rooms.get(playerRoomCode);
          if (!room || room.status !== "PLAYING") return;
          const pIdx = room.players.findIndex(x => x.id === playerId);
          const p = room.players[pIdx];
          const team = pIdx % 2 === 0 ? "teamA" : "teamB";

          if (room.lastRaiserTeam === team) return;

          const currentSt = room.currentStake || 1;
          const nextStake = currentSt === 1 ? 3 : currentSt === 3 ? 6 : currentSt === 6 ? 9 : 12;

          room.pendingRaise = {
            challengerId: playerId,
            challengerName: p.name,
            challengerTeam: team,
            proposedStake: nextStake
          };
          room.lastRaiserTeam = team;
          room.status = "RAISE_PENDING";
          room.announcement = `${p.name} pediu ${nextStake === 3 ? "TRUCO!" : nextStake === 6 ? "SEIS!" : nextStake === 9 ? "NOVE!" : "DOZE!"}`;
          broadcastRoom(room);

          // If responding team contains bots, trigger bot response
          const rivalTeam = team === "teamA" ? "teamB" : "teamA";
          const rivalBots = room.players.filter((rp, rIdx) => (rIdx % 2 === (rivalTeam === "teamA" ? 0 : 1)) && rp.isBot);
          if (rivalBots.length > 0) {
            setTimeout(() => {
              const r = Math.random();
              const decision = r < 0.2 && nextStake < 12 ? "raise" : r < 0.35 ? "fold" : "accept";
              handleServerRaiseResponse(room, rivalBots[0].id, decision);
            }, 1200);
          }
          break;
        }

        case "RESPOND_RAISE": {
          const room = rooms.get(playerRoomCode);
          if (!room || room.status !== "RAISE_PENDING") return;
          handleServerRaiseResponse(room, playerId, data.decision);
          break;
        }

        // 2. Join Room
        case "JOIN_ROOM": {
          const codeInput = (data.roomCode || "").trim().toUpperCase();
          const room = rooms.get(codeInput);

          if (!room) {
            ws.send(JSON.stringify({ type: "ERROR", message: `Sala "${codeInput}" não encontrada. Verifique o código.` }));
            return;
          }

          if (room.players.length >= 4) {
            ws.send(JSON.stringify({ type: "ERROR", message: "A sala já está cheia (máx 4 jogadores)." }));
            return;
          }

          playerId = `p_${Math.random().toString(36).substr(2, 6)}`;
          playerRoomCode = room.code;

          room.players.push({
            id: playerId,
            name: data.playerName || `Jogador ${room.players.length + 1}`,
            charId: data.charId || "veneno",
            isHost: false,
            isReady: false,
            isBot: false,
            hand: [],
            ws
          });

          ws.send(JSON.stringify({ type: "ROOM_JOINED", roomCode: room.code, playerId }));
          broadcastRoom(room);
          break;
        }

        // 3. Fill Bots (host can complete 4 seats with AI)
        case "FILL_BOTS": {
          const room = rooms.get(playerRoomCode);
          if (!room || room.status !== "LOBBY") return;

          const needed = 4 - room.players.length;
          for (let i = 0; i < needed; i++) {
            const preset = BOT_PRESETS[i % BOT_PRESETS.length];
            room.players.push({
              id: `bot_${Math.random().toString(36).substr(2, 6)}`,
              name: `${preset.name} (Bot)`,
              charId: preset.charId,
              isHost: false,
              isReady: true,
              isBot: true,
              hand: [],
              ws: null
            });
          }

          broadcastRoom(room);
          break;
        }

        // 4. Toggle Ready
        case "TOGGLE_READY": {
          const room = rooms.get(playerRoomCode);
          if (room) {
            const p = room.players.find(x => x.id === playerId);
            if (p) p.isReady = !p.isReady;
            broadcastRoom(room);
          }
          break;
        }

        // 5. Start Match (Host only, minimum 2 players or filled with bots)
        case "START_MATCH": {
          const room = rooms.get(playerRoomCode);
          if (!room || room.players[0].id !== playerId) return;

          // Auto-fill remaining seats if less than 4 for 4-player Sueca
          if (room.players.length < 4) {
            const needed = 4 - room.players.length;
            for (let i = 0; i < needed; i++) {
              const preset = BOT_PRESETS[i % BOT_PRESETS.length];
              room.players.push({
                id: `bot_${Math.random().toString(36).substr(2, 6)}`,
                name: `${preset.name} (Bot)`,
                charId: preset.charId,
                isHost: false,
                isReady: true,
                isBot: true,
                hand: [],
                ws: null
              });
            }
          }

          startRoomHand(room);
          break;
        }

        // 6. Play Card
        case "PLAY_CARD": {
          const room = rooms.get(playerRoomCode);
          if (room) {
            handlePlayerCardPlay(room, playerId, data.cardIndex);
          }
          break;
        }

        // 7. Leave Room
        case "LEAVE_ROOM": {
          if (playerRoomCode && rooms.has(playerRoomCode)) {
            const room = rooms.get(playerRoomCode);
            room.players = room.players.filter(p => p.id !== playerId);
            if (room.players.length === 0 || room.players.every(p => p.isBot)) {
              rooms.delete(playerRoomCode);
            } else {
              broadcastRoom(room);
            }
          }
          playerRoomCode = null;
          playerId = null;
          break;
        }
      }
    } catch (e) {
      console.error("WS error:", e.message);
    }
  });

  ws.on("close", () => {
    if (playerRoomCode && rooms.has(playerRoomCode)) {
      const room = rooms.get(playerRoomCode);
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0 || room.players.every(p => p.isBot)) {
        rooms.delete(playerRoomCode);
      } else {
        broadcastRoom(room);
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MÁ FAMA Server & Real-time Multiplayer running at http://localhost:${PORT}`);
});
