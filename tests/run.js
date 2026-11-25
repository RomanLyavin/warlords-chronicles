'use strict';
const assert = require('assert');
const path = require('path');

require('../js/util.js');
require('../js/data.js');
require('../js/scenarios.js');
require('../js/mapgen.js');
require('../js/state.js');
require('../js/combat.js');
require('../js/actions.js');
require('../js/ai.js');

const WL = globalThis.WL;
const D = WL.Data;
const Game = WL.Game;
const AI = WL.AI;
const U = WL.Util;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  OK  ' + name);
  } catch (e) {
    console.error('  FAIL ' + name);
    console.error(e && e.stack ? e.stack : e);
    process.exitCode = 1;
  }
}

function checkInvariants(state) {
  assert(state.tiles.length === state.w * state.h, 'tile count');
  const seen = new Set();
  state.armies.forEach(function (a) {
    assert(a.x >= 0 && a.y >= 0 && a.x < state.w && a.y < state.h, 'army out of bounds');
    const t = state.tiles[a.y * state.w + a.x];
    assert(D.TERRAIN[t.t].passable, 'army on water at ' + a.x + ',' + a.y);
    const k = a.x + ',' + a.y;
    assert(!seen.has(k), 'two armies on ' + k);
    seen.add(k);
    assert(a.units.length <= Game.MAX_UNITS, 'too many units');
    a.units.forEach(function (u) {
      const max = Game.unitMaxHp(state, a.faction, u.type);
      assert(u.hp > 0 && u.hp <= max, 'bad hp ' + u.hp + '/' + max + ' for ' + u.type);
    });
    if (a.hero) {
      assert(a.hero.level >= 1 && a.hero.level <= 5, 'hero level');
      assert(a.hero.xp >= 0, 'hero xp');
    }
  });
  state.cities.forEach(function (c) {
    assert(c.owner >= -1 && c.owner < state.factions.length, 'city owner');
    assert(c.tier >= 1 && c.tier <= 3, 'city tier');
  });
  state.factions.forEach(function (f) {
    assert(Number.isFinite(f.gold), 'gold finite');
  });
}

console.log('\n[1] Данные и карты');
test('Все сценарии корректны', function () {
  assert(WL.SCENARIOS.length === 3, 'three scenarios');
  WL.SCENARIOS.forEach(function (s) {
    assert(s.cities.length >= 6, s.id + ' cities');
    assert(s.factions.length >= 2, s.id + ' factions');
    const coords = new Set();
    s.cities.concat(s.sites).forEach(function (p) {
      assert(p.x >= 0 && p.y >= 0 && p.x < s.w && p.y < s.h, s.id + ' point in bounds');
      const k = p.x + ',' + p.y;
      assert(!coords.has(k), s.id + ' duplicate point ' + k);
      coords.add(k);
    });
    s.cities.forEach(function (c) {
      assert(c.owner >= -1 && c.owner < s.factions.length, 'scenario owner');
    });
  });
});

test('Генерация карт: проходимость и дороги', function () {
  WL.SCENARIOS.forEach(function (sc) {
    const map = WL.MapGen.generate(sc);
    assert(map.tiles.length === sc.w * sc.h);
    let roads = 0;
    map.tiles.forEach(function (t) { if (t.road) roads++; });
    assert(roads > 20, sc.id + ' has roads');
    // BFS from first city over passable tiles
    const start = sc.cities[0];
    const seen = new Set([start.y * sc.w + start.x]);
    const queue = [[start.x, start.y]];
    while (queue.length) {
      const p = queue.shift();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const x = p[0] + d[0], y = p[1] + d[1];
        if (x < 0 || y < 0 || x >= sc.w || y >= sc.h) return;
        const k = y * sc.w + x;
        if (seen.has(k)) return;
        if (!D.TERRAIN[map.tiles[k].t].passable) return;
        seen.add(k);
        queue.push([x, y]);
      });
    }
    sc.cities.forEach(function (c) {
      assert(seen.has(c.y * sc.w + c.x), sc.id + ' city unreachable: ' + c.name);
    });
  });
});

