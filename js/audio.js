(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};

  const Audio = WL.Audio = {
    ctx: null,
    enabled: true,
    ready: false
  };

  Audio.init = function () {
    if (Audio.ctx) {
      if (Audio.ctx.state === 'suspended') Audio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      Audio.ctx = new Ctx();
      Audio.ready = true;
    } catch (e) { /* ignore */ }
  };

  function tone(freq, dur, type, gain, when, slideTo) {
    if (!Audio.ctx || !Audio.enabled) return;
    const ctx = Audio.ctx;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, when) {
    if (!Audio.ctx || !Audio.enabled) return;
    const ctx = Audio.ctx;
    const t0 = ctx.currentTime + (when || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
  }

  Audio.play = function (name) {
    if (!Audio.enabled) return;
    Audio.init();
    if (!Audio.ctx) return;
    if (name === 'click') tone(620, 0.05, 'square', 0.03, 0, 420);
    else if (name === 'move') { tone(170, 0.09, 'sine', 0.06, 0, 120); noise(0.05, 0.02, 0); }
    else if (name === 'coin') { tone(880, 0.08, 'triangle', 0.05); tone(1320, 0.12, 'triangle', 0.04, 0.06); }
    else if (name === 'battle') { noise(0.28, 0.09); tone(120, 0.22, 'sawtooth', 0.05, 0, 70); }
    else if (name === 'win') {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.3, 'triangle', 0.06, i * 0.13); });
    } else if (name === 'lose') {
      [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.32, 'sine', 0.06, i * 0.16); });
    } else if (name === 'turn') {
      tone(330, 0.16, 'triangle', 0.05);
      tone(440, 0.2, 'triangle', 0.04, 0.08);
    } else if (name === 'capture') {
      tone(523, 0.12, 'triangle', 0.05);
      tone(784, 0.18, 'triangle', 0.05, 0.1);
    } else if (name === 'error') {
      tone(220, 0.1, 'square', 0.03, 0, 160);
    }
  };

  Audio.setEnabled = function (v) {
    Audio.enabled = !!v;
    try { localStorage.setItem('warlords_kb_sound', v ? '1' : '0'); } catch (e) {}
  };

  Audio.loadPref = function () {
    try {
      const v = localStorage.getItem('warlords_kb_sound');
      if (v != null) Audio.enabled = v === '1';
    } catch (e) {}
  };
})();
