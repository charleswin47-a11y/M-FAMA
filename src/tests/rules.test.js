// MÁ FAMA - Automated Unit Tests Suite (GDD Section 12.2)

import { generateDeckData } from "../data/cards.js";
import { getManilhaRank, compareCards, resolveHandStatus, getFoldAward, BET_LADDER, getNextRaise } from "../core/rules.js";
import { AbilityManager } from "../core/abilities.js";

export function runAllTests() {
  const results = [];

  function assert(testName, condition, detail = "") {
    if (condition) {
      results.push({ name: testName, passed: true, detail });
      console.log(`✓ [PASS] ${testName}`);
    } else {
      results.push({ name: testName, passed: false, detail });
      console.error(`✗ [FAIL] ${testName} - ${detail}`);
    }
  }

  console.log("=== RUNNING MÁ FAMA RULE SUITE ===");

  // 1. Deck generates exactly 40 unique IDs
  const deck = generateDeckData();
  const ids = new Set(deck.map(c => c.id));
  assert("Baralho gera exatamente 40 cartas únicas", deck.length === 40 && ids.size === 40, `Cartas: ${deck.length}, Únicas: ${ids.size}`);

  // 2. Each suit has exactly the 10 expected ranks, excluding 8, 9, 10, Joker
  const suits = ["clubs", "hearts", "spades", "diamonds"];
  const expectedRanks = ["4", "5", "6", "7", "q", "j", "k", "a", "2", "3"];
  let suitsValid = true;
  for (const s of suits) {
    const suitCards = deck.filter(c => c.suit === s);
    const suitRanks = suitCards.map(c => c.rank).sort();
    if (suitCards.length !== 10) suitsValid = false;
  }
  const hasInvalidRank = deck.some(c => ["8", "9", "10", "joker"].includes(c.rank.toLowerCase()));
  assert("Cada naipe tem exatamente 10 cartas e não contém 8, 9, 10 ou Curinga", suitsValid && !hasInvalidRank);

  // 3. Circular manilha calculation, including Vira 3 -> Manilha 4
  assert("Vira 4 -> Manilha 5", getManilhaRank("4") === "5");
  assert("Vira 7 -> Manilha Q", getManilhaRank("7") === "q");
  assert("Vira K -> Manilha A", getManilhaRank("k") === "a");
  assert("Vira 3 -> Manilha 4 (Fechamento circular)", getManilhaRank("3") === "4");

  // 4. Any manilha beats any common card
  const viraCard = { rank: "7", suit: "hearts" }; // Manilha is Q
  const manilhaOuros = { rank: "q", suit: "diamonds" }; // Weakest manilha
  const strongCommon3 = { rank: "3", suit: "clubs" }; // Strongest common card
  assert("A manilha mais fraca (Q Ouros) vence a carta comum mais forte (3 Paus)", compareCards(manilhaOuros, strongCommon3, "q") === 1);

  // 5. Suit priority among manilhas: Paus > Copas > Espadas > Ouros
  const zap = { rank: "q", suit: "clubs" };
  const copas = { rank: "q", suit: "hearts" };
  const espadas = { rank: "q", suit: "spades" };
  const ouros = { rank: "q", suit: "diamonds" };
  assert("Manilha Zap (Paus) vence Copas", compareCards(zap, copas, "q") === 1);
  assert("Manilha Copas vence Espadas", compareCards(copas, espadas, "q") === 1);
  assert("Manilha Espadas vence Ouros", compareCards(espadas, ouros, "q") === 1);
  assert("Manilha Ouros perde para Zap", compareCards(ouros, zap, "q") === -1);

  // 6. Common cards of identical rank tie regardless of suit
  const threeClubs = { rank: "3", suit: "clubs" };
  const threeHearts = { rank: "3", suit: "hearts" };
  assert("Cartas comuns iguais empatam independentemente do naipe (3 ♣ vs 3 ♥)", compareCards(threeClubs, threeHearts, "4") === 0);

  // 7. Winning two tricks finishes the hand
  const statusTwoWins = resolveHandStatus(["player", "player"]);
  assert("Duas primeiras vazas ganhas encerram a mão", statusTwoWins.finished && statusTwoWins.winner === "player");

  // 8. Tie cases
  // 8.1: First trick ties, second decides
  const statusTieFirst = resolveHandStatus(["tie", "bot"]);
  assert("Empate na 1ª vaza: vencedor da 2ª leva a mão", statusTieFirst.finished && statusTieFirst.winner === "bot");

  // 8.2: First won, second tied -> winner of first takes hand
  const statusWinThenTie = resolveHandStatus(["player", "tie"]);
  assert("Venceu 1ª e 2ª empatou: vencedor da 1ª leva a mão", statusWinThenTie.finished && statusWinThenTie.winner === "player");

  // 8.3: A wins 1st, B wins 2nd, 3rd ties -> winner of 1st takes hand
  const statusSplitThenTie = resolveHandStatus(["player", "bot", "tie"]);
  assert("Cada um venceu uma vaza e a 3ª empatou: vencedor da 1ª leva a mão", statusSplitThenTie.finished && statusSplitThenTie.winner === "player");

  // 8.4: All three tie -> no points, redistribute
  const statusTripleTie = resolveHandStatus(["tie", "tie", "tie"]);
  assert("Três vazas empatadas: ninguém pontua", statusTripleTie.finished && statusTripleTie.winner === "none");

  // 9. Fold awards previous stake
  assert("Correr do Truco (3) concede 1 tento", getFoldAward(1, 3) === 1);
  assert("Correr do Seis (6) concede 3 tentos", getFoldAward(3, 6) === 3);
  assert("Correr do Nove (9) concede 6 tentos", getFoldAward(6, 9) === 6);
  assert("Correr do Doze (12) concede 9 tentos", getFoldAward(9, 12) === 9);

  // 10. Bet ladder sequence: 1 -> 3 -> 6 -> 9 -> 12
  assert("Escada de aposta progride 1 -> 3 -> 6 -> 9 -> 12", 
    getNextRaise(1) === 3 && getNextRaise(3) === 6 && getNextRaise(6) === 9 && getNextRaise(9) === 12 && getNextRaise(12) === null);

  // 11. Abilities constraints: disabled in classic, 1 use per hand in ma_fama
  const classicAbilities = new AbilityManager("classic");
  assert("Habilidades desativadas no modo Clássico", !classicAbilities.isAbilityEnabled());

  const maFamaAbilities = new AbilityManager("ma_fama");
  assert("Habilidade disponível no modo MÁ FAMA", maFamaAbilities.isAbilityEnabled());
  const canUseTrampa = maFamaAbilities.canUsePlayerAbility("trampa", { trickIndex: 0, trickCardsCount: 0 });
  assert("Trampa pode usar Mão Leve antes da 1ª vaza", canUseTrampa === true);

  console.log(`=== TEST RUN FINISHED: ${results.filter(r => r.passed).length}/${results.length} PASSED ===`);
  return results;
}

// Allow execution via Node CLI
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("rules.test.js")) {
  runAllTests();
}
