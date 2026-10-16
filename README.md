# MÁ FAMA

> Um jogo de cartas indie com estética cartoon noir, personagens
> autorais e partidas em um clube clandestino.

MÁ FAMA reúne jogos tradicionais de cartas e um universo próprio de
personagens, fichas virtuais e partidas entre amigos. A direção visual
combina ilustrações cartoon, cartas vintage, madeira escura, feltro
bordô, dourado envelhecido e iluminação âmbar.

> **Status:** este README descreve a visão e o roteiro do projeto.
> Recursos marcados como planejados não devem ser considerados
> implementados até serem desenvolvidos e testados no código.

## Índice

-   [Visão geral](#visão-geral)
-   [Modalidades](#modalidades)
-   [Personagens](#personagens)
-   [Tecnologias e estrutura](#tecnologias-e-estrutura)
-   [Como executar localmente](#como-executar-localmente)
-   [Multiplayer](#multiplayer)
-   [Fichas virtuais](#fichas-virtuais)
-   [Responsividade](#responsividade)
-   [Estado e próximas etapas](#estado-e-próximas-etapas)
-   [Direção visual](#direção-visual)

## Visão geral

Objetivos do projeto:

-   Lobby ilustrado e seleção de modalidade.
-   Seleção de personagens.
-   Partidas locais e online com amigos.
-   Fichas virtuais e mesas com diferentes entradas.
-   Configurações de música, efeitos sonoros e acessibilidade.
-   Assistente opcional de dicas durante as partidas.
-   Interface responsiva para computador, tablet e celular.
-   Progressão e conteúdo desbloqueável, sem apostas com dinheiro real.

## Modalidades

### 1. Truco Paulista

-   Baralho de 40 cartas.
-   Quatro jogadores em duas duplas.
-   Três cartas por jogador.
-   Sistema de tentos e pedidos de Truco, Seis, Nove e Doze.
-   Manilhas determinadas pela vira, conforme a variante definida no
    projeto.

### 2. Truco MÁ FAMA

Usa a base do Truco Paulista e adiciona poderes opcionais dos
personagens. Os poderes precisam ser balanceados e validados pelo
servidor em partidas online.

### 3. Sueca Tradicional

-   Quatro jogadores em duas duplas.
-   Baralho de 40 cartas.
-   Dez cartas por jogador e dez vazas por mão.
-   Obrigação de assistir ao naipe quando possível.
-   Trunfo e contagem de pontos conforme a variante documentada pelo
    projeto.

### 4. Sueca MÁ FAMA

Mantém as regras centrais da Sueca e permite poderes especiais
opcionais. Os poderes não devem alterar indevidamente a contagem
tradicional de pontos.

### 5. Poker Tradicional --- planejado

A proposta inicial é Texas Hold'em: baralho padrão de 52 cartas sem
coringas, cartas privadas, cartas comunitárias, rodadas de apostas,
avaliação da melhor mão de cinco cartas e controle de pote pelo
servidor.

### 6. Poker MÁ FAMA: Submundo --- planejado

Um modo roguelike de pontuação inspirado no gênero de construção de mãos
de poker, com conteúdo próprio:

-   Metas de pontuação por rodada.
-   Coringas e melhorias com efeitos especiais.
-   Multiplicadores e sinergias.
-   Loja, desafios e progressão de run.
-   Desbloqueios entre partidas.

O modo Submundo é separado do Poker multiplayer tradicional. A
referência é estrutural; a arte, os nomes, os efeitos e o conteúdo devem
ser originais.

## Personagens

-   **Trampa --- O Estrategista:** guaxinim malandro, charmoso e atento
    às oportunidades.
-   **Veneno --- A Manipuladora:** calculista, ligada a segredos e
    investigação.
-   **Calibre --- O Intimidador:** reservado e protetor.
-   **Pixel --- O Imprevisível:** improvisador urbano, irreverente e
    criativo.

Os poderes devem ser opcionais nos modos MÁ FAMA e desativados nos modos
tradicionais.

## Tecnologias e estrutura

Estrutura observada no projeto:

``` text
baralho/
├── assets/
│   └── art/
│       ├── backgrounds/
│       ├── cards/
│       ├── characters/
│       │   ├── avatars/
│       │   ├── court/
│       │   └── portraits/
│       ├── raw/
│       ├── table/
│       ├── ui/
│       └── logo.png
├── css/
├── node_modules/
├── scratch/
├── src/
├── tools/
├── index.html
├── package-lock.json
├── package.json
└── server.js
```

A árvore é uma referência baseada na estrutura vista no VS Code;
arquivos e subpastas podem variar.

### Stack prevista

-   **HTML, CSS e JavaScript:** interface web e lobby.
-   **Node.js:** servidor de aplicação.
-   **Socket.IO:** comunicação em tempo real, caso ainda não esteja
    instalado.
-   **Hospedagem web:** interface estática.
-   **Hospedagem Node.js com WebSockets:** servidor multiplayer.

Antes de instalar dependências ou alterar a estrutura, confira o
conteúdo real de `package.json` e `server.js`.

## Como executar localmente

1.  Instale uma versão LTS recente do Node.js.

2.  Abra a pasta do projeto no VS Code.

3.  No terminal, na raiz do projeto, execute:

    ``` bash
    npm install
    ```

4.  Confira os scripts disponíveis:

    ``` bash
    npm run
    ```

5.  Execute o script de desenvolvimento, se existir. Caso o projeto use
    `server.js` diretamente, o comando poderá ser:

    ``` bash
    node server.js
    ```

6.  Abra no navegador o endereço informado pelo servidor.

Os comandos exatos dependem da configuração do `package.json`. A
existência de `server.js` não significa, por si só, que o multiplayer
esteja pronto.

## Multiplayer

Fluxo planejado para salas privadas:

1.  O anfitrião escolhe a modalidade e cria uma sala.
2.  O servidor gera um código de convite.
3.  Os amigos entram usando o código.
4.  A sala mostra jogadores, personagens e estado de prontidão.
5.  O anfitrião inicia quando os requisitos forem atendidos.
6.  O servidor controla turnos, jogadas legais, pontuação e resultado.
7.  Cada cliente recebe somente as informações que pode conhecer.

Requisitos importantes:

-   O servidor é a autoridade sobre o estado da partida.
-   Mãos privadas nunca devem ser enviadas a clientes que não podem
    vê-las.
-   O servidor valida posse da carta, turno e regras antes de aceitar
    jogadas.
-   O servidor valida apostas, saldo, pote e pagamentos.
-   A liquidação de fichas deve impedir pagamentos duplicados.
-   Salas devem tratar desconexões e reconexões de forma controlada.

## Fichas virtuais

A economia proposta utiliza fichas exclusivamente virtuais:

-   Carteira persistente por jogador.
-   Mesas com diferentes valores de entrada.
-   Reserva de fichas ao entrar em uma mesa.
-   Prêmios calculados pelo servidor.
-   Histórico de transações para evitar duplicidade.
-   Recompensas por partidas e progressão.

As fichas não devem ter saque, conversão em dinheiro real ou valor
monetário. Valores e premiações precisam ser configurados e testados
antes de ativados.

## Responsividade

A interface deve se adaptar a diferentes telas:

-   **Celular:** navegação compacta, cards em coluna ou carrossel,
    controles confortáveis para toque e cartas legíveis.
-   **Tablet:** modos em duas colunas e mesa adaptada à orientação.
-   **Computador:** lobby amplo, navegação lateral e mais informações
    visíveis.

Preserve a proporção das ilustrações, respeite as áreas seguras dos
dispositivos e evite rolagem horizontal indesejada. O lobby e a mesa
devem ser testados separadamente.

## Estado e próximas etapas

### Estrutura observada

-   [x] Projeto web com `index.html`, `css/`, `src/`, `assets/` e
    `server.js`.
-   [x] Organização de assets para cenários, cartas, personagens e
    interface.
-   [ ] Auditar os scripts reais de `package.json`.
-   [ ] Confirmar quais partes do lobby já estão conectadas à lógica do
    jogo.

### Funcionalidades planejadas

-   [ ] Seleção funcional das seis modalidades.
-   [ ] Sala privada e convite por código.
-   [ ] Lobby multiplayer para quatro jogadores em Truco e Sueca.
-   [ ] Validação das regras no servidor.
-   [ ] Carteira, entrada de mesa e liquidação segura de fichas.
-   [ ] Assistente de dicas configurável.
-   [ ] Configurações com volumes independentes.
-   [ ] Layout responsivo completo.
-   [ ] Poker Texas Hold'em.
-   [ ] Poker MÁ FAMA: Submundo.
-   [ ] Testes automatizados de regras, pontuação e economia.

### Ordem recomendada

1.  Auditar `package.json`, `server.js` e a interface principal.
2.  Estabilizar o lobby e a navegação.
3.  Implementar e testar o motor de regras de uma modalidade
    tradicional.
4.  Adicionar salas privadas e sincronização em tempo real.
5.  Implementar fichas e liquidação segura.
6.  Adaptar a mesa para celular e testar em dispositivos reais.
7.  Adicionar poderes opcionais, dicas e configurações.
8.  Desenvolver Poker Tradicional e, depois, o modo Submundo.

## Direção visual

  Uso          Cor
  ------------ -----------
  Carvão       `#171114`
  Vinho        `#54252C`
  Dourado      `#C99B52`
  Pergaminho   `#E9D2A5`

A interface mantém estética cartoon noir, ilustrações autorais, molduras
vintage, dourado envelhecido, sombras quentes e textura de papel. Evite
efeitos futuristas genéricos ou excesso de brilho que prejudique a
leitura.

------------------------------------------------------------------------

**MÁ FAMA** --- tradição na mesa, segredos no baralho.
