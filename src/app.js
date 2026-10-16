import { CHARACTERS, COURT_LORE } from "./data/characters.js";
import { GameState } from "./core/gameState.js";
import { AudioManager } from "./audio/audioManager.js";
import { runAllTests } from "./tests/rules.test.js";
import { BET_NAMES, getNextRaise } from "./core/rules.js";
import { ICONS } from "./ui/icons.js";
import { SettingsManager } from "./settings/settingsManager.js";
import { SettingsModal } from "./ui/settingsModal.js";
import { HintController } from "./assistant/hintController.js";
import { HintPanel } from "./ui/hintPanel.js";
import { BettingEngine, POKER_STAGES } from "./game/poker/bettingEngine.js";
import { RunManager } from "./game/poker/runManager.js";
import { HandEvaluator } from "./game/cards/handEvaluator.js";
import { WalletManager, TABLE_STAKES } from "./core/economy.js";

export class MaFamaApp {
  constructor() {
    this.audio = new AudioManager();
    this.settings = new SettingsManager(this.audio);
    this.settingsModal = new SettingsModal(this.settings, this.audio);
    this.hintController = new HintController(this.settings);
    this.hintPanel = new HintPanel(document.body, (highlightedIdx) => {
      this.highlightHandCard(highlightedIdx);
    });

    // Virtual Economy & Table Stakes
    this.wallet = new WalletManager();
    this.selectedStake = TABLE_STAKES.find(s => s.id === "salao") || TABLE_STAKES[2]; // Default: Salão (500 fichas)
    this.onlineRoomStake = 500;

    this.selectedPlayerChar = CHARACTERS[0]; // Trampa by default
    this.selectedOpponentChar = CHARACTERS[1]; // Veneno by default
    this.selectedRuleset = "truco_paulista"; // "truco_paulista", "truco_ma_fama", "sueca_tradicional", "sueca_ma_fama"
    this.matchType = "bot"; // "bot", "online", or "pvp" (Local Friend)
    this.activeFriendTurn = "p1"; // "p1" or "p2" for 2P mode
    this.gameState = null;
    this.inspectingChar = CHARACTERS[0];

    // Multiplayer State
    this.isOnlineMatch = false;
    this.onlineRoomCode = null;
    this.onlinePlayerId = null;
    this.onlineRoomState = null;
    this.ws = null;
    this.isReadyMp = false;

    this.initDOMElements();
    this.setupEventListeners();
    this.initWebSocket();
    this.renderMenuCharacters();
    this.renderCourtLore();
    this.initWallet();
    this.setupStakesSelector();

    // Subscribe to settings to toggle DICA button
    this.settings.subscribe((s) => {
      if (this.btnShowHint) {
        this.btnShowHint.style.display = s.showHintButton ? "inline-flex" : "none";
      }
    });
  }

  initDOMElements() {
    // Screens
    this.menuScreen = document.getElementById("menu-screen");
    this.tableScreen = document.getElementById("table-screen");

    // Menu Mode & Match Type Buttons
    this.matchTypeBot = document.getElementById("match-type-bot");
    this.matchTypeOnline = document.getElementById("match-type-online");
    this.matchTypePvp = document.getElementById("match-type-pvp");

    // Modes (6 Official Game Modes)
    this.modeTrucoPaulista = document.getElementById("mode-truco-paulista");
    this.modeTrucoMaFama = document.getElementById("mode-truco-ma-fama");
    this.modeSuecaTradicional = document.getElementById("mode-sueca-tradicional");
    this.modeSuecaMaFama = document.getElementById("mode-sueca-ma-fama");
    this.modePokerTradicional = document.getElementById("mode-poker-tradicional");
    this.modePokerSubmundo = document.getElementById("mode-poker-submundo");
    this.charCarousel = document.getElementById("characters-carousel");
    this.btnStartGame = document.getElementById("btn-start-game");

    // Multiplayer Modals & Controls
    this.mpChoiceModal = document.getElementById("multiplayer-choice-modal");
    this.btnCloseMpModal = document.getElementById("btn-close-mp-modal");
    this.tabCreateRoom = document.getElementById("tab-create-room");
    this.tabJoinRoom = document.getElementById("tab-join-room");
    this.paneCreateRoom = document.getElementById("pane-create-room");
    this.paneJoinRoom = document.getElementById("pane-join-room");
    this.btnSubmitCreateRoom = document.getElementById("btn-submit-create-room");
    this.inputRoomCode = document.getElementById("input-room-code");
    this.btnSubmitJoinRoom = document.getElementById("btn-submit-join-room");
    this.joinRoomError = document.getElementById("join-room-error");

    // Waiting Room Modal
    this.waitingRoomModal = document.getElementById("waiting-room-modal");
    this.waitingRoomCodeDisplay = document.getElementById("waiting-room-code-display");
    this.waitingRoomModeTag = document.getElementById("waiting-room-mode-tag");
    this.waitingSeatsGrid = document.getElementById("waiting-seats-grid");
    this.btnCopyRoomCode = document.getElementById("btn-copy-room-code");
    this.copyBtnTxt = document.getElementById("copy-btn-txt");
    this.btnFillBots = document.getElementById("btn-fill-bots");
    this.btnToggleReadyMp = document.getElementById("btn-toggle-ready-mp");
    this.readyStatusLabel = document.getElementById("ready-status-label");
    this.btnLeaveRoom = document.getElementById("btn-leave-room");
    this.btnHostStartMatch = document.getElementById("btn-host-start-match");

    // 4 Seats Elements on Table
    this.seatNorth = document.getElementById("seat-north");
    this.seatWest = document.getElementById("seat-west");
    this.seatEast = document.getElementById("seat-east");
    this.nameNorth = document.getElementById("name-north");
    this.nameWest = document.getElementById("name-west");
    this.nameEast = document.getElementById("name-east");
    this.avatarNorth = document.getElementById("avatar-north");
    this.avatarWest = document.getElementById("avatar-west");
    this.avatarEast = document.getElementById("avatar-east");
    this.wrapNorth = document.getElementById("wrap-north");
    this.wrapWest = document.getElementById("wrap-west");
    this.wrapEast = document.getElementById("wrap-east");
    this.cardsNorth = document.getElementById("cards-north");
    this.cardsWest = document.getElementById("cards-west");
    this.cardsEast = document.getElementById("cards-east");

    // Nav & Settings & Hint Buttons
    this.btnOpenRules = document.getElementById("btn-open-rules");
    this.btnRunTests = document.getElementById("btn-run-tests");
    this.btnOpenDossierMenu = document.getElementById("btn-open-dossier-menu");
    this.btnOpenSettingsMenu = document.getElementById("btn-open-settings-menu");
    this.btnTableSettings = document.getElementById("btn-table-settings");
    this.btnShowHint = document.getElementById("btn-show-hint");

    // Table HUD elements
    this.playerScoreEl = document.getElementById("player-score-num");
    this.botScoreEl = document.getElementById("bot-score-num");
    this.hudPlayerLabel = document.getElementById("hud-player-label");
    this.hudOpponentLabel = document.getElementById("hud-opponent-label");
    this.currentStakeEl = document.getElementById("current-stake-val");
    this.trickDotsContainer = document.getElementById("trick-dots");
    this.tableLogList = document.getElementById("table-log-list");

    // Center zone
    this.viraCardImg = document.getElementById("vira-card-img");
    this.manilhaRankTxt = document.getElementById("manilha-rank-txt");
    this.trickZone = document.getElementById("trick-played-zone");

    // Player bottom elements
    this.playerAvatar = document.getElementById("player-avatar-img");
    this.playerName = document.getElementById("player-name-txt");
    this.playerTurnStatus = document.getElementById("player-turn-status-txt");
    this.playerIdentityPanel = document.getElementById("player-identity-panel");
    this.playerHandContainer = document.getElementById("player-hand-cards");
    this.btnTruco = document.getElementById("btn-truco-action");
    this.btnAbility = document.getElementById("btn-ability-action");
    this.abilityBtnText = document.getElementById("ability-btn-text");

    // 2P Local Privacy Curtain
    this.turnPassCurtain = document.getElementById("turn-pass-curtain");
    this.turnPassTitle = document.getElementById("turn-pass-title");
    this.btnRevealTurn = document.getElementById("btn-reveal-turn");

    // Poker Tradicional & Submundo Elements
    this.standardHudPanel = document.getElementById("standard-hud-panel");
    this.submundoHudPanel = document.getElementById("submundo-hud-panel");
    this.submundoAnteVal = document.getElementById("submundo-ante-val");
    this.submundoBlindType = document.getElementById("submundo-blind-type");
    this.submundoBlindName = document.getElementById("submundo-blind-name");
    this.submundoScoreCur = document.getElementById("submundo-score-cur");
    this.submundoScoreTarget = document.getElementById("submundo-score-target");
    this.submundoProgressFill = document.getElementById("submundo-progress-fill");
    this.submundoHandsLeft = document.getElementById("submundo-hands-left");
    this.submundoDiscardsLeft = document.getElementById("submundo-discards-left");
    this.submundoMoneyVal = document.getElementById("submundo-money-val");
    this.submundoJokersTray = document.getElementById("submundo-jokers-tray");
    this.jokersSlotsContainer = document.getElementById("jokers-slots-container");

    this.viraContainer = document.getElementById("vira-container");
    this.pokerCommunityZone = document.getElementById("poker-community-zone");
    this.pokerStageTag = document.getElementById("poker-stage-tag");
    this.pokerBoardCards = document.getElementById("poker-board-cards");
    this.pokerPotVal = document.getElementById("poker-pot-val");

    this.standardActionButtons = document.getElementById("standard-action-buttons");
    this.pokerActionsBar = document.getElementById("poker-actions-bar");
    this.btnPokerFold = document.getElementById("btn-poker-fold");
    this.btnPokerCheckCall = document.getElementById("btn-poker-check-call");
    this.btnPokerRaise = document.getElementById("btn-poker-raise");
    this.btnRaiseMin = document.getElementById("btn-raise-min");
    this.btnRaiseHalfPot = document.getElementById("btn-raise-half-pot");
    this.btnRaisePot = document.getElementById("btn-raise-pot");
    this.btnPokerAllin = document.getElementById("btn-poker-allin");

    this.submundoActionsBar = document.getElementById("submundo-actions-bar");
    this.submundoDetectName = document.getElementById("submundo-detect-name");
    this.submundoDetectScore = document.getElementById("submundo-detect-score");
    this.btnSubmundoPlay = document.getElementById("btn-submundo-play");
    this.btnSubmundoDiscard = document.getElementById("btn-submundo-discard");

    this.submundoShopModal = document.getElementById("submundo-shop-modal");
    this.shopCardsGrid = document.getElementById("shop-cards-grid");
    this.shopUserMoney = document.getElementById("shop-user-money");
    this.shopEquippedCount = document.getElementById("shop-equipped-count");
    this.btnShopContinue = document.getElementById("btn-shop-continue");

    this.chipsSouth = document.getElementById("chips-south");
    this.chipsWest = document.getElementById("chips-west");
    this.chipsNorth = document.getElementById("chips-north");
    this.chipsEast = document.getElementById("chips-east");

    // Winner Pointer & Trick Highlight Overlay
    this.winnerPointerOverlay = document.getElementById("table-winner-pointer-overlay");
    this.winnerArrowGlyph = document.getElementById("pointer-arrow-glyph");
    this.winnerBannerTitle = document.getElementById("winner-banner-title");
    this.winnerBannerSub = document.getElementById("winner-banner-sub");
    this.winnerCrownIcon = document.getElementById("winner-crown-icon");

    // Modals
    this.challengeModal = document.getElementById("challenge-modal");
    this.challengeTitle = document.getElementById("challenge-title");
    this.challengeSub = document.getElementById("challenge-sub");
    this.btnModalAccept = document.getElementById("btn-modal-accept");
    this.btnModalFold = document.getElementById("btn-modal-fold");
    this.btnModalRaise = document.getElementById("btn-modal-raise");

    // Character Dossier Modal
    this.dossierModal = document.getElementById("dossier-modal");
    this.btnCloseDossier = document.getElementById("btn-close-dossier");
    this.btnSelectFromDossier = document.getElementById("btn-select-from-dossier");
    this.btnViewCharSheet = document.getElementById("btn-view-char-sheet");

    // Rules / Tests / Match Over Modals
    this.rulesModal = document.getElementById("rules-modal");
    this.btnCloseRules = document.getElementById("btn-close-rules");
    this.testsModal = document.getElementById("tests-modal");
    this.btnCloseTests = document.getElementById("btn-close-tests");
    this.matchOverModal = document.getElementById("match-over-modal");
    this.btnRematch = document.getElementById("btn-rematch");
    this.btnBackToMenu = document.getElementById("btn-back-to-menu");

    // Ability Vignette Modal
    this.abilityModal = document.getElementById("ability-modal");
    this.abilityModalTitle = document.getElementById("ability-modal-title");
    this.abilityModalContent = document.getElementById("ability-modal-content");
    this.btnCloseAbilityModal = document.getElementById("btn-close-ability-modal");

    // Controls
    this.btnLeaveTable = document.getElementById("btn-leave-table");
    this.btnToggleMusic = document.getElementById("btn-toggle-music");
    this.btnToggleMute = document.getElementById("btn-toggle-mute");
    this.btnToggleLog = document.getElementById("btn-toggle-log");
    this.drawerLog = document.getElementById("drawer-log");
    this.btnCloseLog = document.getElementById("btn-close-log");

    // Virtual Economy & Wallet DOM
    this.headerChipsVal = document.getElementById("header-chips-val");
    this.profileChipsVal = document.getElementById("profile-chips-val");
    this.btnOpenWallet = document.getElementById("btn-open-wallet");
    this.navCarteira = document.getElementById("nav-carteira");
    this.walletModal = document.getElementById("wallet-modal");
    this.btnCloseWallet = document.getElementById("btn-close-wallet");
    this.walletModalBalance = document.getElementById("wallet-modal-balance");
    this.btnRequestLoan = document.getElementById("btn-request-loan");
    this.walletTxList = document.getElementById("wallet-tx-list");
    this.walletLoanBox = document.getElementById("wallet-loan-box");
    this.loanBoxStatusTxt = document.getElementById("loan-box-status-txt");
    this.currentStakesDesc = document.getElementById("current-stakes-desc");
    this.stakesPillsGrid = document.getElementById("stakes-pills-grid");
  }

