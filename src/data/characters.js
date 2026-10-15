// MÁ FAMA - Official Character Dossier and System Definitions

export const CHARACTERS = [
  {
    id: "trampa",
    name: "Trampa",
    subtitle: "O Estrategista",
    specialty: "Informação e trapaça",
    difficulty: "Média",
    suit: "clubs",
    quote: "A mesa só revela o que eu deixo você ver.",
    summary: "Trampa é o personagem para quem gosta de antecipar jogadas, descobrir segredos e vencer usando informação que os outros não possuem.",
    whyPlay: "Para quem gosta de contar cartas, observar adversários e planejar com antecedência.",
    mainPowerName: "Carta Marcada",
    mainPowerTiming: "Antes da 1ª vaza",
    mainPowerDesc: "Escolhe um adversário e consegue visualizar temporariamente uma carta aleatória da mão dele, sem alterá-la nem roubá-la.",
    passiveName: "Memória de Tubarão",
    passiveDesc: "Registra automaticamente cartas importantes já jogadas e facilita a consulta ao histórico informacional.",
    personality: "Ri quando descobre algo importante, faz comentários sarcásticos e reage exageradamente quando alguém percebe sua estratégia.",
    visual: {
      primary: "#245247",
      secondary: "#121719",
      accent: "#D4A354",
      skin_shadow: "#88543B"
    },
    portrait: "assets/art/characters/portraits/char_trampa_portrait.png",
    avatar: "assets/art/characters/avatars/avatar_trampa.png"
  },
  {
    id: "veneno",
    name: "Veneno",
    subtitle: "A Manipuladora",
    specialty: "Manipulação e risco",
    difficulty: "Alta",
    suit: "hearts",
    quote: "Quem sabe o que o outro esconde já venceu metade da rodada.",
    summary: "Veneno não precisa conhecer todas as cartas. Ela é especialista em escolher o momento certo para pressionar o adversário.",
    whyPlay: "Para quem gosta de blefar, analisar riscos e tomar decisões sob pressão.",
    mainPowerName: "Jogo Psicológico",
    mainPowerTiming: "Uma vez por mão",
    mainPowerDesc: "Estima a probabilidade e o risco estratégico de uma disputa com base nas cartas públicas e no histórico, sem revelar a mão do rival.",
    passiveName: "Sangue Frio",
    passiveDesc: "Recebe informações resumidas sobre riscos e possibilidades estratégicas diretamente na interface sem complicação.",
    personality: "Provoca os adversários, sorri quando alguém cai em uma armadilha e mantém a calma mesmo quando está perdendo.",
    visual: {
      primary: "#74263A",
      secondary: "#191419",
      accent: "#D8AD66",
      skin_shadow: "#A96F57"
    },
    portrait: "assets/art/characters/portraits/char_veneno_portrait.png",
    avatar: "assets/art/characters/avatars/avatar_veneno.png"
  },
  {
    id: "calibre",
    name: "Calibre",
    subtitle: "O Intimidador",
    specialty: "Apostas e pressão",
    difficulty: "Média",
    suit: "spades",
    quote: "Respeito resolve. Ninguém blefa duas vezes quando a aposta sobe.",
    summary: "Calibre transforma decisões importantes em momentos de risco. É o personagem para quem prefere jogar de maneira agressiva e assumir consequências.",
    whyPlay: "Para quem gosta de decisões de alto risco, recompensas e partidas competitivas.",
    mainPowerName: "Aposta de Sangue",
    mainPowerTiming: "Antes de uma disputa decisiva",
    mainPowerDesc: "Declara que está apostando alto na rodada, amplificando a pressão de aumento e dobrando a moral sobre o adversário.",
    passiveName: "Sangue de Ferro",
    passiveDesc: "Apresenta com clareza matemática as consequências de decisões arriscadas, incluindo o que a equipe pode ganhar ou perder.",
    personality: "Não comemora vitórias pequenas, encara derrotas em silêncio e demonstra respeito quando alguém aceita uma aposta difícil.",
    visual: {
      primary: "#22212A",
      secondary: "#55485F",
      accent: "#B58B4D",
      skin_shadow: "#B88D72"
    },
    portrait: "assets/art/characters/portraits/char_calibre_portrait.png",
    avatar: "assets/art/characters/avatars/avatar_calibre.png"
  },
  {
    id: "pixel",
    name: "Pixel",
    subtitle: "O Imprevisível",
    specialty: "Adaptação e improviso",
    difficulty: "Baixa",
    suit: "diamonds",
    quote: "Nada é óbvio. Eu mudo as regras no reflexo.",
    summary: "Pixel é o personagem para quem gosta de mudar de estratégia e encontrar oportunidades inesperadas na banca.",
    whyPlay: "Para iniciantes e jogadores que preferem experimentar em vez de seguir uma única estratégia engessada.",
    mainPowerName: "Plano B",
    mainPowerTiming: "Antes de confirmar a jogada",
    mainPowerDesc: "Permite reorganizar ou substituir a escolha de carta na mão em resposta imediata à jogada exposta do adversário.",
    passiveName: "Gambiarra",
    passiveDesc: "Acesso rápido e simplificado às ações disponíveis e às alternativas válidas durante a vaza.",
    personality: "Comemora de maneira exagerada, reclama quando algo dá errado e inventa desculpas absurdas quando sua estratégia falha.",
    visual: {
      primary: "#C98232",
      secondary: "#563426",
      accent: "#F0D7A4",
      skin_shadow: "#A94F2E"
    },
    portrait: "assets/art/characters/portraits/char_pixel_portrait.png",
    avatar: "assets/art/characters/avatars/avatar_pixel.png"
  }
];

export const COURT_LORE = [
  {
    name: "Dona Trambique",
    title: "A Feira de Penhores",
    suit: "Ouros (♦)",
    quote: "Tudo tem um preço. Até a verdade.",
    desc: "Dona da Feira de Penhores, Trambique compra e vende objetos sem fazer perguntas. Dizem que ela conhece todos os segredos da cidade.",
    image: "assets/art/characters/court/dona_trambique_ouros.jpg"
  },
  {
    name: "Migué",
    title: "O Salão Coração",
    suit: "Copas (♥)",
    quote: "Não é sobre o que eu faço, é sobre o que você acredita.",
    desc: "Migué é um artista de rua e mestre da lábia. Transforma mentira em espetáculo e sempre tem um truque na manga.",
    image: "assets/art/characters/court/migue_copas.jpg"
  },
  {
    name: "Madruga",
    title: "O Arquivo da Meia-Noite",
    suit: "Espadas (♠)",
    quote: "Todo mundo fala. Eu só escuto.",
    desc: "Madruga comanda um pequeno balcão que nunca fecha. Ela ouve mais do que fala e sabe coisas que deveriam estar enterradas.",
    image: "assets/art/characters/court/madruga_espadas.jpg"
  },
  {
    name: "Pombo de Guerra",
    title: "A Oficina do Fundo",
    suit: "Paus (♣)",
    quote: "Entrega, cobrança e sem conversa.",
    desc: "Pombo de Guerra é o entregador mais temido da cidade. Resolve problemas com rapidez e costuma colecionar inimigos.",
    image: "assets/art/characters/court/pombo_de_guerra_paus.jpg"
  }
];
