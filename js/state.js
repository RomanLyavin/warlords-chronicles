(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const D = WL.Data;
  const Game = WL.Game = WL.Game || {};

  const MAX_UNITS = 6;
  Game.MAX_UNITS = MAX_UNITS;
  Game.SAVE_KEY = 'warlords_kb_save_v1';

  Game.newGame = function (scenarioId, playerFaction, difficultyId) {
    const scenario = WL.SCENARIOS.filter(function (s) { return s.id === scenarioId; })[0];
    if (!scenario) throw new Error('Unknown scenario: ' + scenarioId);
    if (playerFaction == null) playerFaction = 0;
    if (!D.DIFFICULTIES[difficultyId]) difficultyId = 'normal';
    const diff = D.DIFFICULTIES[difficultyId];

    const map = WL.MapGen.generate(scenario);

    const state = {
      version: 1,
      scenarioId: scenario.id,
      difficulty: difficultyId,
      playerFaction: playerFaction,
      turn: 1,
      currentFaction: playerFaction,
      phase: 'playing',
      winner: null,
      w: map.w,
      h: map.h,
      tiles: map.tiles,
      cities: [],
      sites: [],
      armies: [],
      factions: [],
      fog: new Uint8Array(map.w * map.h),
      log: [],
      nextId: 1,
      stats: { battles: 0, wins: 0, losses: 0, citiesTaken: 0, unitsLost: 0, goldEarned: 0 },
      startedAt: Date.now()
    };

    scenario.factions.forEach(function (key, idx) {
      const def = D.FACTIONS[key];
      state.factions.push({
        id: idx,
        key: key,
        name: def.name,
        title: def.title,
        color: def.color,
        dark: def.dark,
        light: def.light,
        crest: def.crest,
        gold: idx === playerFaction ? 250 : 200,
        alive: true,
        isPlayer: idx === playerFaction
      });
    });

    scenario.cities.forEach(function (c) {
      state.cities.push({
        id: state.nextId++,
        kind: 'city',
        x: c.x, y: c.y,
        name: c.name,
        tier: c.tier,
        owner: c.owner,
        prodAcc: 0,
        queue: []
      });
    });

    scenario.sites.forEach(function (s) {
      state.sites.push({
        id: state.nextId++,
        kind: s.kind,
        x: s.x, y: s.y,
        name: s.name,
        owner: -1,
        cleared: false,
        cooldown: 0
      });
    });

    // ---- Neutral garrisons ----
    state.cities.forEach(function (city) {
      if (city.owner >= 0) return;
      const units = Game.garrisonForTier(city.tier);
      Game.addArmy(state, -1, city.x, city.y, units, { guard: true });
    });
    state.sites.forEach(function (site) {
      if (site.kind === 'temple') return;
      let units;
      if (site.kind === 'mine') {
        units = ['troll', 'troll'];
      } else if (site.name.indexOf('Дракон') >= 0 || site.name.indexOf('дракон') >= 0) {
        units = ['dragon', 'troll', 'troll'];
      } else {
        units = ['troll', 'militia', 'militia'];
      }
      Game.addArmy(state, -1, site.x, site.y, units, { guard: true });
    });

    // ---- Capital armies ----
    state.factions.forEach(function (f, idx) {
      const capital = state.cities.filter(function (c) { return c.owner === idx; })[0];
      if (!capital) return;
      const units = ['militia', 'spearmen', 'archers', 'cavalry'];
      if (idx !== playerFaction && difficultyId === 'hard') units.push('spearmen');
      const hero = Game.makeHero(state, idx);
      Game.addArmy(state, idx, capital.x, capital.y, units, { hero: hero });
      if (idx !== playerFaction && difficultyId === 'hard') f.gold += 200;
    });

    Game.log(state, 'Начало партии: ' + scenario.name + '.', 'info');
    Game.log(state, 'Вы ведёте ' + state.factions[playerFaction].name + '.', 'info');
    Game.startTurn(state);
    Game.recomputeFog(state);
    return state;
  };

  Game.garrisonForTier = function (tier) {
    if (tier >= 3) return ['spearmen', 'spearmen', 'spearmen', 'archers', 'archers', 'troll'];
    if (tier === 2) return ['spearmen', 'spearmen', 'archers', 'archers'];
    return ['militia', 'militia', 'spearmen'];
  };

  Game.makeHero = function (state, factionId) {
    const f = state.factions[factionId];
    if (!f) return null;
    const key = f.key;
    const pool = D.FACTIONS[key].heroes;
    const used = state.armies.filter(function (a) { return a.hero && a.faction === factionId; })
      .map(function (a) { return a.hero.name; });
    let names = pool.filter(function (n) { return used.indexOf(n) < 0; });
    if (!names.length) names = pool;
    const name = names[Math.floor(Math.random() * names.length)];
    return { name: name, level: 1, xp: 0 };
  };

  Game.addArmy = function (state, factionId, x, y, types, opts) {
    opts = opts || {};
    const army = {
      id: state.nextId++,
      faction: factionId,
      x: x, y: y,
      units: [],
      hero: opts.hero || null,
      mp: 0,
      guard: !!opts.guard
    };
    (types || []).forEach(function (t) {
      if (army.units.length >= MAX_UNITS) return;
      army.units.push({ type: t, hp: Game.unitMaxHp(state, factionId, t) });
    });
    if (!army.hero && !opts.guard) {
      army.mp = Game.maxMp(state, army);
    }
    state.armies.push(army);
    return army;
  };

  Game.removeArmy = function (state, army) {
    const i = state.armies.indexOf(army);
    if (i >= 0) state.armies.splice(i, 1);
  };

  Game.armyById = function (state, id) {
    return state.armies.filter(function (a) { return a.id === id; })[0] || null;
  };

  Game.armyAt = function (state, x, y) {
    for (let i = 0; i < state.armies.length; i++) {
      const a = state.armies[i];
      if (a.x === x && a.y === y) return a;
    }
    return null;
  };

  Game.cityAt = function (state, x, y) {
    for (let i = 0; i < state.cities.length; i++) {
      const c = state.cities[i];
      if (c.x === x && c.y === y) return c;
    }
    return null;
  };

  Game.siteAt = function (state, x, y) {
    for (let i = 0; i < state.sites.length; i++) {
      const s = state.sites[i];
      if (s.x === x && s.y === y) return s;
    }
    return null;
  };

  Game.factionOf = function (state, id) {
    if (id < 0) {
      return { id: -1, key: 'neutral', name: 'Нейтралы', color: '#8a7a5a', dark: '#4a3f2a', light: '#c8b898', crest: 'skull', isPlayer: false };
    }
    return state.factions[id];
  };

  Game.factionName = function (state, id) {
    return Game.factionOf(state, id).name;
  };

  Game.unitName = function (state, factionId, type) {
    const f = Game.factionOf(state, factionId);
    return D.unitName(f.key, type);
  };

  Game.unitMaxHp = function (state, factionId, type) {
    const f = Game.factionOf(state, factionId);
    return D.unitMaxHp(type, f.key);
  };

  Game.unitStr = function (state, factionId, type) {
    const f = Game.factionOf(state, factionId);
    return D.unitStr(type, f.key);
  };

  Game.unitCost = function (state, factionId, type) {
    const f = Game.factionOf(state, factionId);
    return D.unitCost(type, f.key);
  };

  Game.maxMp = function (state, army) {
    let mp = 8;
    if (army.hero) mp += 2 + Math.floor((army.hero.level - 1) / 2);
    return Math.min(14, mp);
  };

  Game.armyPower = function (state, army, opts) {
    if (!army) return 0;
    opts = opts || {};
    let p = 0;
    army.units.forEach(function (u) {
      const max = Game.unitMaxHp(state, army.faction, u.type);
      const frac = Math.max(0, Math.min(1, u.hp / max));
      p += Game.unitStr(state, army.faction, u.type) * (0.55 + 0.45 * frac);
    });
    if (army.hero) p *= 1 + 0.05 * (army.hero.level - 1);
    if (opts.cityWall) p *= 1 + opts.cityWall;
    return p;
  };

  Game.defensePower = function (state, x, y) {
    const army = Game.armyAt(state, x, y);
    const city = Game.cityAt(state, x, y);
    let wall = 0;
    if (city && army && city.owner === army.faction) {
      wall = D.CITY_TIERS[city.tier].wall;
    }
    return Game.armyPower(state, army, { cityWall: wall });
  };

  Game.recomputeFog = function (state) {
    const fog = state.fog;
    for (let i = 0; i < fog.length; i++) {
      if (fog[i] === 2) fog[i] = 1;
    }
    function reveal(cx, cy, r) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= state.w || y >= state.h) continue;
          if (Math.hypot(dx, dy) <= r + 0.15) {
            fog[y * state.w + x] = 2;
          }
        }
      }
    }
    state.armies.forEach(function (a) {
      if (a.faction === state.playerFaction) reveal(a.x, a.y, 4);
    });
    state.cities.forEach(function (c) {
      if (c.owner === state.playerFaction) reveal(c.x, c.y, 5);
    });
    state.sites.forEach(function (s) {
      if (s.owner === state.playerFaction) reveal(s.x, s.y, 2);
    });
  };

  Game.isVisible = function (state, x, y) {
    return state.fog[y * state.w + x] === 2;
  };

  Game.isExplored = function (state, x, y) {
    return state.fog[y * state.w + x] >= 1;
  };

  Game.log = function (state, text, kind, factionId) {
    state.log.push({
      turn: state.turn,
      text: text,
      kind: kind || 'info',
      faction: (factionId == null ? null : factionId)
    });
    if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
  };

  Game.income = function (state, factionId) {
    const f = state.factions[factionId];
    if (!f) return 0;
    let gold = 0;
    state.cities.forEach(function (c) {
      if (c.owner === factionId) gold += D.CITY_TIERS[c.tier].income;
    });
    state.sites.forEach(function (s) {
      if (s.kind === 'mine' && s.owner === factionId) gold += 20;
    });
    const mult = D.FACTIONS[f.key].bonus.goldMult || 1;
    return Math.round(gold * mult);
  };

  Game.upkeep = function (state, factionId) {
    let gold = 0;
    state.armies.forEach(function (a) {
      if (a.faction !== factionId) return;
      a.units.forEach(function (u) { gold += D.UNITS[u.type].upkeep; });
      if (a.hero) gold += 3;
    });
    return gold;
  };

  Game.cityProd = function (state, city) {
    const f = state.factions[city.owner];
    if (!f) return D.CITY_TIERS[city.tier].prod;
    const mult = D.FACTIONS[f.key].bonus.prodMult || 1;
    return Math.round(D.CITY_TIERS[city.tier].prod * mult);
  };

  Game.cityCount = function (state, factionId) {
    return state.cities.filter(function (c) { return c.owner === factionId; }).length;
  };

  Game.armyCount = function (state, factionId) {
    return state.armies.filter(function (a) { return a.faction === factionId; }).length;
  };

  Game.checkFactionAlive = function (state, factionId) {
    if (factionId < 0) return false;
    const f = state.factions[factionId];
    if (!f || !f.alive) return false;
    const hasCities = state.cities.some(function (c) { return c.owner === factionId; });
    const hasArmies = state.armies.some(function (a) { return a.faction === factionId; });
    if (!hasCities && !hasArmies) {
      f.alive = false;
      Game.log(state, f.name + ' повержена!', 'elim', factionId);
      return false;
    }
    return true;
  };

  Game.checkVictory = function (state) {
    if (state.phase === 'gameover') return;
    let playerAlive = false;
    let enemiesAlive = 0;
    state.factions.forEach(function (f) {
      const alive = Game.checkFactionAlive(state, f.id);
      if (f.id === state.playerFaction) playerAlive = alive;
      else if (alive) enemiesAlive++;
    });
    if (!playerAlive) {
      state.phase = 'gameover';
      state.winner = 'enemy';
      Game.log(state, 'Ваша держава пала. Поражение.', 'elim', state.playerFaction);
    } else if (enemiesAlive === 0) {
      state.phase = 'gameover';
      state.winner = 'player';
      Game.log(state, 'Все враги повержены. Победа!', 'win', state.playerFaction);
    }
  };

  Game.serialize = function (state) {
    const copy = {};
    Object.keys(state).forEach(function (k) {
      if (k === 'fog') copy.fog = Array.from(state.fog);
      else copy[k] = state[k];
    });
    return JSON.stringify(copy);
  };

  Game.deserialize = function (json) {
    const state = JSON.parse(json);
    state.fog = new Uint8Array(state.fog);
    return state;
  };

  Game.xpForNext = function (level) {
    return 100 * level;
  };

  Game.grantXp = function (state, army, amount, reason) {
    if (!army || !army.hero) return;
    const hero = army.hero;
    hero.xp += amount;
    let leveled = false;
    while (hero.level < 5 && hero.xp >= Game.xpForNext(hero.level)) {
      hero.xp -= Game.xpForNext(hero.level);
      hero.level++;
      leveled = true;
    }
    if (leveled) {
      Game.log(state, 'Герой ' + hero.name + ' достиг ' + hero.level + ' уровня!', 'reward', army.faction);
      army.mp = Math.max(army.mp, Game.maxMp(state, army));
    }
  };
})();
