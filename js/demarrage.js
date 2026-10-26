/* WealthMorand : avant l'affichage, le thème choisi, l'écran d'ouverture (une fois par session)
   et, si les données sont chiffrées, l'écran du verrou à la place de l'app.
   Fichier à part : la politique de sécurité du contenu n'autorise aucun script dans la page. */
try { const t = localStorage.getItem("wealthnord.theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) { /* stockage indisponible */ }
try { if (!sessionStorage.getItem("wm.ouverture")) { document.documentElement.classList.add("avec-ouverture"); sessionStorage.setItem("wm.ouverture", "1"); } } catch (e) { /* stockage indisponible */ }
try { if ((localStorage.getItem("boussole.v1") || "").startsWith('{"wealthmorand":"chiffre"')) document.documentElement.classList.add("verrouille"); } catch (e) { /* stockage indisponible */ }
