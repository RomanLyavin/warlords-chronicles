(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const D = WL.Data;
  const Game = WL.Game;
  const Render = WL.Render;
  const Audio = WL.Audio;

  const UI = WL.UI = {
    state: null,
    selected: null,
    army: null,
    movesRes: null,
    reachable: null,
    hover: null,
    ghost: null,
    busy: false,
    fastAI: false,
    setup: { scenarioId: 'valley', difficulty: 'normal', faction: 0 },
    el: {}
  };

  function $(id) { return document.getElementById(id); }
  UI.$ = $;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  UI.init = function () {
    UI.el = {
      screens: {
        title: $('screen-title'),
        setup: $('screen-setup'),
        game: $('screen-game')
      },
      scenarioList: $('scenario-list'),
      difficultyList: $('difficulty-list'),
      factionList: $('faction-list'),
      setupSummary: $('setup-summary'),
      btnStart: $('btn-start'),
      btnContinue: $('btn-continue'),
      map: $('map-canvas'),
      banner: $('turn-banner'),
      toast: $('map-toast'),
      log: $('log-list'),
      topbar: {
        name: $('tb-faction-name'),
        title: $('tb-faction-title'),
        turn: $('tb-turn'),
        gold: $('tb-gold'),
        income: $('tb-income'),
        cities: $('tb-cities'),
        armies: $('tb-armies'),
        crest: $('crest-canvas')
      },
      objectives: $('objectives-body'),
      contextHead: $('context-head'),
      contextBody: $('context-body'),
      minimap: $('minimap-canvas'),
      btnEnd: $('btn-end-turn'),
      chkFast: $('chk-fast-ai'),
      btnSound: $('btn-sound'),
      btnSidebar: $('btn-sidebar'),
      tooltip: $('tooltip'),
      modalRoot: $('modal-root')
    };

    Render.init(UI.el.map);
    Audio.loadPref();
    UI.fastAI = false;
    try { UI.fastAI = localStorage.getItem('warlords_kb_fastai') === '1'; } catch (e) {}
    UI.el.chkFast.checked = UI.fastAI;
    UI.updateSoundButton();
    UI.autoCollapseSidebar();

    $('btn-new').addEventListener('click', function () { Audio.play('click'); UI.openSetup(); });
    $('btn-continue').addEventListener('click', function () { Audio.play('click'); UI.loadSave(); });
    $('btn-about').addEventListener('click', function () { Audio.play('click'); WL.Modals.about(); });
    $('btn-setup-back').addEventListener('click', function () { Audio.play('click'); UI.showScreen('title'); });
    $('btn-start').addEventListener('click', function () { Audio.play('click'); UI.startGame(); });
    $('btn-menu').addEventListener('click', function () { Audio.play('click'); WL.Modals.menu(); });
    UI.el.btnSidebar.addEventListener('click', function () {
      Audio.play('click');
      const main = $('game-main');
      const hidden = main.classList.toggle('sidebar-collapsed');
      UI.setSidebarHidden(hidden);
      try { localStorage.setItem('warlords_kb_sidebar', hidden ? '1' : '0'); } catch (e) {}
    });
    $('btn-sound').addEventListener('click', function () {
      Audio.init();
      Audio.setEnabled(!Audio.enabled);
      UI.updateSoundButton();
      if (Audio.enabled) Audio.play('click');
    });
    UI.el.btnEnd.addEventListener('click', function () { Audio.play('click'); UI.endTurn(); });
    UI.el.chkFast.addEventListener('change', function () {
      UI.fastAI = UI.el.chkFast.checked;
      try { localStorage.setItem('warlords_kb_fastai', UI.fastAI ? '1' : '0'); } catch (e) {}
    });

    UI.el.map.addEventListener('click', UI.onCanvasClick);
    UI.el.map.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      UI.deselect();
    });
    UI.el.map.addEventListener('mousemove', UI.onCanvasMove);
    UI.el.map.addEventListener('mouseleave', function () {
      UI.hover = null;
      UI.el.tooltip.classList.add('hidden');
    });

    UI.el.contextBody.addEventListener('click', UI.onContextClick);

    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'Escape') {
        if (UI.el.modalRoot.children.length) { UI.closeModal(); return; }
        UI.deselect();
      } else if (e.code === 'Space') {
        if (UI.el.modalRoot.children.length) return;
        e.preventDefault();
        UI.endTurn();
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
        UI.nextArmy();
      }
    });

    UI.el.btnContinue.disabled = !UI.hasSave();
    UI.showScreen('title');
    UI.updateSoundButton();
    UI.startLoop();
  };

  UI.hasSave = function () {
    try { return !!localStorage.getItem(Game.SAVE_KEY); } catch (e) { return false; }
  };

  UI.updateSoundButton = function () {
    UI.el.btnSound.textContent = Audio.enabled ? '\u266B' : '\u2715';
    UI.el.btnSound.title = Audio.enabled ? 'Звук включён' : 'Звук выключен';
    UI.el.btnSound.style.color = Audio.enabled ? '#c8a24a' : '#7d6f56';
  };

  UI.showScreen = function (name) {
    Object.keys(UI.el.screens).forEach(function (k) {
      UI.el.screens[k].classList.toggle('hidden', k !== name);
    });
  };

  UI.setSidebarHidden = function (hidden) {
    document.getElementById('game-main').classList.toggle('sidebar-collapsed', !!hidden);
    UI.el.btnSidebar.textContent = hidden ? 'Панель' : 'Скрыть';
    UI.el.btnSidebar.title = hidden ? 'Показать боковую панель' : 'Скрыть боковую панель';
  };

  UI.autoCollapseSidebar = function () {
    let pref = null;
    try { pref = localStorage.getItem('warlords_kb_sidebar'); } catch (e) {}
    const hidden = pref != null ? pref === '1' : window.innerWidth < 1000;
    UI.setSidebarHidden(hidden);
  };

  UI.openModal = function (html, className) {
    UI._modalClose = null;
    UI.el.modalRoot.innerHTML = '<div class="modal-backdrop"><div class="modal ' + (className || '') + '">' + html + '</div></div>';
    return UI.el.modalRoot.firstElementChild.firstElementChild;
  };

  UI.closeModal = function () {
    const cb = UI._modalClose;
    UI._modalClose = null;
    UI.el.modalRoot.innerHTML = '';
    if (cb) cb();
  };

  UI.showBanner = function (text, ms) {
    const b = UI.el.banner;
    b.textContent = text;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(UI._bannerTimer);
    UI._bannerTimer = setTimeout(function () { b.classList.add('hidden'); }, ms || 1400);
  };

  UI.toast = function (text, ms) {
    const t = UI.el.toast;
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(function () { t.classList.add('hidden'); }, ms || 2400);
  };

  /* ---------------- Setup ---------------- */

  UI.openSetup = function () {
    UI.showScreen('setup');
    UI.buildSetup();
  };

  UI.buildSetup = function () {
    UI.el.scenarioList.innerHTML = '';
    WL.SCENARIOS.forEach(function (sc) {
      const card = document.createElement('button');
      card.className = 'scenario-card' + (UI.setup.scenarioId === sc.id ? ' selected' : '');
      card.innerHTML =
        '<canvas class="scenario-preview" width="320" height="180"></canvas>' +
        '<div class="scenario-info">' +
        '<div class="scenario-name">' + U.escapeHtml(sc.name) + '</div>' +
        '<div class="scenario-sub">' + U.escapeHtml(sc.subtitle) + '</div>' +
        '<p class="scenario-desc">' + U.escapeHtml(sc.desc) + '</p>' +
        '<div class="scenario-meta">' +
        '<span class="chip">' + sc.w + '×' + sc.h + '</span>' +
        '<span class="chip">' + sc.cities.length + ' городов</span>' +
        '<span class="chip">' + sc.factions.length + ' державы</span>' +
        '</div></div>';
      card.addEventListener('click', function () {
        Audio.play('click');
        UI.setup.scenarioId = sc.id;
        if (UI.setup.faction >= sc.factions.length) UI.setup.faction = 0;
        UI.buildSetup();
      });
      UI.el.scenarioList.appendChild(card);
      Render.drawPreview(card.querySelector('canvas'), sc);
    });

    UI.el.difficultyList.innerHTML = '';
    ['easy', 'normal', 'hard'].forEach(function (key) {
      const d = D.DIFFICULTIES[key];
      const card = document.createElement('button');
      card.className = 'difficulty-card' + (UI.setup.difficulty === key ? ' selected' : '');
      card.innerHTML = '<div class="difficulty-name">' + d.name + '</div><div class="difficulty-desc">' + d.desc + '</div>';
      card.addEventListener('click', function () {
        Audio.play('click');
        UI.setup.difficulty = key;
        UI.buildSetup();
      });
      UI.el.difficultyList.appendChild(card);
    });

    const sc = UI.scenario();
    UI.el.factionList.innerHTML = '';
    sc.factions.forEach(function (key, idx) {
      const def = D.FACTIONS[key];
      const card = document.createElement('button');
      card.className = 'faction-card' + (UI.setup.faction === idx ? ' selected' : '');
      card.innerHTML =
        '<canvas class="faction-crest" width="40" height="40"></canvas>' +
        '<div><div class="faction-card-name">' + def.name + '</div>' +
        '<div class="faction-card-title">' + def.title + '</div>' +
        '<div class="faction-card-desc">' + def.desc + '</div></div>';
      card.addEventListener('click', function () {
        Audio.play('click');
        UI.setup.faction = idx;
        UI.buildSetup();
      });
      UI.el.factionList.appendChild(card);
      const cv = card.querySelector('canvas');
      WL.Art.drawCrest(cv.getContext('2d'), def.crest, 40);
    });

    const diff = D.DIFFICULTIES[UI.setup.difficulty];
    UI.el.setupSummary.innerHTML = '<b>' + sc.name + '</b> · ' + diff.name + ' · <b>' +
      D.FACTIONS[sc.factions[UI.setup.faction]].name + '</b>';
  };

  UI.scenario = function () {
    return WL.SCENARIOS.filter(function (s) { return s.id === UI.setup.scenarioId; })[0];
  };

  UI.startGame = function () {
    const sc = UI.scenario();
    UI.state = Game.newGame(sc.id, UI.setup.faction, UI.setup.difficulty);
    UI.selected = null;
    UI.army = null;
    UI.reachable = null;
    UI.movesRes = null;
    UI.hover = null;
    UI.ghost = null;
    UI.busy = false;
    UI._gameOverShown = false;
    Render.buildBase(UI.state);
    UI.showScreen('game');
    UI.el.map.width = UI.state.w * Render.TILE;
    UI.el.map.height = UI.state.h * Render.TILE;
    UI.refresh();
    UI.showBanner('Ход 1: ' + UI.state.factions[UI.state.playerFaction].name, 1600);
    Audio.play('turn');
    UI.autosave();
  };

  /* ---------------- Top bar / panels ---------------- */

  UI.updateTopbar = function () {
    const state = UI.state;
    if (!state) return;
    const p = state.factions[state.playerFaction];
    UI.el.topbar.name.textContent = p.name;
    UI.el.topbar.title.textContent = p.title;
    UI.el.topbar.turn.textContent = 'Ход ' + state.turn;
    UI.el.topbar.gold.textContent = p.gold;
    const income = Game.income(state, p.id) - Game.upkeep(state, p.id);
    UI.el.topbar.income.textContent = U.signed(income);
    UI.el.topbar.income.style.color = income >= 0 ? '#5f9a4a' : '#b3473a';
    UI.el.topbar.cities.textContent = Game.cityCount(state, p.id);
    UI.el.topbar.armies.textContent = Game.armyCount(state, p.id);
    const crest = UI.el.topbar.crest;
    const cctx = crest.getContext('2d');
    cctx.clearRect(0, 0, crest.width, crest.height);
    WL.Art.drawCrest(cctx, p.crest, 40);
    UI.el.btnEnd.disabled = UI.busy || state.currentFaction !== state.playerFaction || state.phase === 'gameover';
    UI.el.btnEnd.textContent = UI.busy ? 'Ход противника…' : 'Завершить ход';
  };

  UI.refresh = function () {
    if (!UI.state) return;
    UI.updateTopbar();
    UI.renderObjectives();
    UI.renderContext();
    Render.drawMinimap(UI.el.minimap, UI.state);
    UI.renderLog();
    UI.paintIcons(UI.el.contextBody);
  };

  UI.renderObjectives = function () {
    const state = UI.state;
    const p = state.factions[state.playerFaction];
    const income = Game.income(state, p.id);
    const upkeep = Game.upkeep(state, p.id);
    let html = '';
    html += '<div class="objective-row"><span class="obj-name">Золото</span><span class="obj-val">' + p.gold + '</span></div>';
    html += '<div class="objective-row"><span class="obj-name">Доход</span><span class="obj-val" style="color:#5f9a4a">+' + income + '</span></div>';
    html += '<div class="objective-row"><span class="obj-name">Содержание</span><span class="obj-val" style="color:#b3473a">−' + upkeep + '</span></div>';
    html += '<div class="objective-row"><span class="obj-name">Города</span><span class="obj-val">' + Game.cityCount(state, p.id) + '</span></div>';
    html += '<div class="objective-row"><span class="obj-name">Отряды</span><span class="obj-val">' + Game.armyCount(state, p.id) + '</span></div>';
    const own = state.cities.filter(function (c) { return c.owner === p.id; });
    if (own.length) {
      html += '<div style="margin-top:8px;border-top:1px solid #3a2c1c;padding-top:6px">';
      own.forEach(function (c) {
        const q = c.queue.length ? c.queue[0] : null;
        const cost = q ? Game.unitCost(state, c.owner, q) : 0;
        const pct = q ? Math.min(100, Math.round(c.prodAcc / cost * 100)) : 0;
        html += '<div class="objective-row"><span class="obj-name" style="color:' + p.color + '">' + U.escapeHtml(c.name) + '</span>' +
          '<span class="obj-val" style="font-size:11px">' + (q ? Game.unitName(state, c.owner, q) + ' ' + pct + '%' : 'очередь пуста') + '</span></div>';
      });
      html += '</div>';
    }
    const enemies = state.factions.filter(function (f) { return f.id !== p.id && f.alive; });
    html += '<div class="hint" style="margin-top:8px">Цель: захватить все города врагов или уничтожить их армии. Врагов: ' + enemies.length + '.</div>';
    UI.el.objectives.innerHTML = html;
  };

  UI.unitIconHtml = function (type, factionId) {
    const f = Game.factionOf(UI.state, factionId);
    return '<canvas class="unit-icon" data-unit="' + type + '" data-color="' + f.color + '" width="32" height="32"></canvas>';
  };

  UI.paintIcons = function (root) {
    if (!root) return;
    root.querySelectorAll('canvas[data-unit]').forEach(function (cv) {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 32, 32);
      WL.Art.drawUnit(ctx, cv.getAttribute('data-unit'), cv.getAttribute('data-color'), 0);
    });
  };

  UI.armyUnitsHtml = function (army) {
    let html = '';
    army.units.forEach(function (u) {
      const max = Game.unitMaxHp(UI.state, army.faction, u.type);
      const pct = Math.round(u.hp / max * 100);
      html += '<div class="unit-row">' + UI.unitIconHtml(u.type, army.faction) +
        '<div class="unit-info"><div class="unit-name">' + Game.unitName(UI.state, army.faction, u.type) + '</div>' +
        '<div class="hp-bar"><div class="hp-fill' + (pct < 45 ? ' low' : '') + '" style="width:' + pct + '%"></div></div></div>' +
        '<div class="unit-hp">' + u.hp + '/' + max + '</div></div>';
    });
    if (!army.units.length) html += '<div class="hint">Отряд без войск — только герой.</div>';
    return html;
  };

  UI.renderContext = function () {
    const state = UI.state;
    const sel = UI.selected;
    let head = 'Обзор';
    let html = '';

    if (!sel) {
      head = 'Обзор';
      html = '<div class="hint">Щёлкните по своему отряду, чтобы увидеть путь и атаковать. Щёлкните по городу, чтобы управлять производством.<br><br>' +
        'Пробел — завершить ход, N — следующий отряд, Esc — отмена.</div>';
      const enemies = state.factions.filter(function (f) { return f.id !== state.playerFaction && f.alive; });
      if (enemies.length) {
        html += '<div style="margin-top:10px">';
        enemies.forEach(function (f) {
          html += '<div class="objective-row"><span class="obj-name" style="color:' + f.color + '">' + f.name + '</span>' +
            '<span class="obj-val">' + Game.cityCount(state, f.id) + ' гор. · ' + Game.armyCount(state, f.id) + ' отр.</span></div>';
        });
        html += '</div>';
      }
    } else if (sel.kind === 'army') {
      const army = Game.armyById(state, sel.id);
      if (!army) { UI.deselect(); return; }
      const f = Game.factionOf(state, army.faction);
      head = army.hero ? 'Герой ' + army.hero.name : 'Отряд';
      const place = Game.tileName(state, army.x, army.y);
      html += '<div class="ctx-title" style="color:' + f.color + '">' + (army.hero ? army.hero.name : 'Отряд') + '</div>';
      html += '<div class="ctx-sub">' + f.name + ' · ' + U.escapeHtml(place) + '</div>';
      html += '<div class="stat-row">Ход <b>' + army.mp + ' / ' + Game.maxMp(state, army) + '</b></div>';
      html += '<div class="stat-row">Сила <b>' + Game.armyPower(state, army).toFixed(1) + '</b></div>';
      if (army.hero) {
        html += '<div class="stat-row">Герой <b>ур. ' + army.hero.level + ' · ' + army.hero.xp + '/' + Game.xpForNext(army.hero.level) + ' опыта</b></div>';
      }
      html += '<div style="margin-top:8px">' + UI.armyUnitsHtml(army) + '</div>';
      html += '<div class="army-actions"><button class="btn btn-sm" data-action="next-army">Следующий отряд</button>' +
        '<button class="btn btn-sm" data-action="deselect">Отмена</button></div>';
      if (army.mp > 0 && UI.reachable) {
        html += '<div class="hint" style="margin-top:8px">Подсвечены доступные клетки. Красным — враг, которого можно атаковать.</div>';
      }
    } else if (sel.kind === 'city') {
      const city = state.cities.filter(function (c) { return c.id === sel.id; })[0];
      if (!city) { UI.deselect(); return; }
      const f = Game.factionOf(state, city.owner);
      head = city.name;
      const tier = D.CITY_TIERS[city.tier];
      const army = Game.armyAt(state, city.x, city.y);
      html += '<div class="ctx-title" style="color:' + f.color + '">' + U.escapeHtml(city.name) + '</div>';
      html += '<div class="ctx-sub">' + tier.name + ' · ' + f.name + '</div>';
      html += '<div class="stat-row">Доход <b>+' + tier.income + '</b></div>';
      html += '<div class="stat-row">Производство <b>' + Game.cityProd(state, city) + ' / ход</b></div>';
      html += '<div class="stat-row">Накоплено <b>' + city.prodAcc + '</b></div>';
      html += '<div class="stat-row">Стены <b>' + Math.round(tier.wall * 100) + '%</b></div>';

      if (city.owner === state.playerFaction) {
        const q = city.queue;
        html += '<div style="margin-top:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a5a">Очередь</div>';
        html += '<div class="prod-queue">';
        if (!q.length) html += '<div class="hint">Пусто. Добавьте войска ниже.</div>';
        q.forEach(function (t, i) {
          const cost = Game.unitCost(state, city.owner, t);
          html += '<div class="prod-item"><span class="idx">' + (i + 1) + '.</span><span class="name">' +
            Game.unitName(state, city.owner, t) + '</span><span>' + cost + '</span>' +
            '<button data-action="dequeue" data-index="' + i + '" title="Убрать">×</button></div>';
        });
        html += '</div>';
        if (q.length) {
          const cost = Game.unitCost(state, city.owner, q[0]);
          const pct = Math.min(100, Math.round(city.prodAcc / cost * 100));
          html += '<div class="prod-bar"><div class="prod-bar-fill" style="width:' + pct + '%"></div></div>';
          html += '<div class="hint">' + Game.unitName(state, city.owner, q[0]) + ': ' + city.prodAcc + ' / ' + cost + '</div>';
        }
        html += '<div class="recruit-grid">';
        ['militia', 'spearmen', 'archers', 'cavalry', 'catapult', 'healer'].forEach(function (t) {
          const cost = Game.unitCost(state, city.owner, t);
          html += '<button class="recruit-btn" data-action="enqueue" data-type="' + t + '"' + (q.length >= 5 ? ' disabled' : '') + '>' +
            UI.unitIconHtml(t, city.owner) + '<span>' + Game.unitName(state, city.owner, t) + '</span><span class="rc">' + cost + '</span></button>';
        });
        html += '</div>';
        html += '<div class="army-actions" style="flex-wrap:wrap">';
        if (q.length) html += '<button class="btn btn-sm" data-action="rush">Ускорить: ' + Game.rushCost(state, city) + ' з.</button>';
        if (army && army.faction === city.owner) {
          html += '<button class="btn btn-sm" data-action="select-garrison">Гарнизон</button>';
        }
        if (!army || !army.hero) {
          html += '<button class="btn btn-sm" data-action="recruit-hero">Герой: ' + Game.heroCostFor(state, city.owner) + ' з.</button>';
        }
        html += '</div>';
        if (army && army.faction === city.owner) {
          html += '<div style="margin-top:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a5a">Гарнизон</div>';
          html += UI.armyUnitsHtml(army);
        } else {
          html += '<div class="hint" style="margin-top:8px">Гарнизона нет — город легко захватить.</div>';
        }
      } else {
        html += '<div class="stat-row">Владелец <b style="color:' + f.color + '">' + f.name + '</b></div>';
        html += '<div class="stat-row">Оборона <b>' + Game.defensePower(state, city.x, city.y).toFixed(1) + '</b></div>';
        if (army) {
          html += '<div style="margin-top:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a5a">Гарнизон</div>';
          html += UI.armyUnitsHtml(army);
        } else {
          html += '<div class="hint" style="margin-top:8px">Город не защищён. Подведите отряд и займите его.</div>';
        }
      }
    } else if (sel.kind === 'inspect') {
      const x = sel.x, y = sel.y;
      if (!Game.isExplored(state, x, y)) {
        head = 'Неизвестные земли';
        html += '<div class="ctx-title">Неизвестные земли</div>' +
          '<div class="hint">Эти земли ещё не разведаны. Отправьте отряд, чтобы открыть их.</div>';
        UI.el.contextHead.textContent = head;
        UI.el.contextBody.innerHTML = html;
        return;
      }
      const tile = Game.tileAt(state, x, y);
      const city = Game.cityAt(state, x, y);
      const site = Game.siteAt(state, x, y);
      const army = Game.armyAt(state, x, y);
      head = 'Осмотр';
      html += '<div class="ctx-title">' + U.escapeHtml(Game.tileName(state, x, y)) + '</div>';
      html += '<div class="ctx-sub">' + D.TERRAIN[tile.t].name + (tile.road ? ' · дорога' : '') + ' · ' + x + ',' + y + '</div>';
      if (city) {
        const f = Game.factionOf(state, city.owner);
        html += '<div class="stat-row">Город <b>' + D.CITY_TIERS[city.tier].name + '</b></div>';
        html += '<div class="stat-row">Владелец <b style="color:' + f.color + '">' + f.name + '</b></div>';
        html += '<div class="stat-row">Стены <b>' + Math.round(D.CITY_TIERS[city.tier].wall * 100) + '%</b></div>';
      }
      if (site) {
        html += '<div class="stat-row">Объект <b>' + U.escapeHtml(site.name) + '</b></div>';
        if (site.kind === 'mine') {
          const owner = site.owner >= 0 ? Game.factionName(state, site.owner) : 'ничей';
          html += '<div class="stat-row">Рудник <b style="color:' + (site.owner >= 0 ? Game.factionOf(state, site.owner).color : '#8a7a5a') + '">' + owner + '</b></div>';
          html += '<div class="stat-row">Доход <b>+20 золота</b></div>';
        } else if (site.kind === 'temple') {
          html += '<div class="stat-row">Исцеление <b>' + (site.cooldown > 0 ? 'через ' + site.cooldown + ' х.' : 'доступно') + '</b></div>';
        } else {
          html += '<div class="stat-row">Состояние <b>' + (site.cleared ? 'разграблено' : 'не тронуто') + '</b></div>';
        }
      }
      if (army) {
        const f = Game.factionOf(state, army.faction);
        html += '<div style="margin-top:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a5a">Отряд</div>';
        html += '<div class="stat-row">Владелец <b style="color:' + f.color + '">' + f.name + '</b></div>';
        html += '<div class="stat-row">Сила <b>' + Game.armyPower(state, army).toFixed(1) + '</b></div>';
        if (army.hero) html += '<div class="stat-row">Герой <b>' + army.hero.name + ', ур. ' + army.hero.level + '</b></div>';
        html += UI.armyUnitsHtml(army);
      }
    }

    UI.el.contextHead.textContent = head;
    UI.el.contextBody.innerHTML = html;
  };

  UI.renderLog = function () {
    const state = UI.state;
    if (!state) return;
    const entries = state.log.slice(-60);
    let html = '';
    entries.forEach(function (e) {
      const f = e.faction != null ? Game.factionOf(state, e.faction) : null;
      const color = f ? f.color : '#a89878';
      html += '<div class="log-entry ' + e.kind + '"><span class="lt">T' + e.turn + '</span>' +
        '<span style="color:' + color + '">' + U.escapeHtml(e.text) + '</span></div>';
    });
    UI.el.log.innerHTML = html;
    UI.el.log.scrollTop = UI.el.log.scrollHeight;
  };

  /* ---------------- Input ---------------- */

  UI.onCanvasClick = function (e) {
    const state = UI.state;
    if (!state || UI.busy || state.phase === 'gameover') return;
    const t = Render.tileFromEvent(state, e);
    if (!t) return;
    Audio.init();
    const army = Game.armyAt(state, t.x, t.y);
    const city = Game.cityAt(state, t.x, t.y);

    if (UI.selected && UI.selected.kind === 'army' && UI.army) {
      const k = t.y * state.w + t.x;
      const cost = UI.reachable ? UI.reachable.get(k) : undefined;
      if (cost != null && cost > 0) {
        UI.doMove(t.x, t.y);
        return;
      }
      if (army === UI.army) { UI.deselect(); return; }
    }

    if (!Game.isExplored(state, t.x, t.y)) {
      UI.selected = { kind: 'inspect', x: t.x, y: t.y };
      UI.army = null; UI.reachable = null; UI.movesRes = null;
      Audio.play('click');
      UI.refresh();
      return;
    }

    if (army && army.faction === state.playerFaction && state.currentFaction === state.playerFaction) {
      UI.selectArmy(army);
      return;
    }
    if (city && city.owner === state.playerFaction) {
      UI.selectCity(city);
      return;
    }
    if (army || city) {
      UI.selected = { kind: 'inspect', x: t.x, y: t.y };
      UI.army = null; UI.reachable = null; UI.movesRes = null;
      Audio.play('click');
      UI.refresh();
      return;
    }
    UI.selected = { kind: 'inspect', x: t.x, y: t.y };
    UI.army = null; UI.reachable = null; UI.movesRes = null;
    Audio.play('click');
    UI.refresh();
  };

  UI.onCanvasMove = function (e) {
    const state = UI.state;
    if (!state) return;
    const t = Render.tileFromEvent(state, e);
    UI.hover = t;
    if (!t) { UI.el.tooltip.classList.add('hidden'); return; }
    let text = Game.tileTooltip(state, t.x, t.y);
    if (UI.army && UI.reachable) {
      const k = t.y * state.w + t.x;
      const cost = UI.reachable.get(k);
      if (cost != null && cost > 0) {
        if (Game.isHostile(state, UI.army, t.x, t.y)) text += '\nАтака (стоимость ' + cost + ')';
        else text += '\nПереход: ' + cost + ' из ' + UI.army.mp;
      }
    }
    const tip = UI.el.tooltip;
    tip.textContent = text;
    tip.classList.remove('hidden');
    const pad = 14;
    let left = e.clientX + pad, top = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (left + r.width > window.innerWidth - 8) left = e.clientX - r.width - pad;
    if (top + r.height > window.innerHeight - 8) top = e.clientY - r.height - pad;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };

  UI.selectArmy = function (army) {
    UI.selected = { kind: 'army', id: army.id };
    UI.army = army;
    UI.movesRes = Game.computeMoves(UI.state, army);
    UI.reachable = UI.filterReachable(UI.movesRes.dist, army.mp);
    Audio.play('click');
    UI.refresh();
  };

  UI.filterReachable = function (dist, mp) {
    const m = new Map();
    dist.forEach(function (cost, k) {
      if (cost > 0 && cost <= mp) m.set(k, cost);
    });
    return m;
  };

  UI.selectCity = function (city) {
    UI.selected = { kind: 'city', id: city.id };
    UI.army = null;
    UI.reachable = null;
    UI.movesRes = null;
    Audio.play('click');
    UI.refresh();
  };

  UI.deselect = function () {
    UI.selected = null;
    UI.army = null;
    UI.reachable = null;
    UI.movesRes = null;
    if (UI.state) UI.refresh();
  };

  UI.nextArmy = function () {
    const state = UI.state;
    if (!state || UI.busy) return;
    const armies = state.armies.filter(function (a) {
      return a.faction === state.playerFaction && a.mp > 0 && !a.guard && a.units.length;
    });
    if (!armies.length) { UI.toast('Все отряды уже сделали ход.'); return; }
    let idx = -1;
    if (UI.selected && UI.selected.kind === 'army') {
      idx = armies.findIndex(function (a) { return a.id === UI.selected.id; });
    }
    const next = armies[(idx + 1) % armies.length];
    UI.selectArmy(next);
  };

  UI.doMove = function (x, y) {
    const state = UI.state;
    const army = UI.army;
    if (!army) return;
    const from = { x: army.x, y: army.y };
    const res = Game.moveArmy(state, army, x, y);
    if (!res.ok) {
      UI.toast(res.error);
      Audio.play('error');
      return;
    }
    UI.startGhost(army, from, res.path);
    Audio.play('move');
    if (res.reward) UI.toast(res.reward.text);
    if (res.captured) Audio.play('capture');
    if (res.battle) {
      Audio.play('battle');
      const delay = Math.min(700, 90 * res.path.length + 120);
      setTimeout(function () {
        if (WL.BattleUI) WL.BattleUI.show(res.battle, UI.onBattleClosed);
      }, delay);
    }
    if (state.armies.indexOf(army) >= 0 && army.mp > 0) {
      UI.selected = { kind: 'army', id: army.id };
      UI.army = army;
      UI.movesRes = Game.computeMoves(state, army);
      UI.reachable = UI.filterReachable(UI.movesRes.dist, army.mp);
    } else {
      UI.selected = null;
      UI.army = null;
      UI.reachable = null;
      UI.movesRes = null;
    }
    UI.refresh();
    UI.autosave();
    if (!res.battle && state.phase === 'gameover') UI.checkGameOver();
  };

  UI.startGhost = function (army, from, path) {
    let type = 'hero';
    let best = -1;
    army.units.forEach(function (u) {
      const val = D.UNITS[u.type].str * u.hp;
      if (val > best) { best = val; type = u.type; }
    });
    const full = [{ x: from.x, y: from.y }].concat(path);
    const f = Game.factionOf(UI.state, army.faction);
    UI.ghost = {
      active: true,
      armyId: army.id,
      path: full,
      started: performance.now(),
      duration: Math.min(1100, 90 * full.length + 90),
      color: f.color,
      type: type
    };
  };

  UI.onBattleClosed = function () {
    UI.refresh();
    UI.autosave();
    if (UI.state && UI.state.phase === 'gameover') UI.checkGameOver();
  };

  UI.getView = function () {
    let path = null;
    if (UI.army && UI.movesRes && UI.hover) {
      const k = UI.hover.y * UI.state.w + UI.hover.x;
      const cost = UI.reachable ? UI.reachable.get(k) : undefined;
      if (cost != null && cost > 0) path = Game.pathTo(UI.movesRes, UI.hover.x, UI.hover.y);
    }
    return {
      frame: performance.now(),
      selected: UI.selected,
      hover: UI.hover,
      reachable: UI.reachable,
      army: UI.army,
      path: path,
      ghost: UI.ghost
    };
  };

  /* ---------------- Context actions ---------------- */

  UI.onContextClick = function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const state = UI.state;
    if (!state) return;
    Audio.play('click');

    if (action === 'next-army') { UI.nextArmy(); return; }
    if (action === 'deselect') { UI.deselect(); return; }

    if (action === 'select-garrison' && UI.selected && UI.selected.kind === 'city') {
      const city = state.cities.filter(function (c) { return c.id === UI.selected.id; })[0];
      const army = city ? Game.armyAt(state, city.x, city.y) : null;
      if (army) UI.selectArmy(army);
      return;
    }

    if (UI.selected && UI.selected.kind === 'city') {
      const city = state.cities.filter(function (c) { return c.id === UI.selected.id; })[0];
      if (!city || city.owner !== state.playerFaction) return;
      if (action === 'enqueue') {
        const res = Game.enqueue(state, city, btn.getAttribute('data-type'));
        if (!res.ok) { UI.toast(res.error); Audio.play('error'); }
        UI.refresh();
        UI.autosave();
      } else if (action === 'dequeue') {
        Game.dequeue(state, city, parseInt(btn.getAttribute('data-index'), 10));
        UI.refresh();
        UI.autosave();
      } else if (action === 'recruit-hero') {
        const res = Game.recruitHero(state, city);
        if (!res.ok) { UI.toast(res.error); Audio.play('error'); }
        else { UI.toast('Герой ' + res.hero.name + ' присоединился.'); Audio.play('coin'); }
        UI.refresh();
        UI.autosave();
      } else if (action === 'rush') {
        const res = Game.rush(state, city);
        if (!res.ok) { UI.toast(res.error); Audio.play('error'); }
        else { Audio.play('coin'); UI.toast('Производство ускорено.'); }
        UI.refresh();
        UI.autosave();
      }
    }
  };

  /* ---------------- Turn flow ---------------- */

  UI.endTurn = function () {
    const state = UI.state;
    if (!state || UI.busy || state.phase === 'gameover') return;
    if (state.currentFaction !== state.playerFaction) return;
    UI.deselect();
    Audio.play('turn');
    const next = Game.advanceFaction(state);
    if (!next) { UI.checkGameOver(); return; }
    if (state.phase === 'gameover') { UI.checkGameOver(); return; }
    if (next === state.playerFaction) {
      UI.showBanner('Ход ' + state.turn + ': ' + state.factions[state.playerFaction].name, 1600);
      UI.refresh();
      UI.autosave();
      return;
    }
    UI.runAITurns();
  };

  UI.runAITurns = async function () {
    const state = UI.state;
    UI.busy = true;
    UI.updateTopbar();
    try {
      while (!state.winner && state.currentFaction !== state.playerFaction) {
        const fid = state.currentFaction;
        const f = state.factions[fid];
        if (!f || !f.alive) {
          const nx = Game.advanceFaction(state);
          if (nx == null) break;
          continue;
        }
        UI.showBanner('Ход: ' + f.name, 900);
        Audio.play('turn');
        WL.AI.beginTurn(state, fid);
        let steps = 0;
        while (!state.winner && steps < 70) {
          const r = WL.AI.step(state, fid);
          if (r.done) break;
          steps++;
          if (r.battle && (r.battle.atkFaction === state.playerFaction || r.battle.defFaction === state.playerFaction)) {
            UI.toast(r.battle.outcome + '. ' + r.battle.summary, 3200);
            Audio.play('battle');
          }
          UI.refresh();
          await sleep(UI.fastAI ? 35 : 140);
        }
        if (state.winner) break;
        const next = Game.advanceFaction(state);
        if (next == null) break;
        if (next === state.playerFaction) break;
        await sleep(UI.fastAI ? 25 : 100);
      }
    } finally {
      UI.busy = false;
    }
    UI.refresh();
    if (state.phase === 'gameover') { UI.checkGameOver(); return; }
    UI.showBanner('Ход ' + state.turn + ': ' + state.factions[state.playerFaction].name, 1500);
    UI.autosave();
  };

  UI.checkGameOver = function () {
    if (!UI.state || UI.state.phase !== 'gameover') return;
    if (UI._gameOverShown) return;
    UI._gameOverShown = true;
    if (UI.state.winner === 'player') Audio.play('win'); else Audio.play('lose');
    WL.Modals.gameOver(UI.state);
  };

  /* ---------------- Save / load ---------------- */

  UI.autosave = function () {
    if (!UI.state) return;
    try {
      localStorage.setItem(Game.SAVE_KEY, Game.serialize(UI.state));
    } catch (e) { /* quota */ }
  };

  UI.loadSave = function () {
    let raw = null;
    try { raw = localStorage.getItem(Game.SAVE_KEY); } catch (e) {}
    if (!raw) { UI.toast('Сохранение не найдено.'); return; }
    try {
      const state = Game.deserialize(raw);
      if (!state || !state.factions || !state.tiles) throw new Error('bad save');
      UI.state = state;
      UI._gameOverShown = false;
      UI.selected = null;
      UI.army = null;
      UI.reachable = null;
      UI.movesRes = null;
      UI.ghost = null;
      UI.busy = false;
      Render.buildBase(state);
      UI.showScreen('game');
      UI.el.map.width = state.w * Render.TILE;
      UI.el.map.height = state.h * Render.TILE;
      UI.refresh();
      UI.showBanner('Ход ' + state.turn + ': ' + state.factions[state.playerFaction].name, 1400);
      if (state.phase === 'gameover') UI.checkGameOver();
    } catch (e) {
      UI.toast('Не удалось загрузить сохранение.');
    }
  };

  UI.startLoop = function () {
    function frame(ts) {
      if (UI.state && !UI.el.screens.game.classList.contains('hidden')) {
        Render.draw(UI.state, UI.getView());
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
