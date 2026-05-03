/**
 * INGE SHOP — analytics.js
 * Tracking básico de eventos para CRO.
 * Compatible con: Shopify Analytics, Google Analytics 4, Meta Pixel.
 * No bloquea el render. Todo es fire-and-forget.
 */

var Analytics = (function () {
  'use strict';

  /* ── Helper seguro para pushear eventos ─────────────────── */
  function push(eventName, data) {
    // Google Analytics 4
    if (typeof gtag === 'function') {
      try { gtag('event', eventName, data); } catch (e) {}
    }

    // Meta Pixel
    if (typeof fbq === 'function') {
      try { fbq('track', eventName, data); } catch (e) {}
    }

    // dataLayer (GTM)
    if (window.dataLayer) {
      try {
        window.dataLayer.push(Object.assign({ event: eventName }, data));
      } catch (e) {}
    }

    // Debug
    if (window.IS_DEV) {
      console.log('[Analytics]', eventName, data);
    }
  }

  /* ── Eventos de carrito ─────────────────────────────────── */
  function trackAddToCart(product) {
    push('add_to_cart', {
      currency: 'COP',
      value: (product.price || 0) / 100,
      items: [{
        item_id: product.id,
        item_name: product.title,
        price: (product.price || 0) / 100
      }]
    });
    push('AddToCart', { // Meta Pixel
      content_type: 'product',
      content_ids: [String(product.id)],
      value: (product.price || 0) / 100,
      currency: 'COP'
    });
  }

  /* ── Eventos de vista de producto ────────────────────────── */
  function trackProductView() {
    var productEl = document.querySelector('[data-product-id]');
    if (!productEl) return;

    push('view_item', {
      currency: 'COP',
      items: [{
        item_id: productEl.getAttribute('data-product-id'),
        item_name: document.title
      }]
    });
  }

  /* ── Eventos de navegación SPA ───────────────────────────── */
  function trackPageView(path) {
    push('page_view', {
      page_path: path || window.location.pathname,
      page_title: document.title
    });
  }

  /* ── Init ────────────────────────────────────────────────── */
  return {
    init: function () {
      // Track vista de producto al cargar
      if (window.location.pathname.includes('/products/')) {
        trackProductView();
      }

      // Escuchar navegación SPA
      State.on('navigation.current', function (path) {
        setTimeout(function () { trackPageView(path); }, 100);
      });

      // Escuchar adds al carrito
      // (se invoca desde Cart.add exitoso)
    },

    trackAddToCart: trackAddToCart,
    trackPageView: trackPageView,
    push: push
  };

})();
