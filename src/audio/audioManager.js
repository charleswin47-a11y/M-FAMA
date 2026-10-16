// MÁ FAMA - Master Audio Engine (Direção de Áudio Definitiva)
// 60% Jazz Noir + 25% Música Clássica/Câmara + 15% Texturas Vintage e Ambientes

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    // Independent audio channels (Gain nodes)
    this.channels = {
      master: null,
      music: null,
      ambience: null,
      cards: null,
      ui: null,
      abilities: null,
      stingers: null
    };

    // Channel volumes (0.0 to 1.0)
    this.volumes = {
      master: 0.8,
      music: 0.65,
      ambience: 0.35,
      cards: 0.75,
      ui: 0.6,
      abilities: 0.8,
      stingers: 0.75
    };

    // Music & Ambience states
    this.currentMusicTrack = null; // "lobby", "table_normal", "table_decisive", "character_theme"
    this.musicInterval = null;
    this.ambienceActive = false;
    this.rainNode = null;
    this.vinylNode = null;

    // Card sound throttling to prevent overlapping chaos
    this.lastCardSoundTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupChannels();
        this.startVintageAmbience();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setupChannels() {
    if (!this.ctx) return;

    // Master
    this.channels.master = this.ctx.createGain();
    this.channels.master.gain.setValueAtTime(this.isMuted ? 0 : this.volumes.master, this.ctx.currentTime);
    this.channels.master.connect(this.ctx.destination);

    // Subchannels
    const subChannels = ["music", "ambience", "cards", "ui", "abilities", "stingers"];
    subChannels.forEach(name => {
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(this.volumes[name], this.ctx.currentTime);
      gainNode.connect(this.channels.master);
      this.channels[name] = gainNode;
    });
  }

  setChannelVolume(channelName, vol) {
    if (this.channels[channelName] && this.ctx) {
      this.volumes[channelName] = Math.max(0, Math.min(1, vol));
      this.channels[channelName].gain.linearRampToValueAtTime(this.volumes[channelName], this.ctx.currentTime + 0.1);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.channels.master && this.ctx) {
      const target = this.isMuted ? 0 : this.volumes.master;
      this.channels.master.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.15);
    }
    return !this.isMuted;
  }

  // =========================================================================
  // 1. AMBIENCE SYSTEM: Distant Rain on Windows + Vintage Vinyl Surface
  // =========================================================================
  startVintageAmbience() {
    if (this.ambienceActive || !this.ctx || !this.channels.ambience) return;
    this.ambienceActive = true;

    // 1. Distant Rain (Stereo filtered pink noise generator)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "lowpass";
    rainFilter.frequency.setValueAtTime(420, this.ctx.currentTime); // muffled through heavy pub glass

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.channels.ambience);
    rainSource.start();
    this.rainNode = rainSource;

    // 2. Subtle Vinyl Crackle / Dust ticks
    const createVinylTick = () => {
      if (!this.ambienceActive || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800 + Math.random() * 2200, t);
      gain.gain.setValueAtTime(0.015, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
      osc.connect(gain);
      gain.connect(this.channels.ambience);
      osc.start(t);
      osc.stop(t + 0.015);
      setTimeout(createVinylTick, 200 + Math.random() * 1200);
    };
    createVinylTick();
  }

  // =========================================================================
  // 2. DYNAMIC MUSIC ENGINE (Jazz Noir + Chamber Classical)
  // Crossfading between Lobby, Normal Game, and Decisive Truco
  // =========================================================================
  switchMusicTrack(newTrack) {
    if (this.currentMusicTrack === newTrack) return;
    this.init();

    // Crossfade out previous track
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    this.currentMusicTrack = newTrack;

    if (newTrack === "lobby") {
      this.playLobbyJazzTheme();
    } else if (newTrack === "table_normal") {
      this.playTableNormalTheme();
    } else if (newTrack === "table_decisive") {
      this.playDecisiveTrucoStrings();
    }
  }

  // Lobby Theme: Slow warm Rhodes piano, acoustic double bass, distant tenor saxophone
  playLobbyJazzTheme() {
    // Elegant jazz progressions: Dm11 -> G13 -> Cmaj9 -> Bdim7 -> E7alt
    const chords = [
      { bass: 73.42, notes: [220, 261.63, 293.66, 349.23], dur: 3.4 }, // Dm11
      { bass: 98.00, notes: [196, 246.94, 329.63, 349.23], dur: 3.2 },  // G13
      { bass: 65.41, notes: [196, 246.94, 293.66, 329.63], dur: 3.4 }, // Cmaj9
      { bass: 61.74, notes: [174.61, 207.65, 246.94, 293.66], dur: 3.2 } // Bdim7
    ];

    let chordIdx = 0;

    const playBar = () => {
      if (this.currentMusicTrack !== "lobby" || !this.ctx) return;
      const t = this.ctx.currentTime;
      const c = chords[chordIdx];
      chordIdx = (chordIdx + 1) % chords.length;

      // Double Bass (Acoustic pluck)
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(c.bass, t);
      bassGain.gain.setValueAtTime(0.28, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      bassOsc.connect(bassGain);
      bassGain.connect(this.channels.music);
      bassOsc.start(t);
      bassOsc.stop(t + 2.1);

      // Warm Piano Chords
      c.notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filt = this.ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + i * 0.04);
        filt.type = "lowpass";
        filt.frequency.setValueAtTime(650, t);

        gain.gain.setValueAtTime(0.07, t + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

        osc.connect(filt);
        filt.connect(gain);
        gain.connect(this.channels.music);
        osc.start(t + i * 0.04);
        osc.stop(t + 3.0);
      });

      // Distant Tenor Saxophone (Melodic breathy lead note)
      if (Math.random() < 0.6) {
        const saxFreqs = [440, 493.88, 523.25, 587.33, 659.25];
        const saxNote = saxFreqs[Math.floor(Math.random() * saxFreqs.length)];
        const saxOsc = this.ctx.createOscillator();
        const saxGain = this.ctx.createGain();
        const saxFilter = this.ctx.createBiquadFilter();

        saxOsc.type = "sawtooth";
        saxOsc.frequency.setValueAtTime(saxNote, t + 0.8);
        saxFilter.type = "bandpass";
        saxFilter.frequency.setValueAtTime(900, t + 0.8);
        saxFilter.Q.setValueAtTime(3.5, t + 0.8);

        saxGain.gain.setValueAtTime(0.001, t + 0.8);
        saxGain.gain.linearRampToValueAtTime(0.04, t + 1.2);
        saxGain.gain.exponentialRampToValueAtTime(0.001, t + 2.6);

        saxOsc.connect(saxFilter);
        saxFilter.connect(saxGain);
        saxGain.connect(this.channels.music);
        saxOsc.start(t + 0.8);
        saxOsc.stop(t + 2.7);
      }
    };

    playBar();
    this.musicInterval = setInterval(playBar, 3400);
  }

  // Table Normal Theme: Quiet brushed drums + Walking double bass + Intimate Rhodes
  playTableNormalTheme() {
    const bassWalking = [73.42, 82.41, 87.31, 98.00, 110.00, 98.00, 87.31, 82.41]; // D, E, F, G, A, G, F, E
    let step = 0;

    const playPulse = () => {
      if (this.currentMusicTrack !== "table_normal" || !this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Brushed Snare (Gentle papery rhythm)
      const brushNoise = this.ctx.createBufferSource();
      const bBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const data = bBuffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
      brushNoise.buffer = bBuffer;

      const brushFilter = this.ctx.createBiquadFilter();
      brushFilter.type = "bandpass";
      brushFilter.frequency.setValueAtTime(3200, t);
      brushFilter.Q.setValueAtTime(1.5, t);

      const brushGain = this.ctx.createGain();
      brushGain.gain.setValueAtTime(0.035, t);
      brushGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

      brushNoise.connect(brushFilter);
      brushFilter.connect(brushGain);
      brushGain.connect(this.channels.music);
      brushNoise.start(t);

      // 2. Walking Acoustic Bass Note
      const bassFreq = bassWalking[step % bassWalking.length];
      step++;

      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(bassFreq, t);
      bassGain.gain.setValueAtTime(0.18, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      bassOsc.connect(bassGain);
      bassGain.connect(this.channels.music);
      bassOsc.start(t);
      bassOsc.stop(t + 0.7);

      // 3. Subtle background Rhodes chime on downbeats
      if (step % 4 === 1) {
        const chord = [220, 261.63, 329.63];
        chord.forEach(f => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.035, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
          osc.connect(gain);
          gain.connect(this.channels.music);
          osc.start(t);
          osc.stop(t + 1.9);
        });
      }
    };

    playPulse();
    this.musicInterval = setInterval(playPulse, 700);
  }

  // Decisive Moment / Truco Raised: Tense Chamber Classical Strings (Cello & Violin dissonance)
  playDecisiveTrucoStrings() {
    const stringChords = [
      [110.00, 155.56, 220.00, 311.13], // A, Eb, A, Eb (Diminished tritone tension)
      [103.83, 146.83, 207.65, 293.66]  // G#, D, G#, D
    ];
    let idx = 0;

    const playStringBar = () => {
      if (this.currentMusicTrack !== "table_decisive" || !this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = stringChords[idx];
      idx = (idx + 1) % stringChords.length;

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, t);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(1200, t + 1.5);

        // Slow swelling tension without blasting the player's ears
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.065, t + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.channels.music);
        osc.start(t);
        osc.stop(t + 2.9);
      });
    };

    playStringBar();
    this.musicInterval = setInterval(playStringBar, 2900);
  }

  // =========================================================================
  // 3. PHYSICAL CARD SOUNDS (Tactile Layered Paper & Mahogany)
  // =========================================================================
  playCardSelect() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    if (t - this.lastCardSoundTime < 0.05) return;
    this.lastCardSoundTime = t;

    // Crisp paper edge snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.06);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.channels.cards);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playCardPlay() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Layer 1: Dry wood table impact (deep resonance)
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    woodOsc.type = "sine";
    woodOsc.frequency.setValueAtTime(140, t);
    woodOsc.frequency.exponentialRampToValueAtTime(40, t + 0.09);

    woodGain.gain.setValueAtTime(0.65, t);
    woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    woodOsc.connect(woodGain);
    woodGain.connect(this.channels.cards);
    woodOsc.start(t);
    woodOsc.stop(t + 0.11);

    // Layer 2: Card cardboard slap contact
    const slapOsc = this.ctx.createOscillator();
    const slapGain = this.ctx.createGain();
    slapOsc.type = "triangle";
    slapOsc.frequency.setValueAtTime(520, t);
    slapOsc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

    slapGain.gain.setValueAtTime(0.3, t);
    slapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

    slapOsc.connect(slapGain);
    slapGain.connect(this.channels.cards);
    slapOsc.start(t);
    slapOsc.stop(t + 0.06);
  }

  playCardDeal() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 3 rhythmic paper cards sliding
    [0, 0.08, 0.16].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(380, t + delay);
      osc.frequency.exponentialRampToValueAtTime(160, t + delay + 0.06);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, t + delay);

      gain.gain.setValueAtTime(0.2, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.channels.cards);

      osc.start(t + delay);
      osc.stop(t + delay + 0.07);
    });
  }

  playTrickSweep() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Multiple cards sliding together on felt
    const noise = this.ctx.createBufferSource();
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.22, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = b;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(450, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.channels.cards);
    noise.start(t);
  }

  // =========================================================================
  // 4. SPECIAL STINGERS & TABLE EVENTS
  // =========================================================================
  // Vira Reveal: Brief chamber string attack
  playViraReveal() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const chord = [220, 277.18, 329.63, 440]; // A major quartet attack
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(1200, t);

      osc.connect(f);
      f.connect(gain);
      gain.connect(this.channels.stingers);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  // Manilha: Deep fundamental with subtle golden brass shimmer
  playManilhaChime() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Deep note
    const lowOsc = this.ctx.createOscillator();
    const lowGain = this.ctx.createGain();
    lowOsc.type = "triangle";
    lowOsc.frequency.setValueAtTime(130.81, t); // C3
    lowGain.gain.setValueAtTime(0.4, t);
    lowGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    lowOsc.connect(lowGain);
    lowGain.connect(this.channels.stingers);
    lowOsc.start(t);
    lowOsc.stop(t + 0.65);

    // Golden shimmer overtones
    [523.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.03);
      gain.gain.setValueAtTime(0.12, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(this.channels.stingers);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.6);
    });
  }

  // Truco Slam: Heavy dry table thump followed by resonant vintage strike
  playTrucoSting() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // 1. Heavy physical wood slam
    const oscWood = this.ctx.createOscillator();
    const gainWood = this.ctx.createGain();
    oscWood.type = "triangle";
    oscWood.frequency.setValueAtTime(110, t);
    oscWood.frequency.exponentialRampToValueAtTime(28, t + 0.35);

    gainWood.gain.setValueAtTime(0.75, t);
    gainWood.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    oscWood.connect(gainWood);
    gainWood.connect(this.channels.stingers);
    oscWood.start(t);
    oscWood.stop(t + 0.38);

    // 2. Brass gong / club bell tension resonance
    const oscBell = this.ctx.createOscillator();
    const gainBell = this.ctx.createGain();
    oscBell.type = "sine";
    oscBell.frequency.setValueAtTime(329.63, t); // E4
    gainBell.gain.setValueAtTime(0.35, t);
    gainBell.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    oscBell.connect(gainBell);
    gainBell.connect(this.channels.stingers);
    oscBell.start(t);
    oscBell.stop(t + 0.9);
  }

  // Chips Slide / Bets
  playChips() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const delay = i * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(950 + Math.random() * 250, t + delay);
      gain.gain.setValueAtTime(0.18, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.045);
      osc.connect(gain);
      gain.connect(this.channels.ui);
      osc.start(t + delay);
      osc.stop(t + delay + 0.05);
    }
  }

  // Trick Win: Short elegant chord
  playTrickWin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392.00].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.02);
      gain.gain.setValueAtTime(0.15, t + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.channels.stingers);
      osc.start(t + idx * 0.02);
      osc.stop(t + 0.45);
    });
  }

  // Victory: Piano & mellow brass harmonic resolution (Classy, not exaggerated)
  playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [130.81, 196.00, 261.63, 329.63, 392.00, 523.25]; // C major 9 resolution
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx < 2 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.25, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.channels.stingers);
      osc.start(t + idx * 0.08);
      osc.stop(t + 1.3);
    });
  }

  // Defeat: Low piano & melancholy cello chord
  playDefeat() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [65.41, 110.00, 155.56, 196.00]; // Low C dim / minor
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);

      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(450, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

      osc.connect(f);
      f.connect(gain);
      gain.connect(this.channels.stingers);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  }

  // =========================================================================
  // 5. CHARACTER SOUND IDENTITIES (Section 4 of Audio Bible)
  // =========================================================================
  playCharacterSignature(charId) {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    switch (charId) {
      case "trampa":
        // Trampa: Short ragtime piano lick + dry wood tap + paper cards
        const ragNotes = [261.63, 293.66, 311.13, 329.63, 392.00];
        ragNotes.forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, t + i * 0.06);
          gain.gain.setValueAtTime(0.22, t + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.14);
          osc.connect(gain);
          gain.connect(this.channels.abilities);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.16);
        });
        this.playCardSelect();
        break;

      case "veneno":
        // Veneno: Smooth piano notes + high violin + subtle tension chord (Elegant & Dangerous)
        const vChord = [329.63, 440.00, 622.25, 830.61]; // E, A, D#, G# (mysterious harmonic minor)
        vChord.forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t + i * 0.05);
          gain.gain.setValueAtTime(0.2, t + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
          osc.connect(gain);
          gain.connect(this.channels.abilities);
          osc.start(t + i * 0.05);
          osc.stop(t + 0.75);
        });
        break;

      case "calibre":
        // Calibre: Deep heavy piano bass + cello + controlled low frequency impact (Deliberate & Heavy)
        const cBass = [55.00, 82.41, 110.00]; // Low A, E, A
        cBass.forEach(f => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.35, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
          osc.connect(gain);
          gain.connect(this.channels.abilities);
          osc.start(t);
          osc.stop(t + 0.85);
        });
        break;

      case "pixel":
        // Pixel: Agile syncopated piano stabs + light acoustic percussion
        const pSync = [349.23, 415.30, 440.00, 523.25];
        [0, 0.07, 0.15, 0.22].forEach((delay, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(pSync[idx], t + delay);
          gain.gain.setValueAtTime(0.2, t + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);
          osc.connect(gain);
          gain.connect(this.channels.abilities);
          osc.start(t + delay);
          osc.stop(t + delay + 0.14);
        });
        break;
    }
  }
}
