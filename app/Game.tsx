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

    // ============ GAME STATE ============
    type GameState = "playing" | "levelComplete" | "gameOver" | "victory";
    let gameState: GameState = "playing";
    let level = 1;
    let score = 0;
    let levelTimer = 0;

    // ============ TYPES ============
    interface Player {
      x: number; y: number; lives: number; arrows: number;
      weapon: Weapon | null; magic: string | null; magicUses: number;
      armor: number; flash: number; facing: string;
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
          [1,0,1,1,1,7,1,1,0,1,0,1,1,1],
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
          [1,0,0,0,0,0,0,0,0,0,0,1,0,1],
          [1,1,1,0,1,1,7,1,1,1,1,1,0,1],
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
          [1,0,1,5,0,1,1,1,1,7,1,0,0,1],
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
          [1,0,1,1,1,1,1,1,0,1,7,1,1,1],
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
          [1,0,1,1,7,1,4,0,1,1,1,1,0,1],
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
          [1,1,1,0,1,1,7,0,0,0,0,1,0,1],
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
          [1,0,1,0,1,1,7,1,0,1,0,1,0,1],
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
      const count = 2 + lv;
      const ms: Monster[] = [];
      const hpMult = 0.8 + (lv - 1) * 0.2;
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
      return pickups;
    }

    function makePortals(map: number[][]): Portal[] {
      const portals: Portal[] = [];
      const portalWorlds = [
        { col: "#00ffff", name: "Ice World" },
        { col: "#ff6600", name: "Fire World" },
        { col: "#aa00ff", name: "Shadow World" },
        { col: "#00ff44", name: "Forest World" },
        { col: "#ff0088", name: "Crystal World" },
      ];
      // Find portal tiles and pair them or warp to a random path
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
        if (map[y][x] === 7) {
          const pw = portalWorlds[portals.length % portalWorlds.length];
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
    const player: Player = { x: 0, y: 0, lives: 5, arrows: 3, weapon: WEAPONS[0], magic: null, magicUses: 0, armor: 0, flash: 0, facing: "right" };

    function startLevel(lv: number) {
      level = lv;
      map = makeMap(lv);
      chicken = findChicken(map);
      pickups = makePickups(map);
      portals = makePortals(map);
      monsters = makeMonsters(lv, map);
      player.x = 0; player.y = 0; player.arrows = 3; player.armor = 0; player.flash = 0;
      // Keep weapon and magic between levels
      gameState = "playing";
      updH();
      setMsg(`Level ${lv}! Find the Magical Golden Chicken!`);
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
        const icons: Record<string, string> = { food: "\uD83C\uDF54", weapon: "\u2694\uFE0F", magic: "\uD83E\uDE84", armor: "\uD83D\uDEE1\uFE0F", arrows: "\uD83C\uDFF9" };
        X.fillText(icons[p.type] || "?", px + S / 2, py + S / 2 + 6 + b);
        X.textAlign = "left";
        const glows: Record<string, string> = { food: "#ffaa00", weapon: "#ff4400", magic: "#aa00ff", armor: "#0088ff", arrows: "#88ff44" };
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
    function drawChicken() {
      const px = chicken.x * S, py = chicken.y * S;
      const b = Math.sin(tick / 8) * 3;
      const glow = 10 + Math.sin(tick / 6) * 8;
      X.save();
      X.shadowColor = "#ffcc00"; X.shadowBlur = glow;
      // Golden glow circle
      X.fillStyle = `rgba(255,204,0,${0.15 + Math.sin(tick / 10) * 0.1})`;
      X.beginPath(); X.arc(px + S / 2, py + S / 2, S / 2, 0, Math.PI * 2); X.fill();
      // Body
      X.fillStyle = "#ffcc00";
      X.beginPath(); X.arc(px + S / 2, py + S / 2 + 2 + b, 11, 0, Math.PI * 2); X.fill();
      // Head
      X.beginPath(); X.arc(px + S / 2, py + S / 2 - 8 + b, 8, 0, Math.PI * 2); X.fill();
      // Beak
      X.fillStyle = "#ff8800";
      X.beginPath(); X.moveTo(px + S / 2, py + S / 2 - 6 + b); X.lineTo(px + S / 2 - 4, py + S / 2 - 2 + b); X.lineTo(px + S / 2 + 4, py + S / 2 - 2 + b); X.closePath(); X.fill();
      // Eyes
      X.fillStyle = "#111"; X.beginPath(); X.arc(px + S / 2 - 3, py + S / 2 - 10 + b, 2, 0, Math.PI * 2); X.fill();
      X.beginPath(); X.arc(px + S / 2 + 3, py + S / 2 - 10 + b, 2, 0, Math.PI * 2); X.fill();
      // Crown
      X.fillStyle = "#ffaa00";
      X.beginPath(); X.moveTo(px + S / 2 - 6, py + S / 2 - 14 + b); X.lineTo(px + S / 2 - 4, py + S / 2 - 20 + b);
      X.lineTo(px + S / 2, py + S / 2 - 16 + b); X.lineTo(px + S / 2 + 4, py + S / 2 - 20 + b);
      X.lineTo(px + S / 2 + 6, py + S / 2 - 14 + b); X.closePath(); X.fill();
      // Sparkles
      for (let i = 0; i < 6; i++) {
        const sx = px + S / 2 + Math.sin(tick / 6 + i * 1.1) * 16;
        const sy = py + S / 2 + Math.cos(tick / 5 + i * 1.3) * 14;
        const sa = 0.3 + Math.sin(tick / 4 + i) * 0.3;
        X.fillStyle = `rgba(255,255,100,${sa})`;
        X.beginPath(); X.arc(sx, sy, 1.5, 0, Math.PI * 2); X.fill();
      }
      X.restore();
      X.fillStyle = "#ffcc00"; X.font = "bold 7px monospace"; X.textAlign = "center";
      X.fillText("GOLDEN CHICKEN!", px + S / 2, py + S - 1); X.textAlign = "left";
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
      // Hudson at 56px scale
      X.fillStyle = "#f0d080"; X.fillRect(14, 18, 24, 22);
      X.fillStyle = "#1a55dd"; X.fillRect(11, 10, 30, 16);
      X.fillStyle = "#ffffff"; X.fillRect(13, 12, 26, 11);
      X.fillStyle = "#66aaff"; X.fillRect(11, 10, 30, 5);
      X.fillStyle = "#1a55dd"; X.fillRect(15, 6, 22, 7);
      X.fillStyle = "#f0d080"; X.fillRect(18, 25, 5, 5); X.fillRect(29, 25, 5, 5);
      X.fillStyle = "#1a44cc"; X.fillRect(10, 40, 32, 10);
      X.fillStyle = "#f0d080"; X.fillRect(8, 26, 7, 13); X.fillRect(37, 26, 7, 13);
      X.fillRect(12, 49, 10, 4); X.fillRect(30, 49, 10, 4);
      if (player.weapon) {
        X.fillStyle = player.weapon.col; X.shadowColor = player.weapon.col; X.shadowBlur = 10;
        X.fillRect(44, 22, 5, 22); X.fillRect(38, 20, 17, 5);
        X.shadowBlur = 0;
      }
      X.setTransform(1, 0, 0, 1, 0, 0);
      // Name
      X.fillStyle = "#88ccff"; X.font = "bold 7px monospace"; X.textAlign = "center";
      X.fillText("Hudson", px + S / 2, py + 3); X.textAlign = "left";
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
      X.fillText("You found the Magical Golden Chicken!", CV.width / 2, 140);
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
      X.fillText("The Magical Golden Chicken is safe!", CV.width / 2, 220);
      X.fillText("Hudson saved everything!", CV.width / 2, 245);
      X.fillStyle = "#ffcc00"; X.font = "bold 11px monospace";
      X.fillText("Press any key to play again!", CV.width / 2, 290);
      X.textAlign = "left"; X.restore();
    }

    // ============ MONSTER AI ============
    function moveMonsters() {
      const speed = Math.max(20, 50 - level * 3);
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
      const interval = Math.max(80, 150 - level * 7);
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
            setMsg(`${m.name} attacked Hudson! ${player.lives} lives left!`);
          }
          updH();
          if (player.lives <= 0) gameState = "gameOver";
        }
      });
    }

    // ============ RENDER ============
    function render() {
      tick++;
      X.clearRect(0, 0, CV.width, CV.height);
      X.fillStyle = "#0a0a1a"; X.fillRect(0, 0, CV.width, CV.height);

      if (gameState === "playing") {
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) dt(x, y, map[y][x]);
        drawPickups();
        drawPortals();
        drawChicken();
        monsters.forEach(drawMonster);
        drawPlayer();
        moveMonsters();
        monsterAttacks();
        // HUD on canvas
        X.fillStyle = "rgba(0,0,0,0.7)"; X.fillRect(0, 0, CV.width, 14);
        X.fillStyle = "#ffcc00"; X.font = "bold 9px monospace";
        X.fillText(`LV ${level}/10`, 4, 10);
        const alive = monsters.filter(m => m.alive).length;
        X.fillStyle = "#ff6666"; X.fillText(`Monsters: ${alive}`, 60, 10);
        X.fillStyle = "#88ff44"; X.fillText(`Arrows: ${player.arrows}`, 135, 10);
        X.fillStyle = "#88ccff"; X.fillText(`Armor: ${player.armor}`, 210, 10);
        X.fillStyle = "#cc88ff"; X.fillText(`Magic: ${player.magic || "-"}${player.magicUses > 0 ? ` x${player.magicUses}` : ""}`, 280, 10);
        X.fillStyle = "#ffcc00"; X.textAlign = "right";
        X.fillText("Find the Golden Chicken!", CV.width - 4, 10);
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
      const h = []; for (let i = 0; i < 5; i++) h.push(i < player.lives ? "\u2764\uFE0F" : "\uD83D\uDDA4");
      document.getElementById("hrt")!.textContent = h.join("");
      document.getElementById("sc")!.textContent = String(score);
      document.getElementById("lb")!.textContent = "LV " + level;
    }
    function setMsg(t: string) { document.getElementById("msg")!.textContent = t; }

    // ============ ACTIONS ============
    function fight() {
      if (!player.weapon) { setMsg("No weapon!"); return; }
      if (player.arrows <= 0) { setMsg("No arrows! Find arrow pickups in the maze!"); return; }
      player.arrows--;
      updH();
      let hit = false;
      monsters.forEach(m => {
        if (!m.alive) return;
        if (Math.abs(m.x - player.x) <= 1 && Math.abs(m.y - player.y) <= 1) {
          m.hp -= player.weapon!.dmg; m.flash = 10; hit = true;
          if (m.hp <= 0) {
            m.alive = false; score += 200 * level; updH();
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
            m.hp -= 50; m.flash = 10;
            if (m.hp <= 0) { m.alive = false; score += 200 * level; }
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
          target.hp -= 80; target.flash = 15;
          if (target.hp <= 0) { target.alive = false; score += 200 * level; }
          setMsg(`LIGHTNING strikes ${target.name}!`);
        }
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
      player.x = nx; player.y = ny;
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
          const types = ["fireball", "freeze", "shield", "heal", "lightning"];
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
        }
        updH();
      }
      // Check portal
      const portal = portals.find(p => !p.taken && p.x === nx && p.y === ny);
      if (portal) {
        portal.taken = true;
        player.x = portal.destX; player.y = portal.destY;
        score += 150;
        setMsg(`Portal to ${portal.name}! Teleported!`);
      }
      // Check chicken!
      if (nx === chicken.x && ny === chicken.y) {
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
        const tips = ["Find the Golden Chicken!", `${alive} monsters lurking...`, "F=Fight  M=Magic", "Pick up items along the way!"];
        setMsg(tips[Math.floor(tick / 60) % tips.length]);
      }
    }

    // ============ INPUT ============
    document.addEventListener("keydown", e => {
      if (gameState === "gameOver" || gameState === "victory") {
        score = 0; player.weapon = WEAPONS[0]; player.magic = null; player.magicUses = 0; player.arrows = 3;
        startLevel(1); return;
      }
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (moves[e.key]) { e.preventDefault(); movePlayer(...moves[e.key]); }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); fight(); }
      if (e.key === "m" || e.key === "M") { e.preventDefault(); useMagic(); }
    });
    document.getElementById("bu")!.onclick = () => movePlayer(0, -1);
    document.getElementById("bd")!.onclick = () => movePlayer(0, 1);
    document.getElementById("bl")!.onclick = () => movePlayer(-1, 0);
    document.getElementById("br")!.onclick = () => movePlayer(1, 0);
    document.getElementById("bf")!.onclick = fight;
    document.getElementById("bm")!.onclick = useMagic;

    updH(); render();
    setMsg("Level 1! Navigate the maze! Find the Golden Chicken!");
  }, []);

  return (
    <div id="game-wrap">
      <div id="gw" ref={cwrapRef} style={{ position: "relative" }}>
        <div id="top">
          <h2>{"🏰 HUDSON'S EPIC QUEST"}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="stat"><span id="hrt">{"❤️❤️❤️❤️❤️"}</span></div>
            <div className="stat">{"⭐ "}<span id="sc">0</span></div>
            <div className="lvl-badge" id="lb">LV 1</div>
          </div>
        </div>
        <div id="mid">
          <canvas id="gc" width={560} height={400}></canvas>
        </div>
        <div id="hud">
          <div className="ctrl-group">
            <button className="btn" id="bu">{"↑"}</button>
            <button className="btn" id="bl">{"←"}</button>
            <button className="btn" id="bd">{"↓"}</button>
            <button className="btn" id="br">{"→"}</button>
          </div>
          <div className="ctrl-group">
            <button className="btn btn-fight" id="bf">{"⚔ Fight (F)"}</button>
            <button className="btn" id="bm" style={{ color: "#cc88ff", borderColor: "#663388" }}>{"🪄 Magic (M)"}</button>
          </div>
          <div id="msg">Navigate the maze! Find the Golden Chicken!</div>
        </div>
      </div>
    </div>
  );
}
