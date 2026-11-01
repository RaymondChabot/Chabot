/* WealthMorand — verrou par phrase de passe, facultatif.
   Activé, il chiffre les données gardées dans ce navigateur : AES-GCM 256 bits, clé tirée de la
   phrase par PBKDF2-SHA-256 (600 000 itérations, sel au hasard). La phrase n'est jamais gardée ;
   seule la clé reste en mémoire, tant que l'app est ouverte. Une phrase oubliée ne se retrouve pas.
   Chargé avant app.js et rapport.js : ils démarrent une fois les données ouvertes (quandOuvert). */
(function () {
  "use strict";
  const CLE = "boussole.v1", ENTETE = '{"wealthmorand":"chiffre"', ITERATIONS = 600000, CLE_DELAI = "wm.verrou.delai";
  const subtle = window.isSecureContext && window.crypto && window.crypto.subtle;
  const enc = new TextEncoder(), dec = new TextDecoder();

  // Base64 par tranches : les données chiffrées dépassent la limite d'arguments d'une fonction.
  function versB64(u8) {
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deB64(t) { const s = atob(t), u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8; }

  // La même phrase donne la même clé, quelle que soit la façon dont l'appareil compose les accents.
  async function deriver(phrase, sel, iterations) {
    const base = await subtle.importKey("raw", enc.encode(phrase.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey({ name: "PBKDF2", salt: sel, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  // Enveloppe : un en-tête sans donnée personnelle (méthode, sel, vecteur), puis les données chiffrées.
  async function chiffrer(texte, cle, sel, iterations) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const donnees = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, cle, enc.encode(texte)));
    return JSON.stringify({ wealthmorand: "chiffre", version: 1, methode: "AES-GCM 256, PBKDF2-SHA-256", iterations, sel: versB64(sel), iv: versB64(iv), donnees: versB64(donnees) });
  }
  const dechiffrer = async (env, cle) => dec.decode(await subtle.decrypt({ name: "AES-GCM", iv: deB64(env.iv) }, cle, deB64(env.donnees)));
  // Ouvre une enveloppe avec une phrase ; échoue si la phrase est fausse ou le fichier abîmé.
  // Le nombre d'itérations vient du fichier : borné, pour qu'un fichier piégé ne fige pas l'app.
  async function ouvrirEnveloppe(env, phrase) {
    const n = +env.iterations;
    if (!(n >= 100000 && n <= 10000000)) throw new Error("itérations");
    const sel = deB64(env.sel), cle = await deriver(phrase, sel, n);
    return { texte: await dechiffrer(env, cle), cle, sel, iterations: n };
  }
  const estChiffre = d => typeof d === "string" ? d.startsWith(ENTETE) : !!d && d.wealthmorand === "chiffre";

  let cle = null, sel = null, iterations = ITERATIONS, texteOuvert = null, ouvert = false;
  const attente = [];
  function ouvrir() {
    ouvert = true;
    document.documentElement.classList.remove("verrouille");   // avant le rendu : les graphiques prennent la largeur des cartes
    attente.splice(0).forEach(f => f());
  }

  // Écritures chiffrées, dans l'ordre ; si plusieurs arrivent pendant un chiffrement, seule la dernière compte.
  // Une écriture faite avec une clé remplacée entre-temps (phrase changée, verrou retiré) est abandonnée.
  let file = Promise.resolve(), prochain = null, fige = false;
  function ecrire(texte) {
    if (fige) return;
    if (!cle) { prochain = null; localStorage.setItem(CLE, texte); return; }
    const dejaPrevue = prochain !== null;
    prochain = texte;
    if (dejaPrevue) return;
    file = file.then(async () => {
      const t = prochain, k = cle, s = sel, n = iterations; prochain = null;
      if (t === null || !k) return;
      try { const env = await chiffrer(t, k, s, n); if (k === cle) localStorage.setItem(CLE, env); } catch (e) { /* stockage plein ou indisponible */ }
    });
  }
  // La phrase ouvre-t-elle les données gardées ?
  async function verifier(phrase) {
    try { await dechiffrer(JSON.parse(localStorage.getItem(CLE)), await deriver(phrase, sel, iterations)); return true; } catch (e) { return false; }
  }
  // Nouvelle clé (nouveau sel), puis relecture : les données gardées doivent s'ouvrir avec elle.
  async function nouvelleCle(phrase, texteActuel) {
    const s = crypto.getRandomValues(new Uint8Array(16)), k = await deriver(phrase, s, ITERATIONS);
    cle = k; sel = s; iterations = ITERATIONS;
    ecrire(texteActuel());
    await file;
    await dechiffrer(JSON.parse(localStorage.getItem(CLE)), k);
  }

  // Verrouiller : on recharge la page ; rien de déchiffré ne reste en mémoire.
  function verrouiller() { file.then(() => location.reload()); }
  const delai = () => { try { return +localStorage.getItem(CLE_DELAI) || 5; } catch (e) { return 5; } };
  // Sans utilisation pendant le délai choisi (l'app en arrière-plan compte), le verrou se referme.
  let activite = Date.now();
  for (const t of ["pointerdown", "keydown", "wheel", "touchstart"]) document.addEventListener(t, () => { activite = Date.now(); }, { capture: true, passive: true });
  function surveiller() { if (cle && Date.now() - activite >= delai() * 60000) verrouiller(); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) surveiller(); });
  setInterval(surveiller, 15000);
  // Un autre onglet a activé, changé ou retiré le verrou : celui-ci n'écrit plus avec l'ancien
  // réglage (il retirerait le verrou ou remettrait l'ancienne phrase) ; on le recharge.
  window.addEventListener("storage", e => {
    if (e.key !== CLE || !ouvert || fige) return;
    let autre = null;
    try { if (estChiffre(e.newValue || "")) autre = JSON.parse(e.newValue).sel; } catch (err) { /* valeur illisible */ }
    if (autre !== (cle ? versB64(sel) : null)) { fige = true; location.reload(); }
  });

  /* Lien de transfert vers un autre appareil, sans compte ni serveur : les données, compressées puis
     chiffrées (AES-GCM 256) avec un code au hasard de 16 caractères (80 bits), vont dans le fragment
     du lien (après #), que le navigateur n'envoie jamais au serveur. Sans le code, le lien est illisible.
     Charge : version (1), indicateurs (1 = compressée), longueur des données chiffrées (4, pour
     reconnaître un lien coupé), sel (16), vecteur (12), données chiffrées. L'en-tête est authentifié. */
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", ITER_TRANSFERT = 200000;   // ni 0, O, 1 ni I
  const codeAuHasard = () => [...crypto.getRandomValues(new Uint8Array(16))].map(o => ALPHABET[o & 31]).join("").match(/.{4}/g).join("-");
  const codeNu = c => String(c).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const versB64url = u8 => versB64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const deB64url = t => deB64(t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4));
  // Passe des octets dans un flux (compression) ; au plus « plafond » octets en sortie.
  async function parFlux(u8, flux, plafond = Infinity) {
    const lecteur = new Blob([u8]).stream().pipeThrough(flux).getReader(), morceaux = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.length;
      if (total > plafond) { await lecteur.cancel(); throw new Error("format"); }
      morceaux.push(value);
    }
    const sortie = new Uint8Array(total); let i = 0;
    for (const m of morceaux) { sortie.set(m, i); i += m.length; }
    return sortie;
  }
  async function creerTransfert(texte) {
    const code = codeAuHasard(), sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const brut = enc.encode(texte);
    let comp = null;
    try { if (typeof CompressionStream !== "undefined") comp = await parFlux(brut, new CompressionStream("deflate")); } catch (e) { /* sans compression */ }
    const compresse = !!comp && comp.length < brut.length, corps = compresse ? comp : brut;
    const tete = new Uint8Array(6); tete[0] = 1; tete[1] = compresse ? 1 : 0;
    new DataView(tete.buffer).setUint32(2, corps.length + 16);   // + 16 : l'étiquette d'AES-GCM
    const cle = await deriver(codeNu(code), sel, ITER_TRANSFERT);
    const chiffre = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: tete }, cle, corps));
    const charge = new Uint8Array(34 + chiffre.length);
    charge.set(tete); charge.set(sel, 6); charge.set(iv, 22); charge.set(chiffre, 34);
    return { code, charge: versB64url(charge) };
  }
  // Erreurs : « format » (lien abîmé ou incomplet), « code » (mauvais code), « ancien » (navigateur sans décompression).
  async function ouvrirTransfert(charge, code) {
    let u8;
    try { u8 = deB64url(String(charge).trim()); } catch (e) { throw new Error("format", { cause: e }); }
    if (u8.length < 51 || u8[0] !== 1 || new DataView(u8.buffer).getUint32(2) !== u8.length - 34) throw new Error("format");
    let corps;
    try {
      const cle = await deriver(codeNu(code), u8.slice(6, 22), ITER_TRANSFERT);
      corps = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: u8.slice(22, 34), additionalData: u8.slice(0, 6) }, cle, u8.slice(34)));
    } catch (e) { throw new Error("code", { cause: e }); }
    if (u8[1] & 1) {
      if (typeof DecompressionStream === "undefined") throw new Error("ancien");
      corps = await parFlux(corps, new DecompressionStream("deflate"), 5000000);
    }
    return dec.decode(corps);
  }

  window.Verrou = {
    disponible: !!subtle,
    actif: () => !!cle,
    estChiffre,
    transfert: { creer: creerTransfert, ouvrir: ouvrirTransfert },
    // app.js et rapport.js démarrent tout de suite sans verrou, sinon une fois la phrase entrée.
    quandOuvert(f) { if (ouvert) f(); else attente.push(f); },
    lire: () => (cle ? texteOuvert : localStorage.getItem(CLE)),
    ecrire,
    async activer(phrase, texteActuel) {
      try { await nouvelleCle(phrase, texteActuel); } catch (e) { cle = sel = null; ecrire(texteActuel()); throw e; }
    },
    async changer(ancienne, nouvelle, texteActuel) {
      if (!(await verifier(ancienne))) return false;
      const avant = [cle, sel, iterations];
      try { await nouvelleCle(nouvelle, texteActuel); } catch (e) { [cle, sel, iterations] = avant; ecrire(texteActuel()); throw e; }
      return true;
    },
    async retirer(phrase, texteActuel) {
      if (!(await verifier(phrase))) return false;
      cle = sel = null; texteOuvert = null;
      ecrire(texteActuel());
      return true;
    },
    verrouiller,
    delai,
    choisirDelai(min) { try { localStorage.setItem(CLE_DELAI, String(min)); } catch (e) { /* préférence non gardée */ } },
    // Sauvegarde exportée : chiffrée avec la même clé (donc la même phrase) quand le verrou est activé.
    pourExport: async texte => (cle ? chiffrer(texte, cle, sel, iterations) : texte),
    ouvrirFichier: async (env, phrase) => (await ouvrirEnveloppe(env, phrase)).texte,
  };

  /* Écran du verrou : la phrase, ou l'effacement des données de cet appareil si elle est oubliée. */
  let stocke = null;
  try { stocke = localStorage.getItem(CLE); } catch (e) { /* stockage indisponible */ }
  if (!estChiffre(stocke)) { ouvrir(); return; }
  document.documentElement.classList.add("verrouille");
  const form = document.getElementById("verrou-form"), champ = document.getElementById("verrou-phrase");
  const msg = document.getElementById("verrou-message"), bouton = document.getElementById("verrou-ouvrir");
  if (!subtle) { msg.textContent = "Ce navigateur ne peut pas ouvrir des données chiffrées : ouvrez WealthMorand à son adresse habituelle (https)."; bouton.disabled = true; }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!champ.value || bouton.disabled) return;
    const t = localStorage.getItem(CLE);
    if (!estChiffre(t)) { location.reload(); return; }   // verrou retiré dans un autre onglet
    bouton.disabled = true; msg.textContent = "Ouverture…";
    try {
      const o = await ouvrirEnveloppe(JSON.parse(t), champ.value);
      cle = o.cle; sel = o.sel; iterations = o.iterations; texteOuvert = o.texte;
      champ.value = ""; msg.textContent = ""; activite = Date.now();
      ouvrir();
    } catch (err) {
      msg.textContent = "Phrase de passe incorrecte.";
      bouton.disabled = false; champ.select();
    }
  });
  const effacer = document.getElementById("verrou-effacer"), effacerOui = document.getElementById("verrou-effacer-oui");
  effacer.addEventListener("click", () => { effacerOui.hidden = false; effacerOui.focus(); });
  effacerOui.addEventListener("click", () => { try { localStorage.removeItem(CLE); } catch (e) { /* stockage indisponible */ } location.reload(); });
  champ.focus();
})();
