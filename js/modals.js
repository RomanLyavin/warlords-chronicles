(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};
  const U = WL.Util;
  const D = WL.Data;
  const Game = WL.Game;
  const UI = WL.UI;
  const Audio = WL.Audio;

  const Modals = WL.Modals = {};

  WL.Updates = {
    current: '1.0.0',
    repo: 'lyrv/Warlords-Chronicles',
    releasesUrl: 'https://api.github.com/repos/lyrv/Warlords-Chronicles/releases',
    state: { checking: false, status: 'idle', latest: null, url: null, error: null }
  };

  function parseVersion(v) {
    if (!v) return null;
    const parts = String(v).replace(/^v/i, '').split('.').map(function (p) { return parseInt(p, 10) || 0; });
    while (parts.length < 3) parts.push(0);
    return { major: parts[0], minor: parts[1], patch: parts[2] };
  }

  function compareVersions(a, b) {
    const pa = parseVersion(a), pb = parseVersion(b);
    if (pa.major !== pb.major) return pb.major - pa.major;
    if (pa.minor !== pb.minor) return pb.minor - pa.minor;
    return pb.patch - pa.patch;
  }

  WL.Updates.check = async function () {
    const st = WL.Updates.state;
    st.checking = true;
    st.status = 'checking';
    st.latest = null;
    st.url = null;
    st.error = null;
    const btn = document.getElementById('btn-update-check');
    const status = document.getElementById('update-status');
    const openBtn = document.getElementById('btn-update-open');
    if (btn) { btn.disabled = false; btn.textContent = 'Проверить обновления'; }
    if (status) status.textContent = 'Проверка обновления…';
    if (openBtn) openBtn.style.display = 'none';
    try {
      const resp = await fetch(WL.Updates.releasesUrl, { headers: { Accept: 'application/vnd.github+json' } });
      if (!resp.ok) throw new Error('github-http-' + resp.status);
      const rel = await resp.json();
      const latest = rel && (rel.tag_name || (rel.name && rel.name.replace(/\.apk$/, ''))) ;
      const latestVersion = latest ? latest.replace(/^v/i, '') : null;
      const cmp = latestVersion ? compareVersions(latestVersion, WL.Updates.current) : -1;
      if (cmp > 0) {
        WL.Updates.state.latest = latestVersion;
        WL.Updates.state.url = rel && (rel.browser_download_url || rel.html_url) || null;
        WL.Updates.state.status = 'found';
        if (status) {
          status.innerHTML = '<div style="color:#c8a24a">Доступна новая версия <b>v' + latestVersion + '</b>.</div>' +
            '<div style="margin-top:6px">У вас установлена версия <b>v' + WL.Updates.current + '</b>.</div>';
        }
        if (openBtn) openBtn.style.display = 'inline-block';
      } else {
        WL.Updates.state.latest = latestVersion;
        WL.Updates.state.status = 'none';
        if (status) status.innerHTML = '<div style="color:#8a9a5a">Обновлений нет. Установлена актуальная версия v' + WL.Updates.current + '.</div>';
      }
    } catch (e) {
      WL.Updates.state.latest = null;
      WL.Updates.state.status = 'error';
      if (status) status.innerHTML = '<div style="color:#b3473a">Не удалось проверить обновления (нет связи или лимит GitHub API).</div>';
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  Modals.about = function () {
    const html =
      '<div class="modal-head"><div class="modal-title">Об игре</div><div class="modal-sub">Warlords: Хроники Короны</div></div>' +
      '<div class="modal-body">' +
      '<p><b>Warlords: Хроники Короны</b> — пошаговая фэнтези-стратегия в духе классической Warlords II. ' +
      'Вы правите державой, захватываете города, производите войска, растите героев и сражаетесь за корону.</p>' +
      '<h3>Правила</h3>' +
      '<ul>' +
      '<li>Каждый ход отряд может пройти несколько клеток. Дороги ускоряют движение, лес и горы замедляют.</li>' +
      '<li>Города приносят золото и производят войска. Очередь производства задаётся в панели города.</li>' +
      '<li>Рудники дают +20 золота за ход. В храмах отряды исцеляются. В руинах ждут сокровища и стражи.</li>' +
      '<li>Бой идёт по раундам: стрелки бьют первыми, стены городов снижают урон (катапульты их игнорируют).</li>' +
      '<li>Победа — захватить все города противников или уничтожить их армии.</li>' +
      '</ul>' +
      '<h3>Управление</h3>' +
      '<ul>' +
      '<li>ЛКМ — выбрать отряд, город или клетку; повторный клик по подсвеченной клетке — движение или атака.</li>' +
      '<li>ПКМ или Esc — снять выделение.</li>' +
      '<li>Пробел — завершить ход, N — следующий отряд.</li>' +
      '</ul>' +
      '<h3>Разработчик</h3>' +
      '<p>Лявин Роман<br>Почта: <a href="mailto:lyrv@yug1c.ru">lyrv@yug1c.ru</a></p>' +
      '<p style="font-size:11px;color:#7d6f56">Версия 1.0 · графика и звук генерируются кодом, внешние ресурсы не используются.</p>' +
      '</div>' +
      '<div class="modal-foot">' +
      '<button class="btn btn-sm" id="btn-update-check">Проверить обновления</button>' +
      '<span id="update-status" style="flex:1;color:#8a7a5a;font-size:12px"></span>' +
      '<button class="btn btn-sm" id="btn-update-open" style="display:none">Скачать APK</button>' +
      '<button class="btn btn-sm btn-gold" data-close="1">Закрыть</button>' +
      '</div>';
    const modal = UI.openModal(html, 'about-modal');
    modal.querySelector('[data-close]').addEventListener('click', function () { UI.closeModal(); });
    const btn = modal.querySelector('#btn-update-check');
    const statusEl = modal.querySelector('#update-status');
    const openBtn = modal.querySelector('#btn-update-open');
    btn.addEventListener('click', function () {
      Audio.play('click');
      WL.Updates.check();
    });
    openBtn.addEventListener('click', function () {
      Audio.play('click');
      if (WL.Updates.state.url) window.open(WL.Updates.state.url, '_blank');
    });
    const us = WL.Updates.state;
    if (us.status === 'found') {
      if (statusEl) { statusEl.innerHTML = '<div style="color:#c8a24a">Доступна новая версия <b>v' + us.latest + '</b>. У вас — v' + WL.Updates.current + '.</div>'; }
      if (openBtn) openBtn.style.display = 'inline-block';
    } else if (us.status === 'none') {
      if (statusEl) statusEl.innerHTML = '<div style="color:#8a9a5a">Обновлений нет. Установлена актуальная версия v' + WL.Updates.current + '.</div>';
    } else if (us.status === 'error') {
      if (statusEl) statusEl.innerHTML = '<div style="color:#b3473a">Не удалось проверить обновления (нет связи или лимит GitHub API).</div>';
    }
    if (us.checking) { if (statusEl) statusEl.innerHTML = '<div style="color:#8a7a5a">Проверка обновления…</div>'; }
  };

  Modals.menu = function () {
    if (UI.busy) { UI.toast('Дождитесь окончания хода противника.'); return; }
    const sound = Audio.enabled ? 'Звук: вкл' : 'Звук: выкл';
    const html =
      '<div class="modal-head"><div class="modal-title">Пауза</div><div class="modal-sub">' +
      (UI.state ? 'Ход ' + UI.state.turn : '') + '</div></div>' +
      '<div class="modal-body" style="display:flex;flex-direction:column;gap:8px;max-width:360px;margin:0 auto">' +
      '<button class="btn" data-act="resume">Продолжить</button>' +
      '<button class="btn" data-act="save">Сохранить</button>' +
      '<button class="btn" data-act="sound">' + sound + '</button>' +
      '<button class="btn" data-act="new">Новая игра</button>' +
      '<button class="btn btn-ghost" data-act="title">В главное меню</button>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn btn-sm" data-act="resume">Закрыть</button></div>';
    const modal = UI.openModal(html, '');
    modal.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const act = btn.getAttribute('data-act');
        Audio.play('click');
        if (act === 'resume') UI.closeModal();
        else if (act === 'save') {
          UI.autosave();
          UI.toast('Игра сохранена.');
          UI.closeModal();
        } else if (act === 'sound') {
          Audio.setEnabled(!Audio.enabled);
          UI.updateSoundButton();
          Modals.menu();
        } else if (act === 'new') {
          UI.closeModal();
          UI.openSetup();
        } else if (act === 'title') {
          UI.autosave();
          UI.closeModal();
          UI.showScreen('title');
          UI.el.btnContinue.disabled = !UI.hasSave();
        }
      });
    });
  };

  Modals.gameOver = function (state) {
    const win = state.winner === 'player';
    const p = state.factions[state.playerFaction];
    const turns = state.turn;
    const stats = state.stats;
    const html =
      '<div class="modal-head"><div class="modal-title">' + (win ? 'Победа' : 'Поражение') + '</div>' +
      '<div class="modal-sub">' + (win ? 'Корона ваша' : 'Держава пала') + '</div></div>' +
      '<div class="modal-body">' +
      '<div class="go-emblem">' + (win ? '\u265B' : '\u2620') + '</div>' +
      '<div class="go-title">' + (win ? 'Корона ваша' : 'Держава пала') + '</div>' +
      '<div class="go-sub">' + (win
        ? 'Все враги склонились перед ' + p.name + '.'
        : 'Знамя ' + p.name + ' пало. Враги захватили ваши земли.') + '</div>' +
      '<div class="go-stats">' +
      '<div class="stat-row">Ходов <b>' + turns + '</b></div>' +
      '<div class="stat-row">Битв <b>' + stats.battles + '</b></div>' +
      '<div class="stat-row">Побед в боях <b>' + stats.wins + '</b></div>' +
      '<div class="stat-row">Поражений <b>' + stats.losses + '</b></div>' +
      '<div class="stat-row">Городов захвачено <b>' + stats.citiesTaken + '</b></div>' +
      '<div class="stat-row">Золота добыто <b>' + stats.goldEarned + '</b></div>' +
      '</div></div>' +
      '<div class="modal-foot" style="justify-content:center">' +
      '<button class="btn" data-act="title">В главное меню</button>' +
      '<button class="btn btn-gold" data-act="new">Новая игра</button>' +
      '</div>';
    const modal = UI.openModal(html, 'gameover-modal');
    modal.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const act = btn.getAttribute('data-act');
        Audio.play('click');
        if (act === 'new') { UI.closeModal(); UI.openSetup(); }
        else { UI.closeModal(); UI.showScreen('title'); UI.el.btnContinue.disabled = !UI.hasSave(); }
      });
    });
  };
})();
