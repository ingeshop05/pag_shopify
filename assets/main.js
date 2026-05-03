// Inge Shop — main.js (Shopify compatible, no ES modules)

// ── Navbar ──────────────────────────────────────────────
(function initNavbar() {
  var navbar = document.querySelector('.navbar');
  var menuBtn = document.querySelector('.navbar__menu-btn');
  var mobileMenu = document.querySelector('.navbar__mobile-menu');

  if (!navbar) return;

  window.addEventListener('scroll', function () {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      menuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
      menuBtn.setAttribute('aria-expanded', mobileMenu.classList.contains('open'));
    });

    document.querySelectorAll('.mobile-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        menuBtn.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
})();

// ── Scroll animations ────────────────────────────────────
(function initScrollAnimations() {
  if (!window.IntersectionObserver) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate]').forEach(function (el) {
    observer.observe(el);
  });
})();

// ── Animated counters ────────────────────────────────────
(function initCounters() {
  if (!window.IntersectionObserver) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = parseInt(el.getAttribute('data-counter'));
      var suffix = el.getAttribute('data-suffix') || '';
      var start = 0;
      var step = target / 60;
      function tick() {
        start = Math.min(start + step, target);
        el.textContent = Math.floor(start).toLocaleString('es-CO') + suffix;
        if (start < target) requestAnimationFrame(tick);
      }
      tick();
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-counter]').forEach(function (el) {
    observer.observe(el);
  });
})();

// ── Collection tabs (home page) ──────────────────────────
(function initTabs() {
  var tabs = document.querySelectorAll('.tab-btn');
  if (!tabs.length) return;

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      var filter = btn.getAttribute('data-filter');
      var cards = document.querySelectorAll('.product-card');

      cards.forEach(function (card) {
        var match = filter === 'all' || card.getAttribute('data-collection') === filter;
        card.style.display = match ? 'flex' : 'none';
        if (match) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px)';
          setTimeout(function () {
            card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 30);
        }
      });
    });
  });
})();

// ── Product image gallery ────────────────────────────────
(function initGallery() {
  var mainImg = document.getElementById('product-main-img');
  if (!mainImg) return;

  document.querySelectorAll('.product-page__thumb').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      document.querySelectorAll('.product-page__thumb').forEach(function (t) {
        t.classList.remove('active');
      });
      thumb.classList.add('active');
      mainImg.style.opacity = '0';
      setTimeout(function () {
        mainImg.src = thumb.getAttribute('data-src');
        mainImg.style.opacity = '1';
      }, 200);
    });
  });

  mainImg.style.transition = 'opacity 0.2s ease';
})();

// ── Toast notification ───────────────────────────────────
function showToast(message, type) {
  var existing = document.querySelector('.cart-toast-popup');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'cart-toast-popup';
  toast.style.cssText = [
    'position:fixed', 'bottom:2rem', 'left:50%',
    'transform:translateX(-50%) translateY(100px)',
    'background:var(--bg-elevated)',
    'border:1px solid ' + (type === 'error' ? 'rgba(255,60,60,0.4)' : 'var(--border-accent)'),
    'color:' + (type === 'error' ? '#ff6b6b' : 'var(--accent-cyan)'),
    'padding:12px 24px', 'border-radius:100px',
    'font-family:var(--font-mono)', 'font-size:0.8rem',
    'letter-spacing:0.05em', 'display:flex',
    'align-items:center', 'gap:8px',
    'z-index:9999',
    'transition:transform 0.3s cubic-bezier(0.4,0,0.2,1)',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'white-space:nowrap'
  ].join(';');

  toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>' + message + '</span>';
  document.body.appendChild(toast);

  requestAnimationFrame(function () {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(function () {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  });
}

// ── Add to cart (Shopify AJAX API) ───────────────────────
document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var variantId = btn.getAttribute('data-add-to-cart');
    btn.disabled = true;
    btn.style.opacity = '0.6';

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.status) {
        showToast(data.description || 'Error al agregar', 'error');
      } else {
        showToast(data.product_title + ' agregado', 'success');
        updateCartCount();
      }
    })
    .catch(function () {
      showToast('Error de conexión', 'error');
    })
    .finally(function () {
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  });
});

// ── Cart count updater ───────────────────────────────────
function updateCartCount() {
  fetch('/cart.js')
    .then(function (res) { return res.json(); })
    .then(function (cart) {
      document.querySelectorAll('.cart-count').forEach(function (el) {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? 'flex' : 'none';
      });
    });
}

// ── Cart quantity buttons ────────────────────────────────
document.querySelectorAll('.qty-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var line = btn.getAttribute('data-line');
    var qty = parseInt(btn.getAttribute('data-qty'));
    if (qty < 0) qty = 0;

    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: line, quantity: qty })
    })
    .then(function () { location.reload(); });
  });
});

// ── Product form (add to cart on product page) ───────────
var productForm = document.getElementById('product-form');
if (productForm) {
  productForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var variantId = productForm.querySelector('[name="id"]').value;
    var submitBtn = productForm.querySelector('[type="submit"]');
    var originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Agregando...';

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.status) {
        showToast(data.description || 'Error', 'error');
      } else {
        showToast('Agregado al carrito', 'success');
        updateCartCount();
        setTimeout(function () { window.location.href = '/cart'; }, 1200);
      }
    })
    .finally(function () {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    });
  });
}

// Run cart count on load
updateCartCount();
