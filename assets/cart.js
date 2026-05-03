/**
 * INGE SHOP — cart.js
 * Módulo de carrito. Maneja: add, update, remove, count, product form.
 * Flujo: Evento → Cart.method() → API → State → DOM
 */

var Cart = (function () {
  'use strict';

  /* ── Actualizar contadores DOM ───────────────────────────── */
  function updateCountDOM(count) {
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
      // Mini animación de feedback
      el.style.transform = 'scale(1.4)';
      setTimeout(function () { el.style.transform = 'scale(1)'; }, 200);
    });
  }

  /* ── Refresh carrito desde Shopify ──────────────────────── */
  function refresh() {
    return API.getCart()
      .then(function (cart) {
        State.merge('cart', {
          item_count: cart.item_count,
          total_price: cart.total_price,
          items: cart.items
        });
        updateCountDOM(cart.item_count);
        return cart;
      })
      .catch(function (err) {
        console.error('[Cart] Error al obtener carrito:', err);
      });
  }

  /* ── Agregar al carrito ─────────────────────────────────── */
  function addItem(variantId, quantity, btn) {
    if (!variantId) return;

    // Loading state en botón
    if (btn) {
      btn.disabled = true;
      btn._originalHTML = btn.innerHTML;
      btn.innerHTML = '<span style="opacity:0.7">Agregando...</span>';
    }

    State.set('ui.loading', true);

    return API.addToCart(variantId, quantity || 1)
      .then(function (item) {
        UI.showToast(item.product_title + ' agregado ✓', 'success');
        return refresh();
      })
      .catch(function (err) {
        var msg = (err && err.description) ? err.description : 'Error al agregar';
        UI.showToast(msg, 'error');
        throw err;
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = btn._originalHTML || 'Comprar';
        }
        State.set('ui.loading', false);
      });
  }

  /* ── Actualizar línea ───────────────────────────────────── */
  function updateLine(line, quantity) {
    return API.updateLine(line, quantity)
      .then(function () { return refresh(); })
      .then(function () {
        // Recargar página del carrito si estamos en /cart
        if (window.location.pathname === '/cart') {
          window.location.reload();
        }
      })
      .catch(function (err) {
        console.error('[Cart] Error al actualizar:', err);
      });
  }

  /* ── Binding: botones [data-add-to-cart] ────────────────── */
  function bindAddButtons() {
    document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
      // Limpiar listeners clonando
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var variantId = btn.getAttribute('data-add-to-cart');
        addItem(variantId, 1, btn);
      });
    });
  }

  /* ── Binding: botones de cantidad en carrito ────────────── */
  function bindQtyButtons() {
    document.querySelectorAll('.qty-btn').forEach(function (btn) {
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    document.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var line = parseInt(btn.getAttribute('data-line'));
        var qty  = parseInt(btn.getAttribute('data-qty'));
        if (qty < 0) qty = 0;
        updateLine(line, qty);
      });
    });
  }

  /* ── Binding: product form ──────────────────────────────── */
  function bindProductForm() {
    var form = document.getElementById('product-form');
    if (!form) return;

    // Limpiar listeners
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    form = document.getElementById('product-form');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var idInput = form.querySelector('[name="id"]');
      if (!idInput) return;

      var variantId = idInput.value;
      var submitBtn = form.querySelector('[type="submit"]');

      addItem(variantId, 1, submitBtn)
        .then(function () {
          // Redirigir al carrito después de 1.2s
          setTimeout(function () {
            Router.go('/cart');
          }, 1200);
        })
        .catch(function () {}); // Ya manejado con toast
    });

    // Actualizar variant ID al cambiar variante
    var variantSelect = form.querySelector('.variant-select');
    if (variantSelect) {
      variantSelect.addEventListener('change', function () {
        var hiddenId = form.querySelector('input[name="id"]');
        if (hiddenId) hiddenId.value = variantSelect.value;
      });
    }
  }

  /* ── Sticky CTA en mobile ───────────────────────────────── */
  function bindStickyCTA() {
    var stickyCta = document.querySelector('.product-sticky-cta');
    if (!stickyCta) return;

    var stickyBtn = stickyCta.querySelector('button');
    if (!stickyBtn) return;

    var newBtn = stickyBtn.cloneNode(true);
    stickyBtn.parentNode.replaceChild(newBtn, stickyBtn);

    newBtn.addEventListener('click', function () {
      var form = document.getElementById('product-form');
      if (form) {
        var submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) submitBtn.click();
      }
    });
  }

  /* ── API pública ─────────────────────────────────────────── */
  return {

    init: function () {
      bindAddButtons();
      bindQtyButtons();
      bindProductForm();
      bindStickyCTA();

      // Suscribirse a cambios de carrito para actualizar DOM
      State.on('cart', function (cartState) {
        updateCountDOM(cartState.item_count || 0);
      });
    },

    /**
     * Re-binding tras SPA swap
     */
    reinit: function () {
      bindAddButtons();
      bindQtyButtons();
      bindProductForm();
      bindStickyCTA();
    },

    refresh: refresh,

    add: addItem,

    update: updateLine
  };

})();