console.log('\n[2] Новая партия');
test('Создание партии на всех сценариях и сложностях', function () {
  WL.SCENARIOS.forEach(function (sc) {
    ['easy', 'normal', 'hard'].forEach(function (diff) {
      for (let pf = 0; pf < sc.factions.length; pf++) {
        const state = Game.newGame(sc.id, pf, diff);
        checkInvariants(state);
        assert(state.playerFaction === pf);
        assert(state.factions[pf].isPlayer);
        assert(Game.cityCount(state, pf) >= 1, 'player has capital');
        assert(state.fog.some(function (v) { return v === 2; }), 'fog revealed');
      }
    });
  });
});

test('Ход игрока: есть достижимые клетки и движение', function () {
  const state = Game.newGame('valley', 0, 'normal');
  const army = state.armies.filter(function (a) { return a.faction === 0 && a.hero; })[0];
  assert(army, 'player hero army exists');
  const moves = Game.computeMoves(state, army);
  assert(moves.dist.size > 1, 'reachable tiles');
  const startX = army.x, startY = army.y;
  let target = null;
  moves.dist.forEach(function (cost, k) {
    if (target || cost <= 0 || cost > army.mp) return;
    const x = k % state.w, y = Math.floor(k / state.w);
    const city = Game.cityAt(state, x, y);
    const other = Game.armyAt(state, x, y);
    if (!city && !other) target = { x: x, y: y, cost: cost };
  });
  assert(target, 'free target tile');
  const res = Game.moveArmy(state, army, target.x, target.y);
  assert(res.ok, 'move ok: ' + res.error);
  assert(army.x === target.x && army.y === target.y, 'army moved');
  assert(army.mp === Math.max(0, Game.maxMp(state, army) - target.cost), 'mp spent');
  checkInvariants(state);
});

console.log('\n[3] Бой и экономика');
test('Бой: результат определён, потери корректны', function () {
  const state = Game.newGame('valley', 0, 'normal');
  const atk = Game.addArmy(state, 0, 5, 5, ['spearmen', 'archers', 'cavalry'], {});
  const def = Game.addArmy(state, -1, 5, 6, ['militia', 'militia'], { guard: true });
  const battle = Game.battle(state, atk, def, {});
  assert(battle.winner === 'atk' || battle.winner === 'def');
  assert(battle.events.length > 2);
  assert(state.stats.battles === 1);
  checkInvariants(state);
});

test('Захват города и смена владельца', function () {
  const state = Game.newGame('valley', 0, 'normal');
  const city = state.cities.filter(function (c) { return c.owner === -1; })[0];
  assert(city, 'neutral city');
  Game.captureCity(state, city, 0, null);
  assert(city.owner === 0, 'owner changed');
  assert(city.queue.length === 0, 'queue cleared');
});

test('Производство: юнит появляется в городе', function () {
  const state = Game.newGame('valley', 0, 'normal');
  const city = state.cities.filter(function (c) { return c.owner === 0; })[0];
  const army = Game.armyAt(state, city.x, city.y);
  const before = army.units.length;
  assert(Game.enqueue(state, city, 'militia').ok);
  let guard = 0;
  while (army.units.length === before && guard++ < 10) {
    state.currentFaction = 0;
    Game.startTurn(state);
  }
  assert(army.units.length > before, 'unit produced');
  checkInvariants(state);
});

console.log('\n[4] ИИ: автопрогон партий');
WL.SCENARIOS.forEach(function (sc) {
  ['easy', 'normal', 'hard'].forEach(function (diff) {
    test('Симуляция ' + sc.id + ' / ' + diff, function () {
      const state = Game.newGame(sc.id, 0, diff);
      const maxTurns = 30;
      let steps = 0;
      while (!state.winner && state.turn <= maxTurns) {
        const fid = state.currentFaction;
        AI.beginTurn(state, fid);
        let guard = 0;
        while (!state.winner && guard++ < 80) {
          const r = AI.step(state, fid);
          if (r.done) break;
          steps++;
          checkInvariants(state);
        }
        if (state.winner) break;
        Game.advanceFaction(state);
        checkInvariants(state);
      }
      assert(steps > 0, 'AI did something');
      console.log('      -> ходов: ' + state.turn + ', шагов ИИ: ' + steps +
        ', победитель: ' + (state.winner || 'нет') +
        ', города: ' + state.factions.map(function (f) { return Game.cityCount(state, f.id); }).join('/'));
    });
  });
});

console.log('\nПройдено проверок: ' + passed);
