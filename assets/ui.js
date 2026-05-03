/**
 * INGE SHOP — ui.js
 * Módulo de UI. Gestiona: navbar, animaciones, gallery, tabs, toast, loader.
 * Todos los métodos son idempotentes (se pueden re-llamar tras SPA swap).
 */

var UI = (function () {
  'use strict';

  /* ── Page loader (para SPA transitions) ──────────────────── */
  function initLoader() {
    if (document.querySelector('#page-loader')) return;

    var loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.setAttribute('aria-hidden', 'true');
    loader.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'height:2px', 'z-index:9999',
      'background:linear-gradient(90deg, var(--accent-cyan), var(--accent-green))',
      'transform-origin:left',
      'opacity:0', 'pointer-events:none',
      'transition:opacity 0.2s ease',
      'animation:loader-sweep 0.8s ease infinite'
    ].join(';');

    // Keyframes del loader
    if (!document.querySelector('#loader-keyframes')) {
      var style = document.createElement('style');
      style.id = 'loader-keyframes';
      style.textContent = '@keyframes loader-sweep{0%{transform:scaleX(0)}60%{transform:scaleX(0.8)}100%{transform:scaleX(1)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(loader);
  }

  /* ── Navbar ──────────────────────────────────────────────── */
  function initNavbar() {
    var navbar = document.querySelector('.navbar');
    var menuBtn = document.querySelector('.navbar__menu-btn');
    var mobileMenu = document.querySelector('.navbar__mobile-menu');

    if (!navbar) return;

    // Scroll effect — usa requestAnimationFrame para perf
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          navbar.classList.toggle('scrolled', window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    }

    // Remover listener anterior si existe
    window.removeEventListener('scroll', window._navbarScrollFn);
    window._navbarScrollFn = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });

    // Estado inicial
    navbar.classList.toggle('scrolled', window.scrollY > 50);

    // Menú móvil
    if (menuBtn && mobileMenu) {
      // Limpiar listeners anteriores clonando
      var newBtn = menuBtn.cloneNode(true);
      menuBtn.parentNode.replaceChild(newBtn, menuBtn);
      menuBtn = newBtn;

      menuBtn.addEventListener('click', function () {
        var isOpen = mobileMenu.classList.toggle('open');
        menuBtn.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
        menuBtn.setAttribute('aria-expanded', String(isOpen));
        State.set('ui.navOpen', isOpen);
      });

      // Cerrar al clic en link
      mobileMenu.querySelectorAll('.mobile-nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
          mobileMenu.classList.remove('open');
          menuBtn.classList.remove('active');
          document.body.style.overflow = '';
          State.set('ui.navOpen', false);
        });
      });

      // Cerrar con Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && State.get('ui.navOpen')) {
          mobileMenu.classList.remove('open');
          menuBtn.classList.remove('active');
          document.body.style.overflow = '';
          State.set('ui.navOpen', false);
        }
      });
    }
  }

  /* ── Scroll animations ────────────────────────────────────── */
  function initScrollAnimations() {
    if (!window.IntersectionObserver) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-animate]:not(.visible)').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ── Animated counters ────────────────────────────────────── */
  function initCounters() {
    if (!window.IntersectionObserver) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var target = parseInt(el.getAttribute('data-counter'));
        var suffix = el.getAttribute('data-suffix') || '';
        var duration = 1200; // ms
        var start = performance.now();

        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

        function tick(now) {
          var elapsed = now - start;
          var progress = Math.min(elapsed / duration, 1);
          var value = Math.floor(easeOut(progress) * target);
          el.textContent = value.toLocaleString('es-CO') + suffix;
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString('es-CO') + suffix;
        }

        requestAnimationFrame(tick);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-counter]').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ── Collection tabs ──────────────────────────────────────── */
  function initTabs() {
    var tabs = document.querySelectorAll('.tab-btn');
    if (!tabs.length) return;

    tabs.forEach(function (btn) {
      // Limpiar listener clonando
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    // Re-seleccionar después del clon
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        var filter = btn.getAttribute('data-filter');
        var cards = document.querySelectorAll('.product-card');
        var delay = 0;

        cards.forEach(function (card) {
          var match = filter === 'all' || card.getAttribute('data-collection') === filter;

          if (!match) {
            card.style.display = 'none';
            return;
          }

          card.style.display = 'flex';
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px)';

          var d = delay;
          setTimeout(function () {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, d);
          delay += 40;
        });
      });
    });
  }

  /* ── Product image gallery ────────────────────────────────── */
  function initGallery() {
    var mainImg = document.getElementById('product-main-img');
    if (!mainImg) return;

    mainImg.style.transition = 'opacity 0.2s ease';

    document.querySelectorAll('.product-page__thumb').forEach(function (thumb) {
      var newThumb = thumb.cloneNode(true);
      thumb.parentNode.replaceChild(newThumb, thumb);
    });

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
  }

  /* ── Toast notification ───────────────────────────────────── */
  function showToast(message, type) {
    var existing = document.querySelector('.cart-toast-popup');
    if (existing) existing.remove();

    var isError = type === 'error';
    var toast = document.createElement('div');
    toast.className = 'cart-toast-popup';

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%) translateY(120px)',
      background: 'var(--bg-elevated)',
      border: '1px solid ' + (isError ? 'rgba(255,60,60,0.4)' : 'var(--border-accent)'),
      color: isError ? '#ff6b6b' : 'var(--accent-cyan)',
      padding: '12px 24px',
      borderRadius: '100px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.8rem',
      letterSpacing: '0.05em',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: '9998',
      transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      whiteSpace: 'nowrap',
      userSelect: 'none'
    });

    var icon = isError
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

    toast.innerHTML = icon + '<span>' + message + '</span>';
    document.body.appendChild(toast);

    // Entrada con bounce
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    // Salida
    setTimeout(function () {
      toast.style.transform = 'translateX(-50%) translateY(120px)';
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 350);
    }, 2800);
  }

  /* ── Prefetch en hover ────────────────────────────────────── */
  function initPrefetch() {
    if (typeof Router === 'undefined') return;

    document.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        var href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          Router.prefetch(href);
        }
      }, { once: true, passive: true });
    });
  }

  /* ── Expose toast globalmente ─────────────────────────────── */
  window.showToast = showToast;

  /* ── API pública ─────────────────────────────────────────── */
  return {
    init: function () {
      initLoader();
      initNavbar();
      initScrollAnimations();
      initCounters();
      initTabs();
      initGallery();
      initPrefetch();
    },

    /**
     * Re-inicializar módulos UI tras swap SPA
     * (excluye navbar/loader que son persistentes)
     */
    reinit: function () {
      initScrollAnimations();
      initCounters();
      initTabs();
      initGallery();
      initPrefetch();
    },

    showToast: showToast
  };

})();
