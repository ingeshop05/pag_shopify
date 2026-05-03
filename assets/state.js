/**
 * INGE SHOP — state.js
 * Store global centralizado con pub/sub.
 * Patrón: State → notify subscribers → update DOM
 */

var State = (function () {
  'use strict';

  /* ── Estado inicial ───────────────────────────────────── */
  var _state = {
    cart: {
      item_count: 0,
      total_price: 0,
      items: []
    },
    ui: {
      navOpen: false,
      cartDrawerOpen: false,
      loading: false,
      activeRoute: window.location.pathname
    },
    navigation: {
      current: window.location.pathname,
      previous: null,
      isTransitioning: false
    }
  };

  /* ── Subscribers ──────────────────────────────────────── */
  var _listeners = {};

  /* ── API pública ──────────────────────────────────────── */
  return {

    init: function () {
      // Estado inicial desde Shopify (si está disponible en el DOM)
      var cartCountEl = document.querySelector('.cart-count');
      if (cartCountEl) {
        var count = parseInt(cartCountEl.textContent) || 0;
        _state.cart.item_count = count;
      }
    },

    /**
     * Leer parte del estado
     * @param {string} path - 'cart.item_count' | 'ui.loading'
     */
    get: function (path) {
      return path.split('.').reduce(function (obj, key) {
        return obj && obj[key] !== undefined ? obj[key] : null;
      }, _state);
    },

    /**
     * Actualizar parte del estado y notificar
     * @param {string} path - 'cart.item_count'
     * @param {*} value
     */
    set: function (path, value) {
      var keys = path.split('.');
      var obj = _state;

      for (var i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }

      var lastKey = keys[keys.length - 1];
      var oldValue = obj[lastKey];
      obj[lastKey] = value;

      // Notificar si cambió
      if (oldValue !== value) {
        this._notify(path, value, oldValue);
        // Notificar también el namespace padre
        if (keys.length > 1) {
          this._notify(keys[0], _state[keys[0]], null);
        }
      }
    },

    /**
     * Merge objeto dentro de namespace
     * @param {string} namespace - 'cart' | 'ui'
     * @param {object} data
     */
    merge: function (namespace, data) {
      if (!_state[namespace]) _state[namespace] = {};
      Object.assign(_state[namespace], data);
      this._notify(namespace, _state[namespace], null);
    },

    /**
     * Suscribirse a cambios
     * @param {string} key - 'cart' | 'ui.loading' | '*'
     * @param {function} callback
     * @returns {function} unsubscribe
     */
    on: function (key, callback) {
      if (!_listeners[key]) _listeners[key] = [];
      _listeners[key].push(callback);

      // Retorna función para desuscribirse
      return function () {
        _listeners[key] = _listeners[key].filter(function (cb) {
          return cb !== callback;
        });
      };
    },

    /**
     * Notificar cambio a suscriptores
     */
    _notify: function (key, newValue, oldValue) {
      var callbacks = (_listeners[key] || []).concat(_listeners['*'] || []);
      callbacks.forEach(function (cb) {
        try { cb(newValue, oldValue, key); }
        catch (e) { console.error('[State] Error en listener:', e); }
      });
    },

    /**
     * Debug: ver estado completo
     */
    debug: function () {
      console.log('[State]', JSON.parse(JSON.stringify(_state)));
    }
  };

})();