  showWinnerPointer(targetSeat, title, subtitle = "") {
    if (!this.winnerPointerOverlay) return;

    // Reset previous seat glows
    document.querySelectorAll(".seat-avatar-wrap, .player-identity-panel").forEach(el => {
      el.classList.remove("seat-winner-glow");
    });

    this.winnerPointerOverlay.className = "table-winner-pointer-overlay active";

    if (targetSeat === "south" || targetSeat === "player") {
      this.winnerPointerOverlay.classList.add("point-south");
      if (this.winnerArrowGlyph) this.winnerArrowGlyph.innerHTML = ICONS.arrowDown;
      if (this.playerIdentityPanel) this.playerIdentityPanel.classList.add("seat-winner-glow");
    } else if (targetSeat === "north" || targetSeat === "bot") {
      this.winnerPointerOverlay.classList.add("point-north");
      if (this.winnerArrowGlyph) this.winnerArrowGlyph.innerHTML = ICONS.arrowUp;
      const wrapNorth = document.getElementById("wrap-north");
      if (wrapNorth) wrapNorth.classList.add("seat-winner-glow");
    } else if (targetSeat === "west") {
      this.winnerPointerOverlay.classList.add("point-west");
      if (this.winnerArrowGlyph) this.winnerArrowGlyph.innerHTML = ICONS.arrowLeft;
      const wrapWest = document.getElementById("wrap-west");
      if (wrapWest) wrapWest.classList.add("seat-winner-glow");
    } else if (targetSeat === "east") {
      this.winnerPointerOverlay.classList.add("point-east");
      if (this.winnerArrowGlyph) this.winnerArrowGlyph.innerHTML = ICONS.arrowRight;
      const wrapEast = document.getElementById("wrap-east");
      if (wrapEast) wrapEast.classList.add("seat-winner-glow");
    } else {
      if (this.winnerArrowGlyph) this.winnerArrowGlyph.innerHTML = ICONS.swords;
    }

    if (this.winnerBannerTitle) this.winnerBannerTitle.textContent = title;
    if (this.winnerBannerSub) this.winnerBannerSub.textContent = subtitle;
  }

  hideWinnerPointer() {
    if (this.winnerPointerOverlay) {
      this.winnerPointerOverlay.classList.remove("active", "point-south", "point-north", "point-west", "point-east");
    }
    document.querySelectorAll(".seat-avatar-wrap, .player-identity-panel").forEach(el => {
      el.classList.remove("seat-winner-glow");
    });
  }

