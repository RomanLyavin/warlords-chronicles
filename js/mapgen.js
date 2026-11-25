(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const RNG = WL.RNG;

  const DIRS8 = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  function inBounds(w, h, x, y) {
    return x >= 0 && y >= 0 && x < w && y < h;
  }

  function aStar(w, h, start, goal, enterCost) {
    const sk = U.key(start.x, start.y, w);
    const gk = U.key(goal.x, goal.y, w);
    if (sk === gk) return [];
    const gScore = new Map([[sk, 0]]);
    const came = new Map();
    const open = [{ k: sk, x: start.x, y: start.y, g: 0, f: 0 }];
    const closed = new Set();

    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bi].f) bi = i;
      }
      const cur = open.splice(bi, 1)[0];
      if (cur.k === gk) {
        const path = [];
        let k = gk;
        while (k !== sk) {
          path.push({ x: k % w, y: Math.floor(k / w) });
          k = came.get(k);
          if (k === undefined) return [];
        }
        path.reverse();
        return path;
      }
      if (closed.has(cur.k)) continue;
      closed.add(cur.k);

      for (let d = 0; d < 8; d++) {
        const nx = cur.x + DIRS8[d][0];
        const ny = cur.y + DIRS8[d][1];
        if (!inBounds(w, h, nx, ny)) continue;
        const nk = U.key(nx, ny, w);
        if (closed.has(nk)) continue;
        const diag = d >= 4;
        const step = enterCost(nx, ny) * (diag ? 1.35 : 1);
        const ng = cur.g + step;
        if (!gScore.has(nk) || ng < gScore.get(nk)) {
          gScore.set(nk, ng);
          came.set(nk, cur.k);
          const hx = Math.abs(goal.x - nx);
          const hy = Math.abs(goal.y - ny);
          const hcost = (hx + hy) * 0.9;
          open.push({ k: nk, x: nx, y: ny, g: ng, f: ng + hcost });
        }
      }
    }
    return [];
  }

  function generate(scenario) {
    const w = scenario.w, h = scenario.h;
    const rng = new RNG(scenario.seed);
    const tiles = new Array(w * h);
    for (let i = 0; i < tiles.length; i++) tiles[i] = { t: 0, road: false };

    const cities = scenario.cities.map(function (c) {
      return { x: c.x, y: c.y, name: c.name, tier: c.tier, owner: c.owner };
    });

    const reserved = new Uint8Array(w * h);
    function reserve(x, y, r) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (inBounds(w, h, nx, ny)) reserved[U.key(nx, ny, w)] = 1;
        }
      }
    }
    cities.forEach(function (c) { reserve(c.x, c.y, 1); });
    scenario.sites.forEach(function (s) { reserve(s.x, s.y, 1); });

    // ---- Roads: minimum spanning tree over cities + a few loops ----
    const edges = [];
    const used = new Set([0]);
    const inTree = [0];
    while (inTree.length < cities.length) {
      let best = null;
      for (let i = 0; i < inTree.length; i++) {
        for (let j = 0; j < cities.length; j++) {
          if (used.has(j)) continue;
          const a = cities[inTree[i]], b = cities[j];
          const d = U.dist(a.x, a.y, b.x, b.y);
          if (!best || d < best.d) best = { a: inTree[i], b: j, d: d };
        }
      }
      if (!best) break;
      used.add(best.b);
      inTree.push(best.b);
      edges.push([best.a, best.b]);
    }

    const extra = [];
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        if (edges.some(function (e) { return (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i); })) continue;
        extra.push({ i: i, j: j, d: U.dist(cities[i].x, cities[i].y, cities[j].x, cities[j].y) });
      }
    }
    extra.sort(function (a, b) { return a.d - b.d; });
    for (let i = 0; i < Math.min(3, extra.length); i++) edges.push([extra[i].i, extra[i].j]);

    function roadCost(x, y) {
      const t = tiles[U.key(x, y, w)];
      if (t.road) return 0.45;
      const jitter = 0.8 + U.hash2(x + 17, y + 31) * 0.5;
      return jitter;
    }

    edges.forEach(function (e) {
      const a = cities[e[0]], b = cities[e[1]];
      const path = aStar(w, h, a, b, roadCost);
      path.forEach(function (p) {
        tiles[U.key(p.x, p.y, w)].road = true;
      });
    });

    // City tiles are road hubs as well
    cities.forEach(function (c) {
      tiles[U.key(c.x, c.y, w)].road = true;
    });

    // ---- Terrain clusters ----
    function canPlace(x, y) {
      return inBounds(w, h, x, y) && !reserved[U.key(x, y, w)];
    }

    function walkBlob(x, y, steps, type) {
      let cx = x, cy = y;
      for (let s = 0; s < steps; s++) {
        if (canPlace(cx, cy)) tiles[U.key(cx, cy, w)].t = type;
        const dir = DIRS8[rng.int(8)];
        cx = U.clamp(cx + dir[0], 0, w - 1);
        cy = U.clamp(cy + dir[1], 0, h - 1);
        if (rng.chance(0.35)) {
          const nx = U.clamp(cx + rng.int(3) - 1, 0, w - 1);
          const ny = U.clamp(cy + rng.int(3) - 1, 0, h - 1);
          if (canPlace(nx, ny)) tiles[U.key(nx, ny, w)].t = type;
        }
      }
    }

    const area = w * h;
    function seedSpots(n) {
      const spots = [];
      for (let i = 0; i < n; i++) {
        spots.push({ x: rng.int(w), y: rng.int(h) });
      }
      return spots;
    }

    seedSpots(Math.max(4, Math.floor(area / 70))).forEach(function (p) {
      walkBlob(p.x, p.y, rng.irange(8, 22), 1);
    });
    seedSpots(Math.max(3, Math.floor(area / 130))).forEach(function (p) {
      walkBlob(p.x, p.y, rng.irange(5, 13), 2);
    });
    seedSpots(Math.max(2, Math.floor(area / 210))).forEach(function (p) {
      walkBlob(p.x, p.y, rng.irange(3, 8), 3);
    });
    seedSpots(Math.max(2, Math.floor(area / 260))).forEach(function (p) {
      walkBlob(p.x, p.y, rng.irange(3, 7), 5);
    });

    // ---- Lakes, kept away from roads and sites ----
    const waterReserved = new Uint8Array(w * h);
    for (let i = 0; i < waterReserved.length; i++) waterReserved[i] = reserved[i];
    cities.forEach(function (c) { reserve2(c.x, c.y, 2); });
    scenario.sites.forEach(function (s) { reserve2(s.x, s.y, 2); });
    function reserve2(x, y, r) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (inBounds(w, h, nx, ny)) waterReserved[U.key(nx, ny, w)] = 1;
        }
      }
    }

    const lakeCount = Math.max(1, Math.floor(area / 300));
    for (let l = 0; l < lakeCount; l++) {
      let sx = rng.int(w), sy = rng.int(h);
      for (let tries = 0; tries < 30; tries++) {
        const tx = rng.int(w), ty = rng.int(h);
        if (!waterReserved[U.key(tx, ty, w)] && !tiles[U.key(tx, ty, w)].road) { sx = tx; sy = ty; break; }
      }
      let cx = sx, cy = sy;
      const size = rng.irange(7, 16);
      for (let s = 0; s < size; s++) {
        const k = U.key(cx, cy, w);
        if (!waterReserved[k] && !tiles[k].road) tiles[k].t = 4;
        const dir = DIRS8[rng.int(8)];
        cx = U.clamp(cx + dir[0], 0, w - 1);
        cy = U.clamp(cy + dir[1], 0, h - 1);
      }
    }

    // Never drown a city or its ring
    cities.forEach(function (c) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = c.x + dx, y = c.y + dy;
          if (inBounds(w, h, x, y) && tiles[U.key(x, y, w)].t === 4) {
            tiles[U.key(x, y, w)].t = 0;
          }
        }
      }
    });

    // A little scattered texture
    for (let i = 0; i < Math.floor(area / 45); i++) {
      const x = rng.int(w), y = rng.int(h);
      const k = U.key(x, y, w);
      if (reserved[k] || tiles[k].road || tiles[k].t !== 0) continue;
      const r = rng.next();
      if (r < 0.14) tiles[k].t = 1;
      else if (r < 0.2) tiles[k].t = 2;
    }

    return { w: w, h: h, tiles: tiles, cities: cities };
  }

  WL.MapGen = { generate: generate, aStar: aStar };
})();
