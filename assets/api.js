/**
 * INGE SHOP — api.js
 * Wrapper sobre la Shopify AJAX Cart API y Storefront API.
 * Flujo: UI → api.js → Shopify → State → DOM
 */

var API = (function () {
  'use strict';

  var BASE = '';
  var HEADERS = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  /* ── Fetch helper con manejo de errores ─────────────────── */
  function request(url, options) {
    options = options || {};
    options.headers = Object.assign({}, HEADERS, options.headers || {});

    return fetch(BASE + url, options)
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw err;
          });
        }
        return res.json();
      });
  }

  /* ── API pública ────────────────────────────────────────── */
  return {

    /**
     * Obtener carrito completo
     * GET /cart.js
     */
    getCart: function () {
      return request('/cart.js');
    },

    /**
     * Agregar item al carrito
     * POST /cart/add.js
     * @param {string|number} variantId
     * @param {number} quantity
     * @param {object} properties - propiedades opcionales
     */
    addToCart: function (variantId, quantity, properties) {
      var body = {
        id: String(variantId),
        quantity: quantity || 1
      };
      if (properties) body.properties = properties;

      return request('/cart/add.js', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    /**
     * Actualizar cantidad de item por línea
     * POST /cart/change.js
     * @param {number} line - índice de línea (1-based)
     * @param {number} quantity - nueva cantidad (0 = eliminar)
     */
    updateLine: function (line, quantity) {
      return request('/cart/change.js', {
        method: 'POST',
        body: JSON.stringify({ line: line, quantity: quantity })
      });
    },

    /**
     * Actualizar cantidad por variant ID
     * POST /cart/change.js
     * @param {string|number} variantId
     * @param {number} quantity
     */
    updateVariant: function (variantId, quantity) {
      var updates = {};
      updates[String(variantId)] = quantity;
      return request('/cart/update.js', {
        method: 'POST',
        body: JSON.stringify({ updates: updates })
      });
    },

    /**
     * Eliminar item del carrito
     * @param {string|number} variantId
     */
    removeItem: function (variantId) {
      return this.updateVariant(variantId, 0);
    },

    /**
     * Vaciar carrito
     * POST /cart/clear.js
     */
    clearCart: function () {
      return request('/cart/clear.js', { method: 'POST' });
    },

    /**
     * Fetch productos de una colección via AJAX
     * @param {string} collectionHandle
     * @param {object} options - { limit, page, sort_by }
     */
    getCollection: function (collectionHandle, options) {
      options = options || {};
      var params = new URLSearchParams({
        limit: options.limit || 12,
        page: options.page || 1
      });
      if (options.sort_by) params.set('sort_by', options.sort_by);

      return request('/collections/' + collectionHandle + '/products.json?' + params.toString());
    },

    /**
     * Fetch sección Shopify como HTML (para SPA)
     * @param {string} sectionId - ID de la sección Shopify
     * @param {object} params - query params adicionales
     */
    fetchSection: function (sectionId, params) {
      params = params || {};
      var query = new URLSearchParams(
        Object.assign({ section_id: sectionId }, params)
      );
      return fetch('/?' + query.toString(), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }).then(function (res) { return res.text(); });
    },

    /**
     * Fetch página completa como HTML (para SPA routing)
     * @param {string} url - pathname
     */
    fetchPage: function (url) {
      return fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      });
    },

    /**
     * Obtener producto por handle (JSON)
     * @param {string} handle
     */
    getProduct: function (handle) {
      return request('/products/' + handle + '.js');
    }

  };

})();
