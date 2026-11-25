(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const D = WL.Data;
  const Game = WL.Game = WL.Game || {};

  function snapshotUnits(state, army) {
    return army.units.map(function (u) {
      return { type: u.type, hp: u.hp, maxHp: Game.unitMaxHp(state, army.faction, u.type) };
    });
  }

  function aliveIndexes(units) {
    const out = [];
    for (let i = 0; i < units.length; i++) if (units[i].hp > 0) out.push(i);
    return out;
  }

  function sortForRound(state, army, units) {
    const idx = aliveIndexes(units);
    idx.sort(function (a, b) {
      const ra = D.UNITS[units[a].type].ranged || 0;
      const rb = D.UNITS[units[b].type].ranged || 0;
      if (ra !== rb) return rb - ra;
      return Game.unitStr(state, army.faction, units[b].type) - Game.unitStr(state, army.faction, units[a].type);
    });
    return idx;
  }

  function pickTarget(units) {
    const alive = aliveIndexes(units);
    if (!alive.length) return -1;
    return alive[Math.floor(Math.random() * alive.length)];
  }

  Game.battle = function (state, atk, def, ctx) {
    ctx = ctx || {};
    const atkSnap = snapshotUnits(state, atk);
    const defSnap = snapshotUnits(state, def);
    const atkFaction = Game.factionOf(state, atk.faction);
    const defFaction = Game.factionOf(state, def.faction);
    const city = ctx.city || null;
    const isCity = !!city;
    const wall = isCity ? D.CITY_TIERS[city.tier].wall : 0;
    const terrainDef = ctx.terrainDef || 0;

    const events = [];
    let atkLosses = 0;
    let defLosses = 0;

    function unitLabel(side, idx) {
      const arr = side === 'atk' ? atk.units : def.units;
      const u = arr[idx];
      if (!u) return '?';
      return Game.unitName(state, side === 'atk' ? atk.faction : def.faction, u.type);
    }

    function performAttack(side, actorIdx, round) {
      const isAtk = side === 'atk';
      const actorArmy = isAtk ? atk : def;
      const targetArmy = isAtk ? def : atk;
      const actor = actorArmy.units[actorIdx];
      if (!actor || actor.hp <= 0) return;
      const tIdx = pickTarget(targetArmy.units);
      if (tIdx < 0) return;
      const target = targetArmy.units[tIdx];
      const actorDef = D.UNITS[actor.type];
      const maxHp = Game.unitMaxHp(state, actorArmy.faction, actor.type);
      const frac = Math.max(0, actor.hp / maxHp);
      let dmg = Game.unitStr(state, actorArmy.faction, actor.type) * (0.6 + 0.4 * frac);
      dmg *= 0.8 + Math.random() * 0.4;
      if (actorArmy.hero) dmg *= 1 + 0.04 * (actorArmy.hero.level - 1);
      if (actorDef.ranged) dmg *= 1.15;
      if (actorDef.siege && isCity) dmg *= 1.6;
      if (actor.type === 'cavalry' && round === 1 && !isCity) dmg *= 1.3;

      let reduce = isCity ? wall : terrainDef;
      if (targetArmy.hero) reduce += 0.03 * (targetArmy.hero.level - 1);
      if (actorDef.siege && isCity) reduce = 0;
      reduce = U.clamp(reduce, 0, 0.6);
      dmg *= 1 - reduce;
      dmg = Math.max(1, Math.round(dmg));

      target.hp -= dmg;
      const killed = target.hp <= 0;
      if (killed) {
        target.hp = 0;
        if (isAtk) defLosses++; else atkLosses++;
      }
      events.push({
        t: 'hit',
        side: side,
        actor: actorIdx,
        target: tIdx,
        dmg: dmg,
        hp: target.hp,
        maxHp: Game.unitMaxHp(state, targetArmy.faction, target.type),
        killed: killed,
        ranged: !!def.ranged,
        text: unitLabel(side, actorIdx) + ' → ' + unitLabel(isAtk ? 'def' : 'atk', tIdx) +
          ': ' + dmg + (killed ? ' — пал' : '')
      });
    }

    function doHeal(side) {
      const army = side === 'atk' ? atk : def;
      const healerIdx = army.units.findIndex(function (u) { return u.hp > 0 && D.UNITS[u.type].heal; });
      if (healerIdx < 0) return;
      let best = -1, bestMissing = 0;
      army.units.forEach(function (u, i) {
        if (u.hp <= 0) return;
        const max = Game.unitMaxHp(state, army.faction, u.type);
        const missing = max - u.hp;
        if (missing > bestMissing) { bestMissing = missing; best = i; }
      });
      if (best < 0) return;
      const amount = Math.min(D.UNITS[army.units[healerIdx].type].heal, bestMissing);
      if (amount <= 0) return;
      army.units[best].hp += amount;
      events.push({
        t: 'heal',
        side: side,
        actor: healerIdx,
        target: best,
        amount: amount,
        hp: army.units[best].hp,
        text: unitLabel(side, healerIdx) + ' лечит ' + unitLabel(side, best) + ' на ' + amount
      });
    }

    let round = 0;
    let winner = null;
    for (round = 1; round <= 12; round++) {
      events.push({ t: 'round', n: round });
      const orderAtk = sortForRound(state, atk, atk.units);
      for (let i = 0; i < orderAtk.length; i++) {
        if (atk.units[orderAtk[i]].hp <= 0) continue;
        performAttack('atk', orderAtk[i], round);
        if (!aliveIndexes(def.units).length) break;
      }
      if (!aliveIndexes(def.units).length) { winner = 'atk'; break; }
      const orderDef = sortForRound(state, def, def.units);
      for (let i = 0; i < orderDef.length; i++) {
        if (def.units[orderDef[i]].hp <= 0) continue;
        performAttack('def', orderDef[i], round);
        if (!aliveIndexes(atk.units).length) break;
      }
      if (!aliveIndexes(atk.units).length) { winner = 'def'; break; }
      doHeal('atk');
      doHeal('def');
    }
    if (!winner) winner = 'def';

    events.push({ t: 'end', winner: winner });

    const atkSurvivors = atk.units.filter(function (u) { return u.hp > 0; });
    const defSurvivors = def.units.filter(function (u) { return u.hp > 0; });
    atk.units = atkSurvivors;
    def.units = defSurvivors;

    if (!def.units.length) Game.removeArmy(state, def);
    if (!atk.units.length) Game.removeArmy(state, atk);

    state.stats.battles++;
    if (winner === 'atk') state.stats.wins++; else state.stats.losses++;
    state.stats.unitsLost += atkLosses;

    if (winner === 'atk' && atk.hero) Game.grantXp(state, atk, 25 + defLosses * 10, 'battle');
    if (winner === 'def' && def.hero) Game.grantXp(state, def, 20 + atkLosses * 10, 'battle');

    const place = isCity ? ('у стен ' + city.name) : 'в открытом поле';
    const outcome = atkFaction.name + (winner === 'atk' ? ' побеждает' : ' разбита');
    const summary = 'Потери: ' + atkLosses + ' / ' + defLosses + '.';
    Game.log(state, 'Битва ' + place + ': ' + atkFaction.name + ' против ' + defFaction.name + '. ' + outcome + '. ' + summary,
      'battle', winner === 'atk' ? atk.faction : def.faction);

    return {
      place: isCity ? city.name : 'Открытое поле',
      atkFaction: atk.faction,
      defFaction: def.faction,
      atkName: atkFaction.name,
      defName: defFaction.name,
      atkColor: atkFaction.color,
      defColor: defFaction.color,
      atkHero: atk.hero ? U.clone(atk.hero) : null,
      defHero: def.hero ? U.clone(def.hero) : null,
      atkUnits: atkSnap,
      defUnits: defSnap,
      events: events,
      winner: winner,
      rounds: round,
      summary: summary,
      outcome: outcome,
      atkLosses: atkLosses,
      defLosses: defLosses
    };
  };
})();
