/**
 * INGE SHOP — app.js
 * Entry point global. Orquesta todos los módulos.
 * Vanilla JS, sin dependencias externas. Compatible Shopify + Dropi.
 */

(function IngeShopApp() {
  'use strict';

  /* ── Esperar DOM ──────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    State.init();
    UI.init();
    Cart.init();
    Router.init();
    Analytics.init();

    // Correr cart count inicial
    Cart.refresh();

    console.log('[IngeShop] App iniciada ✓');
  }

})();
