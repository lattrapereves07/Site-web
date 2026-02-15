/* ============================================
   L'ATTRAPE-REVES - main.js
   Ferme de decouverte et d'emerveillement
   ============================================ */

(function () {
  'use strict';

  /* ---- HAMBURGER MENU ---- */
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileOverlay = document.querySelector('.mobile-overlay');

  function toggleMenu(open) {
    const isOpen = typeof open === 'boolean' ? open : !hamburger.classList.contains('open');
    hamburger.classList.toggle('open', isOpen);
    mobileNav.classList.toggle('open', isOpen);
    mobileOverlay.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', function () { toggleMenu(); });
  }
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function () { toggleMenu(false); });
  }

  // Close mobile menu on link click
  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { toggleMenu(false); });
    });
  }

  /* ---- ACTIVE NAV LINK ---- */
  function setActiveNav() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mobile-nav a[data-page]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === page || (page === '' && href === 'index.html') || (page === 'index.html' && href === 'index.html')) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }
  setActiveNav();

  /* ---- i18n MULTILINGUAL SYSTEM ---- */
  var currentLang = localStorage.getItem('atrv-lang') || 'fr';
  var translations = {};

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('atrv-lang', lang);
    loadTranslations(lang);
    updateLangButtons(lang);
  }

  function updateLangButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
  }

  function loadTranslations(lang) {
    // Determine base path for lang files
    var basePath = getBasePath();
    var url = basePath + 'assets/lang/' + lang + '.json';

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        translations = data;
        applyTranslations();
      })
      .catch(function (err) {
        console.warn('i18n: Could not load ' + lang + '.json', err);
      });
  }

  function getBasePath() {
    // Works for both root and subdirectory hosting
    var path = window.location.pathname;
    var idx = path.lastIndexOf('/');
    return path.substring(0, idx + 1);
  }

  function getNestedValue(obj, key) {
    return key.split('.').reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : null;
    }, obj);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = getNestedValue(translations, key);
      if (val !== null) {
        el.innerHTML = val;
      }
    });
    // Also update placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = getNestedValue(translations, key);
      if (val !== null) {
        el.setAttribute('placeholder', val);
      }
    });
    // Update title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var val = getNestedValue(translations, key);
      if (val !== null) {
        el.setAttribute('title', val);
      }
    });
    // Update alt attributes
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      var val = getNestedValue(translations, key);
      if (val !== null) {
        el.setAttribute('alt', val);
      }
    });
    // Update document lang attribute
    document.documentElement.lang = currentLang;
  }

  // Bind all lang buttons
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-lang'));
    });
  });

  // Initialize
  updateLangButtons(currentLang);
  loadTranslations(currentLang);

  /* ---- FAQ ACCORDION ---- */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var isOpen = item.classList.contains('open');

      // Close all others
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Toggle current
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---- SCROLL FADE-IN ANIMATIONS ---- */
  var fadeEls = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window && fadeEls.length > 0) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything
    fadeEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ---- HEADER SCROLL SHADOW ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    var lastScroll = 0;
    window.addEventListener('scroll', function () {
      var scroll = window.pageYOffset;
      if (scroll > 10) {
        header.style.boxShadow = '0 2px 16px rgba(0,0,0,0.1)';
      } else {
        header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
      }
      lastScroll = scroll;
    }, { passive: true });
  }

})();
