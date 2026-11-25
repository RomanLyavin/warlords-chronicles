(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const Game = WL.Game;
  const UI = WL.UI;

  const BattleUI = WL.BattleUI = {};

  function sideHtml(battle, side, units, color, factionId) {
    const state = UI.state;
    const isAtk = side === 'atk';
    const hero = isAtk ? battle.atkHero : battle.defHero;
    let html = '<div class="battle-side">';
    html += '<div class="battle-side-head">' +
      '<div style="width:6px;height:26px;background:' + color + ';border:1px solid #1a140d"></div>' +
      '<div><div class="battle-side-name">' + (isAtk ? battle.atkName : battle.defName) + '</div>' +
      '<div class="battle-side-role">' + (isAtk ? 'Нападающие' : 'Защитники') + (hero ? ' · герой ' + U.escapeHtml(hero.name) + ' ур.' + hero.level : '') + '</div></div></div>';
    html += '<div class="battle-units">';
    units.forEach(function (u, i) {
      const max = u.maxHp;
      const name = Game.unitName(state, factionId, u.type);
      html += '<div class="battle-unit" data-side="' + side + '" data-idx="' + i + '">' +
        '<canvas width="32" height="32" data-unit="' + u.type + '" data-color="' + color + '"></canvas>' +
        '<div class="battle-unit-info"><div class="battle-unit-name">' + name +
        ' <span class="battle-unit-hp" style="color:#8a7a5a;font-size:9px">' + u.hp + '/' + max + '</span></div>' +
        '<div class="hp-bar"><div class="hp-fill" style="width:' + Math.round(u.hp / max * 100) + '%"></div></div></div></div>';
    });
    html += '</div></div>';
    return html;
  }

  BattleUI.show = function (battle, onClose) {
    if (!battle) { if (onClose) onClose(); return; }
    const state = UI.state;
    const atkFid = battle.atkFaction;
    const defFid = battle.defFaction;

    const html =
      '<div class="modal-head"><div class="modal-title">Битва</div><div class="modal-sub">' +
      U.escapeHtml(battle.place) + '</div></div>' +
      '<div class="modal-body">' +
      '<div class="battle-top">' +
      sideHtml(battle, 'atk', battle.atkUnits, battle.atkColor, atkFid) +
      '<div class="battle-vs">&#9876;</div>' +
      sideHtml(battle, 'def', battle.defUnits, battle.defColor, defFid) +
      '</div>' +
      '<div class="battle-log" id="battle-log"></div>' +
      '<div class="battle-result hidden" id="battle-result"></div>' +
      '</div>' +
      '<div class="modal-foot">' +
      '<button class="btn btn-sm" id="battle-skip">Пропустить</button>' +
      '<button class="btn btn-sm btn-gold" id="battle-close">Закрыть</button>' +
      '</div>';

    const modal = UI.openModal(html, 'battle-modal');
    UI.paintIcons(modal);
    UI._modalClose = onClose || null;

    const disp = {
      atk: battle.atkUnits.map(function (u) { return { type: u.type, hp: u.hp, maxHp: u.maxHp, dead: u.hp <= 0 }; }),
      def: battle.defUnits.map(function (u) { return { type: u.type, hp: u.hp, maxHp: u.maxHp, dead: u.hp <= 0 }; })
    };
    const events = battle.events.slice();
    const logEl = modal.querySelector('#battle-log');
    const resultEl = modal.querySelector('#battle-result');
    const closeBtn = modal.querySelector('#battle-close');
    const skipBtn = modal.querySelector('#battle-skip');
    let timer = null;
    let finished = false;

    function log(text, cls) {
      const div = document.createElement('div');
      if (cls) div.className = cls;
      div.textContent = text;
      logEl.appendChild(div);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function updateCard(side, idx) {
      const d = disp[side][idx];
      if (!d) return;
      const card = modal.querySelector('.battle-unit[data-side="' + side + '"][data-idx="' + idx + '"]');
      if (!card) return;
      card.classList.toggle('dead', d.hp <= 0);
      const fill = card.querySelector('.hp-fill');
      if (fill) fill.style.width = Math.max(0, Math.round(d.hp / d.maxHp * 100)) + '%';
      const hp = card.querySelector('.battle-unit-hp');
      if (hp) hp.textContent = Math.max(0, d.hp) + '/' + d.maxHp;
    }

    function finish() {
      finished = true;
      if (timer) { clearInterval(timer); timer = null; }
      skipBtn.disabled = true;
      resultEl.classList.remove('hidden');
      const playerWon = (battle.winner === 'atk') === (battle.atkFaction === state.playerFaction);
      const line = battle.outcome + '. ' + battle.summary;
      resultEl.textContent = (playerWon ? 'Победа! ' : 'Поражение. ') + line;
      if (!playerWon) resultEl.classList.add('lose');
      log(line, 'end');
      const bodyEl = modal.querySelector('.modal-body');
      if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
      closeBtn.focus();
    }

    function applyEvent(ev) {
      if (!ev) return;
      if (ev.t === 'round') {
        log('— Раунд ' + ev.n + ' —', 'rnd');
      } else if (ev.t === 'hit') {
        const tSide = ev.side === 'atk' ? 'def' : 'atk';
        const d = disp[tSide][ev.target];
        if (d) {
          d.hp = ev.hp;
          updateCard(tSide, ev.target);
        }
        log(ev.text, 'hit');
      } else if (ev.t === 'heal') {
        const d = disp[ev.side][ev.target];
        if (d) {
          d.hp = ev.hp;
          updateCard(ev.side, ev.target);
        }
        log(ev.text, 'heal');
      } else if (ev.t === 'end') {
        finish();
      }
    }

    function tick() {
      if (finished) return;
      applyEvent(events.shift());
      if (!events.length && !finished) finish();
    }

    function skipAll() {
      if (finished) return;
      while (events.length) {
        const ev = events.shift();
        if (ev.t === 'hit') {
          const tSide = ev.side === 'atk' ? 'def' : 'atk';
          const d = disp[tSide][ev.target];
          if (d) { d.hp = ev.hp; updateCard(tSide, ev.target); }
        } else if (ev.t === 'heal') {
          const d = disp[ev.side][ev.target];
          if (d) { d.hp = ev.hp; updateCard(ev.side, ev.target); }
        } else if (ev.t === 'round') {
          log('— Раунд ' + ev.n + ' —', 'rnd');
        } else if (ev.t === 'end') {
          finish();
          return;
        }
      }
      finish();
    }

    skipBtn.addEventListener('click', skipAll);
    closeBtn.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; }
      UI.closeModal();
    });

    timer = setInterval(tick, 330);
    setTimeout(function () { if (!finished) tick(); }, 120);
  };
})();
