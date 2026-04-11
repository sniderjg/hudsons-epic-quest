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
    const S = 56, C = 10, R = 7;
    let tick = 0;

    // ============ GAME STATE ============
    type GameState = "playing" | "levelComplete" | "gameOver" | "victory";
    let gameState: GameState = "playing";
    let level = 1;
    let score = 0;
    let lives = 5;
    let levelTimer = 0;

    // ============ TYPES ============
    interface Monster {
      id: number; name: string; shape: string; col: string; eye: string;
      hp: number; maxhp: number; x: number; y: number; alive: boolean; flash: number;
      reward: Record<string, number>;
    }
    interface Animal {
      id: number; name: string; type: string; x: number; y: number;
      isPet?: boolean; adopted?: boolean;
    }
    interface Weapon { id: string; name: string; dmg: number; icon: string; col: string; }
    interface Block { id: string; icon: string; color: string; top: string; side: string; label: string; }
    interface Quest { q: string; ch: string[]; rewards: Record<string, { blocks?: Record<string, number>; weapon?: string; heal?: number; score?: number }>; }

    // ============ CONSTANTS ============
    const BLOCKS: Block[] = [
      { id: "stone", icon: "\uD83E\uDEA8", color: "#888", top: "#aaa", side: "#555", label: "Stone" },
      { id: "wood", icon: "\uD83D\uDFEB", color: "#7a3010", top: "#9a4020", side: "#5a1a06", label: "Wood" },
      { id: "gold", icon: "\uD83D\uDFE1", color: "#c49010", top: "#e5b530", side: "#906808", label: "Gold" },
      { id: "castle", icon: "\uD83C\uDFF0", color: "#999", top: "#bbb", side: "#666", label: "Castle" },
    ];
    const WEAPONS: Weapon[] = [
      { id: "sw", name: "Fire Sword", dmg: 15, icon: "\uD83D\uDDE1", col: "#ff6600" },
      { id: "ax", name: "War Axe", dmg: 28, icon: "\u2694", col: "#aaaaff" },
      { id: "bw", name: "Magic Bow", dmg: 42, icon: "\uD83C\uDFF9", col: "#00ffaa" },
      { id: "cn", name: "DEATH CANNON", dmg: 75, icon: "\uD83D\uDCA5", col: "#ff00ff" },
      { id: "ds", name: "Dragon Slayer", dmg: 100, icon: "\u2694\uFE0F", col: "#ff0000" },
    ];

    // ============ QUEST SYSTEM (No Math!) ============
    const ALL_QUESTS: Quest[] = [
      { q: "A mysterious chest! What do you do?", ch: ["Open it!", "Kick it!", "Sniff it!", "Sit on it!"], rewards: { "Open it!": { blocks: { gold: 3 }, score: 100 }, "Kick it!": { weapon: "sw", score: 50 }, "Sniff it!": { heal: 1, score: 50 }, "Sit on it!": { blocks: { stone: 5 }, score: 75 } } },
      { q: "A goblin offers you a trade! Pick one:", ch: ["Shiny Sword", "Magic Shield", "Speed Boots", "Gold Bag"], rewards: { "Shiny Sword": { weapon: "ax", score: 100 }, "Magic Shield": { heal: 2, score: 100 }, "Speed Boots": { score: 200 }, "Gold Bag": { blocks: { gold: 5 }, score: 150 } } },
      { q: "You found a magic fountain! Drink from it?", ch: ["Drink deep!", "Splash face", "Fill bottle", "Throw coin in"], rewards: { "Drink deep!": { heal: 2, score: 100 }, "Splash face": { score: 150 }, "Fill bottle": { weapon: "bw", score: 100 }, "Throw coin in": { blocks: { gold: 4, castle: 2 }, score: 200 } } },
      { q: "An old wizard asks: Pick your reward!", ch: ["Power Up!", "Treasure!", "New Weapon!", "Extra Life!"], rewards: { "Power Up!": { weapon: "cn", score: 200 }, "Treasure!": { blocks: { gold: 6, castle: 3 }, score: 150 }, "New Weapon!": { weapon: "bw", score: 100 }, "Extra Life!": { heal: 3, score: 100 } } },
      { q: "A dragon egg is glowing! What do you do?", ch: ["Hatch it!", "Keep it warm", "Trade it", "Guard it"], rewards: { "Hatch it!": { weapon: "ds", score: 300 }, "Keep it warm": { heal: 2, score: 200 }, "Trade it": { blocks: { gold: 8 }, score: 250 }, "Guard it": { score: 400 } } },
      { q: "The blacksmith says: I'll forge you something!", ch: ["Fire Sword!", "War Axe!", "Magic Bow!", "CANNON!"], rewards: { "Fire Sword!": { weapon: "sw", score: 100 }, "War Axe!": { weapon: "ax", score: 100 }, "Magic Bow!": { weapon: "bw", score: 100 }, "CANNON!": { weapon: "cn", score: 100 } } },
      { q: "You discover a hidden room! Search it?", ch: ["Search high", "Search low", "Break wall", "Read scroll"], rewards: { "Search high": { blocks: { castle: 4 }, score: 100 }, "Search low": { blocks: { gold: 3, wood: 3 }, score: 100 }, "Break wall": { weapon: "ax", score: 150 }, "Read scroll": { heal: 2, weapon: "bw", score: 200 } } },
      { q: "A friendly ghost appears! It offers help:", ch: ["Show secrets", "Give power", "Heal wounds", "Share gold"], rewards: { "Show secrets": { score: 300 }, "Give power": { weapon: "ds", score: 100 }, "Heal wounds": { heal: 3, score: 100 }, "Share gold": { blocks: { gold: 6 }, score: 100 } } },
      { q: "You won the arena battle! Pick a prize:", ch: ["Champion Belt", "Gold Trophy", "Magic Ring", "Royal Sword"], rewards: { "Champion Belt": { heal: 2, score: 200 }, "Gold Trophy": { blocks: { gold: 5, castle: 3 }, score: 300 }, "Magic Ring": { score: 500 }, "Royal Sword": { weapon: "ds", score: 200 } } },
      { q: "A merchant has rare items! Buy one:", ch: ["Healing Potion", "Bomb Bag", "Magic Wand", "Full Armor"], rewards: { "Healing Potion": { heal: 3, score: 50 }, "Bomb Bag": { weapon: "cn", score: 100 }, "Magic Wand": { weapon: "bw", score: 100 }, "Full Armor": { heal: 2, blocks: { castle: 4 }, score: 150 } } },
      { q: "You fell into a trap! How do you escape?", ch: ["Dig out!", "Climb up!", "Yell HELP!", "Use magic!"], rewards: { "Dig out!": { blocks: { stone: 4 }, score: 100 }, "Climb up!": { score: 200 }, "Yell HELP!": { heal: 1, score: 100 }, "Use magic!": { weapon: "bw", score: 150 } } },
      { q: "The king's messenger brings a gift!", ch: ["Royal Blade", "Gold Chest", "Magic Armor", "Healing Elixir"], rewards: { "Royal Blade": { weapon: "ds", score: 200 }, "Gold Chest": { blocks: { gold: 8, castle: 4 }, score: 200 }, "Magic Armor": { blocks: { castle: 6 }, score: 200 }, "Healing Elixir": { heal: 3, score: 200 } } },
    ];

    // ============ LEVEL MAPS ============
    function makeMap(lv: number): number[][] {
      // Base maps that get harder. 0=grass, 1=tree, 2=water, 3=path, 5=quest, 6=sand, 7=gate, 8=tower, 9=wall
      const baseMaps: number[][][] = [
        // Level 1-2: Open and easy
        [[9,9,8,9,6,3,3,6,9,8,9],[9,5,0,0,6,0,0,6,0,5,0],[9,0,7,0,3,0,0,3,0,7,0],[9,0,0,5,3,0,0,3,5,0,0],[6,0,3,3,0,0,0,0,3,3,0],[9,5,3,0,7,0,0,7,0,3,5],[9,8,9,9,9,6,6,9,9,9,8]],
        [[9,8,9,9,6,3,3,6,9,8,9],[9,0,0,5,0,0,0,0,5,0,0],[0,5,7,0,3,0,0,3,0,7,5],[9,0,0,3,3,0,0,3,3,0,0],[6,0,3,5,0,0,0,0,5,3,0],[0,5,3,0,7,0,0,7,0,3,5],[9,8,9,9,9,6,6,9,9,9,8]],
        // Level 3-4: More complex
        [[9,9,8,9,2,3,3,2,9,8,9],[9,5,0,2,0,0,0,0,2,5,0],[0,0,7,0,5,0,0,5,0,7,0],[9,5,1,3,3,0,0,3,3,1,5],[6,0,3,5,0,0,0,0,5,3,0],[0,5,3,0,7,0,0,7,0,3,5],[9,8,9,9,9,6,6,9,9,9,8]],
        [[9,8,9,2,6,3,3,6,2,8,9],[0,5,0,2,0,0,0,0,2,5,0],[9,0,7,0,5,0,0,5,0,7,0],[0,5,1,3,3,0,0,3,3,1,5],[6,0,5,3,0,0,0,0,3,5,0],[0,5,3,0,7,0,0,7,0,3,5],[9,8,9,9,9,2,2,9,9,9,8]],
        // Level 5-6: Dangerous
        [[9,9,8,9,2,2,2,2,9,8,9],[9,5,0,0,2,0,0,2,0,5,0],[0,0,7,5,3,0,0,3,5,7,0],[9,5,1,3,3,0,0,3,3,1,5],[2,0,5,3,0,0,0,0,3,5,2],[0,5,3,0,7,0,0,7,0,3,5],[9,8,9,9,9,6,6,9,9,9,8]],
        [[8,9,8,9,2,3,3,2,9,8,8],[0,5,0,0,0,0,0,0,0,5,0],[9,0,7,5,3,0,0,3,5,7,0],[0,5,0,3,3,0,0,3,3,0,5],[6,0,5,3,0,0,0,0,3,5,0],[0,5,3,5,7,0,0,7,5,3,5],[9,8,9,9,9,2,2,9,9,9,8]],
        // Level 7-8: Hard
        [[8,8,8,9,2,2,2,2,9,8,8],[0,5,0,0,2,0,0,2,0,5,0],[9,0,7,5,0,0,0,0,5,7,0],[0,5,1,3,5,0,0,5,3,1,5],[2,0,5,3,0,0,0,0,3,5,2],[0,5,3,5,7,0,0,7,5,3,5],[8,8,9,9,9,6,6,9,9,8,8]],
        [[8,8,8,2,2,3,3,2,2,8,8],[0,5,0,2,0,0,0,0,2,5,0],[0,5,7,0,5,0,0,5,0,7,5],[0,5,0,5,3,0,0,3,5,0,5],[2,0,5,3,0,0,0,0,3,5,2],[0,5,3,5,7,0,0,7,5,3,5],[8,8,9,9,9,2,2,9,9,8,8]],
        // Level 9-10: Epic
        [[8,8,8,2,2,2,2,2,2,8,8],[0,5,0,2,5,0,0,5,2,5,0],[0,5,7,0,0,0,0,0,0,7,5],[0,5,0,5,5,0,0,5,5,0,5],[2,0,5,3,0,0,0,0,3,5,2],[0,5,3,5,7,0,0,7,5,3,5],[8,8,8,9,9,2,2,9,9,8,8]],
        [[8,8,8,2,2,2,2,2,2,8,8],[5,5,0,2,5,0,0,5,2,5,5],[0,5,7,5,0,0,0,0,5,7,5],[5,5,0,5,5,0,0,5,5,0,5],[2,5,5,3,0,0,0,0,3,5,2],[5,5,3,5,7,0,0,7,5,3,5],[8,8,8,8,8,2,2,8,8,8,8]],
      ];
      const idx = Math.min(lv - 1, baseMaps.length - 1);
      return baseMaps[idx].map(row => [...row]);
    }

    // ============ MONSTER TEMPLATES PER LEVEL ============
    const MONSTER_TEMPLATES: { name: string; shape: string; col: string; eye: string; hp: number }[] = [
      { name: "Skeleton", shape: "bone", col: "#ffffaa", eye: "#ff00ff", hp: 12 },
      { name: "Zombie", shape: "wraith", col: "#55aa55", eye: "#ff0000", hp: 18 },
      { name: "Goblin", shape: "troll", col: "#44aa44", eye: "#ffff00", hp: 15 },
      { name: "Troll", shape: "troll", col: "#aa6633", eye: "#ffffff", hp: 30 },
      { name: "Ogre", shape: "giant", col: "#88aa44", eye: "#ff0000", hp: 45 },
      { name: "Shadow Wraith", shape: "wraith", col: "#9900ff", eye: "#ffffff", hp: 20 },
      { name: "Fire Demon", shape: "demon", col: "#ff2200", eye: "#ffff00", hp: 35 },
      { name: "Dark Knight", shape: "lord", col: "#333366", eye: "#ff0000", hp: 50 },
      { name: "Ice Giant", shape: "giant", col: "#00ccff", eye: "#ff0000", hp: 55 },
      { name: "Dragon", shape: "eagle", col: "#ff4400", eye: "#ffff00", hp: 80 },
      { name: "Bone King", shape: "bone", col: "#ffffcc", eye: "#ff00ff", hp: 65 },
      { name: "Lava Troll", shape: "troll", col: "#ff6600", eye: "#ffffff", hp: 40 },
      { name: "Storm Eagle", shape: "eagle", col: "#4488ff", eye: "#ffff00", hp: 25 },
      { name: "DARK LORD", shape: "lord", col: "#ff00aa", eye: "#00ffff", hp: 120 },
      { name: "DRAGON KING", shape: "eagle", col: "#ff0000", eye: "#ffff00", hp: 150 },
    ];

    function makeMonstersForLevel(lv: number): Monster[] {
      const count = 3 + lv * 2; // 5, 7, 9, 11...
      const hpMult = 1 + (lv - 1) * 0.3;
      const spots = [[1,1],[8,1],[1,5],[8,5],[5,1],[2,6],[7,6],[3,3],[7,3],[0,3],[9,3],[4,1],[6,1],[4,6],[6,6]];
      const ms: Monster[] = [];
      for (let i = 0; i < Math.min(count, spots.length); i++) {
        const tIdx = Math.min(i + Math.floor((lv - 1) * 1.2), MONSTER_TEMPLATES.length - 1);
        const t = MONSTER_TEMPLATES[tIdx];
        const hp = Math.floor(t.hp * hpMult);
        ms.push({ id: i, name: t.name, shape: t.shape, col: t.col, eye: t.eye, hp, maxhp: hp, x: spots[i][0], y: spots[i][1], alive: true, flash: 0, reward: { gold: lv + 1, stone: Math.floor(lv / 2) } });
      }
      return ms;
    }

    // ============ PET ANIMAL TEMPLATES ============
    const PET_TYPES = [
      { name: "Kitty", type: "cat" }, { name: "Buddy", type: "dog" },
      { name: "Ribbit", type: "frog" }, { name: "Tweety", type: "bird" },
    ];
    const RIDE_TYPES = [
      { name: "Bear", type: "bear" }, { name: "Wolf", type: "wolf" },
      { name: "Fox", type: "fox" }, { name: "Deer", type: "deer" },
    ];

    function makeAnimalsForLevel(lv: number): Animal[] {
      const anims: Animal[] = [];
      let id = 0;
      // 1-2 rideable animals per level
      const rideSpots = [[1,3],[8,3],[0,6],[9,6]];
      const rideCount = Math.min(2 + Math.floor(lv / 3), 4);
      for (let i = 0; i < rideCount; i++) {
        const t = RIDE_TYPES[i % RIDE_TYPES.length];
        anims.push({ id: id++, name: t.name, type: t.type, x: rideSpots[i][0], y: rideSpots[i][1], isPet: false });
      }
      // 1-2 pets per level
      const petSpots = [[3,1],[6,1],[3,5],[6,5]];
      const petCount = Math.min(1 + Math.floor(lv / 2), 4);
      for (let i = 0; i < petCount; i++) {
        const t = PET_TYPES[(i + lv) % PET_TYPES.length];
        anims.push({ id: id++, name: t.name, type: t.type, x: petSpots[i][0], y: petSpots[i][1], isPet: true });
      }
      return anims;
    }

    // ============ MUTABLE GAME DATA ============
    let map: number[][] = makeMap(1);
    let player = { x: 5, y: 3 };
    let inv: Record<string, number> = { stone: 0, wood: 0, gold: 0, castle: 0 };
    let weapons: Weapon[] = [];
    let eqW: Weapon | null = null;
    let selB: string | null = null;
    let monsters: Monster[] = makeMonstersForLevel(1);
    let animals: Animal[] = makeAnimalsForLevel(1);
    let solved = new Set<number>();
    let aPuz: { idx: number; q: Quest } | null = null;
    let bMap: (Block | null)[][] = Array.from({ length: R }, () => Array(C).fill(null));
    let riding: Animal | null = null;
    let pets: Animal[] = [];
    let questCounter = 0;

    // ============ LEVEL MANAGEMENT ============
    function startLevel(lv: number) {
      level = lv;
      map = makeMap(lv);
      player = { x: 5, y: 3 };
      monsters = makeMonstersForLevel(lv);
      animals = makeAnimalsForLevel(lv);
      solved = new Set<number>();
      bMap = Array.from({ length: R }, () => Array(C).fill(null));
      riding = null;
      // Keep inventory, weapons, pets, and score between levels
      gameState = "playing";
      updH(); updS();
      setMsg(`LEVEL ${lv}! Defeat all monsters and find the gate!`);
    }

    function checkLevelComplete() {
      if (monsters.every(m => !m.alive)) {
        if (level >= 10) {
          gameState = "victory";
        } else {
          gameState = "levelComplete";
          levelTimer = 180; // 3 seconds at 60fps
        }
      }
    }

    // ============ TILE DRAWING ============
    function dt(x: number, y: number, t: number) {
      const px = x * S, py = y * S;
      if (t === 0) {
        X.fillStyle = "#2d6e20"; X.fillRect(px, py, S, S);
        X.fillStyle = "#3a8a28";
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) X.fillRect(px + 4 + i * 18, py + 4 + j * 18, 14, 14);
      } else if (t === 1) {
        X.fillStyle = "#1a3a10"; X.fillRect(px, py, S, S);
        X.fillStyle = "#3a8820"; X.beginPath(); X.arc(px + 28, py + 20, 18, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#4aaa28"; X.beginPath(); X.arc(px + 20, py + 24, 13, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#2a5510"; X.fillRect(px + 22, py + 36, 12, 18);
      } else if (t === 2) {
        X.fillStyle = "#0d3d9a"; X.fillRect(px, py, S, S);
        const w = Math.sin(tick / 20 + x) * 3;
        X.fillStyle = "#1a55cc"; X.fillRect(px, py + 12 + w, S, 16);
        X.fillStyle = "rgba(100,180,255,0.3)"; X.fillRect(px + 4, py + 14 + w, S - 8, 6);
      } else if (t === 3) {
        X.fillStyle = "#8a7050"; X.fillRect(px, py, S, S);
        X.fillStyle = "#aa9060"; X.fillRect(px + 2, py + 2, S - 4, S - 4);
      } else if (t === 5) {
        // GLOWING QUEST TILE
        X.fillStyle = "#8a7050"; X.fillRect(px, py, S, S);
        X.fillStyle = "#aa9060"; X.fillRect(px + 2, py + 2, S - 4, S - 4);
        const g = 0.6 + Math.sin(tick / 8) * 0.4;
        const pulse = Math.sin(tick / 12) * 6;
        X.save();
        X.shadowColor = "#ffff00"; X.shadowBlur = 20 + pulse;
        X.fillStyle = `rgba(255,220,0,${g})`; X.fillRect(px + 4, py + 4, S - 8, S - 8);
        X.restore();
        X.fillStyle = `rgba(255,240,50,${0.7 + Math.sin(tick / 6) * 0.3})`;
        X.fillRect(px + 6, py + 6, S - 12, S - 12);
        X.save(); X.shadowColor = "#ffff00"; X.shadowBlur = 15;
        X.fillStyle = "#ff0000"; X.font = "bold 32px monospace"; X.textAlign = "center";
        X.fillText("?", px + S / 2, py + S / 2 + 12);
        X.restore(); X.textAlign = "left";
        for (let i = 0; i < 4; i++) {
          const sx = px + 10 + Math.sin(tick / 10 + i * 1.5) * 16;
          const sy = py + 10 + Math.cos(tick / 8 + i * 2) * 14;
          X.fillStyle = `rgba(255,255,100,${0.5 + Math.sin(tick / 5 + i) * 0.5})`;
          X.beginPath(); X.arc(sx, sy, 2, 0, Math.PI * 2); X.fill();
        }
      } else if (t === 6) {
        X.fillStyle = "#c8a030"; X.fillRect(px, py, S, S);
        X.fillStyle = "#e0b840"; X.fillRect(px + 2, py + 2, S - 4, S - 4);
      } else if (t === 7) {
        const gateOpen = monsters.every(m => !m.alive);
        X.fillStyle = gateOpen ? "#1a5a10" : "#5a1010"; X.fillRect(px, py, S, S);
        X.fillStyle = gateOpen ? "#2a8a20" : "#8a2020"; X.fillRect(px + 4, py + 4, S - 8, S - 8);
        X.font = "28px monospace"; X.textAlign = "center";
        X.fillStyle = gateOpen ? "#ffff00" : "#ffcc00";
        X.fillText(gateOpen ? "\u2605" : "\uD83D\uDD12", px + S / 2, py + S / 2 + 10); X.textAlign = "left";
        if (gateOpen) {
          X.save(); X.shadowColor = "#ffff00"; X.shadowBlur = 10 + Math.sin(tick / 8) * 5;
          X.strokeStyle = "#ffff00"; X.lineWidth = 2; X.strokeRect(px + 2, py + 2, S - 4, S - 4);
          X.restore();
        }
      } else if (t === 8) {
        X.fillStyle = "#999999"; X.fillRect(px, py, S, S);
        X.fillStyle = "#bbbbbb"; X.fillRect(px + 2, py + 2, S - 4, S - 4);
        X.fillStyle = "#888"; X.fillRect(px + 6, py + 6, 14, 16); X.fillRect(px + S - 20, py + 6, 14, 16);
      } else if (t === 9) {
        X.fillStyle = "#888888"; X.fillRect(px, py, S, S);
        X.fillStyle = "#aaaaaa"; X.fillRect(px + 2, py + 2, S - 4, S - 4);
        for (let i = 0; i < 3; i++) { X.fillStyle = "#666"; X.fillRect(px + 4 + i * 16, py + 2, 12, 8); }
        const fl = 0.6 + Math.sin(tick / 6 + x) * 0.4;
        X.fillStyle = `rgba(255,150,0,${fl})`; X.beginPath(); X.arc(px + S / 2, py + S / 2, 8, 0, Math.PI * 2); X.fill();
        X.fillStyle = "rgba(255,220,0,0.8)"; X.beginPath(); X.arc(px + S / 2, py + S / 2, 4, 0, Math.PI * 2); X.fill();
      }
    }

    // ============ ANIMAL DRAWING ============
    function drawAnimal(a: Animal) {
      if (a.adopted) {
        // Draw adopted pets following Hudson
        const petIdx = pets.indexOf(a);
        if (petIdx < 0) return;
        const followDist = petIdx + 1;
        const fpx = player.x * S + (Math.sin(tick / 20 + petIdx * 2) * followDist * 8);
        const fpy = player.y * S + 10 + petIdx * 6;
        drawSmallPet(a, fpx, fpy);
        return;
      }
      const px = a.x * S, py = a.y * S;
      const b = Math.sin(tick / 18 + a.id * 1.2) * 4;
      X.save();
      if (a.type === "bear") {
        X.fillStyle = "#8b4513";
        X.beginPath(); X.arc(px + 28, py + 30 + b, 16, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 18 + b, 13, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 17, py + 12 + b, 8, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 39, py + 12 + b, 8, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 22, py + 16 + b, 4, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 34, py + 16 + b, 4, 0, Math.PI * 2); X.fill();
      } else if (a.type === "wolf") {
        X.fillStyle = "#ccccee";
        X.beginPath(); X.arc(px + 28, py + 30 + b, 14, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 18 + b, 12, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.moveTo(px + 18, py + 10 + b); X.lineTo(px + 14, py + 2 + b); X.lineTo(px + 22, py + 10 + b); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 38, py + 10 + b); X.lineTo(px + 42, py + 2 + b); X.lineTo(px + 34, py + 10 + b); X.closePath(); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 22, py + 17 + b, 3, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 34, py + 17 + b, 3, 0, Math.PI * 2); X.fill();
      } else if (a.type === "fox") {
        X.fillStyle = "#ee7700";
        X.beginPath(); X.arc(px + 28, py + 30 + b, 13, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 18 + b, 11, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 22, py + 17 + b, 3, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 34, py + 17 + b, 3, 0, Math.PI * 2); X.fill();
      } else if (a.type === "deer") {
        X.fillStyle = "#aa7733";
        X.beginPath(); X.arc(px + 28, py + 32 + b, 12, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 20 + b, 10, 0, Math.PI * 2); X.fill();
        X.strokeStyle = "#885522"; X.lineWidth = 3;
        X.beginPath(); X.moveTo(px + 20, py + 13 + b); X.lineTo(px + 14, py + 4 + b); X.stroke();
        X.beginPath(); X.moveTo(px + 36, py + 13 + b); X.lineTo(px + 42, py + 4 + b); X.stroke();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 22, py + 19 + b, 3, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 34, py + 19 + b, 3, 0, Math.PI * 2); X.fill();
      } else if (a.type === "cat") {
        X.fillStyle = "#ff9933";
        X.beginPath(); X.arc(px + 28, py + 34 + b, 10, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 22 + b, 9, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.moveTo(px + 19, py + 16 + b); X.lineTo(px + 16, py + 8 + b); X.lineTo(px + 24, py + 16 + b); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 37, py + 16 + b); X.lineTo(px + 40, py + 8 + b); X.lineTo(px + 32, py + 16 + b); X.closePath(); X.fill();
        X.fillStyle = "#22cc22"; X.beginPath(); X.arc(px + 23, py + 21 + b, 3, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 33, py + 21 + b, 3, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#ff6699"; X.beginPath(); X.arc(px + 28, py + 25 + b, 2, 0, Math.PI * 2); X.fill();
      } else if (a.type === "dog") {
        X.fillStyle = "#cc8844";
        X.beginPath(); X.arc(px + 28, py + 34 + b, 11, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 22 + b, 10, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#996633";
        X.beginPath(); X.arc(px + 16, py + 24 + b, 6, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 40, py + 24 + b, 6, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 23, py + 20 + b, 3, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 33, py + 20 + b, 3, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#ff5577"; X.beginPath(); X.arc(px + 28, py + 30 + b, 3, 0, Math.PI); X.fill();
      } else if (a.type === "frog") {
        X.fillStyle = "#33cc33";
        X.beginPath(); X.arc(px + 28, py + 34 + b, 12, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#44ee44";
        X.beginPath(); X.arc(px + 20, py + 22 + b, 8, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 36, py + 22 + b, 8, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 20, py + 22 + b, 4, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 36, py + 22 + b, 4, 0, Math.PI * 2); X.fill();
      } else if (a.type === "bird") {
        const wf = Math.sin(tick / 4 + a.id) * 8;
        X.fillStyle = "#ff4466";
        X.beginPath(); X.moveTo(px + 28, py + 28 + b); X.lineTo(px + 6, py + 20 - wf + b); X.lineTo(px + 14, py + 30 + b); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 28, py + 28 + b); X.lineTo(px + 50, py + 20 - wf + b); X.lineTo(px + 42, py + 30 + b); X.closePath(); X.fill();
        X.fillStyle = "#ff6688";
        X.beginPath(); X.arc(px + 28, py + 28 + b, 10, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 20 + b, 8, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 24, py + 18 + b, 2, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 32, py + 18 + b, 2, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#ffaa00";
        X.beginPath(); X.moveTo(px + 28, py + 22 + b); X.lineTo(px + 24, py + 26 + b); X.lineTo(px + 32, py + 26 + b); X.closePath(); X.fill();
      }
      X.fillStyle = a.isPet ? "#ff66aa" : "#ffcc00";
      X.font = "bold 10px monospace"; X.textAlign = "center";
      X.fillText(a.isPet ? "\u2764 " + a.name : a.name, px + S / 2, py + S - 2 + b);
      X.textAlign = "left";
      X.restore();
    }

    function drawSmallPet(a: Animal, px: number, py: number) {
      X.save();
      const emojis: Record<string, string> = { cat: "\uD83D\uDC31", dog: "\uD83D\uDC36", frog: "\uD83D\uDC38", bird: "\uD83D\uDC26" };
      X.font = "16px monospace";
      X.fillText(emojis[a.type] || "\u2764", px, py + 16);
      X.restore();
    }

    // ============ MONSTER DRAWING ============
    function drawMonster(m: Monster) {
      if (!m.alive) return;
      const px = m.x * S, py = m.y * S;
      const col = m.flash > 0 ? "#ffffff" : m.col;
      X.save();
      if (m.shape === "wraith") {
        for (let i = 0; i < 5; i++) { X.fillStyle = col + "88"; X.beginPath(); X.arc(px + 8 + i * 10, py + 40 + Math.sin(tick / 7 + i) * 5, 5, 0, Math.PI * 2); X.fill(); }
        X.fillStyle = col; X.beginPath(); X.arc(px + 28, py + 22, 18, 0, Math.PI * 2); X.fill();
        X.shadowColor = col; X.shadowBlur = 16; X.strokeStyle = col; X.lineWidth = 2; X.beginPath(); X.arc(px + 28, py + 22, 20, 0, Math.PI * 2); X.stroke(); X.shadowBlur = 0;
        X.fillStyle = m.eye; X.beginPath(); X.arc(px + 21, py + 20, 5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 20, 5, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(px + 21, py + 20, 2.5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 20, 2.5, 0, Math.PI * 2); X.fill();
      } else if (m.shape === "demon") {
        X.fillStyle = col; X.fillRect(px + 8, py + 14, 40, 30);
        X.beginPath(); X.arc(px + 28, py + 16, 16, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#990000";
        X.beginPath(); X.moveTo(px + 10, py + 6); X.lineTo(px + 16, py + 18); X.lineTo(px + 4, py + 16); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 46, py + 6); X.lineTo(px + 40, py + 18); X.lineTo(px + 52, py + 16); X.closePath(); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(px + 21, py + 14, 5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 14, 5, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(px + 21, py + 14, 2.5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 14, 2.5, 0, Math.PI * 2); X.fill();
        const fr = Math.sin(tick / 5) * 4; X.fillStyle = "rgba(255,100,0,0.85)"; X.beginPath(); X.arc(px + 28, py + 48 + fr, 9, 0, Math.PI * 2); X.fill();
        X.shadowColor = col; X.shadowBlur = 12; X.strokeStyle = col; X.lineWidth = 1.5; X.strokeRect(px + 8, py + 14, 40, 30); X.shadowBlur = 0;
      } else if (m.shape === "giant") {
        X.fillStyle = col; X.fillRect(px + 4, py + 10, 48, 38);
        X.fillStyle = col + "cc"; X.fillRect(px + 2, py + 20, 5, 22); X.fillRect(px + 49, py + 20, 5, 22);
        X.fillStyle = m.eye; X.fillRect(px + 10, py + 18, 14, 13); X.fillRect(px + 32, py + 18, 14, 13);
        X.fillStyle = "#000"; X.fillRect(px + 13, py + 21, 8, 7); X.fillRect(px + 35, py + 21, 8, 7);
        X.fillStyle = "#fff"; X.fillRect(px + 14, py + 22, 4, 4); X.fillRect(px + 36, py + 22, 4, 4);
        X.shadowColor = col; X.shadowBlur = 18; X.strokeStyle = col; X.lineWidth = 3; X.strokeRect(px + 4, py + 10, 48, 38); X.shadowBlur = 0;
      } else if (m.shape === "bone") {
        X.fillStyle = col; X.beginPath(); X.arc(px + 28, py + 16, 16, 0, Math.PI * 2); X.fill();
        X.fillRect(px + 14, py + 28, 28, 18);
        for (let i = 0; i < 4; i++) { X.beginPath(); X.arc(px + 12 + i * 10, py + 50, 6, 0, Math.PI * 2); X.fill(); }
        X.fillStyle = "#000"; X.fillRect(px + 14, py + 10, 10, 13); X.fillRect(px + 32, py + 10, 10, 13);
        X.fillStyle = m.eye; X.beginPath(); X.arc(px + 19, py + 16, 5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 37, py + 16, 5, 0, Math.PI * 2); X.fill();
        X.shadowColor = m.eye; X.shadowBlur = 10; X.strokeStyle = m.eye; X.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) { X.beginPath(); X.arc(px + 12 + i * 10, py + 50, 7, 0, Math.PI * 2); X.stroke(); }
        X.shadowBlur = 0;
      } else if (m.shape === "lord") {
        X.fillStyle = col; X.fillRect(px + 6, py + 10, 44, 36);
        X.beginPath(); X.arc(px + 28, py + 12, 14, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#330033";
        X.beginPath(); X.moveTo(px + 12, py + 4); X.lineTo(px + 18, py + 14); X.lineTo(px + 6, py + 14); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 44, py + 4); X.lineTo(px + 38, py + 14); X.lineTo(px + 50, py + 14); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 28, py + 2); X.lineTo(px + 22, py + 12); X.lineTo(px + 34, py + 12); X.closePath(); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(px + 21, py + 12, 5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 12, 5, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(px + 21, py + 12, 2.5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 12, 2.5, 0, Math.PI * 2); X.fill();
        const la = tick / 8;
        X.shadowColor = m.eye; X.shadowBlur = 12; X.strokeStyle = m.eye; X.lineWidth = 2.5;
        X.beginPath(); X.moveTo(px + 21, py + 12); X.lineTo(px + 21 + Math.cos(la) * 40, py + 12 + Math.sin(la) * 40); X.stroke();
        X.beginPath(); X.moveTo(px + 35, py + 12); X.lineTo(px + 35 + Math.cos(la + 2) * 40, py + 12 + Math.sin(la + 2) * 40); X.stroke();
        X.shadowBlur = 0;
      } else if (m.shape === "troll") {
        X.fillStyle = col; X.beginPath(); X.arc(px + 28, py + 30, 20, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 16, 15, 0, Math.PI * 2); X.fill();
        X.fillStyle = col === "#ffffff" ? "#cc4400" : "#cc4400";
        X.beginPath(); X.moveTo(px + 16, py + 8); X.lineTo(px + 10, py + 0); X.lineTo(px + 20, py + 10); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 40, py + 8); X.lineTo(px + 46, py + 0); X.lineTo(px + 36, py + 10); X.closePath(); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(px + 21, py + 14, 5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 14, 5, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(px + 21, py + 14, 2.5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 35, py + 14, 2.5, 0, Math.PI * 2); X.fill();
        X.shadowColor = col; X.shadowBlur = 12; X.strokeStyle = col; X.lineWidth = 2; X.beginPath(); X.arc(px + 28, py + 26, 22, 0, Math.PI * 2); X.stroke(); X.shadowBlur = 0;
      } else if (m.shape === "eagle") {
        const wf = Math.sin(tick / 5 + m.id) * 12;
        X.fillStyle = col + "bb";
        X.beginPath(); X.moveTo(px + 28, py + 24); X.lineTo(px + 2, py + 16 - wf); X.lineTo(px + 8, py + 28); X.closePath(); X.fill();
        X.beginPath(); X.moveTo(px + 28, py + 24); X.lineTo(px + 54, py + 16 - wf); X.lineTo(px + 48, py + 28); X.closePath(); X.fill();
        X.fillStyle = col; X.beginPath(); X.arc(px + 28, py + 24, 15, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#ffdd00";
        X.beginPath(); X.moveTo(px + 28, py + 28); X.lineTo(px + 20, py + 36); X.lineTo(px + 36, py + 36); X.closePath(); X.fill();
        X.fillStyle = m.eye; X.beginPath(); X.arc(px + 20, py + 22, 5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 36, py + 22, 5, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#000"; X.beginPath(); X.arc(px + 20, py + 22, 2.5, 0, Math.PI * 2); X.fill(); X.beginPath(); X.arc(px + 36, py + 22, 2.5, 0, Math.PI * 2); X.fill();
        X.shadowColor = col; X.shadowBlur = 10; X.strokeStyle = col; X.lineWidth = 2; X.beginPath(); X.arc(px + 28, py + 24, 17, 0, Math.PI * 2); X.stroke(); X.shadowBlur = 0;
      }
      const hw = Math.floor((m.hp / m.maxhp) * (S - 8));
      X.fillStyle = "#440000"; X.fillRect(px + 4, py + 2, S - 8, 6);
      X.fillStyle = m.hp > m.maxhp * 0.5 ? "#00ee44" : "#ff3300"; X.fillRect(px + 4, py + 2, hw, 6);
      X.fillStyle = "#ffcc00"; X.font = "bold 9px monospace"; X.textAlign = "center"; X.fillText(m.name, px + S / 2, py + S - 1); X.textAlign = "left";
      if (m.flash > 0) m.flash--;
      X.restore();
    }

    // ============ HUDSON DRAWING ============
    function drawHudson() {
      const px = player.x * S, py = player.y * S;
      if (riding) {
        const rb = Math.sin(tick / 12) * 3;
        X.save();
        X.fillStyle = riding.type === "bear" ? "#8b4513" : riding.type === "wolf" ? "#ccccee" : riding.type === "fox" ? "#ee7700" : "#aa7733";
        X.beginPath(); X.arc(px + 28, py + 34 + rb, 18, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 28, py + 20 + rb, 14, 0, Math.PI * 2); X.fill();
        X.fillStyle = "#111"; X.beginPath(); X.arc(px + 22, py + 18 + rb, 3, 0, Math.PI * 2); X.fill();
        X.beginPath(); X.arc(px + 34, py + 18 + rb, 3, 0, Math.PI * 2); X.fill();
        X.restore();
        X.fillStyle = "#f0d080"; X.fillRect(px + 18, py + 4 + rb, 18, 14);
        X.fillStyle = "#1a55dd"; X.fillRect(px + 16, py + 0 + rb, 22, 8);
        X.fillStyle = "#ffffff"; X.fillRect(px + 18, py + 2 + rb, 18, 5);
        X.fillStyle = "#ffcc00"; X.font = "bold 8px monospace"; X.textAlign = "center";
        X.fillText("RIDING " + riding.name.toUpperCase(), px + S / 2, py + S - 1);
        X.textAlign = "left";
      } else {
        X.fillStyle = "#f0d080"; X.fillRect(px + 14, py + 18, 24, 22);
        X.fillStyle = "#1a55dd"; X.fillRect(px + 11, py + 10, 30, 16);
        X.fillStyle = "#ffffff"; X.fillRect(px + 13, py + 12, 26, 11);
        X.fillStyle = "#66aaff"; X.fillRect(px + 11, py + 10, 30, 5);
        X.fillStyle = "#88dd44"; X.fillRect(px + 15, py + 11, 6, 2.5); X.fillRect(px + 24, py + 11, 6, 2.5);
        X.fillStyle = "#4499ff"; X.fillRect(px + 21, py + 12, 4, 2.5);
        X.fillStyle = "#1a55dd"; X.fillRect(px + 15, py + 6, 22, 7);
        X.fillStyle = "#f0d080"; X.fillRect(px + 18, py + 25, 5, 5); X.fillRect(px + 29, py + 25, 5, 5);
        X.fillStyle = "#1a44cc"; X.fillRect(px + 10, py + 40, 32, 10);
        X.fillStyle = "#f0d080"; X.fillRect(px + 8, py + 26, 7, 13); X.fillRect(px + 37, py + 26, 7, 13);
        X.fillRect(px + 12, py + 49, 10, 4); X.fillRect(px + 30, py + 49, 10, 4);
      }
      if (eqW) {
        X.fillStyle = eqW.col; X.shadowColor = eqW.col; X.shadowBlur = 10;
        X.fillRect(px + 44, py + 22, 5, 22); X.fillRect(px + 38, py + 20, 17, 5);
        X.shadowBlur = 0;
      }
    }

    // ============ OVERLAY SCREENS ============
    function drawLevelComplete() {
      X.fillStyle = "rgba(0,0,20,0.85)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save(); X.shadowColor = "#ffcc00"; X.shadowBlur = 20;
      X.fillStyle = "#ffcc00"; X.font = "bold 28px monospace"; X.textAlign = "center";
      X.fillText(`LEVEL ${level} COMPLETE!`, CV.width / 2, 140);
      X.shadowBlur = 0;
      X.fillStyle = "#ffffff"; X.font = "16px monospace";
      X.fillText(`Score: ${score}`, CV.width / 2, 180);
      X.fillText(`Pets: ${pets.length}  |  Lives: ${lives}`, CV.width / 2, 210);
      X.fillStyle = "#88ff88"; X.font = "bold 18px monospace";
      X.fillText(`Entering Level ${level + 1}...`, CV.width / 2, 260);
      // Countdown bar
      const pct = levelTimer / 180;
      X.fillStyle = "#333"; X.fillRect(CV.width / 2 - 100, 280, 200, 12);
      X.fillStyle = "#ffcc00"; X.fillRect(CV.width / 2 - 100, 280, 200 * (1 - pct), 12);
      X.textAlign = "left"; X.restore();
    }

    function drawGameOver() {
      X.fillStyle = "rgba(20,0,0,0.9)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save(); X.shadowColor = "#ff0000"; X.shadowBlur = 20;
      X.fillStyle = "#ff4444"; X.font = "bold 32px monospace"; X.textAlign = "center";
      X.fillText("GAME OVER", CV.width / 2, 150);
      X.shadowBlur = 0;
      X.fillStyle = "#ffffff"; X.font = "16px monospace";
      X.fillText(`Final Score: ${score}`, CV.width / 2, 200);
      X.fillText(`Reached Level: ${level}`, CV.width / 2, 230);
      X.fillStyle = "#ffcc00"; X.font = "bold 16px monospace";
      X.fillText("Press any key to restart!", CV.width / 2, 290);
      X.textAlign = "left"; X.restore();
    }

    function drawVictory() {
      X.fillStyle = "rgba(0,10,0,0.9)"; X.fillRect(0, 0, CV.width, CV.height);
      X.save(); X.shadowColor = "#ffff00"; X.shadowBlur = 30;
      X.fillStyle = "#ffcc00"; X.font = "bold 28px monospace"; X.textAlign = "center";
      X.fillText("\u2605 YOU WIN! \u2605", CV.width / 2, 120);
      X.shadowBlur = 0;
      X.fillStyle = "#ffffff"; X.font = "18px monospace";
      X.fillText("All 10 levels defeated!", CV.width / 2, 170);
      X.fillText(`Final Score: ${score}`, CV.width / 2, 210);
      X.fillText(`Pets Collected: ${pets.length}`, CV.width / 2, 240);
      X.fillStyle = "#88ff88"; X.font = "14px monospace";
      X.fillText("Hudson saved the kingdom!", CV.width / 2, 290);
      X.fillStyle = "#ffcc00"; X.font = "bold 14px monospace";
      X.fillText("Press any key to play again!", CV.width / 2, 330);
      X.textAlign = "left"; X.restore();
    }

    // ============ RENDER ============
    function render() {
      tick++;
      X.clearRect(0, 0, CV.width, CV.height);
      X.fillStyle = "#0a0a1a"; X.fillRect(0, 0, CV.width, CV.height);

      if (gameState === "playing") {
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) dt(x, y, map[y][x]);
        bMap.forEach((row, y) => row.forEach((b, x) => {
          if (b) { X.fillStyle = b.color; X.fillRect(x * S + 2, y * S + 2, S - 4, S - 4); }
        }));
        animals.forEach(drawAnimal);
        monsters.forEach(drawMonster);
        drawHudson();
        // Level indicator on canvas
        X.fillStyle = "rgba(0,0,0,0.5)"; X.fillRect(0, 0, CV.width, 16);
        X.fillStyle = "#ffcc00"; X.font = "bold 11px monospace";
        X.fillText(`LEVEL ${level}/10`, 4, 12);
        const alive = monsters.filter(m => m.alive).length;
        X.fillStyle = "#ff6666";
        X.fillText(`Enemies: ${alive}`, CV.width / 2 - 30, 12);
        X.fillStyle = "#88ff88"; X.textAlign = "right";
        X.fillText(`Objective: Defeat all monsters!`, CV.width - 4, 12);
        X.textAlign = "left";
      } else if (gameState === "levelComplete") {
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) dt(x, y, map[y][x]);
        drawLevelComplete();
        levelTimer--;
        if (levelTimer <= 0) startLevel(level + 1);
      } else if (gameState === "gameOver") {
        drawGameOver();
      } else if (gameState === "victory") {
        drawVictory();
      }

      requestAnimationFrame(render);
    }

    // ============ HUD ============
    function updH() {
      const h = [];
      for (let i = 0; i < 5; i++) h.push(i < lives ? "\u2764\uFE0F" : "\uD83D\uDDA4");
      document.getElementById("hrt")!.textContent = h.join("");
      document.getElementById("sc")!.textContent = String(score);
      document.getElementById("lb")!.textContent = "LV " + level;
      const pc = document.getElementById("petcount");
      if (pc) pc.textContent = String(pets.length);
      const rc = document.getElementById("ridestat");
      if (rc) rc.textContent = riding ? riding.name : "none";
    }

    function updS() {
      const ig = document.getElementById("ig")!;
      ig.innerHTML = "";
      BLOCKS.forEach((b) => {
        const d = document.createElement("div");
        d.className = "ibox" + (selB === b.id ? " sel" : "");
        d.innerHTML = `<span class="ilab">${b.label}</span>${b.icon}<span class="ict">${inv[b.id] || 0}</span>`;
        d.onclick = () => { selB = b.id; updS(); setMsg(`Selected ${b.label} block!`); };
        ig.appendChild(d);
      });
      const wl = document.getElementById("wl")!;
      wl.innerHTML = "";
      if (!weapons.length) { wl.innerHTML = '<div style="font-size:10px;color:#555">find quest tiles!</div>'; return; }
      weapons.forEach((w) => {
        const d = document.createElement("div");
        d.className = "wbox" + (eqW && eqW.id === w.id ? " eq" : "");
        d.innerHTML = `${w.icon} ${w.name} <span class="dmg">${w.dmg}dmg</span>`;
        d.onclick = () => { eqW = w; updS(); setMsg("Equipped " + w.name + "!"); };
        wl.appendChild(d);
      });
    }

    function setMsg(t: string) { document.getElementById("msg")!.textContent = t; }

    // ============ QUEST SYSTEM ============
    (window as unknown as Record<string, unknown>).chk = function (c: string) {
      if (!aPuz) return;
      const { q } = aPuz;
      const rw = q.rewards[c];
      const pm = document.getElementById("pm")!;
      if (rw) {
        if (rw.blocks) Object.entries(rw.blocks).forEach(([k, v]) => (inv[k] = (inv[k] || 0) + v));
        if (rw.weapon) {
          const w = WEAPONS.find((w) => w.id === rw.weapon);
          if (w && !weapons.find((x) => x.id === w.id)) { weapons.push(w); eqW = w; }
        }
        if (rw.heal) lives = Math.min(5, lives + rw.heal);
        if (rw.score) score += rw.score;
        pm.style.color = "#ffcc00";
        pm.textContent = "\uD83C\uDF89 Great choice!";
        updS(); updH();
        setTimeout(() => { const o = document.getElementById("ov"); if (o) o.remove(); aPuz = null; setMsg("Quest complete! Keep exploring!"); }, 1200);
      }
    };

    function showQuest() {
      const q = ALL_QUESTS[questCounter % ALL_QUESTS.length];
      questCounter++;
      aPuz = { idx: questCounter, q };
      const o = document.createElement("div");
      o.id = "ov";
      o.innerHTML = `<div id="pb"><h3>\uD83C\uDFF0 QUEST!</h3><p>${q.q}</p><div id="chs">${q.ch.map((c) => `<button class="cb" onclick="chk('${c}')">${c}</button>`).join("")}</div><div id="pm"></div></div>`;
      cwrapRef.current!.appendChild(o);
    }

    // ============ RIDE SELECTION ============
    function showRideMenu() {
      const available = animals.filter(a => !a.isPet && !a.adopted && a.x >= 0);
      if (available.length === 0 && !riding) { setMsg("No animals nearby to ride!"); return; }
      if (riding) {
        riding = null;
        setMsg("You hopped off!");
        updH();
        return;
      }
      // Find adjacent rideable animals
      const nearby = available.filter(a => Math.abs(a.x - player.x) <= 1 && Math.abs(a.y - player.y) <= 1);
      if (nearby.length === 0) { setMsg("Walk next to an animal first!"); return; }
      if (nearby.length === 1) {
        riding = nearby[0];
        nearby[0].x = -1; nearby[0].y = -1;
        score += 50;
        setMsg(`Riding ${riding.name}! +10 bonus fight damage!`);
        updH();
        return;
      }
      // Show choice
      const o = document.createElement("div");
      o.id = "ov";
      o.innerHTML = `<div id="pb"><h3>\uD83D\uDC0E CHOOSE YOUR RIDE!</h3><div id="chs">${nearby.map(a => `<button class="cb" onclick="pickRide(${a.id})">${a.name}</button>`).join("")}</div><div id="pm"></div></div>`;
      cwrapRef.current!.appendChild(o);
    }
    (window as unknown as Record<string, unknown>).pickRide = function (id: number) {
      const a = animals.find(a => a.id === id);
      if (a) {
        riding = a;
        a.x = -1; a.y = -1;
        score += 50;
        updH();
        setMsg(`Riding ${a.name}! +10 bonus damage!`);
      }
      const o = document.getElementById("ov"); if (o) o.remove();
    };

    // ============ ACTIONS ============
    function fight() {
      if (!eqW) { setMsg("No weapon! Find a glowing ? quest tile!"); return; }
      let hit = false;
      monsters.forEach((m) => {
        if (!m.alive) return;
        if (Math.abs(m.x - player.x) <= 1 && Math.abs(m.y - player.y) <= 1) {
          const bonus = riding ? 10 : 0;
          const totalDmg = eqW!.dmg + bonus;
          m.hp -= totalDmg; m.flash = 10; hit = true;
          if (m.hp <= 0) {
            m.alive = false;
            if (m.reward) Object.entries(m.reward).forEach(([k, v]) => (inv[k] = (inv[k] || 0) + v));
            score += 300 * level;
            updS(); updH();
            setMsg(`\uD83D\uDC80 ${m.name} DESTROYED! +${300 * level} pts!`);
            checkLevelComplete();
          } else {
            setMsg(`\u2694\uFE0F Hit ${m.name} for ${totalDmg}!${riding ? " (ride bonus!)" : ""} HP: ${Math.max(0, m.hp)}/${m.maxhp}`);
          }
        }
      });
      if (!hit) setMsg("No monster nearby! Walk next to one first!");
    }

    function brk() {
      const dx = [0, 1, -1, 0, 0], dy = [0, 0, 0, 1, -1];
      for (let i = 0; i < 5; i++) {
        const nx = player.x + dx[i], ny = player.y + dy[i];
        if (nx < 0 || nx >= C || ny < 0 || ny >= R) continue;
        if (bMap[ny][nx]) { const b = bMap[ny][nx]!; inv[b.id] = (inv[b.id] || 0) + 1; bMap[ny][nx] = null; updS(); setMsg(`Broke ${b.label} block!`); return; }
      }
      setMsg("No block nearby to break!");
    }

    function mv(dx: number, dy: number) {
      if (aPuz || gameState !== "playing") return;
      const nx = player.x + dx, ny = player.y + dy;
      if (nx < 0 || nx >= C || ny < 0 || ny >= R) return;
      const t = map[ny][nx];
      if (t === 1) return;
      if (t === 7) {
        if (monsters.every(m => !m.alive)) {
          // Gate is open - advance level!
          checkLevelComplete();
          return;
        } else {
          const alive = monsters.filter(m => m.alive).length;
          setMsg(`Gate locked! Defeat ${alive} more monsters!`);
          return;
        }
      }
      if (monsters.find((m) => m.alive && m.x === nx && m.y === ny)) { setMsg("Monster blocking! Use Fight!"); return; }
      // Animal interaction
      const animalHere = animals.find((a) => a.x === nx && a.y === ny && !a.adopted);
      if (animalHere) {
        if (animalHere.isPet) {
          animalHere.adopted = true;
          pets.push(animalHere);
          score += 100;
          updH();
          setMsg(`\u2764\uFE0F Adopted ${animalHere.name}! They follow you now!`);
        } else {
          riding = animalHere;
          animalHere.x = -1; animalHere.y = -1;
          score += 50;
          updH();
          setMsg(`Riding ${animalHere.name}! +10 bonus fight damage!`);
        }
        player.x = nx; player.y = ny;
        return;
      }
      if (selB && bMap[ny][nx] === null && (inv[selB] || 0) > 0 && [0, 3, 5, 6, 8, 9].includes(t)) {
        const b = BLOCKS.find((b) => b.id === selB)!;
        bMap[ny][nx] = b; inv[selB]--; updS(); setMsg(`Placed ${b.label} block!`); return;
      }
      player.x = nx; player.y = ny;
      // Quest tile
      if (t === 5 && !solved.has(ny * 100 + nx)) {
        solved.add(ny * 100 + nx);
        setMsg("QUEST TIME!");
        showQuest();
      } else {
        const alive = monsters.filter(m => m.alive).length;
        const tips = [`${alive} monsters left! Find and destroy them!`, "Walk into animals to ride or adopt pets!", "Glowing ? tiles give weapons and loot!", `Level ${level}/10 - clear all monsters to open the gate!`];
        setMsg(tips[tick % tips.length]);
      }
    }

    // ============ INPUT ============
    document.addEventListener("keydown", (e) => {
      if (gameState === "gameOver" || gameState === "victory") {
        // Restart
        score = 0; lives = 5; level = 1; weapons = []; eqW = null; inv = { stone: 0, wood: 0, gold: 0, castle: 0 }; pets = []; questCounter = 0;
        startLevel(1);
        return;
      }
      const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (m[e.key]) { e.preventDefault(); mv(...m[e.key]); }
      if (e.key === " ") { e.preventDefault(); fight(); }
    });
    document.getElementById("bu")!.onclick = () => mv(0, -1);
    document.getElementById("bd")!.onclick = () => mv(0, 1);
    document.getElementById("bl")!.onclick = () => mv(-1, 0);
    document.getElementById("br")!.onclick = () => mv(1, 0);
    document.getElementById("bf")!.onclick = fight;
    document.getElementById("bx")!.onclick = brk;
    document.getElementById("bride")!.onclick = showRideMenu;

    updH(); updS(); render();
    setMsg(`LEVEL 1! Defeat all monsters and find the gate!`);
  }, []);

  return (
    <div id="game-wrap">
      <div id="gw" ref={cwrapRef} style={{ position: "relative" }}>
        <div id="top">
          <h2>{"🏰 HUDSON'S EPIC QUEST"}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="stat"><span id="hrt">{"❤️❤️❤️❤️❤️"}</span></div>
            <div className="stat">{"⭐ "}<span id="sc">0</span></div>
            <div className="stat">{"🐾 "}<span id="petcount">0</span></div>
            <div className="stat" style={{ fontSize: 9, color: "#88cc88" }}>{"🐴 "}<span id="ridestat">none</span></div>
            <div className="lvl-badge" id="lb">LV 1</div>
          </div>
        </div>
        <div id="mid">
          <canvas id="gc" width={560} height={400}></canvas>
        </div>
        <div id="inv-row">
          <div style={{ color: "#ffcc00", fontSize: 10, fontWeight: 500 }}>{"🎒"}</div>
          <div id="ig" style={{ display: "flex", gap: 3 }}></div>
          <div style={{ width: 1, background: "#2a1a3a", height: 28 }}></div>
          <div style={{ color: "#ffcc00", fontSize: 10, fontWeight: 500 }}>{"⚔️"}</div>
          <div id="wl" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "#555" }}>find quest tiles!</div>
          </div>
        </div>
        <div id="hud">
          <div className="ctrl-group">
            <button className="btn" id="bu">{"↑"}</button>
            <button className="btn" id="bl">{"←"}</button>
            <button className="btn" id="bd">{"↓"}</button>
            <button className="btn" id="br">{"→"}</button>
          </div>
          <div className="ctrl-group">
            <button className="btn btn-fight" id="bf">{"⚔ Fight"}</button>
            <button className="btn btn-break" id="bx">{"Break"}</button>
            <button className="btn" id="bride" style={{ color: "#88cc88", borderColor: "#336633" }}>{"🐴 Ride"}</button>
          </div>
          <div id="msg">Level 1! Defeat all monsters and find the gate!</div>
        </div>
      </div>
    </div>
  );
}
