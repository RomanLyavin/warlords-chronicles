(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) {
      this.seed = (seed >>> 0) || 1;
      this._f = mulberry32(this.seed);
    }
    next() { return this._f(); }
    int(n) { return Math.floor(this.next() * n); }
    range(a, b) { return a + this.next() * (b - a); }
    irange(a, b) { return Math.floor(this.range(a, b + 1)); }
    pick(arr) { return arr[this.int(arr.length)]; }
    chance(p) { return this.next() < p; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = this.int(i + 1);
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  }

  const Util = {
    clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
    cheb(x1, y1, x2, y2) { return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); },
    key(x, y, w) { return y * w + x; },
    sum(arr, fn) {
      let s = 0;
      for (let i = 0; i < arr.length; i++) s += fn ? fn(arr[i], i) : arr[i];
      return s;
    },
    signed(n) { return (n > 0 ? '+' : '') + n; },
    escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
    clone(o) { return JSON.parse(JSON.stringify(o)); },
    hash2(x, y) {
      let h = (x * 374761393 + y * 668265263) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    },
    shade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      r = Util.clamp(Math.round(r + amt), 0, 255);
      g = Util.clamp(Math.round(g + amt), 0, 255);
      b = Util.clamp(Math.round(b + amt), 0, 255);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    plural(n, one, few, many) {
      const a = Math.abs(n) % 100;
      const b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    }
  };

  WL.RNG = RNG;
  WL.Util = Util;
})();