  setupEventListeners() {
    // Match Type Selector (Solo vs Bot, Online Friends, or Local 2P)
    this.matchTypeBot?.addEventListener("click", () => {
      this.matchType = "bot";
      this.matchTypeBot.classList.add("active");
      this.matchTypeOnline.classList.remove("active");
      this.matchTypePvp.classList.remove("active");
      this.audio.playChips();
    });

    this.matchTypeOnline?.addEventListener("click", () => {
      this.matchType = "online";
      this.matchTypeOnline.classList.add("active");
      this.matchTypeBot.classList.remove("active");
      this.matchTypePvp.classList.remove("active");
      this.audio.playChips();
      this.openMultiplayerChoiceModal();
    });

    this.matchTypePvp?.addEventListener("click", () => {
      this.matchType = "pvp";
      this.matchTypePvp.classList.add("active");
      this.matchTypeOnline.classList.remove("active");
      this.matchTypeBot.classList.remove("active");
      this.audio.playChips();
    });

    // Ruleset modes selection (6 Official Modes)
    const modeCards = [
      { el: this.modeTrucoPaulista, id: "truco_paulista" },
      { el: this.modeTrucoMaFama, id: "truco_ma_fama" },
      { el: this.modeSuecaTradicional, id: "sueca_tradicional" },
      { el: this.modeSuecaMaFama, id: "sueca_ma_fama" },
      { el: this.modePokerTradicional, id: "poker_tradicional" },
      { el: this.modePokerSubmundo, id: "poker_submundo" }
    ];

    modeCards.forEach(({ el, id }) => {
      el?.addEventListener("click", () => {
        this.selectedRuleset = id;
        modeCards.forEach(m => m.el?.classList.remove("selected"));
        el.classList.add("selected");
        this.audio.playChips();
      });
    });

    // Multiplayer Modal Events
    this.btnCloseMpModal?.addEventListener("click", () => {
      this.mpChoiceModal.classList.remove("active");
    });

    this.tabCreateRoom?.addEventListener("click", () => {
      this.tabCreateRoom.classList.add("active");
      this.tabJoinRoom.classList.remove("active");
      this.paneCreateRoom.style.display = "block";
      this.paneJoinRoom.style.display = "none";
    });

    this.tabJoinRoom?.addEventListener("click", () => {
      this.tabJoinRoom.classList.add("active");
      this.tabCreateRoom.classList.remove("active");
      this.paneJoinRoom.style.display = "block";
      this.paneCreateRoom.style.display = "none";
    });

    // Submit Create Room
    this.btnSubmitCreateRoom?.addEventListener("click", () => {
      const modeRadio = document.querySelector('input[name="mp-mode-select"]:checked');
      const selectedMode = modeRadio ? modeRadio.value : "sueca_tradicional";

      const stakeRadio = document.querySelector('input[name="mp-stake-select"]:checked');
      let chosenStake = 500;
      if (stakeRadio) {
        if (stakeRadio.value === "custom") {
          const customInp = document.getElementById("input-custom-stake");
          chosenStake = customInp && customInp.value ? Math.max(0, parseInt(customInp.value, 10)) : 500;
        } else {
          chosenStake = parseInt(stakeRadio.value, 10);
        }
      }

      if (chosenStake > 0 && !this.wallet.canAfford(chosenStake)) {
        this.audio.playChips();
        this.openWalletModal();
        return;
      }

      this.createOnlineRoom(selectedMode, chosenStake);
    });

    // Custom stake toggle in MP modal
    document.querySelectorAll('input[name="mp-stake-select"]').forEach(radio => {
      radio.addEventListener("change", (e) => {
        const wrap = document.getElementById("mp-custom-stake-wrap");
        if (wrap) {
          wrap.style.display = e.target.value === "custom" ? "block" : "none";
        }
      });
    });

    // Submit Join Room
    this.btnSubmitJoinRoom?.addEventListener("click", () => {
      const code = this.inputRoomCode.value.trim();
      if (!code) {
        this.joinRoomError.textContent = "Digite o código da sala.";
        this.joinRoomError.style.display = "block";
        return;
      }
      this.joinOnlineRoom(code);
    });

    // Waiting Room Controls
    this.btnCopyRoomCode?.addEventListener("click", () => {
      if (this.onlineRoomCode) {
        navigator.clipboard.writeText(this.onlineRoomCode).then(() => {
          this.copyBtnTxt.textContent = "CÓDIGO COPIADO!";
          setTimeout(() => {
            this.copyBtnTxt.textContent = "COPIAR CÓDIGO";
          }, 2000);
        });
      }
    });

    this.btnFillBots?.addEventListener("click", () => {
      this.audio.playChips();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "FILL_BOTS" }));
      }
    });

    this.btnToggleReadyMp?.addEventListener("click", () => {
      this.audio.playChips();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "TOGGLE_READY" }));
      }
    });

    this.btnHostStartMatch?.addEventListener("click", () => {
      this.audio.playCardDeal();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "START_MATCH" }));
      }
    });

    this.btnLeaveRoom?.addEventListener("click", () => {
      this.leaveOnlineRoom();
    });

    // Settings Modals (Lobby & Table)
    this.btnOpenSettingsMenu?.addEventListener("click", () => {
      this.audio.playChips();
      this.settingsModal.show();
    });

    this.btnTableSettings?.addEventListener("click", () => {
      this.audio.playChips();
      this.settingsModal.show();
    });

    // Hint Button (Conselheiro de Mesa)
    this.btnShowHint?.addEventListener("click", () => {
      const advice = this.hintController.getAdvice(this.getCurrentAdviceContext());
      if (advice) {
        this.audio.playChips();
        this.hintPanel.toggle(advice);
      } else {
        alert("O Conselheiro de Mesa está desativado nas Configurações.");
      }
    });

    // Wallet Modal Events
    this.btnOpenWallet?.addEventListener("click", () => this.openWalletModal());
    this.navCarteira?.addEventListener("click", () => this.openWalletModal());
    const profileChips = document.getElementById("player-badge-chips");
    profileChips?.addEventListener("click", () => this.openWalletModal());
    this.btnCloseWallet?.addEventListener("click", () => this.closeWalletModal());
    this.btnRequestLoan?.addEventListener("click", () => this.handleLoanRequest());

    // Start Game from Main Menu
    this.btnStartGame?.addEventListener("click", () => {
      this.audio.init();

      // Check buy-in affordability
      const stakeAmount = this.selectedStake ? this.selectedStake.chips : 0;
      if (stakeAmount > 0 && !this.wallet.canAfford(stakeAmount)) {
        this.audio.playChips();
        this.openWalletModal();
        return;
      }

      if (this.matchType === "online") {
        this.openMultiplayerChoiceModal();
      } else if (this.matchType === "bot" && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.audio.playCardDeal();
        this.createSoloOnlineRoom(this.selectedRuleset);
      } else {
        this.audio.playCardDeal();
        this.startNewMatch();
      }
    });

    // Leave Table to Lobby
    this.btnLeaveTable?.addEventListener("click", () => {
      this.audio.playChips();
      this.tableScreen.classList.remove("active");
      this.menuScreen.classList.add("active");
      this.hintPanel.hide();
      this.resetTableModeViews();
      if (this.wallet.getActiveReservation()) {
        this.wallet.refundStake("Saída voluntária da mesa");
      }
      if (this.gameState) {
        this.gameState.state = "IDLE";
      }
      if (this.isOnlineMatch) {
        this.leaveOnlineRoom();
      }
    });

    // Audio toggles with clean SVGs
    this.btnToggleMusic?.addEventListener("click", () => {
      const playing = this.audio.toggleMusic();
      this.btnToggleMusic.innerHTML = playing ? ICONS.musicOn : ICONS.musicOff;
    });

    this.btnToggleMute?.addEventListener("click", () => {
      const muted = this.audio.toggleMute();
      this.btnToggleMute.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
    });

    // Log drawer
    this.btnToggleLog?.addEventListener("click", () => {
      this.drawerLog.classList.toggle("open");
    });
    this.btnCloseLog?.addEventListener("click", () => {
      this.drawerLog.classList.remove("open");
    });

    // Dossier Modal
    this.btnOpenDossierMenu?.addEventListener("click", () => {
      this.openCharacterDossier(this.selectedPlayerChar);
    });
    this.btnViewCharSheet?.addEventListener("click", () => {
      this.openCharacterDossier(this.selectedPlayerChar);
    });
    this.btnCloseDossier?.addEventListener("click", () => {
      this.dossierModal.classList.remove("active");
    });
    this.btnSelectFromDossier?.addEventListener("click", () => {
      this.selectedPlayerChar = this.inspectingChar;
      const otherChars = CHARACTERS.filter(c => c.id !== this.selectedPlayerChar.id);
      this.selectedOpponentChar = otherChars[Math.floor(Math.random() * otherChars.length)];
      this.renderMenuCharacters();
      this.dossierModal.classList.remove("active");
      this.audio.playChips();
    });

    // Rules / Lore modal
    this.btnOpenRules?.addEventListener("click", () => {
      this.rulesModal.classList.add("active");
    });
    this.btnCloseRules?.addEventListener("click", () => {
      this.rulesModal.classList.remove("active");
    });

    // Test Runner modal
    this.btnRunTests?.addEventListener("click", () => {
      this.runAndDisplayTests();
      this.testsModal.classList.add("active");
    });
    this.btnCloseTests?.addEventListener("click", () => {
      this.testsModal.classList.remove("active");
    });

    // Rematch & back to menu
    this.btnRematch?.addEventListener("click", () => {
      this.matchOverModal.classList.remove("active");
      if (this.isOnlineMatch) {
        if (this.isSoloMatch) {
          this.createSoloOnlineRoom(this.selectedRuleset);
        } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "START_MATCH" }));
        }
      } else {
        this.startNewMatch();
      }
    });
    this.btnBackToMenu?.addEventListener("click", () => {
      this.matchOverModal.classList.remove("active");
      this.tableScreen.classList.remove("active");
      this.menuScreen.classList.add("active");
      if (this.wallet.getActiveReservation()) {
        this.wallet.refundStake("Retorno ao menu principal");
      }
      if (this.isOnlineMatch) {
        this.leaveOnlineRoom();
      }
    });

    // Ability modal close & confirm
    this.btnCloseAbilityModal?.addEventListener("click", () => {
      this.abilityModal?.classList.remove("active");
      if (this.gameState) {
        this.updateTableUI();
      }
    });

    const btnAbilityConfirm = document.getElementById("btn-ability-confirm");
    btnAbilityConfirm?.addEventListener("click", () => {
      this.abilityModal?.classList.remove("active");
      if (this.gameState) {
        this.updateTableUI();
      }
    });

    // 2P Local Reveal Button
    this.btnRevealTurn?.addEventListener("click", () => {
      this.turnPassCurtain.classList.remove("active");
      this.updateTableUI();
    });

    // Truco challenge button
    this.btnTruco?.addEventListener("click", () => {
      if (this.isOnlineMatch) {
        this.handleOnlineRaiseClick();
      } else {
        this.handlePlayerProposeTruco();
      }
    });

    // Ability button
    this.btnAbility?.addEventListener("click", () => {
      this.handlePlayerTriggerAbility();
    });

    // Challenge Modal buttons
    this.btnModalAccept?.addEventListener("click", () => {
      if (this.isOnlineMatch) {
        this.handleOnlineRaiseDecision("accept");
      } else {
        this.handlePlayerRaiseDecision("accept");
      }
    });
    this.btnModalFold?.addEventListener("click", () => {
      if (this.isOnlineMatch) {
        this.handleOnlineRaiseDecision("fold");
      } else {
        this.handlePlayerRaiseDecision("fold");
      }
    });
    this.btnModalRaise?.addEventListener("click", () => {
      if (this.isOnlineMatch) {
        this.handleOnlineRaiseDecision("raise");
      } else {
        this.handlePlayerRaiseDecision("raise");
      }
    });

    // Poker Tradicional Action Buttons
    this.btnPokerFold?.addEventListener("click", () => this.handlePokerPlayerAction("FOLD"));
    this.btnPokerCheckCall?.addEventListener("click", () => {
      if (!this.pokerGame) return;
      const toCall = this.pokerGame.highestBetThisRound - this.pokerGame.players.south.currentBet;
      this.handlePokerPlayerAction(toCall > 0 ? "CALL" : "CHECK");
    });
    this.btnPokerRaise?.addEventListener("click", () => {
      if (!this.pokerGame) return;
      const amt = this.pokerGame.highestBetThisRound + this.pokerGame.bigBlind;
      this.handlePokerPlayerAction("RAISE", amt);
    });
    this.btnRaiseMin?.addEventListener("click", () => {
      if (!this.pokerGame) return;
      const amt = this.pokerGame.highestBetThisRound + this.pokerGame.bigBlind;
      this.handlePokerPlayerAction("RAISE", amt);
    });
    this.btnRaiseHalfPot?.addEventListener("click", () => {
      if (!this.pokerGame) return;
      const half = Math.max(this.pokerGame.highestBetThisRound + this.pokerGame.bigBlind, Math.floor(this.pokerGame.potManager.mainPot / 2));
      this.handlePokerPlayerAction("RAISE", half);
    });
    this.btnRaisePot?.addEventListener("click", () => {
      if (!this.pokerGame) return;
      const full = Math.max(this.pokerGame.highestBetThisRound + this.pokerGame.bigBlind, this.pokerGame.potManager.mainPot);
      this.handlePokerPlayerAction("RAISE", full);
    });
    this.btnPokerAllin?.addEventListener("click", () => this.handlePokerPlayerAction("ALL_IN"));

    // Submundo Roguelike Action Buttons
    this.btnSubmundoPlay?.addEventListener("click", () => this.playSubmundoHand());
    this.btnSubmundoDiscard?.addEventListener("click", () => this.discardSubmundoCards());
    this.btnShopContinue?.addEventListener("click", () => this.advanceSubmundoNextRound());
  }

  // Open full Character Dossier to read powers, personality, and passive
  openCharacterDossier(character) {
    this.inspectingChar = character;
    document.getElementById("dossier-char-name").textContent = character.name.toUpperCase();
    document.getElementById("dossier-char-subtitle").textContent = `${character.subtitle} • ${character.suit === 'clubs' ? 'Paus' : character.suit === 'hearts' ? 'Copas' : character.suit === 'spades' ? 'Espadas' : 'Ouros'}`;
    document.getElementById("dossier-char-img").src = character.portrait;
    document.getElementById("dossier-specialty").textContent = character.specialty;
    document.getElementById("dossier-difficulty").textContent = character.difficulty;
    document.getElementById("dossier-quote").textContent = `“${character.quote}”`;
    document.getElementById("dossier-summary").textContent = character.summary;

    document.getElementById("dossier-power-name").textContent = character.mainPowerName;
    document.getElementById("dossier-power-desc").textContent = character.mainPowerDesc;
    document.getElementById("dossier-power-timing").textContent = `Momento de ativação: ${character.mainPowerTiming}`;

    document.getElementById("dossier-passive-name").textContent = character.passiveName;
    document.getElementById("dossier-passive-desc").textContent = character.passiveDesc;

    document.getElementById("dossier-personality").textContent = character.personality;
    document.getElementById("dossier-why-play").textContent = character.whyPlay;

    this.audio.playCharacterSignature(character.id);
    this.dossierModal.classList.add("active");
  }

  // Render character cards on menu carousel
  renderMenuCharacters() {
    if (!this.charCarousel) return;
    this.charCarousel.innerHTML = "";

    const specialtyIcons = {
      trampa: ICONS.chessKnight,
      veneno: ICONS.rose,
      calibre: ICONS.crosshair,
      pixel: ICONS.jokerHat
    };

    CHARACTERS.forEach(char => {
      const isSelected = char.id === this.selectedPlayerChar.id;
      const card = document.createElement("div");
      card.className = `char-card-item ${isSelected ? "selected" : ""} char-theme-${char.id}`;
      card.innerHTML = `
        <button class="char-inspect-btn" title="Ver Dossiê e Poderes">
          ${ICONS.eye}
          <span class="inspect-text">FICHA</span>
        </button>
        <span class="char-card-selected-tag">${ICONS.check} SELECIONADO</span>
        <div class="char-img-wrap">
          <img src="${char.portrait}" alt="${char.name}">
        </div>
        <div class="char-card-footer">
          <div class="char-footer-top">
            <span class="name">${char.name}</span>
            <span class="char-badge-pill"><span class="badge-svg-icon" style="display:inline-flex; align-items:center; margin-right:4px;">${specialtyIcons[char.id] || ICONS.cards}</span>${char.subtitle}</span>
          </div>
          <div class="char-power-row">
            <span class="power-prefix">PODER:</span>
            <span class="power-title">${char.mainPowerName}</span>
          </div>
        </div>
      `;

      // Click card to select
      card.addEventListener("click", (e) => {
        if (e.target.closest(".char-inspect-btn")) return;
        this.selectedPlayerChar = char;
        const otherChars = CHARACTERS.filter(c => c.id !== char.id);
        this.selectedOpponentChar = otherChars[Math.floor(Math.random() * otherChars.length)];
        this.renderMenuCharacters();
        this.audio.playChips();
      });

      // Click inspect button to inspect dossier
      const inspectBtn = card.querySelector(".char-inspect-btn");
      inspectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openCharacterDossier(char);
      });

      this.charCarousel.appendChild(card);
    });

    // Update player profile badge
    const badgeImg = document.getElementById("player-badge-img");
    const badgeName = document.getElementById("player-badge-name");
    if (badgeImg && badgeName) {
      badgeImg.src = this.selectedPlayerChar.avatar;
      badgeName.textContent = this.selectedPlayerChar.name;
    }
  }

  // Render court lore inside rules modal
  renderCourtLore() {
    const container = document.getElementById("court-lore-container");
    if (!container) return;
    container.innerHTML = "";

    COURT_LORE.forEach(item => {
      const box = document.createElement("div");
      box.className = "court-lore-card";
      box.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <div class="info">
          <h4>${item.name}</h4>
          <p style="color: var(--gold); font-size: 0.75rem;">${item.title} — ${item.suit}</p>
          <p class="quote">“${item.quote}”</p>
          <p class="desc">${item.desc}</p>
        </div>
      `;
      container.appendChild(box);
    });
  }

  // Start new match
  startNewMatch() {
    if (this.selectedRuleset === "poker_tradicional") {
      this.startPokerTradicionalMatch();
      return;
    }
    if (this.selectedRuleset === "poker_submundo") {
      this.startPokerSubmundoMatch();
      return;
    }

    this.resetTableModeViews();
    this.revealedBotCardId = null;

    // Virtual Economy: Reserve Table Buy-in
    const stakeAmount = this.selectedStake ? this.selectedStake.chips : 0;
    this.wallet.reserveStake(stakeAmount, `match_${Date.now()}`, `${this.selectedStake.name} (${this.selectedRuleset})`);
    this.updateTableEconomyHUD(stakeAmount);

    this.gameState = new GameState(this.selectedPlayerChar, this.selectedOpponentChar, this.selectedRuleset);
    this.gameState.startMatch();

    // Switch screen
    this.menuScreen.classList.remove("active");
    this.tableScreen.classList.add("active");

    // Setup labels according to match type
    if (this.matchType === "pvp") {
      this.hudPlayerLabel.textContent = this.selectedPlayerChar.name.toUpperCase();
      this.hudOpponentLabel.textContent = this.selectedOpponentChar.name.toUpperCase();
    } else {
      this.hudPlayerLabel.textContent = "SUA DUPLA";
      this.hudOpponentLabel.textContent = "ADVERSÁRIOS";
    }

    // Visual avatars (South: You)
    if (this.playerAvatar) this.playerAvatar.src = this.selectedPlayerChar.avatar;
    if (this.playerName) this.playerName.textContent = this.selectedPlayerChar.name;

    // Partner (North: Calibre or other)
    const partnerChar = CHARACTERS.find(c => c.id !== this.selectedPlayerChar.id && c.id !== this.selectedOpponentChar.id) || CHARACTERS[2];
    if (this.avatarNorth) this.avatarNorth.src = partnerChar.avatar;
    if (this.nameNorth) this.nameNorth.textContent = `${partnerChar.name} (Parceiro)`;

    // Rival 1 (West: Opponent)
    if (this.avatarWest) this.avatarWest.src = this.selectedOpponentChar.avatar;
    if (this.nameWest) this.nameWest.textContent = this.selectedOpponentChar.name;

    // Rival 2 (East)
    const remainingChars = CHARACTERS.filter(c => c.id !== this.selectedPlayerChar.id && c.id !== this.selectedOpponentChar.id && c.id !== partnerChar.id);
    const eastChar = remainingChars[0] || CHARACTERS[3];
    if (this.avatarEast) this.avatarEast.src = eastChar.avatar;
    if (this.nameEast) this.nameEast.textContent = eastChar.name;

    this.audio.playCardDeal();
    this.audio.playViraReveal();
    this.audio.switchMusicTrack("table_normal");
    this.updateTableUI();

    // In Bot match, if bot starts, play after delay
    if (this.matchType === "bot" && this.gameState.turnPlayer === "bot") {
      setTimeout(() => this.executeBotTurn(), 1000);
    }
  }

  // Update table UI
  updateTableUI() {
    if (!this.gameState) return;

    // Scores & Stake
    if (this.playerScoreEl) this.playerScoreEl.textContent = this.gameState.playerScore;
    if (this.botScoreEl) this.botScoreEl.textContent = this.gameState.botScore;
    if (this.currentStakeEl) this.currentStakeEl.textContent = this.gameState.currentStake;

    // Trick Dots (Clean SVG indicators, no emojis)
    if (this.trickDotsContainer) {
      this.trickDotsContainer.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("div");
        const winner = this.gameState.trickWinners[i];
        if (winner === "player") {
          dot.className = "trick-dot won-player";
          dot.innerHTML = `<span style="font-weight: bold; font-size: 0.7rem;">1</span>`;
        } else if (winner === "bot") {
          dot.className = "trick-dot won-bot";
          dot.innerHTML = `<span style="font-weight: bold; font-size: 0.7rem;">2</span>`;
        } else if (winner === "tie") {
          dot.className = "trick-dot tie";
          dot.innerHTML = `<span style="font-weight: bold; font-size: 0.7rem;">=</span>`;
        } else {
          dot.className = "trick-dot";
        }
        this.trickDotsContainer.appendChild(dot);
      }
    }

    // Turn Indicators
    const isPlayerTurn = this.gameState.turnPlayer === "player";
    if (isPlayerTurn) {
      this.playerIdentityPanel?.classList.add("turn-active");
      this.wrapWest?.classList.remove("turn-active");
      if (this.playerTurnStatus) this.playerTurnStatus.textContent = "Sua Vez";
    } else {
      this.playerIdentityPanel?.classList.remove("turn-active");
      this.wrapWest?.classList.add("turn-active");
      if (this.playerTurnStatus) this.playerTurnStatus.textContent = this.matchType === "pvp" ? `Aguardando ${this.selectedOpponentChar.name}` : `Vez de ${this.selectedOpponentChar.name}`;
    }

    // Vira & Manilha
    if (this.gameState.viraCard && this.viraCardImg) {
      this.viraCardImg.src = this.gameState.viraCard.faceAsset;
      if (this.manilhaRankTxt) this.manilhaRankTxt.textContent = (this.gameState.manilhaRank || "").toUpperCase();
    }

    // Center Trick Cards Played
    this.renderCenterTrickCards();

    // Seats Cards in Hand (North, West, East)
    const oppCardsCount = this.gameState.botHand ? this.gameState.botHand.length : 3;
    if (this.cardsWest) {
      this.cardsWest.innerHTML = "";
      for (let i = 0; i < oppCardsCount; i++) {
        const mini = document.createElement("div");
        const botCard = this.gameState.botHand ? this.gameState.botHand[i] : null;
        if (botCard && botCard.id === this.revealedBotCardId) {
          mini.className = "mini-card-back mini-card-revealed";
          mini.title = `Carta Revelada: ${botCard.rank.toUpperCase()}`;
          mini.style.cssText = "display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold-bright); box-shadow: 0 0 12px rgba(216, 173, 102, 0.8); background: radial-gradient(circle, #245247 0%, #121719 100%);";
          mini.innerHTML = `<span style="font-size: 0.75rem; color: var(--gold-bright); font-weight: 800;">${botCard.rank.toUpperCase()}</span>`;
        } else {
          mini.className = "mini-card-back";
        }
        this.cardsWest.appendChild(mini);
      }
    }
    if (this.cardsNorth) {
      this.cardsNorth.innerHTML = "";
      for (let i = 0; i < oppCardsCount; i++) {
        const mini = document.createElement("div");
        mini.className = "mini-card-back";
        this.cardsNorth.appendChild(mini);
      }
    }
    if (this.cardsEast) {
      this.cardsEast.innerHTML = "";
      for (let i = 0; i < oppCardsCount; i++) {
        const mini = document.createElement("div");
        mini.className = "mini-card-back";
        this.cardsEast.appendChild(mini);
      }
    }

    // Player Hand Cards
    this.renderPlayerHand();

    // Truco Button
    const nextRaise = getNextRaise(this.gameState.currentStake);
    const canRaise = nextRaise && this.gameState.state === "PLAYING" && this.gameState.lastRaiser !== this.gameState.turnPlayer;
    if (this.btnTruco) {
      if (canRaise) {
        this.btnTruco.disabled = false;
        this.btnTruco.textContent = BET_NAMES[nextRaise] || `PEDIR ${nextRaise}!`;
      } else {
        this.btnTruco.disabled = true;
        this.btnTruco.textContent = "TRUCO!";
      }
    }

    // Ability Button
    this.updateAbilityButton();

    // Update Logs
    this.renderEventLogs();

    // Check match over
    if (this.gameState.state === "MATCH_OVER") {
      this.showMatchOverModal();
    }
  }

  // Render cards played on center table - Soltas na mesa com sombra curta e pouso natural
  renderCenterTrickCards() {
    this.trickZone.innerHTML = "";

    this.gameState.tableCards.forEach((tc, idx) => {
      const slot = document.createElement("div");
      slot.className = "played-slot";

      const label = document.createElement("span");
      label.className = "slot-label";
      label.textContent = tc.playerId === "player" ? this.selectedPlayerChar.name : this.selectedOpponentChar.name;

      const cardFrame = document.createElement("div");
      cardFrame.className = "card-frame";
      const rot = tc.playerId === "player" ? -2.5 : 2.5;
      cardFrame.style.setProperty("--play-rot", `${rot}deg`);

      const img = document.createElement("img");
      img.src = tc.card.faceAsset;
      cardFrame.appendChild(img);

      slot.appendChild(label);
      slot.appendChild(cardFrame);
      this.trickZone.appendChild(slot);
    });
  }

  // Render player hand cards - Mão em leque orgânico com cartas físicas
  renderPlayerHand() {
    this.playerHandContainer.innerHTML = "";

    const count = this.gameState.playerHand.length;
    const isPlayerTurn = this.gameState.turnPlayer === "player" && this.gameState.state === "PLAYING";

    this.gameState.playerHand.forEach((card, idx) => {
      const wrapper = document.createElement("div");
      const offsetFromCenter = idx - (count - 1) / 2;
      const rot = offsetFromCenter * 5.5;
      const vertArc = Math.abs(offsetFromCenter) * 4;

      const isManilha = this.gameState.manilhaRank && card.rank.toLowerCase() === this.gameState.manilhaRank.toLowerCase();
      wrapper.className = `hand-card-wrapper ${isManilha ? "manilha-card" : ""} ${!isPlayerTurn ? "disabled" : ""}`;
      wrapper.style.transform = `rotate(${rot}deg) translateY(${vertArc}px)`;

      const cardFrame = document.createElement("div");
      cardFrame.className = "card-frame";
      const img = document.createElement("img");
      img.src = card.faceAsset;
      cardFrame.appendChild(img);

      wrapper.appendChild(cardFrame);

      wrapper.addEventListener("mouseenter", () => {
        this.audio.playCardSelect();
      });

      if (isPlayerTurn) {
        wrapper.addEventListener("click", () => {
          this.handlePlayerPlayCard(idx);
        });
      }

      this.playerHandContainer.appendChild(wrapper);
    });
  }

  // Play a card
  handlePlayerPlayCard(cardIndex) {
    if (this.gameState.state !== "PLAYING" || this.gameState.turnPlayer !== "player") return;

    this.audio.playCardPlay();
    const played = this.gameState.playCard("player", cardIndex);
    if (!played) return;

    this.updateTableUI();

    if (this.gameState.state === "TRICK_RESOLVE") {
      setTimeout(() => this.handleResolveTrick(), 350);
    } else if (this.gameState.turnPlayer === "bot") {
      if (this.matchType === "bot") {
        setTimeout(() => this.executeBotTurn(), 350);
      } else {
        // Friend 2P mode: show privacy curtain for player 2
        this.showTurnPassCurtain(this.selectedOpponentChar.name);
      }
    }
  }

  // Privacy curtain for local 2P friend turn
  showTurnPassCurtain(nextPlayerName) {
    this.turnPassTitle.textContent = `VEZ DE ${nextPlayerName.toUpperCase()}`;
    this.turnPassCurtain.classList.add("active");
  }

  // Bot plays turn
  executeBotTurn() {
    if (!this.gameState || this.gameState.state !== "PLAYING" || this.gameState.turnPlayer !== "bot") return;

    // Challenge Truco check
    if (this.gameState.currentStake < 12 && this.gameState.lastRaiser !== "bot") {
      const shouldRaise = this.gameState.ai.shouldChallenge(
        this.gameState.botHand,
        this.gameState.manilhaRank,
        this.gameState.currentStake,
        this.gameState.trickWinners,
        this.gameState.currentTrick
      );

      if (shouldRaise) {
        const nextLadder = getNextRaise(this.gameState.currentStake);
        this.triggerOpponentSpeech(this.gameState.ai.getDialogue("truco", nextLadder));
        this.audio.playTrucoSting();
        this.gameState.proposeRaise("bot");
        this.showChallengeModalForPlayer();
        return;
      }
    }

    // Play card
    const cardIdx = this.gameState.ai.chooseCardToPlay(
      this.gameState.botHand,
      this.gameState.tableCards,
      this.gameState.manilhaRank,
      this.gameState.trickWinners,
      this.gameState.currentTrick
    );

    this.audio.playCardPlay();
    this.gameState.playCard("bot", cardIdx);
    this.updateTableUI();

    if (this.gameState.state === "TRICK_RESOLVE") {
      setTimeout(() => this.handleResolveTrick(), 350);
    }
  }

  // Resolve current trick
  handleResolveTrick() {
    const outcome = this.gameState.resolveCurrentTrick();
    if (!outcome) return;

    const winner = outcome.trickResult.winner;
    const winCard = outcome.trickResult.winningCard;

    // Highlight winning card in the center trick zone
    if (winCard && this.trickZone) {
      const cardFrames = this.trickZone.querySelectorAll(".card-frame");
      this.gameState.tableCards.forEach((tc, idx) => {
        if (tc.card.id === winCard.id && cardFrames[idx]) {
          cardFrames[idx].classList.add("winner-highlight");
        }
      });
    }

    // Directional winner pointer banner
    if (winner === "player") {
      this.audio.playTrickWin();
      const cardDesc = winCard ? `${winCard.rank.toUpperCase()} de ${winCard.suitName}` : "Maior Carta";
      this.showWinnerPointer("south", "VOCÊ FEZ A VAZA!", cardDesc);
    } else if (winner === "bot") {
      this.audio.playChips();
      const botName = this.selectedOpponentChar?.name || "Oponente";
      const cardDesc = winCard ? `${winCard.rank.toUpperCase()} de ${winCard.suitName}` : "Maior Carta";
      this.showWinnerPointer("north", `${botName.toUpperCase()} FEZ A VAZA!`, cardDesc);
    } else {
      this.showWinnerPointer("center", "EMPATE! A VAZA CANGOU!", "Nenhum ponto concedido nesta disputa");
    }

    // Show winner pointer & highlighted card for 850ms, then clear smoothly
    setTimeout(() => {
      this.hideWinnerPointer();
      this.audio.playTrickSweep();
      this.gameState.clearTrickCards();
      this.updateTableUI();

      // Hand finished?
      if (outcome.handStatus.finished) {
        setTimeout(() => {
          this.gameState.startNewHand();
          this.audio.playCardDeal();
          this.audio.playViraReveal();
          this.audio.switchMusicTrack("table_normal");
          this.updateTableUI();

          if (this.matchType === "bot" && this.gameState.turnPlayer === "bot" && this.gameState.state === "PLAYING") {
            setTimeout(() => this.executeBotTurn(), 350);
          }
        }, 850);
      } else {
        if (this.matchType === "bot" && this.gameState.turnPlayer === "bot") {
          setTimeout(() => this.executeBotTurn(), 350);
        }
      }
    }, 850);
  }

  // Propose Truco
  handlePlayerProposeTruco() {
    if (this.gameState.state !== "PLAYING") return;
    this.audio.playTrucoSting();

    const success = this.gameState.proposeRaise("player");
    if (!success) return;

    this.updateTableUI();

    if (this.matchType === "bot") {
      setTimeout(() => {
        this.executeBotRaiseResponse();
      }, 1200);
    } else {
      // 2P Friend mode challenge prompt
      this.showChallengeModalForPlayer();
    }
  }

  // Bot evaluates raise
  executeBotRaiseResponse() {
    const proposed = this.gameState.pendingRaise.proposedStake;
    const decision = this.gameState.ai.respondToChallenge(
      this.gameState.botHand,
      this.gameState.manilhaRank,
      proposed,
      this.gameState.trickWinners,
      this.gameState.currentTrick
    );

    if (decision === "accept") {
      this.triggerOpponentSpeech(this.gameState.ai.getDialogue("accept", proposed));
      this.audio.playChips();
      this.gameState.respondToRaise("bot", "accept");
      this.updateTableUI();

      if (this.gameState.turnPlayer === "bot") {
        setTimeout(() => this.executeBotTurn(), 800);
      }
    } else if (decision === "fold") {
      this.triggerOpponentSpeech(this.gameState.ai.getDialogue("fold", proposed));
      this.audio.playChips();
      this.gameState.respondToRaise("bot", "fold");
      this.updateTableUI();

      setTimeout(() => {
        this.gameState.startNewHand();
        this.audio.playCardDeal();
        this.updateTableUI();
      }, 1500);
    } else if (decision === "counter") {
      const nextLadder = getNextRaise(proposed);
      this.triggerOpponentSpeech(this.gameState.ai.getDialogue("counter", nextLadder));
      this.audio.playTrucoSting();
      this.gameState.respondToRaise("bot", "raise");
      this.showChallengeModalForPlayer();
    }
  }

  // Challenge modal for responder
  showChallengeModalForPlayer() {
    if (!this.gameState.pendingRaise) return;
    const proposed = this.gameState.pendingRaise.proposedStake;
    const current = this.gameState.currentStake;
    const challenger = this.gameState.pendingRaise.challenger;
    const challengerName = challenger === "player" ? this.selectedPlayerChar.name : this.selectedOpponentChar.name;

    this.challengeTitle.textContent = `${challengerName.toUpperCase()} PEDIU ${BET_NAMES[proposed] || proposed}!`;
    this.challengeSub.textContent = `A mão atualmente vale ${current} tentos. Se aceitar, valerá ${proposed}. Se correr, ${challengerName} leva ${current}.`;

    const canCounter = proposed < 12;
    const nextLadder = getNextRaise(proposed);
    if (canCounter && nextLadder) {
      this.btnModalRaise.style.display = "block";
      this.btnModalRaise.textContent = `PEDIR ${BET_NAMES[nextLadder] || nextLadder}!`;
    } else {
      this.btnModalRaise.style.display = "none";
    }

    this.challengeModal.classList.add("active");
  }

  // Player raise decision
  handlePlayerRaiseDecision(decision) {
    this.challengeModal.classList.remove("active");

    if (decision === "accept") {
      this.audio.playChips();
      this.gameState.respondToRaise("player", "accept");
      this.updateTableUI();

      if (this.gameState.turnPlayer === "bot") {
        setTimeout(() => this.executeBotTurn(), 800);
      }
    } else if (decision === "fold") {
      this.audio.playChips();
      this.gameState.respondToRaise("player", "fold");
      this.updateTableUI();

      setTimeout(() => {
        this.gameState.startNewHand();
        this.audio.playCardDeal();
        this.updateTableUI();
      }, 1500);
    } else if (decision === "raise") {
      this.audio.playTrucoSting();
      this.gameState.respondToRaise("player", "raise");
      this.updateTableUI();

      if (this.matchType === "bot") {
        setTimeout(() => {
          this.executeBotRaiseResponse();
        }, 1200);
      }
    }
  }

  // Update Ability Button
  updateAbilityButton() {
    if (!this.btnAbility || !this.gameState) return;

    const isPowersMode = this.selectedRuleset === "truco_ma_fama" || 
                         this.selectedRuleset === "sueca_ma_fama" || 
                         this.selectedRuleset === "ma_fama" ||
                         (this.selectedRuleset && this.selectedRuleset.includes("ma_fama"));

    if (!isPowersMode) {
      this.btnAbility.style.display = "none";
      return;
    }
    this.btnAbility.style.display = "inline-flex";

    if (this.gameState.abilityManager.playerAbilityUsed) {
      this.btnAbility.disabled = true;
      if (this.abilityBtnText) this.abilityBtnText.textContent = `${this.selectedPlayerChar.mainPowerName} (Usado)`;
      return;
    }

    const timingContext = {
      trickIndex: this.gameState.currentTrick,
      trickCardsCount: this.gameState.tableCards ? this.gameState.tableCards.length : 0,
      lastTrickLostByPlayer: this.gameState.lastTrickLostByPlayer,
      isPlayerTurn: this.gameState.turnPlayer === "player",
      opponentCardVisible: this.gameState.tableCards ? this.gameState.tableCards.some(tc => tc.playerId === "bot") : false
    };

    const canUse = this.gameState.abilityManager.canUsePlayerAbility(this.selectedPlayerChar.id, timingContext);
    this.btnAbility.disabled = !canUse;
    if (this.abilityBtnText) this.abilityBtnText.textContent = this.selectedPlayerChar.mainPowerName;
  }

  // Trigger character powers
  handlePlayerTriggerAbility() {
    if (this.isOnlineMatch) {
      this.executeOnlineAbility();
      return;
    }

    if (!this.gameState || this.gameState.abilityManager.playerAbilityUsed) return;
    const charId = this.selectedPlayerChar.id;

    if (charId === "trampa") {
      this.executeTrampaCartaMarcada();
    } else if (charId === "veneno") {
      this.executeVenenoJogoPsicologico();
    } else if (charId === "calibre") {
      this.executeCalibreApostaDeSangue();
    } else if (charId === "pixel") {
      this.executePixelPlanoB();
    }
  }

  executeOnlineAbility() {
    const char = this.selectedPlayerChar;
    this.audio.playCharacterSignature(char.id);

    const modalIcon = document.getElementById("ability-modal-icon");
    if (modalIcon) modalIcon.innerHTML = ICONS.power;

    this.abilityModalTitle.textContent = `${char.mainPowerName.toUpperCase()} — ${char.name.toUpperCase()}`;
    let desc = "";
    if (char.id === "trampa") {
      desc = `<p style="margin-bottom: 12px; color: var(--text-secondary);">Com a Memória de Tubarão, Trampa monitora as cartas jogadas e a rotação dos naipes.</p>
              <p style="color: var(--gold-bright); font-size: 0.9rem;">Dica: consulte o Conselheiro de Mesa (botão DICA) para ver a melhor jogada na vaza atual!</p>`;
    } else if (char.id === "veneno") {
      desc = `<p style="margin-bottom: 12px; color: var(--text-secondary);">Veneno analisa as reações dos adversários e o ritmo das vazas passadas.</p>
              <p style="color: var(--gold-bright); font-size: 0.9rem;">Seus blefes causam hesitação imediata nos oponentes da mesa.</p>`;
    } else if (char.id === "calibre") {
      desc = `<p style="margin-bottom: 12px; color: var(--text-secondary);">Calibre impõe respeito e intimidação na mesa de jogo.</p>
              <p style="color: var(--gold-bright); font-size: 0.9rem;">Use os botões de TRUCO para acelerar a mão quando estiver na vantagem!</p>`;
    } else {
      desc = `<p style="margin-bottom: 12px; color: var(--text-secondary);">Pixel calcula probabilidades frias e otimização de cartas por naipe.</p>
              <p style="color: var(--gold-bright); font-size: 0.9rem;">Consulte o Conselheiro de Mesa para jogadas com probabilidade favorável.</p>`;
    }

    this.abilityModalContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px;">
        <img src="${char.avatar}" alt="${char.name}" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--gold); display: inline-block; box-shadow: 0 0 15px rgba(216, 173, 102, 0.4);">
      </div>
      ${desc}
    `;
    this.abilityModal.classList.add("active");
  }

  // 1. TRAMPA: CARTA MARCADA
  executeTrampaCartaMarcada() {
    if (!this.gameState || !this.gameState.botHand || this.gameState.botHand.length === 0) return;
    const card = this.gameState.abilityManager.executeCartaMarcada(this.gameState.botHand);
    if (!card) return;

    this.gameState.abilityManager.playerAbilityUsed = true;
    this.audio.playChips();
    this.audio.playManilhaChime();
    this.gameState.logEvent(`Trampa ativou Carta Marcada: espiou uma carta secreta do oponente!`, "win");

    const modalIcon = document.getElementById("ability-modal-icon");
    if (modalIcon) modalIcon.innerHTML = ICONS.chessKnight;
    this.abilityModalTitle.textContent = "CARTA MARCADA — TRAMPA";

    const isManilha = card.rank.toLowerCase() === (this.gameState.manilhaRank || "").toLowerCase();

    this.abilityModalContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="font-size: 0.78rem; color: var(--gold); text-transform: uppercase; letter-spacing: 2px;">INFORMAÇÃO PRIVILEGIADA OBTIDA</span>
        <h3 style="color: #fff; font-size: 1.15rem; margin-top: 4px;">O rival esconde na mão:</h3>
      </div>
      <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin: 15px 0;">
        <img src="${card.faceAsset}" alt="${card.rank} de ${card.suit}" style="width: 105px; height: 150px; border-radius: 8px; border: 2.5px solid var(--gold-bright); box-shadow: 0 0 30px rgba(216, 173, 102, 0.6);">
        <div style="text-align: left; max-width: 240px;">
          <div style="font-weight: 800; font-size: 1.25rem; color: var(--gold-bright);">${card.rank.toUpperCase()} DE ${(card.suitName || card.suit).toUpperCase()}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.4;">
            ${isManilha ? '<strong style="color: #ff5555; display:block;">ATENÇÃO: É UMA MANILHA!</strong> Cuidado com essa carta na vaza decisiva.' : 'Carta comum. Oponente precisará blefar se não possuir manilhas.'}
          </div>
        </div>
      </div>
      <p style="font-size: 0.82rem; color: var(--gold);">Memória de Tubarão: Esta carta permanecerá destacada para você na mão do rival!</p>
    `;

    this.revealedBotCardId = card.id;
    this.abilityModal.classList.add("active");
    this.updateTableUI();
  }

  // 2. VENENO: JOGO PSICOLÓGICO
  executeVenenoJogoPsicologico() {
    if (!this.gameState || !this.gameState.botHand) return;
    this.gameState.abilityManager.playerAbilityUsed = true;
    this.audio.playChips();
    this.audio.playVenenoWhisper();

    const manilhaRank = (this.gameState.manilhaRank || "").toLowerCase();
    const hasManilha = this.gameState.abilityManager.executeDossie(this.gameState.botHand, "manilha", manilhaRank);
    const manilhaCount = this.gameState.botHand.filter(c => c.rank.toLowerCase() === manilhaRank).length;

    let riskLevel = "BAIXO RISCO (Rival vulnerável a pressão)";
    let riskColor = "#55dd88";
    let tacticalAdvice = "O oponente NÃO possui nenhuma Manilha na mão! É o momento ideal para pedir TRUCO e forçar a desistência.";

    if (hasManilha) {
      riskLevel = manilhaCount > 1 ? "PERIGO CRÍTICO (Rival possui múltiplas Manilhas!)" : "RISCO MODERADO (Rival possui 1 Manilha)";
      riskColor = manilhaCount > 1 ? "#ff5555" : "#ffaa44";
      tacticalAdvice = "O oponente possui Manilha na mão! Não blefe alto a menos que você tenha uma carta superior (Zap ou Copas).";
    }

    this.gameState.logEvent(`Veneno ativou Jogo Psicológico: escaneamento tático concluído!`, "win");

    const modalIcon = document.getElementById("ability-modal-icon");
    if (modalIcon) modalIcon.innerHTML = ICONS.rose;
    this.abilityModalTitle.textContent = "JOGO PSICOLÓGICO — VENENO";
    this.abilityModalContent.innerHTML = `
      <div style="background: rgba(116, 38, 58, 0.25); border: 1.5px solid var(--wine); border-radius: 8px; padding: 16px; margin-bottom: 15px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 0.75rem; color: var(--gold); letter-spacing: 1.5px; text-transform: uppercase;">DOSSIÊ DE PRESSÃO PSICOLÓGICA</span>
          <span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 10px; background: rgba(0,0,0,0.5); color: ${riskColor}; font-weight: 700;">${hasManilha ? 'MANILHA CONFIRMADA' : 'SEM MANILHAS'}</span>
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: ${riskColor}; margin-bottom: 6px;">
          ${riskLevel}
        </div>
        <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
          ${tacticalAdvice}
        </p>
      </div>
      <div style="font-size: 0.82rem; color: var(--gold); text-align: center;">
        Passiva Sangue Frio: Os blefes de Veneno causam hesitação imediata nos oponentes da mesa!
      </div>
    `;

    this.abilityModal.classList.add("active");
    this.updateTableUI();
  }

  // 3. CALIBRE: APOSTA DE SANGUE
  executeCalibreApostaDeSangue() {
    if (!this.gameState) return;
    this.gameState.abilityManager.playerAbilityUsed = true;
    this.audio.playChips();
    this.audio.playTrucoSting();

    // Table screen vibration effect
    this.tableScreen.classList.add("intimidation-shake");
    setTimeout(() => this.tableScreen.classList.remove("intimidation-shake"), 800);

    const oldStake = this.gameState.currentStake;
    const newStake = Math.max(6, oldStake + 3);
    this.gameState.currentStake = newStake;
    this.gameState.lastRaiser = "player";

    this.gameState.logEvent(`Calibre ativou Aposta de Sangue! Aposta saltou direto para ${newStake} TENTOS!`, "raise");

    const modalIcon = document.getElementById("ability-modal-icon");
    if (modalIcon) modalIcon.innerHTML = ICONS.crosshair;
    this.abilityModalTitle.textContent = "APOSTA DE SANGUE — CALIBRE";
    this.abilityModalContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 0.8rem; color: #ff5555; letter-spacing: 2px; text-transform: uppercase;">INTIMIDAÇÃO PESADA NA BANCA</span>
        <h2 style="font-size: 2.2rem; color: var(--gold-bright); margin: 6px 0; font-family: var(--font-title);">VALE ${newStake} TENTOS!</h2>
        <p style="font-size: 0.9rem; color: var(--text-secondary); max-width: 380px; margin: 0 auto;">
          Calibre colocou o revólver sobre o feltro. A rodada foi forçada para <strong>${newStake} TENTOS</strong> instantaneamente!
        </p>
      </div>
      <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(216, 173, 102, 0.3); border-radius: 8px; padding: 12px; font-size: 0.82rem; color: var(--gold);">
        O oponente ficou abalado com a pressão violenta. Ninguém blefa duas vezes quando o calibre sobe!
      </div>
    `;

    this.abilityModal.classList.add("active");

    // Bot intimidation response check
    setTimeout(() => {
      const manilhaRank = (this.gameState.manilhaRank || "").toLowerCase();
      const botHasManilha = this.gameState.botHand && this.gameState.botHand.some(c => c.rank.toLowerCase() === manilhaRank);
      if (!botHasManilha && Math.random() < 0.6) {
        this.triggerOpponentSpeech("Calibre... você tá maluco! Essa mão é sua, eu corro!");
        this.gameState.logEvent(`${this.selectedOpponentChar.name} fugiu aterrorizado pela Aposta de Sangue!`, "win");
        setTimeout(() => {
          this.gameState.respondToRaise("bot", "fold");
          this.updateTableUI();
          setTimeout(() => {
            this.revealedBotCardId = null;
            this.gameState.startNewHand();
            this.audio.playCardDeal();
            this.updateTableUI();
          }, 1500);
        }, 1200);
      } else {
        this.triggerOpponentSpeech("Você quer sangue, Calibre? Então vamos ver quem tomba!");
      }
    }, 1000);

    this.updateTableUI();
  }

  // 4. PIXEL: PLANO B
  executePixelPlanoB() {
    if (!this.gameState || !this.gameState.playerHand || this.gameState.playerHand.length === 0) return;

    const modalIcon = document.getElementById("ability-modal-icon");
    if (modalIcon) modalIcon.innerHTML = ICONS.jokerHat;
    this.abilityModalTitle.textContent = "PLANO B — PIXEL";

    let cardsHtml = `<div style="display: flex; justify-content: center; gap: 14px; margin: 18px 0; flex-wrap: wrap;">`;
    this.gameState.playerHand.forEach((c, idx) => {
      cardsHtml += `
        <div style="text-align: center;">
          <img src="${c.faceAsset}" alt="${c.rank} de ${c.suit}" style="width: 85px; height: 125px; border-radius: 6px; border: 1.5px solid var(--gold); display: block; margin-bottom: 8px;">
          <button class="btn-secondary pixel-swap-btn" data-card-idx="${idx}" style="padding: 6px 12px; font-size: 0.75rem; width: 100%; border-color: var(--gold); cursor: pointer;">
            TROCAR
          </button>
        </div>
      `;
    });
    cardsHtml += `</div>`;

    this.abilityModalContent.innerHTML = `
      <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 6px;">
        Gambiarra ativada! Escolha qual carta da sua mão você deseja <strong>descartar</strong> para sacar uma nova carta do baralho:
      </p>
      ${cardsHtml}
      <p style="font-size: 0.8rem; color: var(--gold);">Pixel reorganiza o jogo no reflexo!</p>
    `;

    this.abilityModal.classList.add("active");

    // Add click listeners to swap buttons
    const swapBtns = this.abilityModalContent.querySelectorAll(".pixel-swap-btn");
    swapBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const cIdx = parseInt(e.currentTarget.getAttribute("data-card-idx"), 10);
        const swapResult = this.gameState.abilityManager.executePlanoBDeckSwap(
          this.gameState.playerHand,
          cIdx,
          this.gameState.deckManager.deck
        );

        if (swapResult) {
          this.gameState.abilityManager.playerAbilityUsed = true;
          this.audio.playChips();
          this.audio.playGlitch();
          this.gameState.logEvent(`Pixel ativou Plano B: trocou ${swapResult.oldCard.rank.toUpperCase()} por ${swapResult.newCard.rank.toUpperCase()}!`, "win");

          this.abilityModalContent.innerHTML = `
            <div style="text-align: center; padding: 15px 0;">
              <span style="font-size: 0.8rem; color: #55dd88; letter-spacing: 2px; text-transform: uppercase;">CARTA TROCADA COM SUCESSO!</span>
              <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin: 15px 0;">
                <div style="opacity: 0.5;">
                  <span style="font-size: 0.75rem; color: #888;">Descartada:</span>
                  <img src="${swapResult.oldCard.faceAsset}" style="width: 70px; height: 100px; border-radius: 6px; display: block; margin-top: 4px;">
                </div>
                <div style="font-size: 1.5rem; color: var(--gold); display: flex; align-items: center;">${ICONS.arrowRight}</div>
                <div>
                  <span style="font-size: 0.75rem; color: var(--gold-bright); font-weight: 700;">Nova Carta:</span>
                  <img src="${swapResult.newCard.faceAsset}" style="width: 85px; height: 125px; border-radius: 6px; border: 2px solid var(--gold); display: block; margin-top: 4px; box-shadow: 0 0 20px rgba(216, 173, 102, 0.5);">
                </div>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">A nova carta já está pronta na sua mão para ser jogada!</p>
            </div>
          `;
          this.updateTableUI();
        }
      });
    });
  }

  // Trigger speech balloon on bot
  triggerOpponentSpeech(text) {
    this.opponentSpeech.textContent = text;
    this.opponentSpeech.classList.add("active");
    setTimeout(() => {
      this.opponentSpeech.classList.remove("active");
    }, 2500);
  }

  // Render logs
  renderEventLogs() {
    if (!this.tableLogList) return;
    this.tableLogList.innerHTML = "";
    this.gameState.eventLog.slice().reverse().forEach(ev => {
      const el = document.createElement("div");
      el.className = `log-entry ${ev.type}`;
      el.innerHTML = `<strong>[${ev.time}]</strong> ${ev.text}`;
      this.tableLogList.appendChild(el);
    });
  }

  // Match victory modal
  showMatchOverModal() {
    this.audio.playVictory();
    const isPlayerWin = this.gameState.matchWinner === "player";
    const winnerChar = isPlayerWin ? this.selectedPlayerChar : this.selectedOpponentChar;

    const titleEl = document.getElementById("match-over-title");
    const subEl = document.getElementById("match-over-sub");
    const avatarEl = document.getElementById("match-winner-avatar");

    titleEl.textContent = isPlayerWin ? "VITÓRIA NA MÁ FAMA" : "DERROTA NA MESA";
    titleEl.style.color = isPlayerWin ? "var(--gold-bright)" : "var(--danger)";
    subEl.textContent = `${winnerChar.name} conquistou os 12 tentos da mesa da Última Ficha! Placar final: ${this.gameState.playerScore} : ${this.gameState.botScore}`;
    avatarEl.src = winnerChar.portrait;

    // Virtual Economy: Settle table prize distribution
    const settle = this.wallet.settleMatch({ won: isPlayerWin, playerCount: 4, mode: this.selectedRuleset });
    this.renderSettlementBanner(settle);

    this.matchOverModal.classList.add("active");
  }

  // Run and display test suite
  runAndDisplayTests() {
    const listEl = document.getElementById("tests-results-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    const results = runAllTests();
    results.forEach(res => {
      const item = document.createElement("div");
      item.style.padding = "6px 12px";
      item.style.marginBottom = "6px";
      item.style.borderRadius = "4px";
      item.style.background = res.passed ? "rgba(110, 159, 120, 0.2)" : "rgba(193, 74, 80, 0.2)";
      item.style.borderLeft = `4px solid ${res.passed ? "var(--success)" : "var(--danger)"}`;
      item.innerHTML = `<strong>${res.passed ? "APROVADO" : "FALHA"}</strong>: ${res.name} ${res.detail ? `<span style="color: var(--text-secondary); font-size: 0.8rem;">(${res.detail})</span>` : ""}`;
      listEl.appendChild(item);
    });
  }

  // =========================================================================
  // MULTIPLAYER CLIENT LOGIC (WebSockets & Real-time Private Rooms)
  // =========================================================================
  initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host || "localhost:3000"}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("Connected to MÁ FAMA Multiplayer Server!");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket connection error:", err);
      };

      this.ws.onclose = () => {
        console.log("WebSocket connection closed. Reconnecting in 3s...");
        setTimeout(() => this.initWebSocket(), 3000);
      };
    } catch (e) {
      console.warn("WebSocket initialization failed:", e);
    }
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case "ROOM_CREATED":
      case "ROOM_JOINED":
        this.onlineRoomCode = msg.roomCode;
        this.onlinePlayerId = msg.playerId;
        this.onlineRoomStake = typeof msg.stake === "number" ? msg.stake : (this.selectedStake ? this.selectedStake.chips : 500);
        this.isOnlineMatch = true;
        this.mpChoiceModal.classList.remove("active");

        // Reserve online table stake
        if (this.onlineRoomStake > 0) {
          this.wallet.reserveStake(this.onlineRoomStake, msg.roomCode, `Mesa Online (${msg.roomCode})`);
        }
        this.updateTableEconomyHUD(this.onlineRoomStake);

        if (msg.solo || this.isSoloMatch) {
          // Immediately enter table screen in solo match
          this.waitingRoomModal.classList.remove("active");
          this.menuScreen.classList.remove("active");
          this.tableScreen.classList.add("active");
        } else {
          this.waitingRoomCodeDisplay.textContent = msg.roomCode;
          const waitingStakeTxt = document.getElementById("waiting-room-stake-txt");
          if (waitingStakeTxt) {
            waitingStakeTxt.textContent = this.onlineRoomStake > 0
              ? `Entrada: ${this.wallet.formatChips(this.onlineRoomStake)} fichas • Pote da Mesa: ${this.wallet.formatChips(this.onlineRoomStake * 4)} fichas`
              : "Mesa de Treino Livre (Sem fichas apostadas)";
          }
          this.waitingRoomModal.classList.add("active");
        }
        break;

      case "ROOM_UPDATE":
        this.onlineRoomState = msg;
        if (msg.status === "LOBBY") {
          this.renderWaitingRoom(msg);
        } else {
          // In game (PLAYING, TRICK_RESOLVED, ROUND_OVER, MATCH_OVER)
          this.waitingRoomModal.classList.remove("active");
          this.menuScreen.classList.remove("active");
          this.tableScreen.classList.add("active");
          this.renderOnlineTableUI(msg);
        }
        break;

      case "ERROR":
        if (this.joinRoomError) {
          this.joinRoomError.textContent = msg.message;
          this.joinRoomError.style.display = "block";
        } else {
          alert(msg.message);
        }
        break;
    }
  }

  openMultiplayerChoiceModal() {
    if (this.joinRoomError) this.joinRoomError.style.display = "none";
    this.mpChoiceModal.classList.add("active");
  }

  createSoloOnlineRoom(mode) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.startNewMatch();
      return;
    }
    const stakeAmount = this.selectedStake ? this.selectedStake.chips : 0;
    this.isSoloMatch = true;
    this.isOnlineMatch = true;
    this.ws.send(JSON.stringify({
      type: "CREATE_ROOM",
      mode: mode,
      solo: true,
      stake: stakeAmount,
      playerName: this.selectedPlayerChar.name,
      charId: this.selectedPlayerChar.id
    }));
  }

  createOnlineRoom(mode, stake = 500) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      alert("Conectando ao servidor... Tente novamente em alguns segundos.");
      return;
    }
    this.isSoloMatch = false;
    this.isOnlineMatch = true;
    this.ws.send(JSON.stringify({
      type: "CREATE_ROOM",
      mode: mode,
      solo: false,
      stake: typeof stake === "number" ? stake : 500,
      playerName: this.selectedPlayerChar.name,
      charId: this.selectedPlayerChar.id
    }));
  }

  joinOnlineRoom(code) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      alert("Conectando ao servidor... Tente novamente em alguns segundos.");
      return;
    }
    this.isSoloMatch = false;
    this.ws.send(JSON.stringify({
      type: "JOIN_ROOM",
      roomCode: code,
      playerName: this.selectedPlayerChar.name,
      charId: this.selectedPlayerChar.id
    }));
  }

  leaveOnlineRoom() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "LEAVE_ROOM" }));
    }
    this.isOnlineMatch = false;
    this.isSoloMatch = false;
    this.onlineRoomCode = null;
    this.onlineRoomState = null;
    this.waitingRoomModal.classList.remove("active");
    this.tableScreen.classList.remove("active");
    this.menuScreen.classList.add("active");
  }

  renderWaitingRoom(room) {
    this.waitingRoomCodeDisplay.textContent = room.roomCode;
    const isSueca = room.mode.startsWith("sueca");
    this.waitingRoomModeTag.textContent = isSueca ? "SUECA TRADICIONAL • 4 JOGADORES (DUPLAS)" : "TRUCO PAULISTA • 12 TENTOS";

    this.waitingSeatsGrid.innerHTML = "";

    const seatNames = [
      { label: "Assento Sul (Você / Host)", team: "team-a", teamLabel: "Sua Dupla" },
      { label: "Assento Oeste (Adversário)", team: "team-b", teamLabel: "Adversários" },
      { label: "Assento Norte (Parceiro)", team: "team-a", teamLabel: "Sua Dupla" },
      { label: "Assento Leste (Adversário)", team: "team-b", teamLabel: "Adversários" }
    ];

    for (let i = 0; i < 4; i++) {
      const p = room.players[i];
      const slot = seatNames[i];
      const card = document.createElement("div");
      card.className = `waiting-seat-card ${p ? "occupied" : "empty"} ${p && p.isReady ? "ready" : ""}`;

      if (p) {
        const charDef = CHARACTERS.find(c => c.id === p.charId) || CHARACTERS[0];
        card.innerHTML = `
          <span class="seat-slot-badge ${slot.team}">${slot.teamLabel}</span>
          <img class="waiting-seat-avatar" src="${charDef.avatar}" alt="${p.name}">
          <div class="waiting-seat-info">
            <div class="w-name">${p.name} ${p.isHost ? `<span class="host-crown-badge" title="Dono da Sala" style="display:inline-flex; vertical-align:middle; margin-left:4px; color:var(--gold-bright);">${ICONS.crown}</span>` : ""}</div>
            <div class="w-role">${slot.label}</div>
            <div class="w-status ${p.isReady ? "ready" : "waiting"}">
              ${p.isReady ? `<span style="color:#55dd88; display:inline-flex; align-items:center; gap:4px;">${ICONS.check} PRONTO PARA JOGAR</span>` : "AGUARDANDO..."}
            </div>
          </div>
        `;
      } else {
        card.innerHTML = `
          <span class="seat-slot-badge" style="background: #333; color: #888;">LIVRE</span>
          <div class="waiting-seat-avatar" style="background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: var(--gold);">+</div>
          <div class="waiting-seat-info">
            <div class="w-name" style="color: var(--text-secondary);">Vaga Aberta</div>
            <div class="w-role">${slot.label}</div>
            <div class="w-status waiting">Aguardando amigo entrar...</div>
          </div>
        `;
      }
      this.waitingSeatsGrid.appendChild(card);
    }

    // Toggle Host Start Button
    const me = room.players.find(x => x.id === this.onlinePlayerId);
    if (me && me.isHost) {
      this.btnHostStartMatch.style.display = "inline-flex";
    } else {
      this.btnHostStartMatch.style.display = "none";
    }
  }

  renderOnlineTableUI(room) {
    const isSueca = room.mode.startsWith("sueca");

    // HUD Scores & Stakes
    this.hudPlayerLabel.textContent = "SUA DUPLA";
    this.hudOpponentLabel.textContent = "ADVERSÁRIOS";
    this.playerScoreEl.textContent = room.teamAScore;
    this.botScoreEl.textContent = room.teamBScore;
    this.currentStakeEl.textContent = isSueca ? `${room.teamAPoints} : ${room.teamBPoints} pts` : room.currentStake;

    // Vira / Trunfo
    if (room.trumpCard) {
      this.viraCardImg.src = room.trumpCard.faceAsset;
      const suitName = room.trumpCard.suit.toUpperCase();
      this.manilhaRankTxt.textContent = `TRUNFO: ${suitName}`;
    } else if (room.viraCard) {
      this.viraCardImg.src = room.viraCard.faceAsset;
      this.manilhaRankTxt.textContent = (room.manilhaRank || "").toUpperCase();
    }

    // Identify my player object and seat layout relative to me
    const meIdx = room.players.findIndex(x => x.id === this.onlinePlayerId);
    const myPlayer = meIdx !== -1 ? room.players[meIdx] : room.players[0];

    // Render South seat (You / myPlayer)
    if (myPlayer) {
      const charMe = CHARACTERS.find(c => c.id === myPlayer.charId) || this.selectedPlayerChar;
      if (this.playerAvatar) this.playerAvatar.src = charMe.avatar;
      if (this.playerName) this.playerName.textContent = myPlayer.name;
    }

    // Relative seats:
    // South: me
    // West: (meIdx + 1) % 4
    // North: (meIdx + 2) % 4 (my partner!)
    // East: (meIdx + 3) % 4
    const westIdx = (meIdx + 1) % room.players.length;
    const northIdx = (meIdx + 2) % room.players.length;
    const eastIdx = (meIdx + 3) % room.players.length;

    const pWest = room.players[westIdx];
    const pNorth = room.players[northIdx];
    const pEast = room.players[eastIdx];

    // Render North seat (partner)
    if (pNorth) {
      const charN = CHARACTERS.find(c => c.id === pNorth.charId) || CHARACTERS[2];
      this.avatarNorth.src = charN.avatar;
      this.nameNorth.textContent = `${pNorth.name} (Parceiro)`;
      if (room.turnPlayerId === pNorth.id) this.wrapNorth.classList.add("turn-active");
      else this.wrapNorth.classList.remove("turn-active");

      this.cardsNorth.innerHTML = "";
      for (let i = 0; i < pNorth.cardsCount; i++) {
        const mini = document.createElement("div");
        mini.className = "mini-card-back";
        mini.style.setProperty("--rot", `${(i - (pNorth.cardsCount - 1) / 2) * 4}deg`);
        this.cardsNorth.appendChild(mini);
      }
    }

    // Render West seat (rival left)
    if (pWest) {
      const charW = CHARACTERS.find(c => c.id === pWest.charId) || CHARACTERS[1];
      this.avatarWest.src = charW.avatar;
      this.nameWest.textContent = pWest.name;
      if (room.turnPlayerId === pWest.id) this.wrapWest.classList.add("turn-active");
      else this.wrapWest.classList.remove("turn-active");

      this.cardsWest.innerHTML = "";
      for (let i = 0; i < pWest.cardsCount; i++) {
        const mini = document.createElement("div");
        mini.className = "mini-card-back";
        this.cardsWest.appendChild(mini);
      }
    }

    // Render East seat (rival right)
    if (pEast) {
      const charE = CHARACTERS.find(c => c.id === pEast.charId) || CHARACTERS[3];
      this.avatarEast.src = charE.avatar;
      this.nameEast.textContent = pEast.name;
      if (room.turnPlayerId === pEast.id) this.wrapEast.classList.add("turn-active");
      else this.wrapEast.classList.remove("turn-active");

      this.cardsEast.innerHTML = "";
      for (let i = 0; i < pEast.cardsCount; i++) {
        const mini = document.createElement("div");
        mini.className = "mini-card-back";
        this.cardsEast.appendChild(mini);
      }
    }

    // Render Center Played Cards
    this.trickZone.innerHTML = "";
    if (room.tableCards) {
      room.tableCards.forEach((tc, idx) => {
        const slot = document.createElement("div");
        slot.className = "played-slot";

        const label = document.createElement("span");
        label.className = "slot-label";
        label.textContent = tc.playerName;

        const isWinningCard = room.status === "TRICK_RESOLVED" && room.lastTrickWinningCard === tc.card.id;
        const cardFrame = document.createElement("div");
        cardFrame.className = `card-frame ${isWinningCard ? "winner-highlight" : ""}`;
        const rot = (idx % 2 === 0 ? -3 : 3) * (idx + 1);
        cardFrame.style.setProperty("--play-rot", `${rot}deg`);

        const img = document.createElement("img");
        img.src = tc.card.faceAsset;
        cardFrame.appendChild(img);

        slot.appendChild(label);
        slot.appendChild(cardFrame);
        this.trickZone.appendChild(slot);
      });
    }

    // Directional winner pointer for trick resolved in room
    if (room.status === "TRICK_RESOLVED") {
      let relativeSeat = "south";
      const winnerP = room.players.find(p => p.name === room.lastTrickWinner);
      if (winnerP) {
        const wIdx = room.players.indexOf(winnerP);
        const relDiff = (wIdx - meIdx + 4) % 4;
        relativeSeat = ["south", "west", "north", "east"][relDiff];
      } else if (room.lastTrickWinnerSeat) {
        relativeSeat = room.lastTrickWinnerSeat;
      }
      if (room.lastTrickWinner === "Empate (Canga)") {
        this.showWinnerPointer("center", "EMPATE (CANGA)!", "Nenhum ponto nesta disputa");
      } else {
        const winTitle = relativeSeat === "south" ? "VOCÊ FEZ A VAZA!" : `${(room.lastTrickWinner || "Oponente").toUpperCase()} FEZ A VAZA!`;
        this.showWinnerPointer(relativeSeat, winTitle, "Maior carta na mesa");
      }
    } else if (room.status === "PLAYING") {
      this.hideWinnerPointer();
    }

    // Render My Hand Cards (Sul)
    const isMyTurn = room.turnPlayerId === this.onlinePlayerId && room.status === "PLAYING";
    if (isMyTurn) {
      this.playerIdentityPanel.classList.add("turn-active");
      this.playerTurnStatus.textContent = "Sua Vez!";
    } else {
      this.playerIdentityPanel.classList.remove("turn-active");
      const currentTurnP = room.players.find(x => x.id === room.turnPlayerId);
      this.playerTurnStatus.textContent = currentTurnP ? `Vez de ${currentTurnP.name}` : "Aguardando...";
    }

    this.playerHandContainer.innerHTML = "";
    if (isSueca) this.playerHandContainer.classList.add("sueca-hand");
    else this.playerHandContainer.classList.remove("sueca-hand");

    if (myPlayer && myPlayer.hand) {
      const count = myPlayer.hand.length;
      myPlayer.hand.forEach((card, idx) => {
        const wrapper = document.createElement("div");
        const offset = idx - (count - 1) / 2;
        const rot = offset * (isSueca ? 2.8 : 5.5);
        const vert = Math.abs(offset) * (isSueca ? 2 : 4);

        wrapper.className = `hand-card-wrapper ${!isMyTurn ? "disabled" : ""}`;
        wrapper.style.transform = `rotate(${rot}deg) translateY(${vert}px)`;

        const cardFrame = document.createElement("div");
        cardFrame.className = "card-frame";
        const img = document.createElement("img");
        img.src = card.faceAsset;
        cardFrame.appendChild(img);

        wrapper.appendChild(cardFrame);

        wrapper.addEventListener("mouseenter", () => {
          this.audio.playCardSelect();
        });

        if (isMyTurn) {
          wrapper.addEventListener("click", () => {
            this.handleOnlineCardPlay(idx);
          });
        }

        this.playerHandContainer.appendChild(wrapper);
      });
    }

    // Truco Raise Action Button on Table
    if (!isSueca) {
      this.btnTruco.style.display = "inline-flex";
      const currentSt = room.currentStake || 1;
      const nextRaise = currentSt === 1 ? 3 : currentSt === 3 ? 6 : currentSt === 6 ? 9 : 12;
      const myTeam = meIdx % 2 === 0 ? "teamA" : "teamB";
      const canRaise = currentSt < 12 && room.status === "PLAYING" && room.lastRaiserTeam !== myTeam;

      if (canRaise) {
        this.btnTruco.disabled = false;
        this.btnTruco.textContent = BET_NAMES[nextRaise] || `PEDIR ${nextRaise}!`;
      } else {
        this.btnTruco.disabled = true;
        this.btnTruco.textContent = "TRUCO!";
      }
    } else {
      this.btnTruco.style.display = "none";
    }

    const isMaFama = room.mode && room.mode.endsWith("ma_fama");
    if (this.btnAbility) {
      const myChar = myPlayer ? (CHARACTERS.find(c => c.id === myPlayer.charId) || this.selectedPlayerChar) : this.selectedPlayerChar;
      this.btnAbility.style.display = isMaFama ? "inline-flex" : "none";
      this.btnAbility.disabled = false;
      if (this.abilityBtnText) this.abilityBtnText.textContent = myChar.mainPowerName;
    }

    // Pending raise popup
    if (room.status === "RAISE_PENDING" && room.pendingRaise) {
      const myTeam = meIdx % 2 === 0 ? "teamA" : "teamB";
      if (room.pendingRaise.challengerTeam !== myTeam) {
        const proposed = room.pendingRaise.proposedStake;
        const current = room.currentStake || 1;
        const challengerName = room.pendingRaise.challengerName;

        this.challengeTitle.textContent = `${challengerName.toUpperCase()} PEDIU ${BET_NAMES[proposed] || proposed}!`;
        this.challengeSub.textContent = `A mão vale ${current} tentos. Se aceitar, valerá ${proposed}. Se correr, ${challengerName} leva a rodada.`;

        const canCounter = proposed < 12;
        const nextLadder = proposed === 3 ? 6 : proposed === 6 ? 9 : 12;
        if (canCounter && nextLadder) {
          this.btnModalRaise.style.display = "block";
          this.btnModalRaise.textContent = `PEDIR ${BET_NAMES[nextLadder] || nextLadder}!`;
        } else {
          this.btnModalRaise.style.display = "none";
        }

        this.challengeModal.classList.add("active");
      }
    } else if (room.status !== "RAISE_PENDING") {
      this.challengeModal.classList.remove("active");
    }

    // Match Over Check
    if (room.status === "MATCH_OVER") {
      this.audio.playVictory();
      const titleEl = document.getElementById("match-over-title");
      const subEl = document.getElementById("match-over-sub");
      titleEl.textContent = "FIM DA PARTIDA";
      titleEl.style.color = "var(--gold-bright)";
      subEl.textContent = `Vencedores: ${room.winner}! Placar Final: ${room.teamAScore} : ${room.teamBScore} tentos.`;

      // Virtual Economy Online Settlement
      const me = room.players.find(p => p.id === this.onlinePlayerId) || room.players[0];
      const myTeam = me ? me.team : "teamA";
      const isWinner = room.winner && (myTeam === "teamA" ? room.winner.includes("Sua Dupla") : room.winner.includes("Adversários"));
      const settle = this.wallet.settleMatch({ won: !!isWinner, playerCount: 4, mode: room.mode });
      this.renderSettlementBanner(settle);

      this.matchOverModal.classList.add("active");
    }
  }

  handleOnlineCardPlay(cardIndex) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.audio.playCardPlay();
    this.ws.send(JSON.stringify({
      type: "PLAY_CARD",
      cardIndex: cardIndex
    }));
  }

  handleOnlineRaiseClick() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.audio.playTrucoSting();
    this.ws.send(JSON.stringify({ type: "PROPOSE_RAISE" }));
  }

  handleOnlineRaiseDecision(decision) {
    this.challengeModal.classList.remove("active");
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (decision === "accept") this.audio.playChips();
    else if (decision === "raise") this.audio.playTrucoSting();
    else this.audio.playChips();

    this.ws.send(JSON.stringify({
      type: "RESPOND_RAISE",
      decision: decision
    }));
  }

  getCurrentAdviceContext() {
    if (this.isOnlineMatch && this.onlineRoomState) {
      const room = this.onlineRoomState;
      const me = room.players.find(x => x.id === this.onlinePlayerId) || room.players[0];
      return {
        mode: room.mode,
        playerHand: me ? me.hand || [] : [],
        tableCards: room.tableCards || [],
        viraCard: room.viraCard,
        manilhaRank: room.manilhaRank,
        leadSuit: room.leadSuit,
        trumpSuit: room.trumpSuit,
        currentTrick: room.currentTrick || 0,
        trickWinners: room.trickWinners || [],
        currentStake: room.currentStake || 1
      };
    } else if (this.gameState) {
      return {
        mode: this.selectedRuleset,
        playerHand: this.gameState.playerHand || [],
        tableCards: this.gameState.tableCards || [],
        viraCard: this.gameState.viraCard,
        manilhaRank: this.gameState.manilhaRank,
        leadSuit: null,
        trumpSuit: null,
        currentTrick: this.gameState.currentTrick || 0,
        trickWinners: this.gameState.trickWinners || [],
        currentStake: this.gameState.currentStake || 1
      };
    }
    return { playerHand: [] };
  }

  highlightHandCard(cardIndex) {
    if (!this.playerHandContainer) return;
    const cards = this.playerHandContainer.querySelectorAll(".hand-card-wrapper");
    cards.forEach((cardEl, idx) => {
      if (idx === cardIndex) {
        cardEl.classList.add("advised-highlight");
      } else {
        cardEl.classList.remove("advised-highlight");
      }
    });
  }

  // Reset all mode-specific HUDs and overlays back to clean state
  resetTableModeViews() {
    this.hideWinnerPointer();
    if (this.playerHandContainer) this.playerHandContainer.classList.remove("sueca-hand");
    if (this.pokerCommunityZone) this.pokerCommunityZone.style.display = "none";
    if (this.pokerActionsBar) this.pokerActionsBar.style.display = "none";
    if (this.submundoHudPanel) this.submundoHudPanel.style.display = "none";
    if (this.submundoJokersTray) this.submundoJokersTray.style.display = "none";
    if (this.submundoActionsBar) this.submundoActionsBar.style.display = "none";
    if (this.chipsSouth) this.chipsSouth.style.display = "none";
    if (this.chipsWest) this.chipsWest.style.display = "none";
    if (this.chipsNorth) this.chipsNorth.style.display = "none";
    if (this.chipsEast) this.chipsEast.style.display = "none";
    if (this.standardHudPanel) this.standardHudPanel.style.display = "flex";
    if (this.standardActionButtons) this.standardActionButtons.style.display = "flex";
    if (this.viraContainer) this.viraContainer.style.display = "flex";
    if (this.seatWest) this.seatWest.style.display = "";
    if (this.seatNorth) this.seatNorth.style.display = "";
    if (this.seatEast) this.seatEast.style.display = "";
  }

  // =========================================================================
  // POKER TRADICIONAL (TEXAS HOLD'EM ENGINE INTEGRATION)
  // =========================================================================
  startPokerTradicionalMatch() {
    this.resetTableModeViews();
    this.standardHudPanel.style.display = "none";
    this.standardActionButtons.style.display = "none";
    this.viraContainer.style.display = "none";
    this.pokerCommunityZone.style.display = "flex";
    this.pokerActionsBar.style.display = "flex";
    this.chipsSouth.style.display = "block";
    this.chipsWest.style.display = "block";
    this.chipsNorth.style.display = "block";
    this.chipsEast.style.display = "block";

    this.menuScreen.classList.remove("active");
    this.tableScreen.classList.add("active");

    if (this.playerAvatar) this.playerAvatar.src = this.selectedPlayerChar.avatar;
    if (this.playerName) this.playerName.textContent = this.selectedPlayerChar.name;

    const remaining = CHARACTERS.filter(c => c.id !== this.selectedPlayerChar.id);
    if (this.avatarWest) this.avatarWest.src = remaining[0].avatar;
    if (this.nameWest) this.nameWest.textContent = remaining[0].name;
    if (this.avatarNorth) this.avatarNorth.src = remaining[1].avatar;
    if (this.nameNorth) this.nameNorth.textContent = remaining[1].name;
    if (this.avatarEast) this.avatarEast.src = remaining[2].avatar;
    if (this.nameEast) this.nameEast.textContent = remaining[2].name;

    this.pokerGame = new BettingEngine(["south", "west", "north", "east"]);
    this.dealPokerHand();
  }

  dealPokerHand() {
    if (!this.pokerGame) return;
    this.hideWinnerPointer();
    this.pokerGame.communityCards.forEach(c => delete c.isWinningCard);
    Object.values(this.pokerGame.players).forEach(p => {
      p.holeCards.forEach(c => delete c.isWinningCard);
    });

    this.pokerGame.startHand();
    this.audio.playCardDeal();
    this.audio.playChips();
    this.renderPokerBoard();
    this.renderPokerHands();
    this.updatePokerHUD();

    if (this.pokerGame.seatOrder[this.pokerGame.currentActorIdx] !== "south") {
      this.schedulePokerBotTurn();
    }
  }

  renderPokerBoard() {
    if (!this.pokerGame) return;
    if (this.pokerStageTag) this.pokerStageTag.textContent = this.pokerGame.stage;
    if (this.pokerPotVal) this.pokerPotVal.textContent = `$${this.pokerGame.potManager.mainPot}`;

    if (this.pokerBoardCards) {
      this.pokerBoardCards.innerHTML = "";
      this.pokerGame.communityCards.forEach(c => {
        const slot = document.createElement("div");
        slot.className = "played-slot";

        const cardFrame = document.createElement("div");
        cardFrame.className = `card-frame ${c.isWinningCard ? "winner-highlight" : ""}`;
        cardFrame.dataset.cardId = c.id;

        const img = document.createElement("img");
        img.src = c.faceAsset;
        img.alt = `${c.rank} de ${c.suitName}`;
        cardFrame.appendChild(img);

        slot.appendChild(cardFrame);
        this.pokerBoardCards.appendChild(slot);
      });
    }
  }

  renderPokerHands(showdown = false) {
    if (!this.pokerGame) return;
    const southPlayer = this.pokerGame.players.south;
    if (this.playerHandContainer) {
      this.playerHandContainer.innerHTML = "";
      this.playerHandContainer.classList.remove("sueca-hand");
      const count = southPlayer.holeCards.length;
      southPlayer.holeCards.forEach((card, idx) => {
        const wrap = document.createElement("div");
        const offset = idx - (count - 1) / 2;
        const rot = offset * 5;
        const vert = Math.abs(offset) * 3;
        wrap.className = `hand-card-wrapper ${southPlayer.folded ? "disabled" : ""}`;
        wrap.style.transform = `rotate(${rot}deg) translateY(${vert}px)`;

        const cardFrame = document.createElement("div");
        cardFrame.className = `card-frame ${card.isWinningCard ? "winner-highlight" : ""}`;
        cardFrame.dataset.cardId = card.id;

        const img = document.createElement("img");
        img.src = card.faceAsset;
        img.alt = `${card.rank} de ${card.suitName}`;
        cardFrame.appendChild(img);
        wrap.appendChild(cardFrame);

        wrap.addEventListener("mouseenter", () => {
          this.audio.playCardSelect();
        });

        this.playerHandContainer.appendChild(wrap);
      });
    }

    // Mini cards for West, North, East
    ["west", "north", "east"].forEach(seatId => {
      const el = seatId === "west" ? this.cardsWest : seatId === "north" ? this.cardsNorth : this.cardsEast;
      const p = this.pokerGame.players[seatId];
      if (!el || !p) return;
      el.innerHTML = "";
      if (p.folded) return;
      p.holeCards.forEach(c => {
        const mini = document.createElement("div");
        mini.className = "mini-card-back";
        if (showdown) {
          mini.innerHTML = `<img src="${c.faceAsset}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">`;
          if (c.isWinningCard) mini.classList.add("winner-highlight");
        } else {
          mini.innerHTML = `<img src="${c.backAsset}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">`;
        }
        el.appendChild(mini);
      });
    });
  }

  updatePokerHUD() {
    if (!this.pokerGame) return;
    if (this.chipsSouth) this.chipsSouth.textContent = `$${this.pokerGame.players.south.chips}`;
    if (this.chipsWest) this.chipsWest.textContent = `$${this.pokerGame.players.west.chips}`;
    if (this.chipsNorth) this.chipsNorth.textContent = `$${this.pokerGame.players.north.chips}`;
    if (this.chipsEast) this.chipsEast.textContent = `$${this.pokerGame.players.east.chips}`;

    const currentActor = this.pokerGame.seatOrder[this.pokerGame.currentActorIdx];
    const isSouth = currentActor === "south" && this.pokerGame.stage !== POKER_STAGES.ROUND_END;

    if (isSouth) {
      this.playerIdentityPanel?.classList.add("turn-active");
      if (this.playerTurnStatus) this.playerTurnStatus.textContent = "Sua Vez de Apostar";
      const toCall = this.pokerGame.highestBetThisRound - this.pokerGame.players.south.currentBet;
      if (this.btnPokerCheckCall) {
        this.btnPokerCheckCall.textContent = toCall > 0 ? `PAGAR ($${toCall})` : "PASSAR (CHECK)";
        this.btnPokerCheckCall.disabled = false;
      }
      if (this.btnPokerFold) this.btnPokerFold.disabled = false;
      if (this.btnPokerRaise) {
        const nextRaise = this.pokerGame.highestBetThisRound + this.pokerGame.bigBlind;
        this.btnPokerRaise.textContent = `AUMENTAR ($${nextRaise})`;
        this.btnPokerRaise.disabled = this.pokerGame.players.south.chips <= toCall;
      }
      if (this.btnPokerAllin) this.btnPokerAllin.disabled = false;
    } else {
      this.playerIdentityPanel?.classList.remove("turn-active");
      if (this.playerTurnStatus) {
        if (this.pokerGame.stage === POKER_STAGES.ROUND_END) {
          this.playerTurnStatus.textContent = "Mão Finalizada";
        } else {
          this.playerTurnStatus.textContent = `Aguardando ${currentActor.toUpperCase()}`;
        }
      }
      if (this.btnPokerCheckCall) this.btnPokerCheckCall.disabled = true;
      if (this.btnPokerFold) this.btnPokerFold.disabled = true;
      if (this.btnPokerRaise) this.btnPokerRaise.disabled = true;
      if (this.btnPokerAllin) this.btnPokerAllin.disabled = true;
    }
  }

  handlePokerPlayerAction(actionType, amount = 0) {
    if (!this.pokerGame) return;
    const res = this.pokerGame.handleAction("south", actionType, amount);
    if (!res.success) return;
    this.audio.playChips();
    this.renderPokerBoard();
    this.renderPokerHands();
    this.updatePokerHUD();

    if (res.finished || this.pokerGame.stage === POKER_STAGES.ROUND_END) {
      this.finishPokerRound();
    } else if (this.pokerGame.seatOrder[this.pokerGame.currentActorIdx] !== "south") {
      this.schedulePokerBotTurn();
    }
  }

  schedulePokerBotTurn() {
    if (!this.pokerGame || this.pokerGame.stage === POKER_STAGES.ROUND_END) return;
    const botId = this.pokerGame.seatOrder[this.pokerGame.currentActorIdx];
    if (botId === "south") {
      this.updatePokerHUD();
      return;
    }

    setTimeout(() => {
      if (!this.pokerGame || this.pokerGame.stage === POKER_STAGES.ROUND_END) return;
      const decision = this.pokerGame.computeBotAction(botId);
      this.pokerGame.handleAction(botId, decision.action, decision.amount || 0);
      this.audio.playChips();
      this.renderPokerBoard();
      this.renderPokerHands();
      this.updatePokerHUD();

      if (this.pokerGame.stage === POKER_STAGES.ROUND_END) {
        this.finishPokerRound();
      } else if (this.pokerGame.seatOrder[this.pokerGame.currentActorIdx] !== "south") {
        this.schedulePokerBotTurn();
      } else {
        this.updatePokerHUD();
      }
    }, 350);
  }

  finishPokerRound() {
    const winInfo = this.pokerGame.winnerInfo;
    const primaryWinner = winInfo && winInfo.winners && winInfo.winners[0];

    // Highlight winning cards on board and hole cards
    if (primaryWinner && primaryWinner.bestHand && primaryWinner.bestHand.scoringCards) {
      const winCardIds = new Set(primaryWinner.bestHand.scoringCards.map(c => c.id));
      this.pokerGame.communityCards.forEach(c => {
        if (winCardIds.has(c.id)) c.isWinningCard = true;
      });
      const p = this.pokerGame.players[primaryWinner.id];
      if (p) {
        p.holeCards.forEach(c => {
          if (winCardIds.has(c.id)) c.isWinningCard = true;
        });
      }
    }

    this.renderPokerBoard();
    this.renderPokerHands(true);
    this.updatePokerHUD();

    let winnerName = "Você";
    if (primaryWinner) {
      if (primaryWinner.id === "south") winnerName = this.selectedPlayerChar?.name || "Você";
      else if (primaryWinner.id === "west") winnerName = this.nameWest?.textContent || "Veneno";
      else if (primaryWinner.id === "north") winnerName = this.nameNorth?.textContent || "Calibre";
      else if (primaryWinner.id === "east") winnerName = this.nameEast?.textContent || "Pixel";

      this.showWinnerPointer(
        primaryWinner.id,
        `${winnerName.toUpperCase()} VENCEU O POTE!`,
        `${primaryWinner.handName || "Maior Mão"} (+${primaryWinner.amount} fichas)`
      );
    }

    if (this.playerTurnStatus) {
      this.playerTurnStatus.textContent = primaryWinner ? `Vencedor: ${winnerName} (${primaryWinner.handName})` : "Mão Finalizada";
    }
    this.audio.playVictoryChime();

    setTimeout(() => {
      this.hideWinnerPointer();
      if (this.selectedRuleset === "poker_tradicional" && this.tableScreen.classList.contains("active")) {
        this.dealPokerHand();
      }
    }, 2200);
  }

  // =========================================================================
  // POKER MÁ FAMA: SUBMUNDO (ROGUELIKE CHIPS X MULT ENGINE)
  // =========================================================================
  startPokerSubmundoMatch() {
    this.resetTableModeViews();
    this.standardHudPanel.style.display = "none";
    this.standardActionButtons.style.display = "none";
    this.viraContainer.style.display = "none";
    if (this.seatWest) this.seatWest.style.display = "none";
    if (this.seatNorth) this.seatNorth.style.display = "none";
    if (this.seatEast) this.seatEast.style.display = "none";

    this.submundoHudPanel.style.display = "flex";
    this.submundoJokersTray.style.display = "flex";
    this.submundoActionsBar.style.display = "flex";

    this.menuScreen.classList.remove("active");
    this.tableScreen.classList.add("active");

    if (this.playerAvatar) this.playerAvatar.src = this.selectedPlayerChar.avatar;
    if (this.playerName) this.playerName.textContent = this.selectedPlayerChar.name;
    if (this.playerTurnStatus) this.playerTurnStatus.textContent = "Selecione até 5 cartas";

    this.submundoRun = new RunManager();
    this.submundoSelectedCardIndices = new Set();
    this.renderSubmundoTable();
  }

  renderSubmundoTable() {
    if (!this.submundoRun) return;
    const run = this.submundoRun;

    if (this.submundoAnteVal) this.submundoAnteVal.textContent = `${run.ante}/8`;
    if (this.submundoBlindType) this.submundoBlindType.textContent = `RODADA ${run.roundInAnte}`;
    if (this.submundoBlindName) {
      this.submundoBlindName.textContent = run.currentBoss ? run.currentBoss.name : (run.roundInAnte === 1 ? "Pequena Blind" : "Grande Blind");
    }
    if (this.submundoScoreCur) this.submundoScoreCur.textContent = run.currentScore;
    if (this.submundoScoreTarget) this.submundoScoreTarget.textContent = run.targetScore;

    const pct = Math.min(100, Math.floor((run.currentScore / run.targetScore) * 100));
    if (this.submundoProgressFill) this.submundoProgressFill.style.width = `${pct}%`;

    if (this.submundoHandsLeft) this.submundoHandsLeft.textContent = run.handsLeft;
    if (this.submundoDiscardsLeft) this.submundoDiscardsLeft.textContent = run.discardsLeft;
    if (this.submundoMoneyVal) this.submundoMoneyVal.textContent = `$${run.money}`;

    // Render Equipped Jokers Tray
    if (this.jokersSlotsContainer) {
      this.jokersSlotsContainer.innerHTML = "";
      for (let i = 0; i < run.jokerSlots; i++) {
        const slot = document.createElement("div");
        const j = run.equippedJokers[i];
        if (j) {
          slot.className = "joker-slot filled";
          slot.title = `${j.name}: ${j.desc}`;
          slot.innerHTML = `<img src="${j.image}" alt="${j.name}">`;
        } else {
          slot.className = "joker-slot";
          slot.innerHTML = `<span style="font-size: 0.75rem; color: rgba(216,173,102,0.4); font-weight: bold;">+</span>`;
        }
        this.jokersSlotsContainer.appendChild(slot);
      }
    }

    // Render 8 Hand Cards in Organic Fan with Authentic Card Frames
    if (this.playerHandContainer) {
      this.playerHandContainer.innerHTML = "";
      this.playerHandContainer.classList.add("sueca-hand");
      const count = run.hand.length;
      run.hand.forEach((card, idx) => {
        const wrap = document.createElement("div");
        const isSelected = this.submundoSelectedCardIndices.has(idx);
        const offset = idx - (count - 1) / 2;
        const rot = offset * 2.8;
        const vert = Math.abs(offset) * 2;
        wrap.className = `hand-card-wrapper ${isSelected ? "selected advised-highlight" : ""}`;
        wrap.style.transform = isSelected
          ? `translateY(-22px) scale(1.06) rotate(${rot}deg)`
          : `rotate(${rot}deg) translateY(${vert}px)`;

        const cardFrame = document.createElement("div");
        cardFrame.className = `card-frame ${isSelected ? "winner-highlight" : ""}`;
        const img = document.createElement("img");
        img.src = card.faceAsset;
        img.alt = `${card.rank} de ${card.suitName}`;
        cardFrame.appendChild(img);
        wrap.appendChild(cardFrame);

        wrap.addEventListener("mouseenter", () => {
          this.audio.playCardSelect();
        });
        wrap.addEventListener("click", () => this.toggleSubmundoCardSelection(idx));
        this.playerHandContainer.appendChild(wrap);
      });
    }

    this.updateSubmundoHandDetection();
  }

  toggleSubmundoCardSelection(cardIdx) {
    if (this.submundoSelectedCardIndices.has(cardIdx)) {
      this.submundoSelectedCardIndices.delete(cardIdx);
    } else {
      if (this.submundoSelectedCardIndices.size >= 5) {
        return;
      }
      this.submundoSelectedCardIndices.add(cardIdx);
    }
    this.audio.playChips();
    this.renderSubmundoTable();
  }

  updateSubmundoHandDetection() {
    if (!this.submundoRun) return;
    const selected = Array.from(this.submundoSelectedCardIndices).map(i => this.submundoRun.hand[i]).filter(Boolean);

    if (selected.length === 0) {
      if (this.submundoDetectName) this.submundoDetectName.textContent = "Selecione até 5 cartas";
      if (this.submundoDetectScore) this.submundoDetectScore.textContent = "0 × 0";
      if (this.btnSubmundoPlay) this.btnSubmundoPlay.disabled = true;
      if (this.btnSubmundoDiscard) this.btnSubmundoDiscard.disabled = true;
      return;
    }

    const evaluation = HandEvaluator.evaluate5Cards(selected);
    const handName = evaluation.type.name;
    const baseChips = evaluation.type.baseChips;
    const baseMult = evaluation.type.baseMult;

    if (this.submundoDetectName) this.submundoDetectName.textContent = handName;
    if (this.submundoDetectScore) this.submundoDetectScore.textContent = `${baseChips} Fichas × ${baseMult} Mult`;

    if (this.btnSubmundoPlay) this.btnSubmundoPlay.disabled = false;
    if (this.btnSubmundoDiscard) this.btnSubmundoDiscard.disabled = this.submundoRun.discardsLeft <= 0;
  }

  playSubmundoHand() {
    if (!this.submundoRun) return;
    const indices = Array.from(this.submundoSelectedCardIndices);
    if (indices.length === 0) return;

    const res = this.submundoRun.playHand(indices);
    this.submundoSelectedCardIndices.clear();

    this.audio.playCardPlay();
    this.audio.playChips();

    this.renderSubmundoTable();

    if (this.submundoRun.state === "ROUND_WON") {
      this.showWinnerPointer("south", "META DA RODADA BATIDA!", `+${res.chipsEarned} PONTOS! Loja Liberada!`);
      this.audio.playVictoryChime();
      setTimeout(() => {
        this.hideWinnerPointer();
        this.openSubmundoShop();
      }, 1400);
    } else if (this.submundoRun.state === "GAME_OVER") {
      alert(`FIM DA RUN! Você acumulou ${this.submundoRun.currentScore} pontos no Ante ${this.submundoRun.ante}.`);
      this.startPokerSubmundoMatch();
    }
  }

  discardSubmundoCards() {
    if (!this.submundoRun || this.submundoRun.discardsLeft <= 0) return;
    const indices = Array.from(this.submundoSelectedCardIndices);
    if (indices.length === 0) return;

    this.submundoRun.discardCards(indices);
    this.submundoSelectedCardIndices.clear();
    this.audio.playCardDeal();
    this.renderSubmundoTable();
  }

  openSubmundoShop() {
    if (!this.submundoRun) return;
    this.submundoRun.generateShop();

    if (this.shopUserMoney) this.shopUserMoney.textContent = `$${this.submundoRun.money}`;
    if (this.shopEquippedCount) this.shopEquippedCount.textContent = `${this.submundoRun.equippedJokers.length}/5`;

    if (this.shopCardsGrid) {
      this.shopCardsGrid.innerHTML = "";
      this.submundoRun.shopItems.forEach((entry, idx) => {
        const cardBox = document.createElement("div");
        cardBox.className = "shop-item-card";

        const imgTag = entry.type === "joker"
          ? `<img src="${entry.item.image}" alt="${entry.item.name}">`
          : `<div style="width: 80px; height: 110px; background: #245247; border: 1.5px solid var(--gold); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--gold-bright); margin-bottom: 10px;">${ICONS.planet}</div>`;

        cardBox.innerHTML = `
          ${imgTag}
          <div class="shop-item-title">${entry.item.name}</div>
          <div class="shop-item-desc">${entry.type === "joker" ? entry.item.desc : `Aumenta o valor de ${entry.item.handName} em +${entry.item.addChips} Fichas e +${entry.item.addMult} Mult`}</div>
          <button class="shop-item-buy-btn" ${this.submundoRun.money < entry.cost ? "disabled" : ""}>COMPRAR ($${entry.cost})</button>
        `;

        const buyBtn = cardBox.querySelector(".shop-item-buy-btn");
        buyBtn.addEventListener("click", () => {
          if (this.submundoRun.buyItem(idx)) {
            this.audio.playChips();
            this.openSubmundoShop();
          }
        });

        this.shopCardsGrid.appendChild(cardBox);
      });
    }

    if (this.submundoShopModal) this.submundoShopModal.classList.add("active");
  }

  advanceSubmundoNextRound() {
    if (this.submundoShopModal) this.submundoShopModal.classList.remove("active");
    if (!this.submundoRun) return;

    this.submundoRun.advanceNextRound();
    this.audio.playCardDeal();

    if (this.submundoRun.state === "VICTORY") {
      alert("PARABÉNS! VOCÊ ZEROU O SUBMUNDO DO MÁ FAMA (ANTE 8 CONCLUÍDO)!");
      this.startPokerSubmundoMatch();
    } else {
      this.renderSubmundoTable();
    }
  }

  // =========================================================================
  // VIRTUAL ECONOMY, PLAYER WALLET & TABLE STAKES LOGIC
  // =========================================================================
  initWallet() {
    this.updateWalletUI(this.wallet.getBalance());
    this.wallet.onChange((bal) => {
      this.updateWalletUI(bal);
    });
  }

  updateWalletUI(balance) {
    const formatted = this.wallet.formatChips(balance);
    if (this.headerChipsVal) {
      this.headerChipsVal.innerHTML = `${formatted} <small>fichas</small>`;
    }
    if (this.profileChipsVal) {
      this.profileChipsVal.textContent = `${formatted} fichas`;
    }
    if (this.walletModalBalance) {
      this.walletModalBalance.textContent = formatted;
    }

    // Check emergency loan eligibility (< 100 chips)
    if (this.walletLoanBox && this.btnRequestLoan) {
      if (balance < 100) {
        this.walletLoanBox.classList.add("eligible");
        this.btnRequestLoan.disabled = false;
        if (this.loanBoxStatusTxt) {
          this.loanBoxStatusTxt.textContent = "Atenção: Seu saldo está abaixo de 100 fichas! Você tem direito a um empréstimo de +500 fichas de cortesia da casa para voltar ao jogo.";
        }
      } else {
        this.walletLoanBox.classList.remove("eligible");
        this.btnRequestLoan.disabled = true;
        if (this.loanBoxStatusTxt) {
          this.loanBoxStatusTxt.textContent = "Empréstimo disponível apenas quando seu saldo estiver abaixo de 100 fichas.";
        }
      }
    }
  }

  openWalletModal() {
    this.audio.playChips();
    this.updateWalletUI(this.wallet.getBalance());
    this.renderWalletTransactions();
    if (this.walletModal) {
      this.walletModal.classList.add("active");
    }
  }

  closeWalletModal() {
    if (this.walletModal) {
      this.walletModal.classList.remove("active");
    }
  }

  handleLoanRequest() {
    const res = this.wallet.requestEmergencyLoan();
    if (res.success) {
      this.audio.playChips();
      this.updateWalletUI(res.balance);
      this.renderWalletTransactions();
      alert(`Empréstimo concedido! +${this.wallet.formatChips(res.amount)} fichas adicionadas à sua carteira virtual.`);
    } else {
      alert(res.message || "Não foi possível conceder o empréstimo.");
    }
  }

  renderWalletTransactions() {
    if (!this.walletTxList) return;
    this.walletTxList.innerHTML = "";

    const txs = this.wallet.getTransactions();
    if (!txs || txs.length === 0) {
      this.walletTxList.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 0.8rem; padding: 12px;">Nenhuma transação registrada ainda.</div>`;
      return;
    }

    txs.forEach(tx => {
      const item = document.createElement("div");
      const isPos = tx.amount > 0;
      const isLoan = tx.type === "EMERGENCY_LOAN";
      item.className = `wallet-tx-item ${isLoan ? "loan" : isPos ? "positive" : "negative"}`;

      const dateStr = new Date(tx.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const sign = isPos ? "+" : "";

      item.innerHTML = `
        <div class="tx-left">
          <span class="tx-desc">${tx.description}</span>
          <span class="tx-date">${dateStr}</span>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${isPos ? "pos" : "neg"}">${sign}${this.wallet.formatChips(tx.amount)}</span>
          <span class="tx-balance">Saldo: ${this.wallet.formatChips(tx.balanceAfter)}</span>
        </div>
      `;
      this.walletTxList.appendChild(item);
    });
  }

  setupStakesSelector() {
    const pills = document.querySelectorAll(".stake-card-pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        this.audio.playChips();
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        const stakeId = pill.dataset.stakeId;
        const found = TABLE_STAKES.find(s => s.id === stakeId);
        if (found) {
          this.selectedStake = found;
          if (this.currentStakesDesc) {
            const potStr = found.chips > 0 ? `Pote: ${this.wallet.formatChips(found.chips * 4)} fichas` : "Sem apostas";
            this.currentStakesDesc.textContent = `${found.name} • Entrada de ${this.wallet.formatChips(found.chips)} fichas por jogador • ${potStr}`;
          }
        }
      });
    });
  }

  updateTableEconomyHUD(customStake = null) {
    const stake = customStake !== null ? customStake : (this.selectedStake ? this.selectedStake.chips : 0);
    const playerCount = 4;
    const pot = stake * playerCount;

    const potNum = document.getElementById("hud-pot-num");
    const stakeVal = document.getElementById("hud-stake-val");
    if (potNum) potNum.textContent = stake > 0 ? this.wallet.formatChips(pot) : "0";
    if (stakeVal) stakeVal.textContent = stake > 0 ? this.wallet.formatChips(stake) : "Grátis";
  }

  renderSettlementBanner(settle) {
    const banner = document.getElementById("match-settlement-banner");
    const titleEl = document.getElementById("settlement-title");
    const numsEl = document.getElementById("settlement-nums");
    const noteEl = document.getElementById("settlement-note");
    if (!banner || !numsEl) return;

    if (!settle || settle.stake === 0) {
      banner.style.display = "flex";
      titleEl.textContent = "MESA DE TREINO LIVRE";
      numsEl.textContent = "Partida Amistosa (0 fichas apostadas)";
      numsEl.className = "settlement-nums";
      noteEl.textContent = "Seu saldo de fichas permanece inalterado.";
      return;
    }

    banner.style.display = "flex";
    if (settle.won) {
      titleEl.textContent = "DISTRIBUIÇÃO DE PRÊMIO • VITÓRIA";
      numsEl.textContent = `+${this.wallet.formatChips(settle.prize)} fichas (Lucro líquido: +${this.wallet.formatChips(settle.netProfit)})`;
      numsEl.className = "settlement-nums";
      noteEl.textContent = `Entrada de ${this.wallet.formatChips(settle.stake)} fichas recuperada com bônus integral de vitória!`;
    } else {
      titleEl.textContent = "DISTRIBUIÇÃO DE PRÊMIO • DERROTA";
      numsEl.textContent = `-${this.wallet.formatChips(settle.stake)} fichas (entrada perdida)`;
      numsEl.className = "settlement-nums loss";
      noteEl.textContent = `As fichas reservadas foram pagas à dupla vencedora.`;
    }
  }
}

// Initialize on DOM load
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    window.app = new MaFamaApp();
  });
}
