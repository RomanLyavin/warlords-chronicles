(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const D = WL.Data;
  const Game = WL.Game;
  const Art = WL.Art;
  const TILE = 32;

  const Render = WL.Render = {
    TILE: TILE,
    canvas: null,
    ctx: null,
    base: null,
    baseState: null
  };

  Render.init = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  };

  function roadMask(state, x, y) {
    const dirs = [
      [0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8],
      [1, -1, 16], [1, 1, 32], [-1, 1, 64], [-1, -1, 128]
    ];
    let m = 0;
    for (let i = 0; i < dirs.length; i++) {
      const nx = x + dirs[i][0], ny = y + dirs[i][1];
      if (nx < 0 || ny < 0 || nx >= state.w || ny >= state.h) continue;
      const t = state.tiles[ny * state.w + nx];
      if (t.road) m |= dirs[i][2];
    }
    return m;
  }

  Render.buildBase = function (state) {
    const canvas = document.createElement('canvas');
    canvas.width = state.w * TILE;
    canvas.height = state.h * TILE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        const tile = state.tiles[y * state.w + x];
        const variant = Math.floor(U.hash2(x * 3 + 1, y * 7 + 2) * 4);
        ctx.save();
        ctx.translate(x * TILE, y * TILE);
        Art.drawTerrain(ctx, tile.t, variant, 0);
        ctx.restore();
      }
    }
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        const tile = state.tiles[y * state.w + x];
        if (!tile.road) continue;
        const mask = roadMask(state, x, y);
        ctx.save();
        ctx.translate(x * TILE, y * TILE);
        Art.drawRoad(ctx, mask);
        ctx.restore();
      }
    }
    this.base = canvas;
    this.baseState = state;
    if (this.canvas) {
      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
    }
  };

  Render.invalidateBase = function () {
    if (this.baseState) this.buildBase(this.baseState);
  };

  function drawCorners(ctx, px, py, color, inset) {
    const i = inset || 1;
    const len = 7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + i, py + i + len); ctx.lineTo(px + i, py + i); ctx.lineTo(px + i + len, py + i);
    ctx.moveTo(px + TILE - i - len, py + i); ctx.lineTo(px + TILE - i, py + i); ctx.lineTo(px + TILE - i, py + i + len);
    ctx.moveTo(px + i, py + TILE - i - len); ctx.lineTo(px + i, py + TILE - i); ctx.lineTo(px + i + len, py + TILE - i);
    ctx.moveTo(px + TILE - i - len, py + TILE - i); ctx.lineTo(px + TILE - i, py + TILE - i); ctx.lineTo(px + TILE - i, py + TILE - i - len);
    ctx.stroke();
  }

  function armyVisible(state, army) {
    if (army.faction === state.playerFaction) return true;
    if (army.guard) return Game.isExplored(state, army.x, army.y);
    return Game.isVisible(state, army.x, army.y);
  }

  function strongestUnit(state, army) {
    let best = null;
    let bestVal = -1;
    army.units.forEach(function (u) {
      const max = Game.unitMaxHp(state, army.faction, u.type);
      const val = Game.unitStr(state, army.faction, u.type) * (0.4 + 0.6 * u.hp / max);
      if (val > bestVal) { bestVal = val; best = u; }
    });
    return best;
  }

  function armyHp(state, army) {
    let hp = 0, max = 0;
    army.units.forEach(function (u) {
      hp += u.hp;
      max += Game.unitMaxHp(state, army.faction, u.type);
    });
    return { hp: hp, max: max };
  }

  function drawGarrisonBadge(ctx, state, army, px, py) {
    const f = Game.factionOf(state, army.faction);
    const x = px + 18, y = py + 17;
    ctx.fillStyle = 'rgba(10,8,5,0.92)';
    ctx.beginPath();
    ctx.arc(x + 4, y + 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e9dfc7';
    ctx.font = 'bold 10px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(army.units.length), x + 4, y + 4);
    if (army.hero) {
      Art.drawFlag(ctx, px + 2, py + 1, f.color, performance.now(), 1);
    }
    const h = armyHp(state, army);
    if (h.max > 0) {
      ctx.fillStyle = 'rgba(10,8,5,0.8)';
      ctx.fillRect(px + 2, py + 29, 12, 3);
      ctx.fillStyle = h.hp / h.max > 0.4 ? '#6fae55' : '#b3473a';
      ctx.fillRect(px + 2, py + 29, Math.max(1, Math.round(12 * h.hp / h.max)), 3);
    }
  }

  function drawFieldArmy(ctx, state, army, frame, selected) {
    const px = army.x * TILE;
    const py = army.y * TILE;
    const f = Game.factionOf(state, army.faction);
    const unit = strongestUnit(state, army);
    if (unit) {
      ctx.save();
      ctx.translate(px, py);
      Art.drawUnit(ctx, unit.type, f.color, frame);
      ctx.restore();
    }
    if (army.hero && unit) {
      Art.drawFlag(ctx, px + 1, py + 1, f.color, frame, 1);
      ctx.fillStyle = '#f0d98f';
      ctx.font = 'bold 8px Georgia';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(army.hero.level), px + 10, py + 2);
    }
    if (army.units.length > 1) {
      const bx = px + 22, by = py + 22;
      ctx.fillStyle = 'rgba(10,8,5,0.92)';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e9dfc7';
      ctx.font = 'bold 9px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(army.units.length), bx, by + 0.5);
    }
    const h = armyHp(state, army);
    if (h.max > 0) {
      ctx.fillStyle = 'rgba(8,6,4,0.8)';
      ctx.fillRect(px + 5, py + 29, 22, 3);
      const frac = h.hp / h.max;
      ctx.fillStyle = frac > 0.55 ? '#6fae55' : (frac > 0.25 ? '#c8a24a' : '#b3473a');
      ctx.fillRect(px + 5, py + 29, Math.max(1, Math.round(22 * frac)), 3);
    }
    if (selected) drawCorners(ctx, px, py, '#f0d98f', 1);
  }

  Render.draw = function (state, view) {
    if (!this.base || this.baseState !== state) this.buildBase(state);
    const ctx = this.ctx;
    const frame = view.frame || 0;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.base, 0, 0);

    // animated water
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        const tile = state.tiles[y * state.w + x];
        if (tile.t !== 4) continue;
        const variant = Math.floor(U.hash2(x * 3 + 1, y * 7 + 2) * 4);
        ctx.save();
        ctx.translate(x * TILE, y * TILE);
        Art.drawTerrain(ctx, 4, variant, frame);
        ctx.restore();
      }
    }

    // cities
    state.cities.forEach(function (city) {
      const owner = Game.factionOf(state, city.owner);
      ctx.save();
      ctx.translate(city.x * TILE, city.y * TILE);
      Art.drawCity(ctx, city.tier, owner.color, frame, {});
      ctx.restore();
    });

    // sites
    state.sites.forEach(function (site) {
      const ownerColor = site.owner >= 0 ? Game.factionOf(state, site.owner).color : null;
      ctx.save();
      ctx.translate(site.x * TILE, site.y * TILE);
      Art.drawSite(ctx, site.kind, ownerColor, frame, site.cleared);
      if (site.kind === 'mine' && site.owner >= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(1, 1, 6, 6);
        ctx.fillStyle = Game.factionOf(state, site.owner).color;
        ctx.fillRect(2, 2, 4, 4);
      }
      ctx.restore();
    });

    // reachable highlights (under fog so unexplored land stays hidden)
    if (view.reachable && view.army) {
      view.reachable.forEach(function (cost, k) {
        const x = k % state.w, y = Math.floor(k / state.w);
        if (cost <= 0) return;
        if (state.fog[k] === 0) return;
        const hostile = Game.isHostile(state, view.army, x, y);
        ctx.fillStyle = hostile ? 'rgba(200,60,45,0.30)' : 'rgba(90,170,255,0.22)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (hostile) {
          ctx.strokeStyle = 'rgba(230,100,80,0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * TILE + 1.5, y * TILE + 1.5, TILE - 3, TILE - 3);
        }
      });
    }

    // path preview
    if (view.path && view.path.length) {
      ctx.fillStyle = 'rgba(240, 217, 143, 0.85)';
      view.path.forEach(function (p, i) {
        if (i === view.path.length - 1) return;
        ctx.fillRect(p.x * TILE + 14, p.y * TILE + 14, 4, 4);
      });
      const last = view.path[view.path.length - 1];
      ctx.strokeStyle = '#f0d98f';
      ctx.lineWidth = 2;
      ctx.strokeRect(last.x * TILE + 2, last.y * TILE + 2, TILE - 4, TILE - 4);
    }

    // fog
    const fog = state.fog;
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        const v = fog[y * state.w + x];
        if (v === 2) continue;
        if (v === 0) {
          ctx.fillStyle = '#06080b';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          if (U.hash2(x, y) > 0.55) {
            ctx.fillStyle = '#080b0f';
            ctx.fillRect(x * TILE + 8, y * TILE + 10, 12, 10);
          }
        } else {
          ctx.fillStyle = 'rgba(5,8,11,0.56)';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    // armies
    state.armies.forEach(function (army) {
      if (!armyVisible(state, army)) return;
      if (view.ghost && view.ghost.active && view.ghost.armyId === army.id) return;
      const city = Game.cityAt(state, army.x, army.y);
      const selected = view.selected && view.selected.kind === 'army' && view.selected.id === army.id;
      if (city) {
        drawGarrisonBadge(ctx, state, army, army.x * TILE, army.y * TILE);
        if (selected) drawCorners(ctx, army.x * TILE, army.y * TILE, '#f0d98f', 1);
      } else {
        drawFieldArmy(ctx, state, army, frame, selected);
      }
    });

    // selected city / tile
    if (view.selected && view.selected.kind === 'city') {
      drawCorners(ctx, view.selected.x * TILE, view.selected.y * TILE, '#f0d98f', 1);
    }

    // hover
    if (view.hover) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(view.hover.x * TILE + 0.5, view.hover.y * TILE + 0.5, TILE - 1, TILE - 1);
    }

    // ghost unit
    if (view.ghost && view.ghost.active) {
      const g = view.ghost;
      const elapsed = frame - g.started;
      let t = U.clamp(elapsed / g.duration, 0, 1);
      const segCount = Math.max(1, g.path.length - 1);
      const pos = t * segCount;
      const idx = Math.min(segCount - 1, Math.floor(pos));
      const frac = pos - idx;
      const a = g.path[idx], b = g.path[idx + 1] || g.path[idx];
      const gx = U.lerp(a.x, b.x, frac) * TILE;
      const gy = U.lerp(a.y, b.y, frac) * TILE;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.translate(gx, gy);
      Art.drawUnit(ctx, g.type, g.color, frame);
      ctx.restore();
      if (t >= 1) g.active = false;
    }
  };

  Render.drawMinimap = function (canvas, state) {
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#080a08';
    ctx.fillRect(0, 0, cw, ch);
    const scale = Math.min(cw / state.w, ch / state.h);
    const ox = Math.floor((cw - state.w * scale) / 2);
    const oy = Math.floor((ch - state.h * scale) / 2);
    const colors = ['#3f6030', '#2c4a24', '#5a5a30', '#6a665c', '#1d4459', '#8a7448'];
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) {
        const tile = state.tiles[y * state.w + x];
        const fog = state.fog[y * state.w + x];
        if (fog === 0) {
          ctx.fillStyle = '#0a0d0a';
        } else {
          ctx.fillStyle = colors[tile.t];
          if (tile.road) ctx.fillStyle = '#8a6b45';
          if (fog === 1) {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#05070a';
            ctx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
            ctx.globalAlpha = 1;
            ctx.fillStyle = colors[tile.t];
            if (tile.road) ctx.fillStyle = '#8a6b45';
          }
        }
        ctx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
    state.cities.forEach(function (c) {
      if (state.fog[c.y * state.w + c.x] === 0) return;
      const f = Game.factionOf(state, c.owner);
      ctx.fillStyle = f.color;
      ctx.fillRect(ox + c.x * scale - 1, oy + c.y * scale - 1, Math.ceil(scale) + 2, Math.ceil(scale) + 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(ox + c.x * scale, oy + c.y * scale, Math.max(1, Math.floor(scale / 2)), Math.max(1, Math.floor(scale / 2)));
    });
    state.armies.forEach(function (a) {
      if (a.faction !== state.playerFaction && !Game.isVisible(state, a.x, a.y)) return;
      const f = Game.factionOf(state, a.faction);
      ctx.fillStyle = f.color;
      ctx.fillRect(ox + a.x * scale, oy + a.y * scale, Math.max(2, Math.ceil(scale)), Math.max(2, Math.ceil(scale)));
      if (a.faction === state.playerFaction) {
        ctx.fillStyle = '#f0d98f';
        ctx.fillRect(ox + a.x * scale, oy + a.y * scale, 1, 1);
      }
    });
  };

  Render.drawPreview = function (canvas, scenario) {
    const map = WL.MapGen.generate(scenario);
    const cw = canvas.width, ch = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0d0a';
    ctx.fillRect(0, 0, cw, ch);
    const scale = Math.min(cw / scenario.w, ch / scenario.h);
    const ox = Math.floor((cw - scenario.w * scale) / 2);
    const oy = Math.floor((ch - scenario.h * scale) / 2);
    const colors = ['#3f6030', '#2c4a24', '#5a5a30', '#6a665c', '#1d4459', '#8a7448'];
    for (let y = 0; y < scenario.h; y++) {
      for (let x = 0; x < scenario.w; x++) {
        const tile = map.tiles[y * scenario.w + x];
        ctx.fillStyle = colors[tile.t];
        ctx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
        if (tile.road) {
          ctx.fillStyle = '#8a6b45';
          ctx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
        }
      }
    }
    scenario.cities.forEach(function (c) {
      ctx.fillStyle = c.owner >= 0 ? D.FACTIONS[scenario.factions[c.owner]].color : '#8a7a5a';
      const s = Math.max(2, Math.ceil(scale) + 1);
      ctx.fillRect(ox + c.x * scale - 1, oy + c.y * scale - 1, s, s);
      ctx.fillStyle = '#0a0d0a';
      ctx.fillRect(ox + c.x * scale, oy + c.y * scale, 1, 1);
    });
    ctx.strokeStyle = 'rgba(200,162,74,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, scenario.w * scale - 1, scenario.h * scale - 1);
  };

  Render.tileFromEvent = function (state, e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= state.w || ty >= state.h) return null;
    return { x: tx, y: ty };
  };
})();
