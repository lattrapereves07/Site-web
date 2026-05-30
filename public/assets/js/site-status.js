/**
 * Bandeau statut du site — L'Attrape-Rêves
 * Le statut est géré depuis /admin (section "Statut du site").
 * Ce fichier n'a plus besoin d'être édité manuellement.
 */
(function () {
  var banner = document.getElementById('site-status-banner');
  if (!banner) return;

  fetch('/api/site-status')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || data.statut === 'open') return;

      var msg = '';
      var cls = '';

      if (data.statut === 'weather') {
        cls = 'status-weather';
        var dates = (data.dates_fermeture || []).length > 0
          ? ' — ' + data.dates_fermeture.join(', ')
          : '';
        msg = '⚠️  Fermeture exceptionnelle pour cause de météo' + dates;
      } else if (data.statut === 'seasonal') {
        cls = 'status-seasonal';
        msg = '🍂  Fermeture pour période estivale';
      } else if (data.statut === 'special') {
        cls = 'status-special';
        msg = '🎉  Ouverture exceptionnelle le ' + (data.date_ouverture_speciale || '');
      }

      if (msg) {
        banner.textContent = msg;
        banner.className = 'site-status-banner ' + cls;
        banner.removeAttribute('hidden');
      }
    })
    .catch(function () { /* silencieux — pas de bandeau en cas d'erreur */ });
})();
