/**
 * ================================================================
 *  STATUT DU SITE — L'Attrape-Rêves
 *  Modifiez uniquement la section CONFIG ci-dessous,
 *  puis committez & poussez pour mettre à jour le site.
 * ================================================================
 */

// ==================== CONFIG ====================

var STATUT = "open";
// Valeurs possibles :
//   "open"     → Ouvert normalement (aucun bandeau affiché)
//   "weather"  → Fermeture exceptionnelle pour cause de météo
//   "seasonal" → Fermeture pour période estivale
//   "special"  → Ouverture exceptionnelle

var DATES_FERMETURE = [];
// Dates de fermeture à afficher dans le bandeau.
// Exemples :
//   ["18/06"]                          → une seule date
//   ["18/06", "19/06", "20/06"]        → plusieurs dates
//   ["du 18/06 au 22/06"]              → une plage

var DATE_OUVERTURE_SPECIALE = "";
// Uniquement pour STATUT = "special"
// Exemple : "22/06/2026"

// ==================== FIN CONFIG ====================

(function () {
  var banner = document.getElementById("site-status-banner");
  if (!banner || STATUT === "open") return;

  var msg = "";
  var cls = "";

  if (STATUT === "weather") {
    cls = "status-weather";
    var dates =
      DATES_FERMETURE.length > 0 ? " — " + DATES_FERMETURE.join(", ") : "";
    msg = "⚠️  Fermeture exceptionnelle pour cause de météo" + dates;
  } else if (STATUT === "seasonal") {
    cls = "status-seasonal";
    msg = "🍂  Fermeture pour période estivale";
  } else if (STATUT === "special") {
    cls = "status-special";
    msg =
      "🎉  Ouverture exceptionnelle le " + DATE_OUVERTURE_SPECIALE;
  }

  if (msg) {
    banner.textContent = msg;
    banner.className = "site-status-banner " + cls;
    banner.removeAttribute("hidden");
  }
})();
