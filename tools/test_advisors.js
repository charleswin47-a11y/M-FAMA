import { TrucoAdvisor } from '../src/assistant/trucoAdvisor.js';
import { SuecaAdvisor } from '../src/assistant/suecaAdvisor.js';

console.log('--- TESTING ADVISORS ---');

// 1. Truco Advisor Test - Vira 4 (Manilha: 5)
const trucoHand = [
  { rank: '3', suit: 'hearts', faceAsset: 'assets/art/cards/faces/3_hearts.png' },
  { rank: 'k', suit: 'clubs', faceAsset: 'assets/art/cards/faces/k_clubs.png' },
  { rank: '5', suit: 'clubs', faceAsset: 'assets/art/cards/faces/5_clubs.png' } // Zap!
];

const trucoContext = {
  playerHand: trucoHand,
  tableCards: [
    { playerId: 'bot', card: { rank: 'a', suit: 'spades' } }
  ],
  viraCard: { rank: '4', suit: 'diamonds' },
  manilhaRank: '5',
  currentTrick: 0,
  trickWinners: [],
  currentStake: 1,
  level: 'estrategico'
};

const trucoAdvice = TrucoAdvisor.getAdvice(trucoContext);
console.log('[TRUCO ESTRATÉGICO]', trucoAdvice);

if (!trucoAdvice || !trucoAdvice.suggestion) {
  throw new Error('Truco advisor failed to generate advice');
}

// 2. Sueca Advisor Test - Trump Hearts, Lead Diamonds, Must Follow Suit
const suecaHand = [
  { rank: 'a', suit: 'diamonds', faceAsset: 'assets/art/cards/faces/a_diamonds.png' }, // 11 pts
  { rank: '7', suit: 'diamonds', faceAsset: 'assets/art/cards/faces/7_diamonds.png' }, // 10 pts
  { rank: '2', suit: 'hearts', faceAsset: 'assets/art/cards/faces/2_hearts.png' }     // Trump
];

const suecaContext = {
  playerHand: suecaHand,
  tableCards: [
    { playerId: 'rival1', playerIndex: 1, playerName: 'Veneno', card: { rank: 'k', suit: 'diamonds' } }
  ],
  leadSuit: 'diamonds',
  trumpSuit: 'hearts',
  currentTrick: 0,
  level: 'estrategico'
};

const suecaAdvice = SuecaAdvisor.getAdvice(suecaContext);
console.log('[SUECA ESTRATÉGICO]', suecaAdvice);

if (!suecaAdvice || !suecaAdvice.suggestion) {
  throw new Error('Sueca advisor failed to generate advice');
}

// 3. Sueca Apprentice Test
const suecaApprenticeAdvice = SuecaAdvisor.getAdvice({ ...suecaContext, level: 'aprendiz' });
console.log('[SUECA APRENDIZ]', suecaApprenticeAdvice);

console.log('--- ALL ADVISOR TESTS PASSED ---');
