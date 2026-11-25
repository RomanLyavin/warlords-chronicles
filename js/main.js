(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const WL = root.WL = root.WL || {};

  function boot() {
    if (!WL.UI || !WL.Game || !WL.Render) {
      console.error('Warlords: modules failed to load');
      return;
    }
    WL.UI.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
