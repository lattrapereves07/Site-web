/**
 * Bandeau(x) statut du site — L'Attrape-Rêves
 * Le statut est géré depuis /admin (section "Statut du site").
 * Ce fichier n'a plus besoin d'être édité manuellement.
 */
(function () {
  var banner = document.getElementById('site-status-banner');
  if (!banner) return;

  fetch('/api/site-status')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data) return;
      var lines = [];

      // --- Fermeture ---
      var fe = data.fermeture;
      if (fe && fe.actif) {
        var msg = '';
        var cls = '';
        if (fe.type === 'weather') {
          cls = 'status-line--weather';
          var dates = (fe.dates || []).length > 0 ? ' — ' + fe.dates.join(', ') : '';
          msg = '⚠️  Fermeture exceptionnelle pour cause de météo' + dates;
        } else if (fe.type === 'winter') {
          cls = 'status-line--winter';
          msg = '❄️  Fermé pour l’hiver, on se retrouve au printemps !';
        } else if (fe.type === 'custom') {
          cls = 'status-line--custom';
          msg = '⚠️  Fermeture exceptionnelle';
          if (fe.motif) msg += ' — ' + fe.motif;
          if ((fe.dates || []).length > 0) msg += ' · ' + fe.dates.join(', ');
        }
        if (msg) lines.push('<div class="status-line ' + cls + '">' + msg + '</div>');
      }

      // --- Ouverture exceptionnelle ---
      var os = data.ouverture_speciale;
      if (os && os.actif) {
        var osMsg = '🎉  Ouverture exceptionnelle';
        if (os.motif) osMsg += ' — ' + os.motif;
        if (os.date) osMsg += ' le ' + os.date;
        lines.push('<div class="status-line status-line--special">' + osMsg + '</div>');
      }

      if (lines.length > 0) {
        banner.innerHTML = lines.join('');
        banner.removeAttribute('hidden');
      }
    })
    .catch(function () { /* silencieux en cas d'erreur */ });
})();
