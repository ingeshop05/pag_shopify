/**
 * INGE SHOP — router.js
 * Navegación SPA híbrida dentro de Shopify.
 * Intercepta links internos → fetch HTML → swap #main-content
 * Mantiene: scroll, carrito, estado UI, historial del navegador.
 */

var Router = (function () {
  'use strict';

  /* ── Configuración ──────────────────────────────────────── */
  var CONFIG = {
    mainSelector: '#main-content',
    transitionClass: 'page-transitioning',
    loaderSelector: '#page-loader',
    transitionDuration: 280, // ms

    // Rutas que NO deben interceptarse (dejar recargar normal)
    excludePatterns: [
      /^\/checkout/,
      /^\/account/,
      /^\/cart\/checkout/,
      /^\/admin/,
      /\.js$/,
      /\.css$/
    ]
  };

  /* ── Estado interno ─────────────────────────────────────── */
  var _isNavigating = false;
  var _cache = {}; // Simple cache de páginas fetched

  /* ── Helpers ────────────────────────────────────────────── */

  function isInternalLink(href) {
    if (!href) return false;
    try {
      var url = new URL(href, window.location.origin);
      return url.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function isExcluded(pathname) {
    return CONFIG.excludePatterns.some(function (pattern) {
      return pattern.test(pathname);
    });
  }

  function getPathname(href) {
    try {
      return new URL(href, window.location.origin).pathname +
             new URL(href, window.location.origin).search;
    } catch (e) {
      return href;
    }
  }

  function extractMain(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var main = doc.querySelector(CONFIG.mainSelector);
    var title = doc.title;
    return { main: main, title: title, doc: doc };
  }

  function updateNavLinks(pathname) {
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(function (link) {
      var linkPath = getPathname(link.getAttribute('href'));
      link.classList.toggle('active', linkPath === pathname);
    });
  }

  function showLoader() {
    var loader = document.querySelector(CONFIG.loaderSelector);
    if (loader) {
      loader.style.opacity = '1';
      loader.style.pointerEvents = 'auto';
    }
    document.body.classList.add(CONFIG.transitionClass);
  }

  function hideLoader() {
    var loader = document.querySelector(CONFIG.loaderSelector);
    if (loader) {
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
    }
    document.body.classList.remove(CONFIG.transitionClass);
  }

  function reinitPageScripts() {
    // Re-ejecutar scripts de página tras el swap
    if (typeof UI !== 'undefined') UI.reinit();
    if (typeof Cart !== 'undefined') Cart.reinit();

    // Re-observar animaciones en el nuevo contenido
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('[data-animate]:not(.visible)').forEach(function (el) {
        observer.observe(el);
      });
    }
  }

  /* ── Navegación principal ───────────────────────────────── */

  function navigate(url, pushState) {
    if (_isNavigating) return;

    var pathname = getPathname(url);

    // No navegar si es la misma página
    if (pathname === (window.location.pathname + window.location.search)) return;

    // No interceptar rutas excluidas
    if (isExcluded(pathname)) {
      window.location.href = url;
      return;
    }

    _isNavigating = true;
    State.set('navigation.isTransitioning', true);
    State.set('navigation.previous', window.location.pathname);

    showLoader();

    // Verificar cache
    var cached = _cache[pathname];
    var fetchPromise = cached
      ? Promise.resolve(cached)
      : API.fetchPage(url);

    fetchPromise
      .then(function (html) {
        // Guardar en cache (max 20 páginas)
        if (!cached) {
          var cacheKeys = Object.keys(_cache);
          if (cacheKeys.length > 20) delete _cache[cacheKeys[0]];
          _cache[pathname] = html;
        }

        var extracted = extractMain(html);

        if (!extracted.main) {
          // Fallback: navegación normal si no hay #main-content
          window.location.href = url;
          return;
        }

        // Transición de salida
        var mainEl = document.querySelector(CONFIG.mainSelector);
        if (mainEl) {
          mainEl.style.opacity = '0';
          mainEl.style.transform = 'translateY(8px)';
        }

        setTimeout(function () {
          // Swap contenido
          if (mainEl && extracted.main) {
            mainEl.innerHTML = extracted.main.innerHTML;
            mainEl.style.opacity = '';
            mainEl.style.transform = '';
          }

          // Actualizar título y URL
          document.title = extracted.title;
          if (pushState !== false) {
            window.history.pushState({ url: url }, extracted.title, url);
          }

          // Actualizar estado
          State.set('navigation.current', pathname);
          State.set('ui.activeRoute', pathname);

          // UI updates
          updateNavLinks(pathname);
          window.scrollTo({ top: 0, behavior: 'instant' });
          hideLoader();
          reinitPageScripts();

          _isNavigating = false;
          State.set('navigation.isTransitioning', false);

        }, CONFIG.transitionDuration);

      })
      .catch(function (err) {
        console.error('[Router] Error al cargar página:', err);
        // Fallback a navegación nativa
        window.location.href = url;
        _isNavigating = false;
        hideLoader();
      });
  }

  /* ── Event listeners ────────────────────────────────────── */

  function interceptClicks() {
    document.addEventListener('click', function (e) {
      // Buscar el <a> más cercano
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href');

      // Ignorar: modificadores, target, anchors, externos
      if (
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
        link.target === '_blank' ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        !isInternalLink(href) ||
        isExcluded(getPathname(href))
      ) {
        return;
      }

      e.preventDefault();
      navigate(href);
    });
  }

  function handlePopState() {
    window.addEventListener('popstate', function (e) {
      var url = e.state && e.state.url ? e.state.url : window.location.href;
      navigate(url, false);
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  return {
    init: function () {
      // Guardar estado inicial en history
      window.history.replaceState(
        { url: window.location.href },
        document.title,
        window.location.href
      );

      interceptClicks();
      handlePopState();

      // Aplicar transición al main content
      var mainEl = document.querySelector(CONFIG.mainSelector);
      if (mainEl) {
        mainEl.style.transition = 'opacity ' + CONFIG.transitionDuration + 'ms ease, transform ' + CONFIG.transitionDuration + 'ms ease';
      }

      console.log('[Router] SPA Router iniciado ✓');
    },

    /**
     * Navegar programáticamente
     * @param {string} url
     */
    go: function (url) {
      navigate(url);
    },

    /**
     * Precachear página en background
     * @param {string} url
     */
    prefetch: function (url) {
      if (!_cache[getPathname(url)]) {
        API.fetchPage(url)
          .then(function (html) { _cache[getPathname(url)] = html; })
          .catch(function () {}); // Silencioso
      }
    },

    /**
     * Limpiar cache
     */
    clearCache: function () {
      _cache = {};
    }
  };

})();
