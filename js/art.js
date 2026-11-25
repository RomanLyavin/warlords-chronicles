(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;

  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }

  function rngFrom(seed) {
    let s = (seed * 2654435761) >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function shadow(ctx, x, y, rx, ry, alpha) {
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha || 0.28) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function tree(ctx, x, y, h) {
    shadow(ctx, x + 2, y + 2, 7, 2.5, 0.22);
    px(ctx, x - 1, y - 2, 3, 6, '#4a3520');
    const rows = [
      [x - 6, y - 5, 12, 2, '#2f5228'],
      [x - 5, y - 8, 10, 2, '#3a6631'],
      [x - 4, y - 11, 8, 2, '#477a3a'],
      [x - 3, y - 14, 6, 2, '#548a42'],
      [x - 2, y - 16, 4, 2, '#5f9a4a']
    ];
    rows.forEach(function (r) { px(ctx, r[0], r[1], r[2], r[3], r[4]); });
    px(ctx, x - 3, y - 14, 1, 3, '#6aa855');
    px(ctx, x + 3, y - 9, 1, 4, '#2a4a23');
  }

  function drawGrass(ctx, v) {
    px(ctx, 0, 0, 32, 32, '#4a7438');
    const r = rngFrom(v * 17 + 3);
    const shades = ['#416a31', '#527e3d', '#456f35', '#3d652e'];
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(r() * 30), y = Math.floor(r() * 30);
      px(ctx, x, y, 1 + Math.floor(r() * 3), 1, shades[Math.floor(r() * shades.length)]);
    }
    for (let i = 0; i < 5; i++) {
      const x = 2 + Math.floor(r() * 27), y = 4 + Math.floor(r() * 24);
      px(ctx, x, y, 1, 2, '#5c8c46');
      px(ctx, x + 1, y + 1, 1, 1, '#6aa855');
    }
    if (v % 3 === 0) {
      const x = 4 + Math.floor(r() * 22), y = 5 + Math.floor(r() * 20);
      px(ctx, x, y, 1, 1, '#e8d36a');
      px(ctx, x + 2, y + 1, 1, 1, '#e8d36a');
    }
  }

  function drawForest(ctx, v) {
    drawGrass(ctx, v + 5);
    const r = rngFrom(v * 31 + 11);
    const pts = [[7, 12], [20, 10], [12, 23], [25, 22], [2, 26]];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 4 || r() > 0.35) tree(ctx, p[0] + Math.floor(r() * 3), p[1] + Math.floor(r() * 2), 16);
    }
    for (let i = 0; i < 4; i++) {
      const x = 3 + Math.floor(r() * 26), y = 6 + Math.floor(r() * 23);
      px(ctx, x, y, 5, 2, '#3a6631');
      px(ctx, x + 1, y - 1, 3, 1, '#477a3a');
      px(ctx, x + 4, y + 1, 1, 1, '#2f5228');
    }
  }

  function drawHills(ctx, v) {
    drawGrass(ctx, v + 9);
    const r = rngFrom(v * 13 + 7);
    const cx = 16 + Math.floor(r() * 3) - 1;
    for (let i = 0; i < 13; i++) {
      const w = Math.round(8 + i * 1.7);
      const x = Math.round(cx - w / 2);
      const y = 15 + i;
      const c = i < 2 ? '#94a052' : i < 5 ? '#84904a' : i < 9 ? '#6f7c3c' : '#5d6b34';
      px(ctx, x, y, w, 1, c);
      px(ctx, x, y, 2, 1, '#a8b460');
      px(ctx, x + w - 2, y, 2, 1, '#4a5828');
    }
    px(ctx, cx - 10, 27, 20, 1, '#46522a');
    px(ctx, cx - 7, 14, 3, 1, '#a8b460');
    px(ctx, cx + 3, 17, 4, 1, '#9aa85a');
    px(ctx, cx - 2, 20, 2, 1, '#4a5828');
    px(ctx, cx + 6, 23, 3, 1, '#4a5828');
    if (v % 2 === 0) {
      px(ctx, cx - 11, 25, 3, 2, '#6b6a5a');
      px(ctx, cx - 10, 24, 1, 1, '#8a8878');
    }
  }

  function drawMountain(ctx, v) {
    drawGrass(ctx, v + 13);
    const r = rngFrom(v * 23 + 5);
    const cx = 16 + Math.floor(r() * 3) - 1;
    for (let i = 0; i < 21; i++) {
      const w = Math.round(4 + i * 1.25);
      const x = Math.round(cx - w / 2);
      const y = 7 + i;
      let c = '#7a766e';
      if (i < 4) c = '#e8e8e0';
      else if (i < 6) c = '#d0d0c8';
      else if (i < 9) c = '#a8a49c';
      px(ctx, x, y, w, 1, c);
      px(ctx, x + Math.ceil(w / 2), y, Math.floor(w / 2), 1, '#57534c');
      px(ctx, x, y, 1, 1, i < 6 ? '#ffffff' : '#96928a');
    }
    px(ctx, cx - 12, 27, 24, 1, '#3e3a34');
    px(ctx, cx - 13, 28, 26, 1, '#4a4640');
    px(ctx, cx - 3, 12, 2, 8, '#8e8a82');
    px(ctx, cx + 5, 16, 1, 6, '#4a4640');
    px(ctx, cx - 6, 20, 1, 4, '#6a665e');
    px(ctx, cx - 9, 25, 4, 2, '#5e5a52');
    px(ctx, cx + 8, 24, 3, 2, '#4e4a44');
    if (v % 2 === 0) {
      px(ctx, cx - 10, 26, 2, 1, '#d0d0c8');
    }
  }

  function drawWater(ctx, v, frame) {
    px(ctx, 0, 0, 32, 32, '#1d4459');
    px(ctx, 0, 0, 32, 10, '#204a60');
    const off = Math.floor((frame || 0) / 240 + v * 3) % 8;
    const r = rngFrom(v * 7 + 2);
    for (let i = 0; i < 4; i++) {
      const y = 5 + i * 7;
      const x = (off + i * 5 + Math.floor(r() * 4)) % 24;
      px(ctx, x, y, 9, 1, '#2f6a86');
      px(ctx, x + 3, y + 1, 5, 1, '#2a5d77');
      px(ctx, x + 16, y + 2, 6, 1, '#27566e');
    }
    px(ctx, (off * 3) % 28, 13, 2, 1, '#5a9ab5');
    px(ctx, (off * 3 + 15) % 28, 26, 2, 1, '#4a8aa5');
  }

  function drawSand(ctx, v) {
    px(ctx, 0, 0, 32, 32, '#9d8657');
    const r = rngFrom(v * 11 + 4);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(r() * 31), y = Math.floor(r() * 31);
      px(ctx, x, y, 1, 1, r() > 0.5 ? '#b09a68' : '#8a7448');
    }
    px(ctx, 3, 7, 6, 1, '#b09a68');
    px(ctx, 20, 22, 7, 1, '#8a7448');
  }

  const Art = WL.Art = {
    px: px,
    shadow: shadow,

    drawTerrain: function (ctx, type, variant, frame) {
      if (type === 0) drawGrass(ctx, variant);
      else if (type === 1) drawForest(ctx, variant);
      else if (type === 2) drawHills(ctx, variant);
      else if (type === 3) drawMountain(ctx, variant);
      else if (type === 4) drawWater(ctx, variant, frame);
      else drawSand(ctx, variant);
    },

    drawRoad: function (ctx, mask) {
      if (!mask) return;
      const segs = [];
      if (mask & 1) segs.push([16, 16, 16, 0]);
      if (mask & 2) segs.push([16, 16, 32, 16]);
      if (mask & 4) segs.push([16, 16, 16, 32]);
      if (mask & 8) segs.push([16, 16, 0, 16]);
      if (mask & 16) segs.push([16, 16, 32, 0]);
      if (mask & 32) segs.push([16, 16, 32, 32]);
      if (mask & 64) segs.push([16, 16, 0, 32]);
      if (mask & 128) segs.push([16, 16, 0, 0]);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#6e5434';
      ctx.lineWidth = 8;
      segs.forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      });
      ctx.strokeStyle = '#9a7b50';
      ctx.lineWidth = 4;
      segs.forEach(function (s) {
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      });
      px(ctx, 14, 14, 4, 4, '#8a6b45');
      px(ctx, 15, 15, 2, 2, '#a8875c');
    },

    drawFlag: function (ctx, x, y, color, frame, size) {
      const s = size || 1;
      px(ctx, x, y, 1, 8 * s, '#3a2a18');
      const wave = Math.round(Math.sin((frame || 0) / 280 + x * 0.3) * 1);
      px(ctx, x + 1, y + wave, 7 * s, 5 * s, color);
      px(ctx, x + 1, y + wave, 7 * s, 1, U.shade(color, 35));
      px(ctx, x + 5, y + wave, 3 * s, 2 * s, U.shade(color, -35));
    },

    drawCity: function (ctx, tier, color, frame, opts) {
      opts = opts || {};
      const stone = '#8d8577', stoneL = '#b0a894', stoneD = '#5e584c', out = '#332f28';
      const roof = color || '#8a7a5a';
      const roofD = U.shade(roof, -55);
      shadow(ctx, 16, 29, 14, 3, 0.32);

      function tower(x, y, w, h, flag) {
        px(ctx, x - 1, y - 1, w + 2, h + 2, out);
        px(ctx, x, y, w, h, stone);
        px(ctx, x, y, 2, h, stoneL);
        px(ctx, x + w - 2, y, 2, h, stoneD);
        for (let i = 0; i < w; i += 4) px(ctx, x + i, y - 3, 2, 3, stone);
        px(ctx, x + 2, y + 4, 2, 3, '#2a2620');
        if (flag) Art.drawFlag(ctx, x + Math.floor(w / 2), y - 10, roof, frame, 1);
      }

      if (tier === 1) {
        for (let x = 6; x < 27; x += 3) {
          px(ctx, x, 22, 2, 8, '#6b4a2a');
          px(ctx, x, 20, 2, 2, '#8a6b45');
        }
        tower(11, 12, 11, 17, true);
        px(ctx, 13, 24, 7, 5, '#2a2218');
        px(ctx, 14, 23, 5, 2, '#4a3a24');
        px(ctx, 15, 20, 3, 2, '#e8c34a');
      } else if (tier === 2) {
        px(ctx, 2, 20, 28, 9, out);
        px(ctx, 3, 21, 26, 8, stone);
        px(ctx, 3, 21, 26, 1, stoneL);
        for (let x = 3; x < 29; x += 4) px(ctx, x, 18, 2, 3, stone);
        tower(3, 13, 7, 16, false);
        tower(22, 13, 7, 16, true);
        px(ctx, 11, 10, 10, 15, out);
        px(ctx, 12, 11, 8, 14, stoneL);
        px(ctx, 12, 11, 1, 14, stone);
        px(ctx, 14, 8, 4, 3, roofD);
        px(ctx, 13, 10, 6, 2, roof);
        px(ctx, 13, 12, 6, 1, roofD);
        px(ctx, 14, 24, 5, 5, '#2a2218');
        px(ctx, 15, 23, 3, 2, '#4a3a24');
        px(ctx, 24, 22, 3, 3, '#2a2620');
      } else {
        px(ctx, 1, 19, 30, 10, out);
        px(ctx, 2, 20, 28, 9, stone);
        px(ctx, 2, 20, 28, 1, stoneL);
        for (let x = 2; x < 31; x += 4) px(ctx, x, 16, 2, 4, stone);
        tower(2, 12, 7, 18, false);
        tower(23, 12, 7, 18, true);
        px(ctx, 12, 6, 8, 19, out);
        px(ctx, 13, 7, 6, 18, stoneL);
        px(ctx, 13, 7, 1, 18, stone);
        px(ctx, 15, 3, 2, 4, '#3a2a18');
        Art.drawFlag(ctx, 16, 1, roof, frame, 1);
        px(ctx, 10, 13, 3, 12, out);
        px(ctx, 10, 14, 2, 11, stoneD);
        px(ctx, 20, 13, 3, 12, out);
        px(ctx, 21, 14, 2, 11, stoneD);
        px(ctx, 13, 24, 6, 5, '#241d14');
        px(ctx, 14, 22, 4, 2, '#4a3a24');
        px(ctx, 15, 18, 2, 4, '#e8c34a');
        px(ctx, 3, 15, 2, 3, '#2a2620');
        px(ctx, 27, 15, 2, 3, '#2a2620');
      }
      if (opts.selected) {
        ctx.strokeStyle = '#f0d98f';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 30, 30);
      }
    },

    drawSite: function (ctx, kind, color, frame, cleared) {
      shadow(ctx, 16, 28, 12, 3, 0.28);
      if (kind === 'ruin') {
        const c1 = cleared ? '#6a655c' : '#8a8478';
        const c2 = cleared ? '#4e4a44' : '#6a655c';
        function pillar(x, h) {
          px(ctx, x - 1, 28 - h, 7, h, '#332f28');
          px(ctx, x, 27 - h, 5, h - 1, c1);
          px(ctx, x, 27 - h, 1, h - 1, '#a8a296');
          px(ctx, x + 4, 27 - h, 1, h - 1, c2);
          px(ctx, x - 1, 26 - h, 7, 2, c2);
          if (!cleared) px(ctx, x + 1, 24 - h, 2, 2, '#d8d0b8');
        }
        pillar(5, 14);
        pillar(14, 18);
        pillar(23, 11);
        px(ctx, 3, 26, 27, 3, c2);
        px(ctx, 6, 24, 4, 2, c1);
        px(ctx, 20, 25, 5, 2, c1);
        px(ctx, 12, 22, 3, 2, c1);
        if (!cleared) {
          px(ctx, 15, 9, 2, 2, '#c8b47a');
          px(ctx, 18, 12, 1, 1, '#c8b47a');
        }
      } else if (kind === 'temple') {
        const glow = ctx.createRadialGradient(16, 14, 2, 16, 16, 16);
        glow.addColorStop(0, 'rgba(240, 230, 180, 0.35)');
        glow.addColorStop(1, 'rgba(240, 230, 180, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 32, 32);
        px(ctx, 3, 27, 26, 3, '#b8b0a0');
        px(ctx, 4, 25, 24, 2, '#d8d0c0');
        px(ctx, 5, 23, 22, 2, '#c8c0b0');
        for (let x = 7; x <= 23; x += 5) {
          px(ctx, x, 12, 3, 11, '#8a8478');
          px(ctx, x + 1, 12, 1, 11, '#f0ead8');
        }
        px(ctx, 4, 10, 24, 2, '#e8e0d0');
        px(ctx, 5, 8, 22, 2, '#d8d0c0');
        px(ctx, 7, 6, 18, 2, '#c8c0b0');
        px(ctx, 10, 4, 12, 2, '#b8b0a0');
        px(ctx, 14, 1, 4, 3, '#e8c34a');
        px(ctx, 13, 27, 6, 2, '#8a8478');
      } else if (kind === 'mine') {
        px(ctx, 3, 20, 26, 8, '#5e584c');
        px(ctx, 4, 17, 24, 5, '#767066');
        px(ctx, 6, 14, 20, 4, '#8a8478');
        px(ctx, 9, 12, 14, 3, '#6a655c');
        px(ctx, 12, 18, 9, 10, '#2a2218');
        px(ctx, 13, 19, 7, 9, '#14100a');
        px(ctx, 10, 17, 2, 12, '#6b4a2a');
        px(ctx, 21, 17, 2, 12, '#6b4a2a');
        px(ctx, 10, 16, 13, 2, '#8a6b45');
        px(ctx, 15, 22, 3, 2, '#e8c34a');
        px(ctx, 19, 24, 1, 1, '#e8c34a');
        if (color) Art.drawFlag(ctx, 24, 8, color, frame, 1);
      }
    },

    drawUnit: function (ctx, type, color, frame, opts) {
      opts = opts || {};
      const dark = U.shade(color || '#3f7fd4', -55);
      const light = U.shade(color || '#3f7fd4', 40);
      const skin = '#d9a066', skinD = '#a8703a';
      const metal = '#b8c0c8', metalD = '#6e7882';
      const wood = '#7a5636', woodD = '#4a3320';
      const out = '#241d14';
      shadow(ctx, 16, 29, 9, 3, 0.28);

      function legs(y, c) {
        px(ctx, 12, y, 3, 5, out); px(ctx, 13, y, 2, 4, c || '#3d3226');
        px(ctx, 17, y, 3, 5, out); px(ctx, 18, y, 2, 4, c || '#3d3226');
        px(ctx, 12, y + 4, 3, 2, '#2a2218');
        px(ctx, 18, y + 4, 3, 2, '#2a2218');
      }

      if (type === 'militia' || type === 'spearmen' || type === 'archers' || type === 'healer' || type === 'hero') {
        // spear / weapon behind
        if (type === 'spearmen' || type === 'militia' || type === 'hero') {
          for (let i = 0; i < 20; i++) {
            const x = 23 - Math.floor(i * 0.25), y = 27 - i;
            px(ctx, x, y, 1, 2, wood);
          }
          px(ctx, 18, 5, 2, 4, metalD);
          px(ctx, 19, 4, 1, 2, '#e8e8e8');
        }
        legs(23, '#3d3226');
        // body
        px(ctx, 9, 12, 14, 12, out);
        px(ctx, 10, 13, 12, 10, color);
        px(ctx, 10, 13, 2, 10, light);
        px(ctx, 19, 13, 3, 10, dark);
        px(ctx, 10, 20, 12, 2, '#5a3a1a');
        px(ctx, 11, 22, 10, 2, U.shade(color, -20));
        // arm
        px(ctx, 20, 15, 3, 6, skin);
        px(ctx, 20, 20, 3, 2, skinD);
        // head
        px(ctx, 12, 5, 8, 8, out);
        px(ctx, 13, 6, 6, 6, skin);
        px(ctx, 13, 10, 6, 2, skinD);
        px(ctx, 16, 8, 1, 1, '#241d14');
        px(ctx, 17, 8, 1, 1, '#241d14');
        // helmet
        px(ctx, 12, 3, 8, 3, metalD);
        px(ctx, 12, 2, 8, 1, metal);
        px(ctx, 12, 4, 1, 3, metalD);
        if (type === 'spearmen') px(ctx, 15, 0, 2, 3, '#b3473a');
        // shield
        px(ctx, 4, 13, 8, 12, out);
        px(ctx, 5, 14, 6, 10, dark);
        px(ctx, 6, 15, 4, 8, color);
        px(ctx, 7, 17, 2, 2, '#e8c34a');
        px(ctx, 5, 14, 1, 10, light);

        if (type === 'archers') {
          // hood
          px(ctx, 11, 3, 10, 6, dark);
          px(ctx, 12, 2, 8, 3, U.shade(color, -20));
          px(ctx, 13, 6, 6, 4, skin);
          px(ctx, 12, 9, 8, 2, U.shade(color, -35));
          // bow
          for (let i = 0; i < 18; i++) {
            const yy = 7 + i;
            const off = Math.round(Math.sin(i / 17 * Math.PI) * 4);
            px(ctx, 25 + off, yy, 1, 1, wood);
          }
          px(ctx, 25, 7, 1, 1, '#d8d0b0');
          px(ctx, 25, 24, 1, 1, '#d8d0b0');
          px(ctx, 24, 8, 1, 16, '#d8d0b0');
          px(ctx, 24, 15, 5, 1, '#c8b48a');
        } else if (type === 'healer') {
          px(ctx, 10, 12, 12, 12, '#e8e0d0');
          px(ctx, 10, 12, 2, 12, '#fff8e8');
          px(ctx, 19, 12, 3, 12, '#c8c0b0');
          px(ctx, 10, 22, 12, 2, '#b8b0a0');
          px(ctx, 12, 4, 8, 7, out);
          px(ctx, 13, 5, 6, 5, skin);
          px(ctx, 11, 3, 10, 4, '#e8e0d0');
          px(ctx, 11, 6, 2, 6, '#e8e0d0');
          px(ctx, 19, 6, 2, 6, '#e8e0d0');
          px(ctx, 15, 14, 2, 6, '#e8c34a');
          px(ctx, 13, 16, 6, 2, '#e8c34a');
          // staff
          px(ctx, 25, 8, 2, 21, woodD);
          px(ctx, 24, 5, 4, 4, '#e8c34a');
          px(ctx, 25, 6, 2, 2, '#fff0b0');
        } else if (type === 'hero') {
          // cape
          px(ctx, 7, 12, 5, 13, U.shade(color, -30));
          px(ctx, 6, 22, 6, 4, U.shade(color, -45));
          // crown
          px(ctx, 12, 2, 8, 2, '#e8c34a');
          px(ctx, 12, 0, 2, 2, '#e8c34a');
          px(ctx, 16, 0, 2, 2, '#e8c34a');
          px(ctx, 19, 0, 1, 2, '#e8c34a');
          // sword raised
          px(ctx, 26, 5, 2, 16, metal);
          px(ctx, 26, 3, 2, 2, '#e8e8e8');
          px(ctx, 24, 19, 6, 2, '#e8c34a');
          // banner
          px(ctx, 28, 2, 1, 12, woodD);
          px(ctx, 29, 3, 3, 4, color);
        }
      } else if (type === 'cavalry') {
        // horse
        px(ctx, 4, 16, 21, 10, out);
        px(ctx, 5, 17, 19, 8, '#7a5636');
        px(ctx, 5, 17, 19, 2, '#8f6842');
        px(ctx, 5, 24, 19, 1, '#5a3e24');
        px(ctx, 7, 25, 3, 5, '#4a3320');
        px(ctx, 12, 25, 3, 5, '#4a3320');
        px(ctx, 18, 25, 3, 5, '#4a3320');
        px(ctx, 23, 25, 2, 4, '#4a3320');
        // neck + head
        px(ctx, 21, 10, 6, 9, out);
        px(ctx, 22, 11, 4, 8, '#7a5636');
        px(ctx, 23, 8, 7, 5, out);
        px(ctx, 24, 9, 5, 3, '#8f6842');
        px(ctx, 28, 9, 1, 1, '#241d14');
        px(ctx, 24, 6, 2, 3, '#5a3e24');
        px(ctx, 23, 11, 1, 4, '#5a3e24');
        // tail
        px(ctx, 2, 17, 3, 2, '#4a3320');
        px(ctx, 1, 19, 2, 5, '#4a3320');
        // saddle
        px(ctx, 10, 14, 9, 4, dark);
        px(ctx, 11, 14, 7, 2, color);
        // rider
        px(ctx, 12, 6, 7, 8, out);
        px(ctx, 13, 7, 5, 6, color);
        px(ctx, 13, 12, 5, 2, dark);
        px(ctx, 13, 3, 6, 4, out);
        px(ctx, 14, 4, 4, 3, skin);
        px(ctx, 13, 2, 6, 2, metal);
        px(ctx, 15, 0, 2, 3, '#b3473a');
        // lance
        for (let i = 0; i < 16; i++) px(ctx, 27 - i, 13 - i, 2, 2, wood);
        px(ctx, 28, 12, 3, 2, metal);
        px(ctx, 30, 11, 1, 2, '#e8e8e8');
      } else if (type === 'catapult') {
        px(ctx, 5, 20, 22, 7, out);
        px(ctx, 6, 21, 20, 5, wood);
        px(ctx, 6, 21, 20, 1, '#8f6842');
        px(ctx, 8, 25, 16, 1, woodD);
        // wheels
        function wheel(x, y) {
          px(ctx, x - 3, y - 3, 7, 7, '#241d14');
          px(ctx, x - 2, y - 2, 5, 5, '#5a3e24');
          px(ctx, x - 1, y - 1, 3, 3, '#2a2218');
          px(ctx, x, y - 2, 1, 5, '#8a6b45');
          px(ctx, x - 2, y, 5, 1, '#8a6b45');
        }
        wheel(9, 27); wheel(23, 27);
        // arm
        for (let i = 0; i < 17; i++) px(ctx, 10 + i, 21 - i, 2, 2, '#6b4a2a');
        px(ctx, 8, 18, 5, 5, '#3a2a18');
        px(ctx, 24, 5, 3, 3, '#8a8478');
        px(ctx, 23, 4, 5, 1, '#c8c0b0');
        // banner
        Art.drawFlag(ctx, 6, 9, color, frame, 1);
      } else if (type === 'troll') {
        px(ctx, 8, 13, 16, 15, out);
        px(ctx, 9, 14, 14, 13, '#4a7a3a');
        px(ctx, 9, 14, 3, 13, '#5f9a4a');
        px(ctx, 19, 14, 4, 13, '#3a5e2e');
        // head
        px(ctx, 10, 4, 12, 10, out);
        px(ctx, 11, 5, 10, 8, '#5f9a4a');
        px(ctx, 11, 9, 10, 3, '#4a7a3a');
        px(ctx, 13, 6, 2, 2, '#c0392b');
        px(ctx, 18, 6, 2, 2, '#c0392b');
        px(ctx, 12, 11, 2, 2, '#e8e0d0');
        px(ctx, 19, 11, 2, 2, '#e8e0d0');
        px(ctx, 15, 12, 3, 1, '#241d14');
        // arms
        px(ctx, 5, 15, 4, 10, out);
        px(ctx, 6, 16, 2, 8, '#4a7a3a');
        px(ctx, 23, 14, 4, 11, out);
        px(ctx, 24, 15, 2, 9, '#4a7a3a');
        // club
        px(ctx, 26, 6, 4, 13, '#5a3e24');
        px(ctx, 25, 4, 6, 5, '#4a3320');
        px(ctx, 26, 2, 4, 3, '#6b4a2a');
        px(ctx, 27, 2, 1, 1, '#8a8478');
      } else if (type === 'dragon') {
        // wings
        ctx.fillStyle = '#6a2a24';
        ctx.beginPath();
        ctx.moveTo(12, 16); ctx.lineTo(2, 4); ctx.lineTo(5, 16); ctx.lineTo(1, 14);
        ctx.lineTo(9, 24); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(19, 16); ctx.lineTo(29, 4); ctx.lineTo(27, 16); ctx.lineTo(31, 14);
        ctx.lineTo(23, 24); ctx.closePath(); ctx.fill();
        // body
        px(ctx, 10, 15, 14, 11, out);
        px(ctx, 11, 16, 12, 9, '#8a3a2a');
        px(ctx, 11, 16, 12, 3, '#a84a32');
        px(ctx, 12, 22, 10, 2, '#6a2a1e');
        // neck + head
        px(ctx, 21, 8, 6, 10, out);
        px(ctx, 22, 9, 4, 9, '#8a3a2a');
        px(ctx, 24, 6, 7, 6, out);
        px(ctx, 25, 7, 5, 4, '#a84a32');
        px(ctx, 29, 8, 1, 1, '#e8c34a');
        px(ctx, 25, 5, 1, 2, '#e8e0d0');
        px(ctx, 27, 5, 1, 2, '#e8e0d0');
        // tail
        px(ctx, 4, 22, 7, 2, '#8a3a2a');
        px(ctx, 2, 20, 3, 2, '#6a2a1e');
        // legs
        px(ctx, 12, 25, 3, 4, '#6a2a1e');
        px(ctx, 19, 25, 3, 4, '#6a2a1e');
        // fire
        px(ctx, 30, 10, 1, 1, '#e8a34a');
        px(ctx, 31, 11, 1, 1, '#e8c34a');
      }
      if (opts.selected) {
        ctx.strokeStyle = '#f0d98f';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 30, 30);
      }
    },

    drawCrest: function (ctx, key, size) {
      size = size || 32;
      const s = size / 32;
      ctx.save();
      ctx.scale(s, s);
      const colors = {
        lion: ['#3f7fd4', '#1d3f73', '#a9c8ff'],
        moon: ['#9a5cf0', '#4a1f7a', '#d3b0ff'],
        anvil: ['#d08a3a', '#6b3f14', '#f0c080'],
        skull: ['#7aa83a', '#3d5a18', '#b8e070'],
        neutral: ['#8a7a5a', '#4a3f2a', '#c8b898']
      };
      const c = colors[key] || colors.neutral;
      ctx.beginPath();
      ctx.moveTo(4, 3);
      ctx.lineTo(28, 3);
      ctx.lineTo(28, 17);
      ctx.quadraticCurveTo(28, 27, 16, 31);
      ctx.quadraticCurveTo(4, 27, 4, 17);
      ctx.closePath();
      ctx.fillStyle = c[0];
      ctx.fill();
      ctx.strokeStyle = '#1a140d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, 5);
      ctx.lineTo(26, 5);
      ctx.lineTo(26, 17);
      ctx.quadraticCurveTo(26, 25, 16, 29);
      ctx.quadraticCurveTo(6, 25, 6, 17);
      ctx.closePath();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f0d98f';
      if (key === 'lion') {
        // crown
        ctx.beginPath();
        ctx.moveTo(10, 14); ctx.lineTo(10, 9); ctx.lineTo(13, 12); ctx.lineTo(16, 7);
        ctx.lineTo(19, 12); ctx.lineTo(22, 9); ctx.lineTo(22, 14);
        ctx.closePath(); ctx.fill();
        ctx.fillRect(10, 15, 12, 2);
        ctx.fillStyle = '#1a140d';
        ctx.fillRect(12, 18, 2, 2);
        ctx.fillRect(18, 18, 2, 2);
        ctx.fillStyle = '#f0d98f';
        ctx.fillRect(11, 21, 10, 2);
      } else if (key === 'moon') {
        ctx.beginPath();
        ctx.arc(16, 17, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c[0];
        ctx.beginPath();
        ctx.arc(19, 14, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (key === 'anvil') {
        ctx.fillRect(9, 11, 14, 4);
        ctx.fillRect(12, 15, 8, 3);
        ctx.fillRect(14, 18, 4, 5);
        ctx.fillRect(11, 23, 10, 3);
      } else {
        ctx.beginPath();
        ctx.arc(16, 15, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(11, 18, 10, 6);
        ctx.fillStyle = '#1a140d';
        ctx.fillRect(12, 13, 3, 3);
        ctx.fillRect(17, 13, 3, 3);
        ctx.fillRect(15, 18, 2, 2);
        ctx.fillRect(12, 21, 8, 1);
      }
      ctx.restore();
    }
  };
})();
