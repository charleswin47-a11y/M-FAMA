// MÁ FAMA - Truco Paulista Advisor (Conselheiro de Truco)
// Analyzes legitimate player-visible game state only. Strictly no opponent secret cards!

import { SUITS, MANILHA_CYCLE, NORMAL_RANK_STRENGTH } from "../data/cards.js";
import { isManilha, getCardPower } from "../core/rules.js";

const SUIT_NAMES = {
  clubs: "Paus (Zap)",
  hearts: "Copas",
  spades: "Espadas (Espadilha)",
  diamonds: "Ouros (Pica-fumo)"
};

export class TrucoAdvisor {
  /**
   * Generates strategic or apprentice advice for the current Truco state
   * @param {Object} context
   * {
   *   playerHand: Array,
   *   tableCards: Array, // [{ playerId, card }]
   *   viraCard: Object,
   *   manilhaRank: string,
   *   currentTrick: number, // 0, 1, 2
   *   trickWinners: Array, // ['player'|'bot'|'tie']
   *   currentStake: number,
   *   level: 'aprendiz' | 'estrategico'
   * }
   */
  static getAdvice(context) {
    const {
      playerHand,
      tableCards = [],
      viraCard,
      manilhaRank,
      currentTrick = 0,
      trickWinners = [],
      currentStake = 1,
      level = "estrategico"
    } = context;

    if (!playerHand || playerHand.length === 0) {
      return {
        title: "Fim da Mão",
        suggestion: "Aguardando próxima distribuição.",
        reason: "Todas as cartas já foram jogadas nesta mão.",
        cardIndex: -1,
        level
      };
    }

    // Evaluate cards in player hand
    const evaluatedHand = playerHand.map((card, index) => {
      const isM = isManilha(card, manilhaRank);
      const power = getCardPower(card, manilhaRank);
      return { card, index, isM, power };
    });

    // Sort by power ascending
    const sortedByPower = [...evaluatedHand].sort((a, b) => a.power - b.power);
    const weakest = sortedByPower[0];
    const strongest = sortedByPower[sortedByPower.length - 1];

    // Find highest card played on table so far
    let highestTableCard = null;
    let highestTablePower = -1;
    let isPartnerWinning = false;

    tableCards.forEach((tc, idx) => {
      const power = getCardPower(tc.card, manilhaRank);
      if (power > highestTablePower) {
        highestTablePower = power;
        highestTableCard = tc.card;
        // In 4-player, partner is player 2 (North)
        isPartnerWinning = tc.playerId === "partner" || tc.playerIndex === 2;
      }
    });

    const isFirstToPlayInTrick = tableCards.length === 0;

    // -------------------------------------------------------------
    // MODO APRENDIZ: Explicação pedagógica das regras e valores
    // -------------------------------------------------------------
    if (level === "aprendiz") {
      const viraRank = viraCard ? viraCard.rank.toUpperCase() : "?";
      const mRank = manilhaRank ? manilhaRank.toUpperCase() : "?";

      if (strongest.isM) {
        return {
          title: "Aprendiz — Manilha Identificada",
          suggestion: `Sua melhor carta é o ${strongest.card.rank.toUpperCase()} de ${SUIT_NAMES[strongest.card.suit] || strongest.card.suit}.`,
          reason: `Como o vira foi ${viraRank}, a manilha desta rodada é ${mRank}. Manilhas superam qualquer carta comum (até mesmo o 3). Naipes: Paus > Copas > Espadas > Ouros.`,
          cardIndex: strongest.index,
          level
        };
      } else {
        return {
          title: "Aprendiz — Hierarquia Tradicional",
          suggestion: `Sua maior carta comum é o ${strongest.card.rank.toUpperCase()} (Força ${strongest.power}/10).`,
          reason: `Na hierarquia do Truco Paulista sem manilhas, a ordem é: 3 → 2 → Ás → Rei → Valete → Dama → 7 → 6 → 5 → 4. Cartas de mesmo valor empatam.`,
          cardIndex: strongest.index,
          level
        };
      }
    }

    // -------------------------------------------------------------
    // MODO ESTRATÉGICO: Sugestão tática situacional
    // -------------------------------------------------------------
    // VAZA 1 (Primeira vaza)
    if (currentTrick === 0) {
      if (isFirstToPlayInTrick) {
        // Sai jogando
        // Se tiver manilha e carta boa, guardar a manilha para a 2ª ou 3ª vaza
        if (evaluatedHand.length === 3 && strongest.isM) {
          const middle = sortedByPower[1];
          return {
            title: "Estratégia — Abrir com Segurança",
            suggestion: `Jogue o ${middle.card.rank.toUpperCase()} de ${SUIT_NAMES[middle.card.suit] || middle.card.suit}.`,
            reason: `Você tem a manilha guardada como garantia. Abrir com uma carta intermediária sonda o oponente sem queimar seu trunfo principal.`,
            cardIndex: middle.index,
            level
          };
        }
        // Sem manilhas: puxar com a melhor carta para tentar garantir a primeira
        return {
          title: "Estratégia — Disputa de Primeira Vaza",
          suggestion: `Jogue o ${strongest.card.rank.toUpperCase()} de ${SUIT_NAMES[strongest.card.suit] || strongest.card.suit}.`,
          reason: `Garantir a primeira vaza do Truco é decisivo. Quem vence a primeira pode amarrar a segunda e levar a mão.`,
          cardIndex: strongest.index,
          level
        };
      } else {
        // Já tem cartas na mesa
        if (isPartnerWinning) {
          // Parceiro está ganhando a vaza: descarte a mais baixa
          return {
            title: "Estratégia — Apoio ao Parceiro",
            suggestion: `Descarte o ${weakest.card.rank.toUpperCase()} de ${SUIT_NAMES[weakest.card.suit] || weakest.card.suit}.`,
            reason: `Seu parceiro já está vencendo a vaza na mesa. Guarde suas cartas fortes para as próximas disputas!`,
            cardIndex: weakest.index,
            level
          };
        }

        // Adversário está ganhando: podemos matar?
        const canBeat = evaluatedHand.filter(c => c.power > highestTablePower);
        if (canBeat.length > 0) {
          // Pegar a menor carta capaz de matar
          const lowestThatBeats = canBeat.sort((a, b) => a.power - b.power)[0];
          return {
            title: "Estratégia — Matar a Vaza",
            suggestion: `Jogue o ${lowestThatBeats.card.rank.toUpperCase()} de ${SUIT_NAMES[lowestThatBeats.card.suit] || lowestThatBeats.card.suit}.`,
            reason: `Esta carta é suficiente para superar a jogada do adversário sem desperdiçar uma manilha superior.`,
            cardIndex: lowestThatBeats.index,
            level
          };
        } else {
          // Não podemos matar: descarte a mais fraca
          return {
            title: "Estratégia — Poupar Recursos",
            suggestion: `Entregue o ${weakest.card.rank.toUpperCase()} de ${SUIT_NAMES[weakest.card.suit] || weakest.card.suit}.`,
            reason: `Nenhuma carta da sua mão supera a mesa nesta vaza. Entregue sua carta mais fraca para manter força na 2ª e 3ª vazas.`,
            cardIndex: weakest.index,
            level
          };
        }
      }
    }

    // VAZA 2 (Segunda vaza)
    if (currentTrick === 1) {
      const wonFirst = trickWinners[0] === "player" || trickWinners[0] === "teamA";
      if (wonFirst) {
        // Vencemos a primeira: jogar forte para fechar logo 2x0
        return {
          title: "Estratégia — Fechar a Mão (2x0)",
          suggestion: `Jogue o ${strongest.card.rank.toUpperCase()} de ${SUIT_NAMES[strongest.card.suit] || strongest.card.suit}.`,
          reason: `Sua dupla já venceu a primeira vaza! Ganhando esta vaza agora, a mão se encerra com vitória de vocês.`,
          cardIndex: strongest.index,
          level
        };
      } else {
        // Perdemos a primeira ou empatamos: precisamos levar obrigatoriamente
        return {
          title: "Estratégia — Recuperação Obrigatória",
          suggestion: `Jogue o ${strongest.card.rank.toUpperCase()} de ${SUIT_NAMES[strongest.card.suit] || strongest.card.suit}.`,
          reason: `Você precisa vencer esta vaza para levar o jogo à terceira rodada ou desempatar a mão. Use sua carta mais forte.`,
          cardIndex: strongest.index,
          level
        };
      }
    }

    // VAZA 3 (Vaza decisiva)
    return {
      title: "Estratégia — Vaza Decisiva",
      suggestion: `Jogue o ${strongest.card.rank.toUpperCase()} de ${SUIT_NAMES[strongest.card.suit] || strongest.card.suit}.`,
      reason: `Última vaza da mão! Quem levar esta carta vence todos os tentos em disputa.`,
      cardIndex: strongest.index,
      level
    };
  }
}
