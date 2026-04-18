"use client";

import { useEffect, useRef } from "react";

export default function Game() {
  const cwrapRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const CV = document.getElementById("gc") as HTMLCanvasElement;
    const X = CV.getContext("2d")!;
    const S = 40;
    const C = 14, R = 10;
    CV.width = C * S;
    CV.height = R * S;
    let tick = 0;

    // ============ AUDIO (Web Audio API, synthesized in-browser) ============
    type AudioCtxCtor = typeof AudioContext;
    let audioCtx: AudioContext | null = null;
    let muted = false;
    let musicGain: GainNode | null = null;
    let musicStarted = false;
    let musicTimer: ReturnType<typeof setInterval> | null = null;

    function getAudio(): AudioContext | null {
      if (muted) return null;
      if (!audioCtx) {
        try {
          const W = window as unknown as { AudioContext?: AudioCtxCtor; webkitAudioContext?: AudioCtxCtor };
          const AC = W.AudioContext || W.webkitAudioContext;
          if (!AC) return null;
          audioCtx = new AC();
          musicGain = audioCtx.createGain();
          musicGain.gain.value = 0.10; // subtle background
          musicGain.connect(audioCtx.destination);
        } catch { return null; }
      }
      return audioCtx;
    }

    // Medieval flute note — triangle wave with vibrato + attack/decay envelope
    function playFluteNote(freq: number, duration: number, startOffset: number = 0) {
      const ctx = getAudio();
      if (!ctx || !musicGain) return;
      const now = ctx.currentTime + startOffset;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      // Vibrato for the whimsical flute sound
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 5.5;
      const vibratoGain = ctx.createGain();
      vibratoGain.gain.value = freq * 0.015;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(now);
      vibrato.stop(now + duration);
      // Envelope
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.8, now + 0.03); // attack
      env.gain.exponentialRampToValueAtTime(0.4, now + duration * 0.5); // sustain/decay
      env.gain.exponentialRampToValueAtTime(0.001, now + duration); // release
      osc.connect(env);
      env.connect(musicGain);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }

    // Simple whimsical medieval flute melody (in D major / Dorian-ish)
    // Note pitches — approx frequencies
    const NOTE: Record<string, number> = {
      D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
    };
    // Melody: notes with durations (in seconds). Loops every ~8 sec.
    const MELODY: [string, number][] = [
      ["D5", 0.4], ["F5", 0.2], ["E5", 0.2], ["D5", 0.4], ["A4", 0.4],
      ["D5", 0.3], ["E5", 0.3], ["F5", 0.6],
      ["G5", 0.4], ["F5", 0.2], ["E5", 0.2], ["D5", 0.4], ["E5", 0.4],
      ["D5", 0.3], ["A4", 0.3], ["D5", 0.8],
      ["F5", 0.3], ["G5", 0.3], ["A5", 0.4], ["G5", 0.4],
      ["F5", 0.3], ["E5", 0.3], ["D5", 0.8],
    ];

    function scheduleMelodyLoop() {
      const ctx = getAudio();
      if (!ctx) return;
      let t = 0;
      for (const [note, dur] of MELODY) {
        playFluteNote(NOTE[note], dur, t);
        t += dur;
      }
      return t; // total length
    }

    function startMusic() {
      if (musicStarted) return;
      const ctx = getAudio();
      if (!ctx) return;
      musicStarted = true;
      // Schedule first loop and repeat
      const totalLen = scheduleMelodyLoop() || 8;
      musicTimer = setInterval(() => {
        if (muted) return;
        scheduleMelodyLoop();
      }, Math.floor(totalLen * 1000));
    }

    function stopMusic() {
      musicStarted = false;
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    }

    // Squish sound — low burst with pitch drop (monster hit)
    function playSquish() {
      const ctx = getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.35, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    // Pffft sound — white noise burst (smoke puff)
    function playPfft() {
      const ctx = getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.25);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      // Bandpass filter for "ffft" texture
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      filter.Q.value = 0.8;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.4, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);
      src.start(now);
    }

    // Walking footstep — soft muted click
    function playWalk() {
      const ctx = getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.15, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }

    // Attack swing — quick upward whoosh
    function playAttack() {
      const ctx = getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.09);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.22, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      // Noise for whoosh texture
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 2500;
      const noiseEnv = ctx.createGain();
      noiseEnv.gain.value = 0.2;
      noise.connect(noiseFilter); noiseFilter.connect(noiseEnv); noiseEnv.connect(ctx.destination);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.12);
      noise.start(now);
    }

    // Getting hit — low dissonant thud
    function playHurt() {
      const ctx = getAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.25);
      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(180, now);
      osc2.frequency.exponentialRampToValueAtTime(60, now + 0.25);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.3, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(env); osc2.connect(env); env.connect(ctx.destination);
      osc1.start(now); osc2.start(now);
      osc1.stop(now + 0.32); osc2.stop(now + 0.32);
    }

    // Correct answer — cheerful ascending arpeggio (C-E-G-C)
    function playCorrect() {
      const ctx = getAudio();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.1;
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.3, now + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    }

    // Wrong answer — two descending buzzy tones
    function playWrong() {
      const ctx = getAudio();
      if (!ctx) return;
      [[400, 0], [260, 0.18]].forEach(([freq, delay]) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.22, now);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      });
    }

    // Monster defeat — triumphant short fanfare (three ascending notes + pfft)
    function playDefeat() {
      const ctx = getAudio();
      if (!ctx) return;
      const notes = [440, 554.37, 659.25]; // A4 C#5 E5 — A major
      notes.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.06;
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.28, now + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      });
    }

    // ============ GAME STATE ============
    type GameState = "intro" | "playing" | "paused" | "levelComplete" | "gameOver" | "victory" | "miniGame" | "portalTravel";
    let portalTravelTimer = 0;
    let portalTravelWorld: { col: string; name: string; bg: string; emoji: string } | null = null;
    let gameState: GameState = "intro";
    let level = 1;
    let score = 0;
    let levelTimer = 0;
    let introScroll = 0;
    let chickensCollected = 0;
    let levelClock = 0; // ticks remaining for this level
    // Smoke puffs when monsters die
    interface SmokePuff { x: number; y: number; life: number; maxLife: number; }
    let smokePuffs: SmokePuff[] = [];
    function spawnSmoke(x: number, y: number) {
      smokePuffs.push({ x, y, life: 30, maxLife: 30 });
      playPfft();
    }
    // Pet dog companion — follows Hudson with a delay (trail buffer)
    const petTrail: { x: number; y: number }[] = [];
    // Mini-game state for portal worlds (Hat Shuffle)
    interface Hat { x: number; hasBall: boolean; }
    interface MiniGameState {
      type: "hatshuffle";
      world: { col: string; name: string; bg: string; emoji: string };
      phase: "showing" | "shuffling" | "guessing" | "done";
      hats: Hat[];
      shuffleStep: number;
      shuffleTotal: number;
      swapFrom: number;
      swapTo: number;
      swapProgress: number; // 0..1
      revealTimer: number;
      resultTimer: number;
      won: boolean;
      done?: boolean;
    }
    let miniGame: MiniGameState | null = null;
    const HAT_Y = 270; // fixed y position for all helmets
    const HAT_XS = [140, 280, 420]; // initial x positions
    const LEVEL_TIMES = [5400, 6000, 6600, 7200, 7800, 9000, 10200, 11400, 12600, 14400]; // ticks per level (90s to 240s)

    // ============ EPIC INTRO STORY ============
    const INTRO_LINES = [
      "",
      "HOW TO PLAY",
      "",
      "Arrow Keys \u2014 Move Hudson",
      "F \u2014 Fight nearby monsters",
      "M \u2014 Use magic power",
      "P \u2014 Pause the game",
      "",
      "Walk over items to pick them up",
      "Portals appear on levels 3, 6, 9",
      "",
      "Find the GOLDEN DOG in each maze",
      "Save all 10 to beat the game!",
      "",
      "",
      "\u2014 THE STORY \u2014",
      "",
      "",
      "In a time of legends...",
      "in a kingdom beyond the mountains...",
      "",
      "there lived a brave knight",
      "known across all the lands as",
      "",
      "SIR HUDSON",
      "",
      "Knight of Snider Castle",
      "Champion of the Realm",
      "Protector of All Creatures",
      "",
      "",
      "For generations, the Royal Family",
      "has guarded ten sacred",
      "MAGICAL GOLDEN DOGS",
      "",
      "These enchanted pups hold the",
      "power that keeps the kingdom",
      "safe from darkness.",
      "",
      "But on a stormy night,",
      "the Shadow King unleashed",
      "his army of monsters",
      "upon Snider Castle.",
      "",
      "In the chaos, all ten",
      "Golden Dogs escaped",
      "into the cursed mazes",
      "that surround the kingdom.",
      "",
      "King Jason has commanded:",
      "",
      "\"Sir Hudson, you must venture",
      "into the ten great mazes.",
      "Face the monsters that lurk within.",
      "Find every Golden Dog",
      "and bring them back to the castle!\"",
      "",
      "Queen Heather added:",
      "",
      "\"Be brave, Sir Hudson.",
      "The kingdom believes in you.",
      "You are our only hope.\"",
      "",
      "",
      "And so Sir Hudson drew his sword,",
      "stepped through the castle gates,",
      "and began his",
      "",
      "EPIC QUEST",
      "",
      "",
      "",
      "[ Press any key to begin ]",
      "",
    ];

    // ============ PORTAL WORLD CHALLENGE ============
    const PORTAL_WORLDS = [
      { col: "#ffaa33", name: "Jason's Realm", bg: "#2a1a0a", emoji: "\uD83D\uDC51" },
      { col: "#4488ff", name: "Hudson's Realm", bg: "#0a1a3a", emoji: "\u2694\uFE0F" },
      { col: "#ff66bb", name: "Heather's Realm", bg: "#3a0a2a", emoji: "\uD83D\uDC51" },
    ];

    // ============ TYPES ============
    interface Player {
      x: number; y: number; lives: number; arrows: number;
      weapon: Weapon | null; magic: string | null; magicUses: number;
      armor: number; flash: number; facing: string;
      thirst: number; // 0-100, 0 = thirsty/dying
    }
    interface Monster {
      id: number; name: string; shape: string; col: string; eye: string;
      hp: number; maxhp: number; x: number; y: number; alive: boolean; flash: number;
      lastMove: number;
    }
    interface Pickup {
      x: number; y: number; type: string; taken: boolean;
    }
    interface Portal {
      x: number; y: number; destX: number; destY: number; col: string; name: string; taken: boolean;
    }
    interface Weapon { id: string; name: string; dmg: number; icon: string; col: string; }

    // ============ WEAPONS ============
    const WEAPONS: Weapon[] = [
      { id: "sw", name: "Fire Sword", dmg: 20, icon: "\uD83D\uDDE1", col: "#ff6600" },
      { id: "ax", name: "War Axe", dmg: 35, icon: "\u2694", col: "#aaaaff" },
      { id: "bw", name: "Magic Bow", dmg: 50, icon: "\uD83C\uDFF9", col: "#00ffaa" },
      { id: "cn", name: "DEATH CANNON", dmg: 80, icon: "\uD83D\uDCA5", col: "#ff00ff" },
      { id: "ds", name: "Dragon Slayer", dmg: 120, icon: "\u2694\uFE0F", col: "#ff0000" },
    ];

    // ============ MONSTER TEMPLATES ============
    const MONSTER_TEMPLATES = [
      { name: "Skeleton", shape: "bone", col: "#ffffaa", eye: "#ff00ff", hp: 15 },
      { name: "Zombie", shape: "wraith", col: "#55aa55", eye: "#ff0000", hp: 18 },
      { name: "Goblin", shape: "troll", col: "#44aa44", eye: "#ffff00", hp: 12 },
      { name: "Troll", shape: "troll", col: "#aa6633", eye: "#ffffff", hp: 25 },
      { name: "Ogre", shape: "giant", col: "#88aa44", eye: "#ff0000", hp: 35 },
      { name: "Wraith", shape: "wraith", col: "#9900ff", eye: "#ffffff", hp: 22 },
      { name: "Fire Demon", shape: "demon", col: "#ff2200", eye: "#ffff00", hp: 40 },
      { name: "Dark Knight", shape: "lord", col: "#333366", eye: "#ff0000", hp: 50 },
      { name: "Ice Giant", shape: "giant", col: "#00ccff", eye: "#ff0000", hp: 55 },
      { name: "Dragon", shape: "eagle", col: "#ff4400", eye: "#ffff00", hp: 70 },
      { name: "Shadow", shape: "wraith", col: "#222244", eye: "#ff0000", hp: 30 },
      { name: "Frost Witch", shape: "lord", col: "#88ccff", eye: "#0000ff", hp: 45 },
      { name: "DARK LORD", shape: "lord", col: "#ff00aa", eye: "#00ffff", hp: 100 },
      { name: "DRAGON KING", shape: "eagle", col: "#ff0000", eye: "#ffff00", hp: 130 },
    ];

    // ============ MAZE MAPS ============
    // 0=path, 1=wall, 2=chicken(goal), 3=food, 4=weapon, 5=magic, 6=armor, 7=portal
    function makeMap(lv: number): number[][] {
      const mazes: number[][][] = [
        // Level 1: Simple intro maze
        [
          [0,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [0,0,0,0,0,1,3,0,0,0,1,0,0,1],
          [1,1,1,1,0,1,1,1,1,0,1,0,1,1],
          [1,3,0,0,0,0,0,0,1,0,0,0,0,1],
          [1,0,1,1,1,1,1,0,1,1,1,1,0,1],
          [1,0,1,5,0,0,0,0,0,0,0,1,0,1],
          [1,0,1,1,1,1,1,1,1,1,0,1,0,1],
          [1,0,0,0,4,0,1,3,0,0,0,0,0,1],
          [1,1,1,1,1,0,1,1,1,1,1,1,0,1],
          [1,1,1,1,1,0,0,0,0,0,0,0,0,2],
        ],
        // Level 2: Two paths
        [
          [0,0,0,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,0,0,0,0,1,3,0,0,0,0,1,1],
          [1,1,1,1,1,0,1,1,1,1,1,0,0,1],
          [1,3,0,0,0,0,0,0,0,1,0,0,1,1],
          [1,0,1,1,1,0,1,1,0,1,0,1,1,1],
          [1,0,0,0,1,0,0,1,0,0,0,0,0,1],
          [1,1,1,0,1,1,0,1,1,1,1,1,0,1],
          [1,4,0,0,0,0,0,0,5,0,0,0,0,1],
          [1,1,1,1,1,0,1,1,1,1,1,1,0,1],
          [1,1,1,1,1,0,0,3,0,0,0,0,0,2],
        ],
        // Level 3: Fork choices
        [
          [0,0,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,1,3,0,0,0,1,0,0,0,1],
          [1,1,1,0,1,0,1,1,0,1,0,1,0,1],
          [1,5,0,0,0,0,1,6,0,0,0,1,0,1],
          [1,0,1,1,1,1,1,1,1,1,0,1,0,1],
          [1,0,0,0,0,0,7,0,0,0,0,1,0,1],
          [1,1,1,0,1,1,0,1,1,1,1,1,0,1],
          [1,4,0,0,0,1,0,0,0,0,3,0,0,1],
          [1,0,1,1,0,1,0,1,1,1,1,1,1,1],
          [1,0,0,0,0,0,0,0,0,0,0,0,0,2],
        ],
        // Level 4: Dead ends
        [
          [0,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [0,0,0,1,3,0,1,0,0,0,1,0,0,1],
          [1,1,0,1,0,0,1,0,1,0,0,0,1,1],
          [1,0,0,0,0,1,1,0,1,1,1,0,0,1],
          [1,0,1,1,0,0,0,0,0,0,0,0,1,1],
          [1,0,1,5,0,1,1,1,1,0,1,0,0,1],
          [1,0,0,0,1,1,0,0,0,0,1,1,0,1],
          [1,1,1,0,0,0,0,1,4,0,0,0,0,1],
          [1,3,0,0,1,1,0,1,1,1,1,1,0,1],
          [1,0,1,0,0,0,0,0,0,6,0,0,0,2],
        ],
        // Level 5: Portal maze
        [
          [0,0,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,0,1,0,0,0,0,1,3,0,1],
          [1,1,1,1,0,1,0,1,1,0,1,0,1,1],
          [1,5,0,0,0,0,0,1,0,0,0,0,0,1],
          [1,0,1,1,1,1,1,1,0,1,0,1,1,1],
          [1,0,0,0,0,0,0,0,0,1,0,0,0,1],
          [1,1,1,1,1,0,1,1,1,1,0,1,0,1],
          [1,4,0,0,0,0,1,6,0,0,0,1,0,1],
          [1,0,1,1,1,0,1,1,1,0,1,1,0,1],
          [1,0,0,3,0,0,0,0,0,0,0,0,0,2],
        ],
        // Level 6: Tight corridors
        [
          [0,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [0,0,0,0,1,0,0,0,0,0,1,0,0,1],
          [1,1,1,0,1,0,1,1,1,0,0,0,1,1],
          [1,3,0,0,0,0,0,1,0,0,1,0,0,1],
          [1,0,1,1,1,1,0,1,0,1,1,1,0,1],
          [1,0,0,5,0,0,0,0,0,0,0,0,0,1],
          [1,0,1,1,1,0,1,1,1,7,1,1,0,1],
          [1,0,0,0,1,0,0,0,4,0,0,0,0,1],
          [1,1,1,0,1,1,1,0,1,1,1,1,0,1],
          [1,6,0,0,0,0,0,0,0,3,0,0,0,2],
        ],
        // Level 7: Winding
        [
          [0,0,0,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,0,0,0,0,1,0,3,0,0,0,1,1],
          [1,0,0,1,1,0,1,0,1,1,1,0,0,1],
          [1,0,1,1,0,0,0,0,0,0,1,1,0,1],
          [1,0,0,0,0,1,1,1,1,0,0,0,0,1],
          [1,1,1,1,0,0,5,0,1,0,1,1,0,1],
          [1,0,0,0,0,1,1,0,0,0,0,0,0,1],
          [1,0,1,1,0,1,4,0,1,1,1,1,0,1],
          [1,0,0,0,0,0,0,0,0,6,0,0,0,1],
          [1,1,1,1,1,1,3,0,1,0,0,1,0,2],
        ],
        // Level 8: Complex
        [
          [0,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [0,0,0,0,0,1,5,0,0,0,0,0,1,1],
          [1,1,1,1,0,1,1,1,1,1,1,0,0,1],
          [1,0,3,0,0,0,0,0,0,0,1,1,0,1],
          [1,0,1,1,1,0,1,1,1,0,0,0,0,1],
          [1,0,0,0,1,0,0,0,1,0,1,1,0,1],
          [1,1,1,0,1,1,0,0,0,0,0,1,0,1],
          [1,4,0,0,0,0,0,1,1,1,0,0,0,1],
          [1,0,1,1,1,1,0,0,6,0,0,1,0,1],
          [1,0,0,3,0,0,0,1,0,1,0,0,0,2],
        ],
        // Level 9: Brutal
        [
          [0,0,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,1,0,0,0,0,0,1,3,0,1],
          [1,1,1,0,1,0,1,1,1,0,1,1,0,1],
          [1,5,0,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,1,1,1,1,1,0,1,1,1,1,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1,0,1],
          [1,1,1,7,1,1,1,0,1,1,0,1,0,1],
          [1,4,0,0,0,1,0,0,0,0,0,0,0,1],
          [1,0,1,1,0,1,6,1,1,0,1,1,0,1],
          [1,0,0,0,0,0,0,0,3,0,0,0,0,2],
        ],
        // Level 10: Final maze
        [
          [0,0,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,0,1,0,3,0,0,0,0,0,1],
          [1,1,1,1,0,1,0,1,1,0,1,1,0,1],
          [1,5,0,0,0,0,0,1,0,0,0,1,0,1],
          [1,0,1,0,1,1,0,1,0,1,0,1,0,1],
          [1,0,1,0,0,0,0,0,0,1,0,0,0,1],
          [1,0,1,1,1,1,1,0,1,1,1,1,0,1],
          [1,0,0,4,0,0,0,0,0,0,6,0,0,1],
          [1,1,1,1,1,0,1,1,1,0,1,1,0,1],
          [1,1,1,1,1,0,0,0,3,0,0,0,0,2],
        ],
      ];
      return mazes[Math.min(lv - 1, mazes.length - 1)].map(row => [...row]);
    }

    // ============ BUILD LEVEL ============
    function makeMonsters(lv: number, map: number[][]): Monster[] {
      // Difficulty graduates slower after level 5
      const count = lv <= 5 ? 2 + lv : 7 + Math.floor((lv - 5) * 0.7);
      const ms: Monster[] = [];
      const hpMult = lv <= 5 ? 0.8 + (lv - 1) * 0.2 : 1.6 + (lv - 5) * 0.12;
      // Find all path tiles to place monsters on
      const paths: [number, number][] = [];
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        if (map[y][x] === 0 && !(x <= 1 && y <= 1) && !(x >= C - 2 && y >= R - 2)) paths.push([x, y]);
      }
      // Shuffle and pick spots
      for (let i = paths.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [paths[i], paths[j]] = [paths[j], paths[i]]; }
      for (let i = 0; i < Math.min(count, paths.length); i++) {
        const tIdx = Math.min(i + Math.floor((lv - 1) * 0.8), MONSTER_TEMPLATES.length - 1);
        const t = MONSTER_TEMPLATES[tIdx];
        const hp = Math.floor(t.hp * hpMult);
        ms.push({ id: i, name: t.name, shape: t.shape, col: t.col, eye: t.eye, hp, maxhp: hp, x: paths[i][0], y: paths[i][1], alive: true, flash: 0, lastMove: 0 });
      }
      return ms;
    }

    function makePickups(map: number[][]): Pickup[] {
      const pickups: Pickup[] = [];
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        if (map[y][x] >= 3 && map[y][x] <= 6) {
          const types = ["", "", "", "food", "weapon", "magic", "armor"];
          pickups.push({ x, y, type: types[map[y][x]], taken: false });
          map[y][x] = 0; // Clear tile to path
        }
      }
      // Scatter arrow pickups on random path tiles
      const paths: [number, number][] = [];
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        if (map[y][x] === 0 && !(x === 0 && y === 0)) paths.push([x, y]);
      }
      for (let i = paths.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [paths[i], paths[j]] = [paths[j], paths[i]]; }
      const arrowCount = 4 + level;
      for (let i = 0; i < Math.min(arrowCount, paths.length); i++) {
        // Don't overlap with existing pickups
        if (!pickups.some(p => p.x === paths[i][0] && p.y === paths[i][1])) {
          pickups.push({ x: paths[i][0], y: paths[i][1], type: "arrows", taken: false });
        }
      }
      // Scatter water pickups (important — thirst drops over time!)
      const waterCount = 3 + Math.floor(level / 2);
      let placed = 0;
      for (let i = arrowCount; i < paths.length && placed < waterCount; i++) {
        if (!pickups.some(p => p.x === paths[i][0] && p.y === paths[i][1])) {
          pickups.push({ x: paths[i][0], y: paths[i][1], type: "water", taken: false });
          placed++;
        }
      }
      return pickups;
    }

    function makePortals(map: number[][]): Portal[] {
      const portals: Portal[] = [];
      // Shuffle the 8 worlds so each portal gets a unique one
      const shuffled = [...PORTAL_WORLDS].sort(() => Math.random() - 0.5);
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        if (map[y][x] === 7) {
          const pw = shuffled[portals.length % shuffled.length];
          // Find a random path tile far away
          let dx: number, dy: number;
          do { dx = Math.floor(Math.random() * C); dy = Math.floor(Math.random() * R); }
          while (map[dy][dx] !== 0 || (Math.abs(dx - x) < 4 && Math.abs(dy - y) < 4));
          portals.push({ x, y, destX: dx, destY: dy, col: pw.col, name: pw.name, taken: false });
          map[y][x] = 0;
        }
      }
      return portals;
    }

    function findChicken(map: number[][]): { x: number; y: number } {
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        if (map[y][x] === 2) { map[y][x] = 0; return { x, y }; }
      }
      return { x: C - 1, y: R - 1 };
    }

    // ============ MUTABLE STATE ============
    let map: number[][] = makeMap(1);
    let chicken = findChicken(map);
    let pickups: Pickup[] = makePickups(map);
    let portals: Portal[] = makePortals(map);
    let monsters: Monster[] = makeMonsters(1, map);
    const player: Player = { x: 0, y: 0, lives: 5, arrows: 3, weapon: WEAPONS[0], magic: null, magicUses: 0, armor: 0, flash: 0, facing: "right", thirst: 100 };

    function startLevel(lv: number) {
      level = lv;
      map = makeMap(lv);
      chicken = findChicken(map);
      pickups = makePickups(map);
      portals = makePortals(map);
      monsters = makeMonsters(lv, map);
      player.x = 0; player.y = 0; player.armor = 0; player.flash = 0;
      smokePuffs = [];
      petTrail.length = 0;
      levelClock = LEVEL_TIMES[Math.min(lv - 1, LEVEL_TIMES.length - 1)];
      // Keep weapon and magic between levels
      gameState = "playing";
      updH();
      const secs = Math.ceil(levelClock / 60);
      setMsg(`Level ${lv}! ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} to find the Golden Dog!`);
    }

    // ============ TILE DRAWING ============
    function dt(x: number, y: number, t: number) {
      const px = x * S, py = y * S;
      if (t === 0) {
        // Path - dark stone floor
        X.fillStyle = "#3a3a4a"; X.fillRect(px, py, S, S);
        X.fillStyle = "#444455"; X.fillRect(px + 1, py + 1, S - 2, S - 2);
        // Subtle grid lines
        X.fillStyle = "rgba(0,0,0,0.15)"; X.fillRect(px, py, S, 1); X.fillRect(px, py, 1, S);
      } else if (t === 1) {
        // Wall - dark stone bricks
        X.fillStyle = "#1a1a2a"; X.fillRect(px, py, S, S);
        X.fillStyle = "#252538"; X.fillRect(px + 1, py + 1, S / 2 - 2, S / 2 - 2);
        X.fillRect(px + S / 2, py + S / 2, S / 2 - 1, S / 2 - 1);
        X.fillRect(px + S / 2, py + 1, S / 2 - 1, S / 2 - 2);
        X.fillRect(px + 1, py + S / 2, S / 2 - 2, S / 2 - 1);
        X.fillStyle = "rgba(0,0,0,0.3)"; X.fillRect(px, py + S / 2, S, 1); X.fillRect(px + S / 2, py, 1, S);
      }
    }

    // ============ DRAW PICKUPS ============
    function drawPickups() {
      pickups.forEach(p => {
        if (p.taken) return;
        const px = p.x * S, py = p.y * S;
        const b = Math.sin(tick / 12 + p.x + p.y) * 2;
        X.font = "18px monospace"; X.textAlign = "center";
        const icons: Record<string, string> = { food: "\uD83C\uDF54", weapon: "\u2694\uFE0F", magic: "\uD83E\uDE84", armor: "\uD83D\uDEE1\uFE0F", arrows: "\uD83C\uDFF9", water: "\uD83D\uDCA7" };
        X.fillText(icons[p.type] || "?", px + S / 2, py + S / 2 + 6 + b);
        X.textAlign = "left";
        const glows: Record<string, string> = { food: "#ffaa00", weapon: "#ff4400", magic: "#aa00ff", armor: "#0088ff", arrows: "#88ff44", water: "#00ccff" };
        X.save(); X.shadowColor = glows[p.type] || "#fff"; X.shadowBlur = 6 + Math.sin(tick / 8) * 3;
        X.fillStyle = "rgba(255,255,255,0.08)"; X.beginPath(); X.arc(px + S / 2, py + S / 2 + b, 12, 0, Math.PI * 2); X.fill();
        X.restore();
      });
    }

    // ============ DRAW PORTALS ============
    function drawPortals() {
      portals.forEach(p => {
        if (p.taken) return;
        const px = p.x * S, py = p.y * S;
        const pulse = Math.sin(tick / 10) * 4;
        // --- Draw ENTRY portal ---
        X.save();
        X.shadowColor = p.col; X.shadowBlur = 12 + pulse;
        X.strokeStyle = p.col; X.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const r = 10 + i * 4 + pulse;
          X.beginPath(); X.arc(px + S / 2, py + S / 2, r, tick / 20 + i, tick / 20 + i + 4); X.stroke();
        }
        X.fillStyle = p.col + "44"; X.beginPath(); X.arc(px + S / 2, py + S / 2, 8, 0, Math.PI * 2); X.fill();
        X.restore();
        X.fillStyle = p.col; X.font = "bold 7px monospace"; X.textAlign = "center";
        X.fillText(p.name, px + S / 2, py + S - 1); X.textAlign = "left";

        // --- Draw DESTINATION marker (matching color) ---
        const dx = p.destX * S, dy = p.destY * S;
        const dp = Math.sin(tick / 12 + 1) * 3;
        X.save();
        X.shadowColor = p.col; X.shadowBlur = 8 + dp;
        // Diamond/target marker
        X.strokeStyle = p.col; X.lineWidth = 2;
        X.beginPath();
        X.moveTo(dx + S / 2, dy + 4); X.lineTo(dx + S - 4, dy + S / 2);
        X.lineTo(dx + S / 2, dy + S - 4); X.lineTo(dx + 4, dy + S / 2);
        X.closePath(); X.stroke();
        X.fillStyle = p.col + "22"; X.fill();
        X.restore();
        // Label
        X.fillStyle = p.col; X.font = "bold 6px monospace"; X.textAlign = "center";
        X.fillText("\u2192 " + p.name, dx + S / 2, dy + S - 1); X.textAlign = "left";
        // Connecting line (faint)
        X.save();
        X.strokeStyle = p.col + "33"; X.lineWidth = 1; X.setLineDash([4, 4]);
        X.beginPath(); X.moveTo(px + S / 2, py + S / 2); X.lineTo(dx + S / 2, dy + S / 2); X.stroke();
        X.setLineDash([]);
        X.restore();
      });
    }

    // ============ DRAW CHICKEN ============
    function drawPetDog() {
      // Pet dog follows 6 steps behind Hudson on the trail
      let tx = player.x, ty = player.y;
      if (petTrail.length >= 6) {
        const pos = petTrail[petTrail.length - 6];
        tx = pos.x; ty = pos.y;
      } else if (petTrail.length > 0) {
        const pos = petTrail[0];
        tx = pos.x; ty = pos.y;
      } else {
        // If no trail yet, sit next to player
        tx = Math.max(0, player.x - 1);
        ty = player.y;
      }
      const px = tx * S, py = ty * S;
      const b = Math.sin(tick / 6) * 2;
      const wag = Math.sin(tick / 3) * 4;
      X.save();
      // Body
      X.fillStyle = "#b07030"; // brown
      X.beginPath(); X.ellipse(px + S / 2, py + S / 2 + 4 + b, 9, 6, 0, 0, Math.PI * 2); X.fill();
      // Legs
      X.fillStyle = "#805020";
      X.fillRect(px + S / 2 - 7, py + S / 2 + 8 + b, 2, 4);
      X.fillRect(px + S / 2 - 3, py + S / 2 + 8 + b, 2, 4);
      X.fillRect(px + S / 2 + 2, py + S / 2 + 8 + b, 2, 4);
      X.fillRect(px + S / 2 + 6, py + S / 2 + 8 + b, 2, 4);
      // Tail (wagging!)
      X.fillStyle = "#b07030";
      X.beginPath();
      X.moveTo(px + S / 2 + 8, py + S / 2 + 2 + b);
      X.lineTo(px + S / 2 + 12 + wag, py + S / 2 - 2 + b);
      X.lineTo(px + S / 2 + 11 + wag, py + S / 2 + 4 + b);
      X.closePath(); X.fill();
      // Head
      X.fillStyle = "#c08040";
      X.beginPath(); X.arc(px + S / 2 - 6, py + S / 2 - 2 + b, 6, 0, Math.PI * 2); X.fill();
      // Floppy ears
      X.fillStyle = "#805020";
      X.beginPath(); X.ellipse(px + S / 2 - 10, py + S / 2 - 1 + b, 2, 4, 0, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.ellipse(px + S / 2 - 3, py + S / 2 - 1 + b, 2, 4, 0, 0, Math.PI * 2); X.fill();
      // Snout
      X.fillStyle = "#d0a060";
      X.beginPath(); X.ellipse(px + S / 2 - 10, py + S / 2 + 1 + b, 3, 2, 0, 0, Math.PI * 2); X.fill();
      // Nose
      X.fillStyle = "#111";
      X.beginPath(); X.arc(px + S / 2 - 12, py + S / 2 + b, 1, 0, Math.PI * 2); X.fill();
      // Eye
      X.fillStyle = "#111";
      X.beginPath(); X.arc(px + S / 2 - 7, py + S / 2 - 3 + b, 1, 0, Math.PI * 2); X.fill();
      // Label
      X.fillStyle = "#ffaa44"; X.font = "bold 6px monospace"; X.textAlign = "center";
      X.fillText("BUDDY", px + S / 2, py + S - 1); X.textAlign = "left";
      X.restore();
    }

    function drawChicken() {
      const px = chicken.x * S, py = chicken.y * S;
      const b = Math.sin(tick / 8) * 2;
      const glow = 12 + Math.sin(tick / 6) * 8;
      const wag = Math.sin(tick / 4) * 4;
      X.save();
      X.shadowColor = "#ffcc00"; X.shadowBlur = glow;
      // Golden glow circle
      X.fillStyle = `rgba(255,204,0,${0.15 + Math.sin(tick / 10) * 0.1})`;
      X.beginPath(); X.arc(px + S / 2, py + S / 2, S / 2, 0, Math.PI * 2); X.fill();
      // Golden Dog!
      const cx = px + S / 2, cy = py + S / 2;
      // Wagging tail (behind body)
      X.fillStyle = "#e6b800";
      X.beginPath();
      X.moveTo(cx - 10, cy + 4 + b);
      X.lineTo(cx - 16 - wag, cy - 2 + b);
      X.lineTo(cx - 14 - wag, cy + 6 + b);
      X.closePath(); X.fill();
      // Body (ellipse)
      X.fillStyle = "#e6b800";
      X.beginPath(); X.ellipse(cx, cy + 4 + b, 12, 8, 0, 0, Math.PI * 2); X.fill();
      // Legs (4 small stubs)
      X.fillStyle = "#cc9900";
      X.fillRect(cx - 9, cy + 9 + b, 3, 5);
      X.fillRect(cx - 4, cy + 9 + b, 3, 5);
      X.fillRect(cx + 1, cy + 9 + b, 3, 5);
      X.fillRect(cx + 6, cy + 9 + b, 3, 5);
      // Head (circle, front-upper)
      X.fillStyle = "#ffcc00";
      X.beginPath(); X.arc(cx + 6, cy - 5 + b, 7, 0, Math.PI * 2); X.fill();
      // Floppy ears (droopy triangles on sides of head)
      X.fillStyle = "#cc9900";
      X.beginPath();
      X.moveTo(cx + 2, cy - 9 + b);
      X.lineTo(cx - 1, cy - 2 + b);
      X.lineTo(cx + 4, cy - 4 + b);
      X.closePath(); X.fill();
      X.beginPath();
      X.moveTo(cx + 10, cy - 9 + b);
      X.lineTo(cx + 13, cy - 2 + b);
      X.lineTo(cx + 8, cy - 4 + b);
      X.closePath(); X.fill();
      // Snout (oval front of head)
      X.fillStyle = "#ffdd33";
      X.beginPath(); X.ellipse(cx + 11, cy - 3 + b, 4, 3, 0, 0, Math.PI * 2); X.fill();
      // Nose (black dot on snout)
      X.fillStyle = "#111";
      X.beginPath(); X.arc(cx + 13, cy - 4 + b, 1.5, 0, Math.PI * 2); X.fill();
      // Eyes (cute dots with shine)
      X.fillStyle = "#111";
      X.beginPath(); X.arc(cx + 3, cy - 6 + b, 1.5, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.arc(cx + 8, cy - 7 + b, 1.5, 0, Math.PI * 2); X.fill();
      X.fillStyle = "#fff";
      X.beginPath(); X.arc(cx + 2.5, cy - 6.5 + b, 0.6, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.arc(cx + 7.5, cy - 7.5 + b, 0.6, 0, Math.PI * 2); X.fill();
      // Crown on top of head
      X.fillStyle = "#ffaa00";
      X.beginPath();
      X.moveTo(cx + 1, cy - 11 + b);
      X.lineTo(cx + 3, cy - 16 + b);
      X.lineTo(cx + 6, cy - 13 + b);
      X.lineTo(cx + 9, cy - 16 + b);
      X.lineTo(cx + 11, cy - 11 + b);
      X.closePath(); X.fill();
      // Sparkles
      for (let i = 0; i < 8; i++) {
        const sx = cx + Math.sin(tick / 6 + i * 0.8) * 18;
        const sy = cy + Math.cos(tick / 5 + i * 1.1) * 16;
        const sa = 0.3 + Math.sin(tick / 4 + i) * 0.3;
        X.fillStyle = `rgba(255,255,100,${sa})`;
        X.beginPath(); X.arc(sx, sy, 1.5, 0, Math.PI * 2); X.fill();
      }
      X.restore();
      X.fillStyle = "#ffcc00"; X.font = "bold 6px monospace"; X.textAlign = "center";
      X.fillText("GOLDEN DOG", px + S / 2, py + S - 1); X.textAlign = "left";
    }

    // ============ DRAW MONSTER ============
    function drawMonster(m: Monster) {
      if (!m.alive) return;
      const px = m.x * S, py = m.y * S;
      const col = m.flash > 0 ? "#ffffff" : m.col;
      const sc = S / 56; // Scale factor from original 56px tiles
      X.save();
      X.translate(px, py);
      X.scale(sc, sc);
      if (m.shape === "wraith") {
        for (let i = 0; i < 5; i++) { X.fillStyle = col + "88"; X.beginPath(); X.arc(8 + i * 10, 40 + Math.sin(tick / 7 + i) * 3, 4, 0, Math.PI * 2); X.fill(); }
        X.fillStyle = col; X.beginPath(); X.arc(28, 22, 16, 0, Math.PI * 2); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(21, 20, 4, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(35, 20, 4, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(21, 20, 2, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(35, 20, 2, 0, Math.PI * 2); X.fill();
      } else if (m.shape === "demon") {
        X.fillStyle = col; X.fillRect(10, 16, 36, 26); X.beginPath(); X.arc(28, 18, 14, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#990000"; X.beginPath(); X.moveTo(12, 8); X.lineTo(16, 18); X.lineTo(6, 16); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(44, 8); X.lineTo(40, 18); X.lineTo(50, 16); X.closePath(); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(21, 16, 4, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(35, 16, 4, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(21, 16, 2, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(35, 16, 2, 0, Math.PI * 2); X.fill();
      } else if (m.shape === "giant") {
        X.fillStyle = col; X.fillRect(6, 12, 44, 34);
        X.fillStyle = m.eye; X.fillRect(12, 20, 12, 10); X.fillRect(32, 20, 12, 10);
        X.fillStyle = "#000"; X.fillRect(15, 23, 6, 5); X.fillRect(35, 23, 6, 5);
        X.fillStyle = "#fff"; X.fillRect(16, 24, 3, 3); X.fillRect(36, 24, 3, 3);
      } else if (m.shape === "bone") {
        X.fillStyle = col; X.beginPath(); X.arc(28, 18, 14, 0, Math.PI * 2); X.fill();
        X.fillRect(16, 28, 24, 16);
        X.fillStyle = "#000"; X.fillRect(16, 12, 8, 10); X.fillRect(32, 12, 8, 10);
        X.fillStyle = m.eye; X.beginPath(); X.arc(20, 18, 4, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(36, 18, 4, 0, Math.PI * 2); X.fill();
      } else if (m.shape === "lord") {
        X.fillStyle = col; X.fillRect(8, 12, 40, 32); X.beginPath(); X.arc(28, 14, 12, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#330033";
        X.beginPath(); X.moveTo(14, 6); X.lineTo(18, 14); X.lineTo(8, 14); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(42, 6); X.lineTo(38, 14); X.lineTo(48, 14); X.closePath(); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(22, 14, 4, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(34, 14, 4, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(22, 14, 2, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(34, 14, 2, 0, Math.PI * 2); X.fill();
      } else if (m.shape === "troll") {
        X.fillStyle = col; X.beginPath(); X.arc(28, 28, 16, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(28, 16, 12, 0, Math.PI * 2); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(22, 14, 4, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(34, 14, 4, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(22, 14, 2, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(34, 14, 2, 0, Math.PI * 2); X.fill();
      } else if (m.shape === "eagle") {
        const wf = Math.sin(tick / 5 + m.id) * 8;
        X.fillStyle = col + "bb";
        X.beginPath(); X.moveTo(28, 24); X.lineTo(4, 16 - wf); X.lineTo(10, 28); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(28, 24); X.lineTo(52, 16 - wf); X.lineTo(46, 28); X.closePath(); X.fill();
        X.fillStyle = col; X.beginPath(); X.arc(28, 24, 12, 0, Math.PI * 2); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(22, 22, 4, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(34, 22, 4, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(22, 22, 2, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(34, 22, 2, 0, Math.PI * 2); X.fill();
      }
      X.setTransform(1, 0, 0, 1, 0, 0); // Reset
      // HP bar
      const hw = Math.floor((m.hp / m.maxhp) * (S - 6));
      X.fillStyle = "#440000"; X.fillRect(px + 3, py + 1, S - 6, 4);
      X.fillStyle = m.hp > m.maxhp * 0.5 ? "#00ee44" : "#ff3300"; X.fillRect(px + 3, py + 1, hw, 4);
      X.fillStyle = "#ffcc00"; X.font = "bold 7px monospace"; X.textAlign = "center"; X.fillText(m.name, px + S / 2, py + S - 1); X.textAlign = "left";
      if (m.flash > 0) m.flash--;
      X.restore();
    }

    // ============ DRAW PLAYER ============
    function drawPlayer() {
      const px = player.x * S, py = player.y * S;
      const sc = S / 56;
      X.save();
      // Flash red when hit
      if (player.flash > 0) {
        X.fillStyle = `rgba(255,0,0,${0.3 + Math.sin(tick / 2) * 0.2})`; X.fillRect(px, py, S, S);
        player.flash--;
      }
      // Armor glow
      if (player.armor > 0) {
        X.save(); X.shadowColor = "#0088ff"; X.shadowBlur = 8;
        X.strokeStyle = "#0088ff"; X.lineWidth = 2; X.strokeRect(px + 2, py + 2, S - 4, S - 4);
        X.restore();
      }
      X.translate(px, py); X.scale(sc, sc);
      // HUDSON — BLUE & RED KNIGHT with animated swinging arms
      // Arm swing offset (animated)
      const armSwing = Math.sin(tick / 6) * 4;
      // Cape (blue with red trim, gentle sway)
      const capeSway = Math.sin(tick / 14) * 2;
      X.fillStyle = "#1a3a8a"; // deep blue cape
      X.beginPath();
      X.moveTo(14, 20);
      X.lineTo(6 + capeSway, 46);
      X.lineTo(22, 42);
      X.closePath(); X.fill();
      X.beginPath();
      X.moveTo(42, 20);
      X.lineTo(50 - capeSway, 46);
      X.lineTo(34, 42);
      X.closePath(); X.fill();
      // Cape red trim
      X.fillStyle = "#c62828";
      X.fillRect(14, 20, 8, 2);
      X.fillRect(34, 20, 8, 2);
      // Legs (silver plate greaves)
      X.fillStyle = "#a0a0a8";
      X.fillRect(18, 40, 8, 12);
      X.fillRect(30, 40, 8, 12);
      X.fillStyle = "#c0c0c8";
      X.fillRect(18, 44, 8, 2);
      X.fillRect(30, 44, 8, 2);
      // Boots
      X.fillStyle = "#333";
      X.fillRect(16, 50, 12, 4);
      X.fillRect(28, 50, 12, 4);
      X.fillStyle = "#555";
      X.fillRect(16, 50, 12, 1);
      X.fillRect(28, 50, 12, 1);
      // Torso — split blue (left half) and red (right half) plate
      X.fillStyle = "#1e49b8"; // blue side
      X.fillRect(14, 18, 14, 24);
      X.fillStyle = "#c62828"; // red side
      X.fillRect(28, 18, 14, 24);
      // Top highlight stripes
      X.fillStyle = "#3a6ed0";
      X.fillRect(14, 18, 14, 4);
      X.fillStyle = "#e53935";
      X.fillRect(28, 18, 14, 4);
      // Center divider
      X.fillStyle = "#ffd700";
      X.fillRect(27, 18, 2, 24);
      // Belt
      X.fillStyle = "#5a3a10";
      X.fillRect(14, 36, 28, 4);
      X.fillStyle = "#ffcc00";
      X.fillRect(26, 37, 4, 2); // buckle
      // Gold star emblem on chest
      X.fillStyle = "#ffd700";
      X.fillRect(26, 26, 4, 8);
      X.fillRect(22, 29, 12, 2);
      X.beginPath();
      X.moveTo(28, 23); X.lineTo(30, 27); X.lineTo(26, 27); X.closePath(); X.fill();
      // Arms — left BLUE sleeve (animated swing)
      X.fillStyle = "#1e49b8";
      X.fillRect(6, 20 + armSwing, 8, 16);
      X.fillStyle = "#3a6ed0";
      X.fillRect(6, 20 + armSwing, 8, 3);
      // Arms — right RED sleeve (opposite swing)
      X.fillStyle = "#c62828";
      X.fillRect(42, 20 - armSwing, 8, 16);
      X.fillStyle = "#e53935";
      X.fillRect(42, 20 - armSwing, 8, 3);
      // Gauntlets (silver) — follow arm swing
      X.fillStyle = "#b0b0b8";
      X.fillRect(4, 34 + armSwing, 10, 6);
      X.fillRect(42, 34 - armSwing, 10, 6);
      // Shield on left arm (BLUE with gold trim)
      X.fillStyle = "#ffd700";
      X.beginPath();
      X.moveTo(0, 22 + armSwing);
      X.lineTo(0, 38 + armSwing);
      X.lineTo(4, 42 + armSwing);
      X.lineTo(8, 38 + armSwing);
      X.lineTo(8, 22 + armSwing);
      X.closePath(); X.fill();
      X.fillStyle = "#1e49b8";
      X.beginPath();
      X.moveTo(1, 23 + armSwing);
      X.lineTo(1, 37 + armSwing);
      X.lineTo(4, 40 + armSwing);
      X.lineTo(7, 37 + armSwing);
      X.lineTo(7, 23 + armSwing);
      X.closePath(); X.fill();
      // Shield emblem (gold star)
      X.fillStyle = "#ffd700";
      X.fillRect(3, 28 + armSwing, 2, 6);
      X.fillRect(1, 30 + armSwing, 6, 2);
      // Helmet (silver closed helm)
      X.fillStyle = "#c0c0c0";
      X.beginPath(); X.arc(28, 12, 11, Math.PI, Math.PI * 2); X.fill();
      X.fillRect(17, 12, 22, 6);
      // Helmet side
      X.fillStyle = "#a0a0a8";
      X.fillRect(17, 14, 22, 4);
      // Helmet visor slit (dark)
      X.fillStyle = "#1a1a1a";
      X.fillRect(20, 10, 16, 3);
      // Blue & red plume on top
      X.fillStyle = "#1e49b8";
      X.fillRect(26, 1, 2, 4);
      X.fillStyle = "#c62828";
      X.fillRect(28, 1, 2, 4);
      // Weapon (keep existing glow position)
      if (player.weapon) {
        X.save(); X.shadowColor = player.weapon.col; X.shadowBlur = 14;
        X.fillStyle = player.weapon.col;
        X.fillRect(50, 12, 5, 26); X.fillRect(46, 10, 13, 4);
        X.restore();
      }
      X.setTransform(1, 0, 0, 1, 0, 0);
      // Name
      X.fillStyle = "#ffcc00"; X.font = "bold 7px monospace"; X.textAlign = "center";
      X.fillText("HUDSON", px + S / 2, py + 3); X.textAlign = "left";
      X.restore();
    }

    // ============ OVERLAYS ============
    function drawLevelComplete() {
      X.fillStyle = "rgba(0,0,20,0.88)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save(); X.shadowColor = "#ffcc00"; X.shadowBlur = 20;
      X.fillStyle = "#ffcc00"; X.font = "bold 22px monospace"; X.textAlign = "center";
      X.fillText(`LEVEL ${level} COMPLETE!`, CV.width / 2, 100);
      X.shadowBlur = 0;
      X.fillStyle = "#88ff88"; X.font = "14px monospace";
      X.fillText("You found the Golden Dog!", CV.width / 2, 140);
      X.fillStyle = "#fff"; X.font = "12px monospace";
      X.fillText(`Score: ${score}`, CV.width / 2, 175);
      X.fillStyle = "#ffcc00"; X.font = "bold 14px monospace";
      X.fillText(`Entering Level ${level + 1}...`, CV.width / 2, 220);
      const pct = levelTimer / 180;
      X.fillStyle = "#333"; X.fillRect(CV.width / 2 - 80, 240, 160, 8);
      X.fillStyle = "#ffcc00"; X.fillRect(CV.width / 2 - 80, 240, 160 * (1 - pct), 8);
      X.textAlign = "left"; X.restore();
    }

    function drawGameOver() {
      X.fillStyle = "rgba(20,0,0,0.92)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save(); X.shadowColor = "#ff0000"; X.shadowBlur = 20;
      X.fillStyle = "#ff4444"; X.font = "bold 28px monospace"; X.textAlign = "center";
      X.fillText("GAME OVER", CV.width / 2, 120);
      X.shadowBlur = 0;
      X.fillStyle = "#fff"; X.font = "14px monospace";
      X.fillText(`Score: ${score}  |  Level: ${level}`, CV.width / 2, 170);
      X.fillStyle = "#ffcc00"; X.font = "bold 12px monospace";
      X.fillText("Press any key to restart!", CV.width / 2, 230);
      X.textAlign = "left"; X.restore();
    }

    function drawVictory() {
      X.fillStyle = "rgba(0,5,0,0.94)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save();
      const glow = 20 + Math.sin(tick / 8) * 15;
      X.shadowColor = "#ffff00"; X.shadowBlur = glow;
      X.fillStyle = "#ffcc00"; X.font = "bold 28px monospace"; X.textAlign = "center";
      X.fillText("\u2B50 YOU WIN! \u2B50", CV.width / 2, 80);
      X.font = "bold 20px monospace";
      X.fillText("YOU SAVED THE WORLD!", CV.width / 2, 120);
      X.shadowBlur = 0;
      // Sparkles
      for (let i = 0; i < 20; i++) {
        const fx = (CV.width / 2) + Math.sin(tick / 6 + i * 0.8) * (60 + i * 8);
        const fy = 50 + Math.cos(tick / 5 + i * 1.1) * 40 + i * 6;
        const fa = 0.4 + Math.sin(tick / 3 + i) * 0.4;
        const c = ["#ff0000","#ffcc00","#00ff00","#00ccff","#ff00ff"][i % 5];
        X.fillStyle = c; X.globalAlpha = fa;
        X.beginPath(); X.arc(fx, fy, 2, 0, Math.PI * 2); X.fill();
      }
      X.globalAlpha = 1;
      X.fillStyle = "#fff"; X.font = "16px monospace";
      X.fillText(`Final Score: ${score}`, CV.width / 2, 180);
      X.fillStyle = "#88ff88"; X.font = "12px monospace";
      X.fillText("The Golden Dogs are safe!", CV.width / 2, 220);
      X.fillText("Hudson saved everything!", CV.width / 2, 245);
      X.fillStyle = "#ffcc00"; X.font = "bold 11px monospace";
      X.fillText("Press any key to play again!", CV.width / 2, 290);
      X.textAlign = "left"; X.restore();
    }

    // ============ MONSTER AI ============
    function moveMonsters() {
      const speed = level <= 5 ? Math.max(30, 50 - level * 4) : Math.max(22, 30 - (level - 5) * 1.5);
      monsters.forEach(m => {
        if (!m.alive) return;
        if (tick - m.lastMove < speed) return;
        m.lastMove = tick;
        // Try to move in a random walkable direction
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        // Shuffle
        for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
        for (const [dx, dy] of dirs) {
          const nx = m.x + dx, ny = m.y + dy;
          if (nx < 0 || nx >= C || ny < 0 || ny >= R) continue;
          if (map[ny][nx] === 1) continue;
          if (monsters.some(o => o.alive && o.id !== m.id && o.x === nx && o.y === ny)) continue;
          m.x = nx; m.y = ny;
          break;
        }
      });
    }

    // ============ MONSTER ATTACKS ============
    function monsterAttacks() {
      const interval = level <= 5 ? Math.max(90, 150 - level * 10) : Math.max(70, 100 - (level - 5) * 5);
      if (tick % interval !== 0) return;
      if (player.lives <= 0) return;
      monsters.forEach(m => {
        if (!m.alive) return;
        if (Math.abs(m.x - player.x) <= 1 && Math.abs(m.y - player.y) <= 1) {
          if (player.armor > 0) {
            player.armor--; player.flash = 10;
            setMsg(`${m.name} attacked! Armor blocked it!`);
          } else {
            player.lives--; player.flash = 15;
            playHurt();
            setMsg(`${m.name} attacked Hudson! ${player.lives} lives left!`);
          }
          updH();
          if (player.lives <= 0) gameState = "gameOver";
        }
      });
    }

    // ============ SMOKE PUFFS ============
    function drawSmokePuffs() {
      smokePuffs = smokePuffs.filter(p => p.life > 0);
      smokePuffs.forEach(p => {
        const progress = 1 - p.life / p.maxLife;
        const alpha = 0.7 * (1 - progress);
        const radius = 6 + progress * 18;
        X.save();
        // Multiple expanding circles for puff effect
        for (let i = 0; i < 5; i++) {
          const ox = Math.sin(i * 1.3 + p.life * 0.2) * progress * 10;
          const oy = Math.cos(i * 1.7 + p.life * 0.3) * progress * 8 - progress * 12;
          X.fillStyle = `rgba(180,180,180,${alpha * (1 - i * 0.15)})`;
          X.beginPath(); X.arc(p.x + ox, p.y + oy, Math.max(1, radius - i * 2), 0, Math.PI * 2); X.fill();
        }
        X.restore();
        p.life--;
      });
    }

    // ============ MINI-GAME SYSTEM ============
    function startMiniGame(world: MiniGameState["world"]) {
      // Build 3 hats, one with the ball
      const ballIdx = Math.floor(Math.random() * 3);
      const hats: Hat[] = HAT_XS.map((x, i) => ({ x, hasBall: i === ballIdx }));
      miniGame = {
        type: "hatshuffle",
        world,
        phase: "showing",
        hats,
        shuffleStep: 0,
        shuffleTotal: 0,
        swapFrom: 0,
        swapTo: 0,
        swapProgress: 0,
        revealTimer: Math.max(60, 110 - level * 4), // shorter look at higher levels
        resultTimer: 0,
        won: false,
      };
      gameState = "miniGame";
    }

    function pickShufflePair(mg: MiniGameState) {
      mg.swapFrom = Math.floor(Math.random() * 3);
      do { mg.swapTo = Math.floor(Math.random() * 3); } while (mg.swapTo === mg.swapFrom);
      mg.swapProgress = 0;
    }

    function enterPortalWorld(_portal: Portal) {
      // Pick a random world, then show travel transition before the hat shuffle
      const world = PORTAL_WORLDS[Math.floor(Math.random() * PORTAL_WORLDS.length)];
      portalTravelWorld = world;
      portalTravelTimer = 180; // ~3 sec travel transition
      gameState = "portalTravel";
    }

    function drawHat(x: number, y: number, raised: boolean = false) {
      // Knight's helmet (replaces top hat)
      const ry = raised ? y - 24 : y;
      // Base/neck ring
      X.fillStyle = "#5a5a68";
      X.fillRect(x - 20, ry + 22, 40, 6);
      // Helmet main bell shape
      X.fillStyle = "#b0b0b8";
      X.beginPath();
      X.moveTo(x - 22, ry + 22);
      X.quadraticCurveTo(x - 22, ry - 18, x, ry - 20);
      X.quadraticCurveTo(x + 22, ry - 18, x + 22, ry + 22);
      X.closePath();
      X.fill();
      // Highlight on left side
      X.fillStyle = "#d0d0d8";
      X.beginPath();
      X.moveTo(x - 18, ry + 18);
      X.quadraticCurveTo(x - 18, ry - 14, x - 6, ry - 18);
      X.lineTo(x - 4, ry - 12);
      X.quadraticCurveTo(x - 14, ry - 10, x - 14, ry + 18);
      X.closePath();
      X.fill();
      // Visor slit (dark)
      X.fillStyle = "#111";
      X.fillRect(x - 16, ry - 2, 32, 4);
      // Visor rivets
      X.fillStyle = "#808088";
      X.beginPath(); X.arc(x - 14, ry + 8, 1.5, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.arc(x + 14, ry + 8, 1.5, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.arc(x - 14, ry - 10, 1.5, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.arc(x + 14, ry - 10, 1.5, 0, Math.PI * 2); X.fill();
      // Red plume on top
      X.fillStyle = "#c62828";
      X.fillRect(x - 2, ry - 28, 4, 10);
      X.fillStyle = "#e53935";
      X.fillRect(x - 1, ry - 28, 2, 8);
      // Shadow under helmet
      X.fillStyle = "rgba(0,0,0,0.4)";
      X.beginPath(); X.ellipse(x, ry + 30, 22, 4, 0, 0, Math.PI * 2); X.fill();
    }

    function drawBall(x: number, y: number) {
      // Red ball with shine
      X.save(); X.shadowColor = "#ff3030"; X.shadowBlur = 8;
      X.fillStyle = "#ff3030";
      X.beginPath(); X.arc(x, y, 10, 0, Math.PI * 2); X.fill();
      X.restore();
      X.fillStyle = "#ff8080";
      X.beginPath(); X.arc(x - 3, y - 3, 3.5, 0, Math.PI * 2); X.fill();
    }

    function drawPortalTravel() {
      if (!portalTravelWorld) { gameState = "playing"; return; }
      const w = portalTravelWorld;
      // Tunnel-like animated background
      X.fillStyle = w.bg; X.fillRect(0, 0, CV.width, CV.height);
      const cx = CV.width / 2, cy = CV.height / 2;
      // Concentric rings zooming out
      for (let r = 0; r < 12; r++) {
        const ring = ((tick * 3 + r * 40) % 400);
        const alpha = 1 - ring / 400;
        X.strokeStyle = w.col;
        X.globalAlpha = alpha * 0.6;
        X.lineWidth = 3;
        X.beginPath(); X.arc(cx, cy, ring, 0, Math.PI * 2); X.stroke();
      }
      X.globalAlpha = 1;
      // Center glow
      X.save(); X.shadowColor = w.col; X.shadowBlur = 40 + Math.sin(tick / 5) * 10;
      X.fillStyle = w.col;
      X.font = "bold 36px monospace"; X.textAlign = "center";
      X.fillText(w.emoji, cx, cy - 10);
      X.restore();
      // World name
      X.save(); X.shadowColor = w.col; X.shadowBlur = 20;
      X.fillStyle = "#ffffff"; X.font = "bold 24px monospace"; X.textAlign = "center";
      X.fillText("Traveling to", cx, cy + 30);
      X.fillStyle = w.col; X.font = "bold 28px monospace";
      X.fillText(w.name.toUpperCase(), cx, cy + 65);
      X.restore();
      X.textAlign = "left";
      portalTravelTimer--;
      if (portalTravelTimer <= 0 && portalTravelWorld) {
        startMiniGame(portalTravelWorld);
        portalTravelWorld = null;
      }
    }

    function drawMiniGame() {
      if (!miniGame) return;
      const mg = miniGame;
      // === Castle hall background ===
      X.fillStyle = mg.world.bg; X.fillRect(0, 0, CV.width, CV.height);
      // Stone brick wall pattern
      const brickH = 22, brickW = 60;
      for (let y = 0; y < CV.height; y += brickH) {
        const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
        for (let x = -offset; x < CV.width; x += brickW) {
          X.fillStyle = "#3a3540";
          X.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
          X.fillStyle = "#2a2530";
          X.fillRect(x + 1, y + brickH - 3, brickW - 2, 2);
          X.fillStyle = "#4a4550";
          X.fillRect(x + 2, y + 2, brickW - 4, 2);
        }
      }
      // Dark color overlay for realm mood
      X.fillStyle = mg.world.col + "14";
      X.fillRect(0, 0, CV.width, CV.height);
      // Left castle pillar
      X.fillStyle = "#4a4550";
      X.fillRect(0, 0, 30, CV.height);
      X.fillStyle = "#5a5560";
      X.fillRect(6, 0, 18, CV.height);
      // Right castle pillar
      X.fillStyle = "#4a4550";
      X.fillRect(CV.width - 30, 0, 30, CV.height);
      X.fillStyle = "#5a5560";
      X.fillRect(CV.width - 24, 0, 18, CV.height);
      // Castle crenellations at top
      X.fillStyle = "#2a2530";
      X.fillRect(0, 0, CV.width, 10);
      for (let cx = 0; cx < CV.width; cx += 30) {
        X.fillStyle = "#4a4550";
        X.fillRect(cx, 0, 14, 10);
      }
      // Torches with flickering flames on both pillars
      const flicker = 0.8 + Math.sin(tick / 3) * 0.2;
      const drawTorch = (tx: number, ty: number) => {
        // Torch handle
        X.fillStyle = "#5a3a10";
        X.fillRect(tx - 2, ty, 4, 14);
        // Torch bowl
        X.fillStyle = "#888";
        X.fillRect(tx - 6, ty - 4, 12, 5);
        // Flame
        X.save();
        X.shadowColor = "#ff7700"; X.shadowBlur = 12 * flicker;
        X.fillStyle = `rgba(255,140,0,${flicker})`;
        X.beginPath();
        X.moveTo(tx - 6, ty - 4);
        X.quadraticCurveTo(tx - 8, ty - 16 - flicker * 2, tx, ty - 22 - flicker * 3);
        X.quadraticCurveTo(tx + 8, ty - 16 - flicker * 2, tx + 6, ty - 4);
        X.closePath(); X.fill();
        X.fillStyle = `rgba(255,220,100,${flicker})`;
        X.beginPath();
        X.moveTo(tx - 3, ty - 6);
        X.quadraticCurveTo(tx - 4, ty - 13, tx, ty - 17);
        X.quadraticCurveTo(tx + 4, ty - 13, tx + 3, ty - 6);
        X.closePath(); X.fill();
        X.restore();
      };
      drawTorch(50, 120);
      drawTorch(CV.width - 50, 120);
      drawTorch(50, 280);
      drawTorch(CV.width - 50, 280);
      // Royal banner hanging in the middle
      X.fillStyle = mg.world.col + "aa";
      X.fillRect(CV.width / 2 - 40, 70, 80, 4);
      X.fillStyle = mg.world.col;
      X.fillRect(CV.width / 2 - 30, 70, 60, 70);
      X.fillStyle = mg.world.col + "dd";
      X.beginPath();
      X.moveTo(CV.width / 2 - 30, 140);
      X.lineTo(CV.width / 2, 154);
      X.lineTo(CV.width / 2 + 30, 140);
      X.closePath(); X.fill();
      // Banner emblem (gold crown)
      X.fillStyle = "#ffd700";
      X.font = "bold 24px serif"; X.textAlign = "center";
      X.fillText(mg.world.emoji, CV.width / 2, 115);
      // Floating dust motes
      for (let i = 0; i < 15; i++) {
        const px = (i * 53 + tick * 0.3) % CV.width;
        const py = (i * 37 + Math.sin(tick / 15 + i) * 20) % CV.height;
        X.fillStyle = "rgba(255,220,140,0.25)";
        X.beginPath(); X.arc(px, py, 1, 0, Math.PI * 2); X.fill();
      }
      // === Title plate ===
      X.save(); X.shadowColor = mg.world.col; X.shadowBlur = 12;
      X.fillStyle = mg.world.col; X.font = "bold 16px serif"; X.textAlign = "center";
      X.fillText(mg.world.name, CV.width / 2, 180);
      X.restore();
      X.fillStyle = "#ffd700"; X.font = "bold 11px monospace"; X.textAlign = "center";
      X.fillText("HELMET SHUFFLE \u2014 Find the ball to win +1 Life!", CV.width / 2, 200);
      X.textAlign = "left";

      // Phase logic
      if (mg.phase === "showing") {
        // Draw 3 hats, raise the one with the ball
        mg.hats.forEach(h => drawHat(h.x, HAT_Y, h.hasBall));
        // Draw ball under the raised hat
        const ballHat = mg.hats.find(h => h.hasBall);
        if (ballHat) drawBall(ballHat.x, HAT_Y + 8);
        // Status text
        X.fillStyle = "#ffffff"; X.font = "bold 12px monospace"; X.textAlign = "center";
        X.fillText("Watch the helmet! The ball is there...", CV.width / 2, 230);
        X.textAlign = "left";
        mg.revealTimer--;
        if (mg.revealTimer <= 0) {
          // Harder: more shuffles, scales with level
          mg.shuffleTotal = 8 + Math.floor(Math.random() * 4) + Math.floor(level / 2); // 8-11 base, +1 per 2 levels
          mg.shuffleStep = 0;
          pickShufflePair(mg);
          mg.phase = "shuffling";
        }
      } else if (mg.phase === "shuffling") {
        // Interpolate positions of swapping hats
        const fromStartX = HAT_XS[mg.swapFrom];
        const toStartX = HAT_XS[mg.swapTo];
        // Compute interpolated positions during animation
        const p = Math.min(1, mg.swapProgress);
        const ease = 0.5 - Math.cos(p * Math.PI) / 2; // smooth easing
        // Draw all hats, override the two that are animating
        mg.hats.forEach((h, i) => {
          if (i === mg.swapFrom) {
            const ax = fromStartX + (toStartX - fromStartX) * ease;
            // Arc path to make it look like they're weaving
            const ay = HAT_Y - Math.sin(p * Math.PI) * 30;
            drawHat(ax, ay);
          } else if (i === mg.swapTo) {
            const ax = toStartX + (fromStartX - toStartX) * ease;
            const ay = HAT_Y + Math.sin(p * Math.PI) * 30;
            drawHat(ax, ay);
          } else {
            drawHat(h.x, HAT_Y);
          }
        });
        // Status
        X.fillStyle = "#ffffff"; X.font = "bold 12px monospace"; X.textAlign = "center";
        X.fillText(`Shuffling... ${mg.shuffleStep + 1} / ${mg.shuffleTotal}`, CV.width / 2, 230);
        X.textAlign = "left";
        // Faster shuffles at higher levels (harder to track)
        mg.swapProgress += 0.055 + level * 0.005;
        if (mg.swapProgress >= 1) {
          // Commit the swap — exchange positions AND hasBall stays with hats (objects swap in array)
          const tmp = mg.hats[mg.swapFrom];
          mg.hats[mg.swapFrom] = mg.hats[mg.swapTo];
          mg.hats[mg.swapTo] = tmp;
          // Reset each hat's x to its slot position
          mg.hats.forEach((h, i) => { h.x = HAT_XS[i]; });
          mg.shuffleStep++;
          if (mg.shuffleStep >= mg.shuffleTotal) {
            mg.phase = "guessing";
          } else {
            pickShufflePair(mg);
          }
        }
      } else if (mg.phase === "guessing") {
        mg.hats.forEach(h => drawHat(h.x, HAT_Y));
        X.save(); X.shadowColor = "#ffcc00"; X.shadowBlur = 8;
        X.fillStyle = "#ffcc00"; X.font = "bold 14px monospace"; X.textAlign = "center";
        X.fillText("Which helmet holds the ball?", CV.width / 2, 230);
        X.restore();
        X.textAlign = "left";
      } else if (mg.phase === "done") {
        // Draw all hats, reveal the ball under the correct one
        mg.hats.forEach((h, i) => {
          drawHat(h.x, HAT_Y, h.hasBall);
        });
        const ballHat = mg.hats.find(h => h.hasBall);
        if (ballHat) drawBall(ballHat.x, HAT_Y + 8);
        // Result text
        X.fillStyle = "rgba(0,0,0,0.75)"; X.fillRect(0, CV.height / 2 - 40, CV.width, 90);
        X.save();
        X.shadowColor = mg.won ? "#00ff88" : "#ff4444"; X.shadowBlur = 12;
        X.fillStyle = mg.won ? "#00ff88" : "#ff4444";
        X.font = "bold 20px monospace"; X.textAlign = "center";
        X.fillText(mg.won ? "\uD83C\uDF89 You Win! +1 Life!" : "\uD83D\uDE14 Wrong helmet!", CV.width / 2, CV.height / 2);
        X.restore();
        X.fillStyle = "#fff"; X.font = "12px monospace"; X.textAlign = "center";
        X.fillText(mg.won ? "A life has been added to your hearts!" : "Better luck next time...", CV.width / 2, CV.height / 2 + 25);
        X.textAlign = "left";
        mg.resultTimer--;
        if (mg.resultTimer <= 0) {
          miniGame = null;
          gameState = "playing";
        }
      }
    }

    // Mini-game canvas click handler (Hat Shuffle)
    CV.addEventListener("click", (e) => {
      if (gameState !== "miniGame" || !miniGame || miniGame.phase !== "guessing") return;
      const rect = CV.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CV.width / rect.width);
      const my = (e.clientY - rect.top) * (CV.height / rect.height);
      // Hit-test hats
      for (let i = 0; i < miniGame.hats.length; i++) {
        const h = miniGame.hats[i];
        if (mx >= h.x - 20 && mx <= h.x + 20 && my >= HAT_Y - 16 && my <= HAT_Y + 28) {
          miniGame.won = h.hasBall;
          miniGame.phase = "done";
          miniGame.resultTimer = 180;
          if (miniGame.won) {
            player.lives = Math.min(5, player.lives + 1);
            updH();
            playCorrect();
          } else {
            playWrong();
          }
          break;
        }
      }
    });

    // ============ DRAW INTRO ============
    function drawIntro() {
      X.fillStyle = "#050510"; X.fillRect(0, 0, CV.width, CV.height);
      // Stars background
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + tick * 0.02) % CV.width;
        const sy = (i * 89) % CV.height;
        const sa = 0.3 + Math.sin(tick / 20 + i) * 0.3;
        X.fillStyle = `rgba(255,255,255,${sa})`;
        X.beginPath(); X.arc(sx, sy, 1, 0, Math.PI * 2); X.fill();
      }
      // Draw Sir Hudson (large, centered at top)
      const hx = CV.width / 2, hy = 50;
      const pulse = Math.sin(tick / 20) * 3;
      // Glow behind Hudson (red knight golden aura)
      X.save(); X.shadowColor = "#ffd700"; X.shadowBlur = 25 + Math.sin(tick / 10) * 10;
      X.fillStyle = "rgba(255,215,0,0.08)";
      X.beginPath(); X.arc(hx, hy + 30, 52, 0, Math.PI * 2); X.fill();
      X.restore();
      // Red cape behind body
      const capeSway2 = Math.sin(tick / 14) * 3;
      X.fillStyle = "#8a0000";
      X.beginPath();
      X.moveTo(hx - 14, hy + 14 + pulse);
      X.lineTo(hx - 28 + capeSway2, hy + 54 + pulse);
      X.lineTo(hx - 4, hy + 46 + pulse);
      X.closePath(); X.fill();
      X.beginPath();
      X.moveTo(hx + 14, hy + 14 + pulse);
      X.lineTo(hx + 28 - capeSway2, hy + 54 + pulse);
      X.lineTo(hx + 4, hy + 46 + pulse);
      X.closePath(); X.fill();
      // Legs — silver plate greaves
      X.fillStyle = "#a0a0a8";
      X.fillRect(hx - 12, hy + 38 + pulse, 10, 16);
      X.fillRect(hx + 2, hy + 38 + pulse, 10, 16);
      X.fillStyle = "#c0c0c8";
      X.fillRect(hx - 12, hy + 44 + pulse, 10, 2);
      X.fillRect(hx + 2, hy + 44 + pulse, 10, 2);
      // Boots (dark metal)
      X.fillStyle = "#333";
      X.fillRect(hx - 14, hy + 52 + pulse, 14, 5);
      X.fillRect(hx, hy + 52 + pulse, 14, 5);
      X.fillStyle = "#555";
      X.fillRect(hx - 14, hy + 52 + pulse, 14, 1);
      X.fillRect(hx, hy + 52 + pulse, 14, 1);
      // Torso — red chest plate
      X.fillStyle = "#c62828";
      X.fillRect(hx - 16, hy + 10 + pulse, 32, 28);
      X.fillStyle = "#e53935";
      X.fillRect(hx - 16, hy + 10 + pulse, 32, 5);
      // Belt
      X.fillStyle = "#5a3a10";
      X.fillRect(hx - 16, hy + 34 + pulse, 32, 4);
      X.fillStyle = "#ffcc00";
      X.fillRect(hx - 2, hy + 35 + pulse, 4, 2);
      // Gold cross emblem on chest
      X.fillStyle = "#ffd700";
      X.fillRect(hx - 2, hy + 18 + pulse, 4, 12);
      X.fillRect(hx - 6, hy + 22 + pulse, 12, 4);
      // Arms — red plate sleeves
      X.fillStyle = "#c62828";
      X.fillRect(hx - 28, hy + 12 + pulse, 12, 22);
      X.fillRect(hx + 16, hy + 12 + pulse, 12, 22);
      X.fillStyle = "#e53935";
      X.fillRect(hx - 28, hy + 12 + pulse, 12, 4);
      X.fillRect(hx + 16, hy + 12 + pulse, 12, 4);
      // Gauntlets (silver)
      X.fillStyle = "#b0b0b8";
      X.fillRect(hx - 30, hy + 30 + pulse, 14, 8);
      X.fillRect(hx + 16, hy + 30 + pulse, 14, 8);
      // Shield on left arm (red with gold trim, cross)
      X.fillStyle = "#ffd700";
      X.beginPath();
      X.moveTo(hx - 42, hy + 14 + pulse);
      X.lineTo(hx - 42, hy + 34 + pulse);
      X.lineTo(hx - 36, hy + 40 + pulse);
      X.lineTo(hx - 30, hy + 34 + pulse);
      X.lineTo(hx - 30, hy + 14 + pulse);
      X.closePath(); X.fill();
      X.fillStyle = "#c62828";
      X.beginPath();
      X.moveTo(hx - 41, hy + 15 + pulse);
      X.lineTo(hx - 41, hy + 33 + pulse);
      X.lineTo(hx - 36, hy + 38 + pulse);
      X.lineTo(hx - 31, hy + 33 + pulse);
      X.lineTo(hx - 31, hy + 15 + pulse);
      X.closePath(); X.fill();
      X.fillStyle = "#ffd700";
      X.fillRect(hx - 37, hy + 20 + pulse, 2, 10);
      X.fillRect(hx - 41, hy + 24 + pulse, 10, 2);
      // Helmet (silver closed helm)
      X.fillStyle = "#c0c0c0";
      X.beginPath(); X.arc(hx, hy + 4 + pulse, 14, Math.PI, Math.PI * 2); X.fill();
      X.fillRect(hx - 14, hy + 4 + pulse, 28, 8);
      X.fillStyle = "#a0a0a8";
      X.fillRect(hx - 14, hy + 7 + pulse, 28, 5);
      // Visor slit (dark)
      X.fillStyle = "#1a1a1a";
      X.fillRect(hx - 10, hy + 2 + pulse, 20, 3);
      // Red plume on top of helmet
      X.fillStyle = "#c62828";
      X.fillRect(hx - 2, hy - 10 + pulse, 4, 6);
      X.fillStyle = "#e53935";
      X.fillRect(hx - 1, hy - 10 + pulse, 2, 5);
      // Name plate
      X.save(); X.shadowColor = "#ffd700"; X.shadowBlur = 10;
      X.fillStyle = "#ffd700"; X.font = "bold 11px monospace"; X.textAlign = "center";
      X.fillText("SIR HUDSON", hx, hy + 72 + pulse);
      X.restore();

      // Scrolling text
      introScroll += 0.4;
      const startY = CV.height - introScroll + 100;
      X.textAlign = "center";
      INTRO_LINES.forEach((line, i) => {
        const ly = startY + i * 22;
        if (ly < -20 || ly > CV.height + 20) return;
        // Fade at edges
        const fade = Math.min(1, Math.min((ly - 70) / 40, (CV.height - ly) / 40));
        if (fade <= 0) return;
        if (["SIR HUDSON", "EPIC QUEST", "MAGICAL GOLDEN DOGS", "HOW TO PLAY", "\u2014 THE STORY \u2014"].includes(line)) {
          X.save(); X.shadowColor = "#ffcc00"; X.shadowBlur = 12;
          X.fillStyle = `rgba(255,204,0,${fade})`; X.font = "bold 18px monospace";
          X.fillText(line, CV.width / 2, ly);
          X.restore();
        } else if (line.startsWith("\"") || line.startsWith("[ ")) {
          X.fillStyle = `rgba(200,200,255,${fade})`; X.font = "italic 12px monospace";
          X.fillText(line, CV.width / 2, ly);
        } else if (line === "King Jason has commanded:" || line === "Queen Heather added:") {
          X.fillStyle = `rgba(255,180,100,${fade})`; X.font = "bold 12px monospace";
          X.fillText(line, CV.width / 2, ly);
        } else {
          X.fillStyle = `rgba(220,220,240,${fade})`; X.font = "12px monospace";
          X.fillText(line, CV.width / 2, ly);
        }
      });
      X.textAlign = "left";
      // Top/bottom fade gradients
      const gTop = X.createLinearGradient(0, 65, 0, 100);
      gTop.addColorStop(0, "#050510"); gTop.addColorStop(1, "rgba(5,5,16,0)");
      X.fillStyle = gTop; X.fillRect(0, 65, CV.width, 35);
      const gBot = X.createLinearGradient(0, CV.height - 30, 0, CV.height);
      gBot.addColorStop(0, "rgba(5,5,16,0)"); gBot.addColorStop(1, "#050510");
      X.fillStyle = gBot; X.fillRect(0, CV.height - 30, CV.width, 30);
    }

    // ============ DRAW PAUSED ============
    function drawPaused() {
      // Draw game behind
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) dt(x, y, map[y][x]);
      drawPickups(); drawPortals(); drawChicken();
      monsters.forEach(drawMonster); drawPlayer();
      // Overlay
      X.fillStyle = "rgba(0,0,20,0.75)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save(); X.shadowColor = "#ffcc00"; X.shadowBlur = 20;
      X.fillStyle = "#ffcc00"; X.font = "bold 28px monospace"; X.textAlign = "center";
      X.fillText("PAUSED", CV.width / 2, CV.height / 2 - 10);
      X.shadowBlur = 0;
      X.fillStyle = "#aaaacc"; X.font = "12px monospace";
      X.fillText("Press P to resume", CV.width / 2, CV.height / 2 + 20);
      X.fillStyle = "#888"; X.font = "10px monospace";
      X.fillText(`Level ${level}/10  |  Score: ${score}  |  Dogs: ${chickensCollected}/10`, CV.width / 2, CV.height / 2 + 50);
      X.textAlign = "left"; X.restore();
    }

    // ============ RENDER ============
    function render() {
      tick++;
      X.clearRect(0, 0, CV.width, CV.height);
      X.fillStyle = "#0a0a1a"; X.fillRect(0, 0, CV.width, CV.height);

      if (gameState === "intro") {
        drawIntro();
      } else if (gameState === "paused") {
        drawPaused();
      } else if (gameState === "playing") {
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) dt(x, y, map[y][x]);
        drawPickups();
        drawPortals();
        drawChicken();
        monsters.forEach(drawMonster);
        drawPetDog();
        drawPlayer();
        drawSmokePuffs();
        moveMonsters();
        monsterAttacks();
        // Level clock countdown (only game over if clock was actually running)
        if (levelClock > 1) levelClock--;
        else if (levelClock === 1) { levelClock = 0; gameState = "gameOver"; setMsg("Time's up!"); }
        // Thirst decay (slow)
        if (tick % 30 === 0) player.thirst = Math.max(0, player.thirst - 0.5);
        if (player.thirst <= 0) {
          // Starts losing lives when parched
          if (tick % 120 === 0 && player.lives > 0) {
            player.lives--; player.flash = 15; updH();
            setMsg("Too thirsty! Find water!");
            if (player.lives <= 0) gameState = "gameOver";
          }
        }
        // HUD on canvas (2 rows)
        X.fillStyle = "rgba(0,0,0,0.7)"; X.fillRect(0, 0, CV.width, 24);
        X.fillStyle = "#ffcc00"; X.font = "bold 9px monospace";
        X.fillText(`LV ${level}/10`, 4, 10);
        const alive = monsters.filter(m => m.alive).length;
        X.fillStyle = "#ff6666"; X.fillText(`Monsters: ${alive}`, 60, 10);
        X.fillStyle = "#88ff44"; X.fillText(`Arrows: ${player.arrows}`, 135, 10);
        X.fillStyle = "#88ccff"; X.fillText(`Armor: ${player.armor}`, 210, 10);
        X.fillStyle = "#cc88ff"; X.fillText(`Magic: ${player.magic || "-"}${player.magicUses > 0 ? ` x${player.magicUses}` : ""}`, 280, 10);
        // Timer on second row
        const secs = Math.ceil(levelClock / 60);
        const mins = Math.floor(secs / 60);
        const secStr = `${mins}:${String(secs % 60).padStart(2, "0")}`;
        X.fillStyle = levelClock < 600 ? "#ff4444" : "#aaffaa"; X.fillText(`Time: ${secStr}`, 380, 10);
        // Thirst row 2 (left of chickens)
        const thirstCol = player.thirst > 50 ? "#00ccff" : player.thirst > 20 ? "#ffcc00" : "#ff4444";
        X.fillStyle = thirstCol; X.font = "bold 8px monospace";
        X.fillText(`\uD83D\uDCA7 ${Math.round(player.thirst)}%`, 200, 21);
        // Chicken icons row 2
        X.fillStyle = "#ffcc00"; X.font = "bold 8px monospace";
        let chickenIcons = "";
        for (let i = 0; i < 10; i++) chickenIcons += i < chickensCollected ? "\uD83D\uDC15" : "\u25CB";
        X.fillText(chickenIcons, 4, 21);
        X.fillStyle = "#888"; X.textAlign = "right";
        X.fillText("Find the Golden Dog!", CV.width - 4, 21);
        X.textAlign = "left";
      } else if (gameState === "levelComplete") {
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) dt(x, y, map[y][x]);
        drawSmokePuffs();
        drawLevelComplete();
        levelTimer--;
        if (levelTimer <= 0) startLevel(level + 1);
      } else if (gameState === "miniGame") {
        drawMiniGame();
      } else if (gameState === "portalTravel") {
        drawPortalTravel();
      } else if (gameState === "gameOver") {
        drawGameOver();
      } else if (gameState === "victory") {
        drawVictory();
      }
      requestAnimationFrame(render);
    }

    // ============ HUD ============
    function updH() {
      const h = []; for (let i = 0; i < 5; i++) h.push(i < player.lives ? "\u2764\uFE0F" : "\uD83D\uDDA4");
      document.getElementById("hrt")!.textContent = h.join("");
      document.getElementById("sc")!.textContent = String(score);
      document.getElementById("lb")!.textContent = "LV " + level;
      const cb = document.getElementById("chickenbar");
      if (cb) {
        let icons = "";
        for (let i = 0; i < 10; i++) icons += i < chickensCollected ? "\uD83D\uDC15" : "\u25CB";
        cb.textContent = icons;
      }
    }
    function setMsg(t: string) { document.getElementById("msg")!.textContent = t; }

    // ============ ACTIONS ============
    function fight() {
      if (!player.weapon) { setMsg("No weapon!"); return; }
      if (player.arrows <= 0) { setMsg("No arrows! Find arrow pickups in the maze!"); return; }
      player.arrows--;
      updH();
      playAttack();
      let hit = false;
      monsters.forEach(m => {
        if (!m.alive) return;
        if (Math.abs(m.x - player.x) <= 1 && Math.abs(m.y - player.y) <= 1) {
          m.hp -= player.weapon!.dmg; m.flash = 10; hit = true; playSquish();
          if (m.hp <= 0) {
            m.alive = false; spawnSmoke(m.x * S + S / 2, m.y * S + S / 2); score += 200 * level; updH();
            playDefeat();
            setMsg(`${m.name} destroyed! +${200 * level} pts!`);
          } else {
            setMsg(`Hit ${m.name}! HP: ${Math.max(0, m.hp)}/${m.maxhp}`);
          }
        }
      });
      if (!hit) setMsg("No monster nearby!");
    }

    function useMagic() {
      if (!player.magic || player.magicUses <= 0) { setMsg("No magic! Find a wand pickup!"); return; }
      player.magicUses--;
      const type = player.magic;
      if (type === "fireball") {
        monsters.forEach(m => {
          if (m.alive && Math.abs(m.x - player.x) <= 2 && Math.abs(m.y - player.y) <= 2) {
            m.hp -= 50; m.flash = 10; playSquish();
            if (m.hp <= 0) { m.alive = false; spawnSmoke(m.x * S + S / 2, m.y * S + S / 2); score += 200 * level; }
          }
        });
        setMsg("FIREBALL! Nearby monsters burned!");
      } else if (type === "freeze") {
        // Monsters won't move for a while (handled by giving them a future lastMove)
        monsters.forEach(m => { if (m.alive) m.lastMove = tick + 120; });
        setMsg("FREEZE! Monsters frozen solid!");
      } else if (type === "shield") {
        player.armor = Math.min(5, player.armor + 3);
        setMsg("SHIELD! +3 armor!");
      } else if (type === "heal") {
        player.lives = Math.min(5, player.lives + 2);
        setMsg("HEAL! +2 lives!");
      } else if (type === "lightning") {
        const alive = monsters.filter(m => m.alive);
        if (alive.length > 0) {
          const target = alive[Math.floor(Math.random() * alive.length)];
          target.hp -= 80; target.flash = 15; playSquish();
          if (target.hp <= 0) { target.alive = false; spawnSmoke(target.x * S + S / 2, target.y * S + S / 2); score += 200 * level; }
          setMsg(`LIGHTNING strikes ${target.name}!`);
        }
      } else if (type === "invisibility") {
        // Spy gear: monsters can't attack for 120 ticks
        monsters.forEach(m => { if (m.alive) m.lastMove = tick + 120; });
        player.armor = Math.min(5, player.armor + 2);
        setMsg("\uD83D\uDD76\uFE0F SPY INVISIBILITY! Monsters can't see you!");
      } else if (type === "xray") {
        // Spy gear: reveals and damages all monsters
        monsters.forEach(m => {
          if (m.alive) { m.hp -= 30; m.flash = 10; if (m.hp <= 0) { m.alive = false; spawnSmoke(m.x * S + S / 2, m.y * S + S / 2); score += 200 * level; } }
        });
        setMsg("\uD83D\uDCE1 SPY X-RAY! All monsters exposed and damaged!");
      } else if (type === "superstrength") {
        // Superpower: destroy all adjacent monsters instantly
        let kills = 0;
        monsters.forEach(m => {
          if (m.alive && Math.abs(m.x - player.x) <= 2 && Math.abs(m.y - player.y) <= 2) {
            m.alive = false; m.flash = 15; spawnSmoke(m.x * S + S / 2, m.y * S + S / 2); score += 200 * level; kills++;
          }
        });
        setMsg(`\uD83D\uDCAA SUPER STRENGTH! Smashed ${kills} monsters!`);
      }
      if (player.magicUses <= 0) player.magic = null;
      updH();
    }

    function movePlayer(dx: number, dy: number) {
      if (gameState !== "playing") return;
      const nx = player.x + dx, ny = player.y + dy;
      if (nx < 0 || nx >= C || ny < 0 || ny >= R) return;
      if (map[ny][nx] === 1) return;
      if (dx > 0) player.facing = "right";
      if (dx < 0) player.facing = "left";
      if (dy < 0) player.facing = "up";
      if (dy > 0) player.facing = "down";
      if (monsters.find(m => m.alive && m.x === nx && m.y === ny)) { setMsg("Monster blocking! Press F to fight!"); return; }
      // Push current position to pet trail before moving (pet follows 2 steps behind)
      petTrail.push({ x: player.x, y: player.y });
      if (petTrail.length > 24) petTrail.shift();
      player.x = nx; player.y = ny;
      playWalk();
      // Check pickups
      const pickup = pickups.find(p => !p.taken && p.x === nx && p.y === ny);
      if (pickup) {
        pickup.taken = true;
        if (pickup.type === "food") {
          player.lives = Math.min(5, player.lives + 1); score += 50;
          setMsg("Found food! +1 life!");
        } else if (pickup.type === "weapon") {
          // Give next weapon upgrade
          const curIdx = WEAPONS.findIndex(w => w.id === player.weapon?.id);
          const next = WEAPONS[Math.min(curIdx + 1, WEAPONS.length - 1)];
          player.weapon = next; score += 100;
          setMsg(`Found ${next.name}! ${next.dmg} damage!`);
        } else if (pickup.type === "magic") {
          const types = ["fireball", "freeze", "shield", "heal", "lightning", "invisibility", "xray", "superstrength"];
          player.magic = types[Math.floor(Math.random() * types.length)];
          player.magicUses = 1 + Math.floor(level / 3);
          score += 75;
          setMsg(`Found ${player.magic} magic! Press M to use!`);
        } else if (pickup.type === "armor") {
          player.armor = Math.min(5, player.armor + 2); score += 75;
          setMsg(`Found armor! Shield: ${player.armor}`);
        } else if (pickup.type === "arrows") {
          player.arrows += 3; score += 50;
          setMsg(`Found arrows! +3 arrows! (${player.arrows} total)`);
        } else if (pickup.type === "water") {
          player.thirst = Math.min(100, player.thirst + 40); score += 30;
          setMsg(`Drank water! Thirst restored! (${Math.round(player.thirst)}%)`);
        }
        updH();
      }
      // Check portal — enter the portal world!
      const portal = portals.find(p => !p.taken && p.x === nx && p.y === ny);
      if (portal) {
        portal.taken = true;
        enterPortalWorld(portal);
        return;
      }
      // Check chicken!
      if (nx === chicken.x && ny === chicken.y) {
        chickensCollected++;
        score += 1000 * level;
        updH();
        if (level >= 10) {
          gameState = "victory";
        } else {
          gameState = "levelComplete";
          levelTimer = 180;
        }
        return;
      }
      // Tips
      const alive = monsters.filter(m => m.alive).length;
      if (!pickup && !portal) {
        const tips = ["Find the Golden Dog!", `${alive} monsters lurking...`, "F=Fight  M=Magic", "Pick up items along the way!"];
        setMsg(tips[Math.floor(tick / 60) % tips.length]);
      }
    }

    // ============ INPUT ============
    document.addEventListener("keydown", e => {
      // Intro: any key starts the game (also first chance to start music — user gesture required)
      if (gameState === "intro") {
        startMusic();
        gameState = "playing";
        startLevel(1);
        return;
      }
      // Pause toggle
      if (e.key === "p" || e.key === "P") {
        if (gameState === "playing") { gameState = "paused"; return; }
        if (gameState === "paused") { gameState = "playing"; return; }
      }
      if (gameState === "paused") return;
      if (gameState === "miniGame") {
        // Hat Shuffle is click-only; if already done, any key dismisses early
        if (miniGame && miniGame.phase === "done") { miniGame = null; gameState = "playing"; return; }
        return;
      }
      if (gameState === "portalTravel") return;
      if (gameState === "gameOver" || gameState === "victory") {
        score = 0; chickensCollected = 0; player.lives = 5; player.weapon = WEAPONS[0]; player.magic = null; player.magicUses = 0; player.arrows = 3; player.thirst = 100;
        gameState = "intro"; introScroll = 0;
        return;
      }
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (moves[e.key]) { e.preventDefault(); movePlayer(...moves[e.key]); }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); fight(); }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); useMagic(); }
    });
    // Bind both click and touchstart for instant mobile response
    function bindPress(id: string, handler: () => void) {
      const el = document.getElementById(id)!;
      el.onclick = (e) => { e.preventDefault(); handler(); };
      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        // Unlock audio on first touch (iOS gesture requirement)
        startMusic();
        handler();
      }, { passive: false });
    }
    // Intro: any button press also advances past the intro
    function maybeLeaveIntro() {
      if (gameState === "intro") {
        startMusic();
        gameState = "playing";
        startLevel(1);
      }
    }
    // We want the intro to end on ANY button press too — wrap handlers
    const wrap = (fn: () => void) => () => { maybeLeaveIntro(); fn(); };
    bindPress("bu", wrap(() => movePlayer(0, -1)));
    bindPress("bd", wrap(() => movePlayer(0, 1)));
    bindPress("bl", wrap(() => movePlayer(-1, 0)));
    bindPress("br", wrap(() => movePlayer(1, 0)));
    bindPress("bf", wrap(fight));
    bindPress("bm", wrap(useMagic));
    bindPress("bpause", () => {
      if (gameState === "playing") gameState = "paused";
      else if (gameState === "paused") gameState = "playing";
    });
    const muteBtn = document.getElementById("bmute")!;
    bindPress("bmute", () => {
      muted = !muted;
      muteBtn.textContent = muted ? "\uD83D\uDD07 Muted" : "\uD83D\uDD0A Sound";
      if (muted) {
        stopMusic();
        if (musicGain) musicGain.gain.value = 0;
      } else {
        if (musicGain) musicGain.gain.value = 0.10;
        if (!musicStarted) startMusic();
      }
    });
    // Canvas tap: dismiss intro / handle mini-game (existing click listener already wired)
    CV.addEventListener("touchstart", (e) => {
      if (gameState === "intro") {
        e.preventDefault();
        startMusic();
        gameState = "playing";
        startLevel(1);
      }
    }, { passive: false });

    render();
    setMsg("Press any key to begin your quest!");
  }, []);

  return (
    <div id="game-wrap">
      <div id="gw" ref={cwrapRef} style={{ position: "relative" }}>
        <div id="top">
          <h2>{"🏰 HUDSON'S EPIC QUEST"}</h2>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <div className="stat"><span id="hrt">{"❤️❤️❤️❤️❤️"}</span></div>
            <div className="stat">{"⭐ "}<span id="sc">0</span></div>
            <div className="stat" style={{ color: "#ffcc00" }} id="chickenbar">{"🐕 0/10"}</div>
            <div className="lvl-badge" id="lb">LV 1</div>
          </div>
        </div>
        <div id="mid">
          <canvas id="gc" width={560} height={400}></canvas>
        </div>
        <div id="hud">
          <div id="msg">Tap a button or press any key to begin!</div>
          <div id="controls">
            <div id="dpad">
              <button className="dbtn dbtn-up" id="bu" aria-label="Up">{"↑"}</button>
              <button className="dbtn dbtn-left" id="bl" aria-label="Left">{"←"}</button>
              <button className="dbtn dbtn-down" id="bd" aria-label="Down">{"↓"}</button>
              <button className="dbtn dbtn-right" id="br" aria-label="Right">{"→"}</button>
            </div>
            <div id="actions">
              <button className="abtn abtn-fight" id="bf">{"⚔ FIGHT"}</button>
              <button className="abtn abtn-magic" id="bm">{"🪄 MAGIC"}</button>
            </div>
          </div>
          <div id="sys-row">
            <button className="sysbtn" id="bpause">{"⏸ Pause"}</button>
            <button className="sysbtn" id="bmute">{"🔊 Sound"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
