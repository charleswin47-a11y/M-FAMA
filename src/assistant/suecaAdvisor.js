// MÁ FAMA - Sueca Tradicional & MÁ FAMA Advisor (Conselheiro de Sueca)
// Analyzes legitimate player-visible game state only. Strictly no opponent secret cards!

import {
  SUECA_CARD_VALUES,
  SUECA_CARD_STRENGTH,
  getSuecaCardValue,
  getSuecaCardStrength,
  isLegalSuecaPlay
} from "../core/suecaRules.js";

const SUIT_NAMES = {
  clubs: "Paus",
  hearts: "Copas",
  spades: "Espadas",
  diamonds: "Ouros"
};

export class SuecaAdvisor {
  /**
   * Generates advice for Sueca
   * @param {Object} context
   * {
   *   playerHand: Array,
   *   tableCards: Array, // [{ playerId, playerIndex, card, playerName }]
   *   leadSuit: string,
   *   trumpSuit: string,
   *   currentTrick: number, // 0 to 9
   *   level: 'aprendiz' | 'estrategico'
   * }
   */
  static getAdvice(context) {
    const {
      playerHand,
      tableCards = [],
      leadSuit,
      trumpSuit,
      currentTrick = 0,
      level = "estrategico"
    } = context;

    if (!playerHand || playerHand.length === 0) {
      return {
        title: "Fim das Cartas",
        suggestion: "Aguardando contagem final dos 120 pontos.",
        reason: "Todas as dez vazas da mão foram concluídas.",
        cardIndex: -1,
        level
      };
    }

    const hasLeadSuit = leadSuit ? playerHand.some(c => c.suit === leadSuit) : false;
    const legalPlays = playerHand.map((card, index) => ({
      card,
      index,
      legal: isLegalSuecaPlay(card, playerHand, leadSuit),
      val: getSuecaCardValue(card),
      str: getSuecaCardStrength(card),
      isTrump: card.suit === trumpSuit
    })).filter(c => c.legal);

    if (legalPlays.length === 0) {
      return {
        title: "Sem Jogadas Legais",
        suggestion: "Selecione qualquer carta.",
        reason: "Verificação do servidor em andamento.",
        cardIndex: 0,
        level
      };
    }

    // Calculate current points on table
    const tablePoints = tableCards.reduce((acc, tc) => acc + getSuecaCardValue(tc.card), 0);

    // Identify current winning card on table
    let currentWinner = null;
    if (tableCards.length > 0) {
      currentWinner = tableCards[0];
      for (let i = 1; i < tableCards.length; i++) {
        const can = tableCards[i];
        const winIsT = currentWinner.card.suit === trumpSuit;
        const canIsT = can.card.suit === trumpSuit;
        if (canIsT && !winIsT) currentWinner = can;
        else if (canIsT && winIsT && getSuecaCardStrength(can.card) > getSuecaCardStrength(currentWinner.card)) currentWinner = can;
        else if (!canIsT && !winIsT && can.card.suit === leadSuit && currentWinner.card.suit === leadSuit) {
          if (getSuecaCardStrength(can.card) > getSuecaCardStrength(currentWinner.card)) currentWinner = can;
        }
      }
    }

    const isPartnerWinning = currentWinner && (currentWinner.playerId === "partner" || currentWinner.playerIndex === 2);

    // -------------------------------------------------------------
    // MODO APRENDIZ: Regra do Naipe Obrigatório e Contagem de Pontos
    // -------------------------------------------------------------
    if (level === "aprendiz") {
      if (leadSuit && hasLeadSuit) {
        const matching = legalPlays.filter(c => c.card.suit === leadSuit);
        const bestMatch = matching.sort((a, b) => b.str - a.str)[0];
        return {
          title: "Aprendiz — Obrigação de Seguir Naipe",
          suggestion: `Você DEVE jogar ${SUIT_NAMES[leadSuit] || leadSuit}. Sugestão: ${bestMatch.card.rank.toUpperCase()}.`,
          reason: `Na Sueca, quem tem carta do naipe que abriu a vaza é OBRIGADO a jogá-lo. Não seguir o naipe tendo a carta é considerado renúncia/falta grave.`,
          cardIndex: bestMatch.index,
          level
        };
      } else if (leadSuit && !hasLeadSuit) {
        return {
          title: "Aprendiz — Sem o Naipe da Vaza",
          suggestion: `Você não tem ${SUIT_NAMES[leadSuit] || leadSuit}. Pode cortar com Trunfo (${SUIT_NAMES[trumpSuit]}) ou descartar ("baldar").`,
          reason: `Como não possui o naipe inicial, você tem liberdade total para jogar qualquer carta da sua mão.`,
          cardIndex: legalPlays[0].index,
          level
        };
      } else {
        // Sai jogando
        const aces = legalPlays.filter(c => c.card.rank.toLowerCase() === "a");
        if (aces.length > 0) {
          return {
            title: "Aprendiz — Valor das Cartas",
            suggestion: `Abra com o Ás de ${SUIT_NAMES[aces[0].card.suit]}.`,
            reason: `O Ás vale 11 pontos e é a carta mais forte do naipe. Pontuação: Ás (11), 7 (10), Rei (4), Valete (3), Dama (2). Total do baralho: 120 pontos.`,
            cardIndex: aces[0].index,
            level
          };
        }
      }
    }

    // -------------------------------------------------------------
    // MODO ESTRATÉGICO: Sugestão Tática da Sueca
    // -------------------------------------------------------------
    // 1. Jogador é o primeiro da vaza (abertura)
    if (tableCards.length === 0) {
      // Prioridade 1: Ás de naipe não-trunfo (garante vaza e 11 pontos)
      const nonTrumpAces = legalPlays.filter(c => c.card.rank.toLowerCase() === "a" && !c.isTrump);
      if (nonTrumpAces.length > 0) {
        return {
          title: "Estratégia — Puxar Firme com Ás",
          suggestion: `Jogue o Ás de ${SUIT_NAMES[nonTrumpAces[0].card.suit]}.`,
          reason: `Puxar com o Ás limpo garante 11 pontos imediatos e recolhe cartas valiosas dos adversários antes que cortem com trunfo.`,
          cardIndex: nonTrumpAces[0].index,
          level
        };
      }

      // Prioridade 2: Carta baixa de naipe longo para abrir caminho
      const lowCards = legalPlays.filter(c => c.val === 0 && !c.isTrump);
      if (lowCards.length > 0) {
        return {
          title: "Estratégia — Sondar a Mesa",
          suggestion: `Abra com o ${lowCards[0].card.rank.toUpperCase()} de ${SUIT_NAMES[lowCards[0].card.suit]}.`,
          reason: `Sem um Ás seguro, abrir com carta de 0 ponto preserva seus trunfos e permite ao seu parceiro entrar de cabeça na vaza.`,
          cardIndex: lowCards[0].index,
          level
        };
      }

      return {
        title: "Estratégia — Controle de Vaza",
        suggestion: `Jogue o ${legalPlays[0].card.rank.toUpperCase()} de ${SUIT_NAMES[legalPlays[0].card.suit]}.`,
        reason: `Mantenha a liderança da mesa para ditar o ritmo das rodadas seguintes.`,
        cardIndex: legalPlays[0].index,
        level
      };
    }

    // 2. Jogador jogando no meio ou final da vaza
    if (isPartnerWinning) {
      // Parceiro já está levando a vaza!
      // Se a mesa já está ganha pelo parceiro com carta alta, "carregar" pontos (7 ou K) se seguro, ou poupar
      const safePoints = legalPlays.filter(c => c.val > 0 && c.card.rank.toLowerCase() !== "a");
      if (safePoints.length > 0 && tableCards.length >= 2) {
        const pointCard = safePoints.sort((a, b) => b.val - a.val)[0];
        return {
          title: "Estratégia — Carregar o Parceiro",
          suggestion: `Entregue o ${pointCard.card.rank.toUpperCase()} de ${SUIT_NAMES[pointCard.card.suit]} (+${pointCard.val} pts).`,
          reason: `Seu parceiro já tem a vaza garantida! Adicione pontos valiosos à pilha da sua dupla.`,
          cardIndex: pointCard.index,
          level
        };
      }

      // Descarte de 0 pontos
      const zeroCards = legalPlays.filter(c => c.val === 0);
      const cardToPlay = zeroCards.length > 0 ? zeroCards[0] : legalPlays[0];
      return {
        title: "Estratégia — Resguardar Força",
        suggestion: `Jogue o ${cardToPlay.card.rank.toUpperCase()} de ${SUIT_NAMES[cardToPlay.card.suit]}.`,
        reason: `A vaza já é do parceiro. Não desperdice cartas decisivas quando a vitória já está assegurada.`,
        cardIndex: cardToPlay.index,
        level
      };
    }

    // 3. Oponente está ganhando a vaza
    // Se temos o naipe da vaza e podemos superar o oponente
    if (hasLeadSuit) {
      const suitPlays = legalPlays.filter(c => c.card.suit === leadSuit);
      const canBeat = suitPlays.filter(c => c.str > getSuecaCardStrength(currentWinner.card));

      if (canBeat.length > 0) {
        // Matar com a menor carta suficiente
        const bestKill = canBeat.sort((a, b) => a.str - b.str)[0];
        return {
          title: "Estratégia — Superar a Vaza",
          suggestion: `Jogue o ${bestKill.card.rank.toUpperCase()} de ${SUIT_NAMES[leadSuit]}.`,
          reason: `Esta jogada toma a vaza dos adversários e protege os ${tablePoints} pontos já acumulados no centro da mesa.`,
          cardIndex: bestKill.index,
          level
        };
      } else {
        // Não conseguimos matar: jogar a menor carta possível (preferência val = 0)
        const weakest = suitPlays.sort((a, b) => a.val - b.val || a.str - b.str)[0];
        return {
          title: "Estratégia — Descarte Econômico",
          suggestion: `Jogue o ${weakest.card.rank.toUpperCase()} de ${SUIT_NAMES[leadSuit]} (${weakest.val} pts).`,
          reason: `Como não é possível superar a carta da mesa, entregue a de menor valor para não dar pontos aos adversários.`,
          cardIndex: weakest.index,
          level
        };
      }
    } else {
      // Não temos o naipe: podemos cortar com Trunfo?
      const trumps = legalPlays.filter(c => c.isTrump);
      if (trumps.length > 0 && (tablePoints >= 10 || currentTrick >= 6)) {
        // Vale a pena cortar!
        const lowestTrump = trumps.sort((a, b) => a.str - b.str)[0];
        return {
          title: "Estratégia — Cortar com Trunfo",
          suggestion: `Corte com o ${lowestTrump.card.rank.toUpperCase()} de ${SUIT_NAMES[trumpSuit]}!`,
          reason: `A vaza contém ${tablePoints} pontos em disputa. Cortar com o menor trunfo assegura esses pontos para sua dupla.`,
          cardIndex: lowestTrump.index,
          level
        };
      } else {
        // Descartar uma carta inútil de 0 pontos (balda)
        const zeroCards = legalPlays.filter(c => c.val === 0 && !c.isTrump);
        const balda = zeroCards.length > 0 ? zeroCards[0] : legalPlays.sort((a, b) => a.val - b.val)[0];
        return {
          title: "Estratégia — Baldar (Descarte Seco)",
          suggestion: `Descarte o ${balda.card.rank.toUpperCase()} de ${SUIT_NAMES[balda.card.suit]}.`,
          reason: `Sem trunfo ou para poupar cortes, jogue uma carta sem valor de um naipe que você deseja esvaziar da mão.`,
          cardIndex: balda.index,
          level
        };
      }
    }
  }
}
