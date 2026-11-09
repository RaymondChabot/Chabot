/* Répertoire des actes d'un médecin de famille en GMF-U en établissement, au mode mixte (annexe XXIII, section B-2).
   Sources :
   - Manuel des médecins omnipraticiens, rémunération à l'acte, version imprimable du 28 octobre 2026 (RAMQ,
     https://www.ramq.gouv.qc.ca/fr/professionnels/media/32651, consulté le 6 novembre 2026) : tarifs de l'onglet B
     (colonne « En CLSC ou en GMF-U en établissement ») et des onglets C, F et Q. Les actes chirurgicaux y sont publiés
     en dollars entiers.
   - Brochure no 1, Entente générale, version en vigueur au 5 novembre 2026 (RAMQ, consultée le 6 novembre 2026) :
     forfait horaire, intervention de supervision, pourcentages payés au mixte en GMF-U (63,58 % des services médicaux,
     62,15 % des services sur base de temps), suppléments payés à 100 % (annexe II à l'annexe XXIII).
   - EP 40 et EP 42 (Brochure no 1) : forfait de responsabilité, suppléments, demi-per diem (liste 1, établissement).
   Ordre : fréquence estimée pour une pratique en GMF-U, validée avec la personne le 6 novembre 2026.
   Champs : g groupe, n nom, c codes, t tarif (nombre, [palier 1, palier 2] ou null si absent du manuel), p part payée
   au mixte en % (0 : non facturable à part), d libellés des deux montants, k mots de recherche, note. */
(function (racine) {
  "use strict";
  const MED = 63.58, TEMPS = 62.15, PLEIN = 100;
  const GROUPES = [
    ["base", "Base du mixte"], ["visites", "Visites"], ["temps", "Interventions et psychothérapie"],
    ["techniques", "Actes techniques"], ["formulaires", "Formulaires et suppléments"], ["non", "Non facturables à part"],
  ];
  const CM = ["1 cm ou moins", "plus de 1 cm"];
  const ACTES = [
    // Base du mixte (Brochure no 1, annexe XXIII, section B-2).
    { g: "base", n: "Forfait horaire, première heure complète", c: ["42094"], t: 59.68, p: PLEIN, k: "heure presence" },
    { g: "base", n: "Forfait horaire, chaque période complète de 15 minutes de plus", c: ["42095"], t: 14.92, p: PLEIN, k: "heure quart" },
    { g: "base", n: "Intervention de supervision, par période complète de 15 minutes", c: ["42096", "42097", "42098"], t: 24.87, p: TEMPS,
      k: "resident externe enseignement superviseur apprenant", note: "Au plus 3,5 h l'avant-midi (42096) et le soir (42098), 5 h l'après-midi (42097) ; un seul acte quel que soit le nombre d'apprenants." },
    { g: "base", n: "Activité académique, par période complète de 15 minutes", c: ["42099"], t: 24.87, p: TEMPS, k: "enseignement formation" },
    { g: "base", n: "Demi-per diem du médecin enseignant (liste 1)", c: ["19911", "19912", "19914", "19915", "19917", "19918", "19920", "19921"], t: [41.45, 49.85],
      d: ["par résident", "par externe"], p: PLEIN, k: "ep 42 resident externe forfait de formation", note: "EP 42 ; liste 2 : 65,20 $ et 73,55 $." },

    // Visites (manuel, onglet B ; établissement).
    { g: "visites", n: "Suivi, patient non vulnérable de moins de 80 ans", c: ["15803", "15804"], t: [32.25, 36.95], p: MED, k: "visite rendez-vous" },
    { g: "visites", n: "Suivi, patient vulnérable de moins de 80 ans", c: ["15823", "15824"], t: [40.50, 45.20], p: MED, k: "visite rendez-vous" },
    { g: "visites", n: "Visite ponctuelle mineure, non vulnérable", c: ["15765", "15766"], t: [15.30, 17.70], p: MED, k: "sans rendez-vous srv" },
    { g: "visites", n: "Visite ponctuelle complexe, non vulnérable", c: ["15773", "15774"], t: [30.65, 35.40], p: MED, k: "sans rendez-vous srv" },
    { g: "visites", n: "Visite périodique, patient vulnérable de moins de 80 ans", c: ["15819", "15820"], t: [72.65, 84.80], p: MED, k: "examen annuel bilan" },
    { g: "visites", n: "Visite ponctuelle complexe, vulnérable", c: ["15775", "15776"], t: [38.85, 43.65], p: MED, k: "sans rendez-vous srv" },
    { g: "visites", n: "Visite ponctuelle mineure, vulnérable", c: ["15767", "15768"], t: [23.55, 25.90], p: MED, k: "sans rendez-vous srv" },
    { g: "visites", n: "Prise en charge, patient non vulnérable de moins de 80 ans", c: ["15801", "15802"], t: [64.50, 74.75], p: MED, k: "inscription nouveau patient pec" },
    { g: "visites", n: "Prise en charge, patient vulnérable de moins de 80 ans", c: ["15821", "15822"], t: [72.65, 82.90], p: MED, k: "inscription nouveau patient pec" },
    { g: "visites", n: "Suivi, patient vulnérable de 80 ans ou plus", c: ["15837", "15838"], t: [46.30, 51.95], p: MED, k: "visite age" },
    { g: "visites", n: "Suivi, patient non vulnérable de 80 ans ou plus", c: ["15817", "15818"], t: [38.15, 43.80], p: MED, k: "visite age" },
    { g: "visites", n: "Visite périodique pédiatrique", c: ["15813", "15814"], t: [50.30, 57.00], p: MED, k: "enfant bebe" },
    { g: "visites", n: "Suivi de grossesse", c: ["15811", "15812"], t: [37.75, 42.85], p: MED, k: "obstetrique enceinte prenatal" },
    { g: "visites", n: "Visite périodique, patient vulnérable de 80 ans ou plus", c: ["15839", "15840"], t: [84.80, 97.30], p: MED, k: "examen annuel age" },
    { g: "visites", n: "Prise en charge, patient vulnérable de 80 ans ou plus", c: ["15835", "15836"], t: [84.80, 97.30], p: MED, k: "inscription pec age" },
    { g: "visites", n: "Prise en charge, patient non vulnérable de 80 ans ou plus", c: ["15815", "15816"], t: [76.55, 89.15], p: MED, k: "inscription pec age" },
    { g: "visites", n: "Visite périodique pédiatrique, patient vulnérable", c: ["15833", "15834"], t: [58.55, 65.20], p: MED, k: "enfant" },
    { g: "visites", n: "Suivi de grossesse, patiente vulnérable", c: ["15831", "15832"], t: [45.95, 51.10], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Prise en charge de grossesse au 1er trimestre, sans référence", c: ["15805", "15806"], t: [99.90, 113.65], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Prise en charge de grossesse au 1er trimestre, avec référence", c: ["15807", "15808"], t: [64.50, 73.55], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Prise en charge de grossesse après le 1er trimestre", c: ["15809", "15810"], t: [64.50, 73.55], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Prise en charge de grossesse au 1er trimestre, sans référence, patiente vulnérable", c: ["15825", "15826"], t: [108.05, 121.85], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Prise en charge de grossesse au 1er trimestre, avec référence, patiente vulnérable", c: ["15827", "15828"], t: [72.65, 81.75], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Prise en charge de grossesse après le 1er trimestre, patiente vulnérable", c: ["15829", "15830"], t: [72.65, 81.75], p: MED, k: "obstetrique enceinte" },
    { g: "visites", n: "Visite ponctuelle mineure, non vulnérable de 80 ans ou plus", c: ["15769", "15770"], t: [18.25, 21.05], p: MED, k: "sans rendez-vous srv age" },
    { g: "visites", n: "Visite ponctuelle complexe, non vulnérable de 80 ans ou plus", c: ["15777", "15778"], t: [36.45, 42.15], p: MED, k: "sans rendez-vous srv age" },
    { g: "visites", n: "Visite ponctuelle mineure, vulnérable de 80 ans ou plus", c: ["15771", "15772"], t: [26.45, 29.30], p: MED, k: "sans rendez-vous srv age" },
    { g: "visites", n: "Visite ponctuelle complexe, vulnérable de 80 ans ou plus", c: ["15779", "15780"], t: [44.65, 50.35], p: MED, k: "sans rendez-vous srv age" },
    { g: "visites", n: "Suivi conjoint en santé mentale", c: ["08848"], t: 55.05, p: MED, k: "psychiatrie" },
    { g: "visites", n: "Évaluation psychiatrique en vue d'un suivi conjoint en santé mentale", c: ["08819"], t: 74.75, p: MED, k: "psychiatrie" },
    { g: "visites", n: "Évaluation d'un problème mineur pour donner une opinion", c: ["15789"], t: 40.60, p: MED, k: "opinion consultation" },
    { g: "visites", n: "Évaluation d'un problème complexe pour donner une opinion", c: ["15790"], t: 63.00, p: MED, k: "opinion consultation" },
    { g: "visites", n: "Visite à domicile, patient non vulnérable en perte sévère d'autonomie", c: ["15781", "15782"], t: [133.25, 102.55], d: ["premier patient", "patient additionnel"], p: MED, k: "domicile" },
    { g: "visites", n: "Visite à domicile, patient vulnérable en perte sévère d'autonomie", c: ["15783", "15784"], t: [143.85, 113.15], d: ["premier patient", "patient additionnel"], p: MED, k: "domicile" },

    // Interventions cliniques et psychothérapie (services sur base de temps, onglet B).
    { g: "temps", n: "Intervention clinique individuelle, première période de 30 minutes", c: ["08857"], t: 49.75, p: TEMPS, k: "counseling therapie" },
    { g: "temps", n: "Intervention clinique individuelle, période de 15 minutes de plus", c: ["08859"], t: 24.87, p: TEMPS, k: "counseling therapie" },
    { g: "temps", n: "Psychothérapie individuelle, première période de 30 minutes", c: ["15785"], t: 49.75, p: TEMPS, k: "sante mentale" },
    { g: "temps", n: "Psychothérapie individuelle, période de 15 minutes de plus", c: ["15786"], t: 24.87, p: TEMPS, k: "sante mentale" },
    { g: "temps", n: "Intervention clinique collective, première période de 30 minutes", c: ["08866"], t: 49.75, p: TEMPS, k: "groupe" },
    { g: "temps", n: "Intervention clinique collective, période de 15 minutes de plus", c: ["08868"], t: 24.87, p: TEMPS, k: "groupe" },
    { g: "temps", n: "Aide médicale à mourir, par période de 15 minutes", c: ["15880", "15881"], t: 43.60, p: TEMPS, k: "amm fin de vie" },

    // Actes techniques (manuel, onglets C, F et Q).
    { g: "techniques", n: "Infiltration d'une bourse séreuse ou d'une articulation, aspiration comprise (au plus 3)", c: ["00431"], t: 16.50, p: MED, k: "injection cortisone genou epaule" },
    { g: "techniques", n: "Infiltration d'une capsule, d'une gaine, d'un tendon, d'un ligament ou d'un fascia", c: ["00430"], t: 16.65, p: MED, k: "injection cortisone tendinite" },
    { g: "techniques", n: "Insertion de stérilet, examen compris", c: ["00205"], t: 55.95, p: MED, k: "diu contraception gynecologie" },
    { g: "techniques", n: "Extraction de stérilet, acte compliqué", c: ["20025"], t: 58.75, p: MED, k: "diu contraception gynecologie retrait" },
    { g: "techniques", n: "Implant contraceptif sous-cutané", c: ["06980", "06981"], t: [109.05, 139.60], d: ["un implant", "plus d'un"], p: MED, k: "contraception nexplanon" },
    { g: "techniques", n: "Exérèse d'implant contraceptif", c: ["06982", "06983"], t: [125.40, 169.80], d: ["un implant", "plus d'un"], p: MED, k: "contraception retrait" },
    { g: "techniques", n: "Cryochirurgie, lésion précancéreuse : tronc, bras, jambes", c: ["01240", "01241"], t: [26, 46], d: CM, p: MED, k: "keratose actinique azote", note: "Biopsies comprises ; au plus 4 lésions payées." },
    { g: "techniques", n: "Cryochirurgie, lésion précancéreuse : face, cuir chevelu, oreilles, cou, mains, pieds, organes génitaux", c: ["01238", "01239"], t: [41, 63], d: CM, p: MED, k: "keratose actinique azote", note: "Biopsies comprises ; au plus 4 lésions payées." },
    { g: "techniques", n: "Cryochirurgie, lésion précancéreuse : paupière, nez, lèvres, muqueuses", c: ["01236", "01237"], t: [54, 86], d: CM, p: MED, k: "keratose actinique azote", note: "Biopsies comprises ; au plus 4 lésions payées." },
    { g: "techniques", n: "Cryochirurgie, lésion cancéreuse : tronc, bras, jambes", c: ["01246", "01247"], t: [54, 68], d: CM, p: MED, k: "cancer peau azote" },
    { g: "techniques", n: "Cryochirurgie, lésion cancéreuse : face, cuir chevelu, oreilles, cou, mains, pieds, organes génitaux", c: ["01244", "01245"], t: [71, 98], d: CM, p: MED, k: "cancer peau azote" },
    { g: "techniques", n: "Cryochirurgie, lésion cancéreuse : paupières, nez, lèvres, muqueuses", c: ["01242", "01243"], t: [92, 135], d: CM, p: MED, k: "cancer peau azote" },
    { g: "techniques", n: "Excision, lésion précancéreuse : tronc, bras, jambes", c: ["01184", "01185"], t: [30, 50], d: CM, p: MED, k: "exerese peau", note: "Biopsies comprises ; au plus 4 lésions payées." },
    { g: "techniques", n: "Excision, lésion précancéreuse : face, cuir chevelu, oreilles, cou, mains, pieds, organes génitaux", c: ["01182", "01183"], t: [46, 70], d: CM, p: MED, k: "exerese peau" },
    { g: "techniques", n: "Excision, lésion précancéreuse : paupière, nez, lèvres, muqueuses", c: ["01180", "01181"], t: [60, 100], d: CM, p: MED, k: "exerese peau" },
    { g: "techniques", n: "Réparation d'une lacération simple, face et cou (moins de 1 cm)", c: ["01320"], t: 27, p: MED, k: "suture plaie points", note: "10 $ par cm de plus, au plus 236 $." },
    { g: "techniques", n: "Réparation d'une lacération simple, autres sites (moins de 1 cm)", c: ["01323"], t: 17, p: MED, k: "suture plaie points", note: "4 $ par cm de plus, au plus 141 $." },
    { g: "techniques", n: "Onycectomie simple, doigt ou orteil", c: ["01215"], t: 19, p: MED, k: "ongle incarne" },
    { g: "techniques", n: "Onycectomie radicale, exérèse de la matrice", c: ["01216"], t: 52, p: MED, k: "ongle incarne" },
    { g: "techniques", n: "Excision chirurgicale d'une verrue non faciale, la première", c: ["01222"], t: 16, p: MED, k: "verrue", note: "4 $ par verrue de plus, au plus 16 de plus." },
    { g: "techniques", n: "Excision chirurgicale d'une verrue faciale, la première", c: ["01223"], t: 29, p: MED, k: "verrue", note: "9 $ par verrue de plus, au plus 10 de plus." },
    { g: "techniques", n: "Électrocoagulation, première lésion", c: ["01300"], t: 7, p: MED, k: "cauterisation", note: "2 $ par lésion de plus, au plus 19 $ par séance." },
    { g: "techniques", n: "Exérèse d'un corps étranger, simple", c: ["01196"], t: 26, p: MED, k: "echarde" },
    { g: "techniques", n: "Incision et drainage d'un abcès sus-fascial", c: ["01005"], t: null, p: MED, k: "abces", note: "Montant absent du manuel imprimable du 28 octobre 2026." },
    { g: "techniques", n: "Excision d'une tumeur bénigne (naevus, lipome…), fermeture simple", c: ["01164", "01165"], t: null, p: MED, k: "kyste grain de beaute lipome", note: "Montant absent du manuel imprimable du 28 octobre 2026." },

    // Formulaires et suppléments (les formulaires de la CNESST viennent du moteur : Calc.CNESST ; à la fin du groupe).
    // Forfait GMF et suppléments à la prise en charge d'un patient sans médecin de famille : payés à 100 % au mixte (annexe II
    // à l'annexe XXIII) ; les montants du moteur (Calc.RAMQ.forfaitGmf ; Calc.MONTANTS_LIEU, établissement).
    { g: "formulaires", n: "Forfait de prise en charge et de suivi de la clientèle en GMF", c: ["08875"], t: 9.35, p: PLEIN, k: "gmf forfait inscrit annuel",
      note: "Une fois par année civile, à la première visite de l'année d'un patient inscrit ; médecin membre d'un GMF, GMF-U compris (EP 33, annexe V)." },
    { g: "formulaires", n: "Patient sans médecin de famille : supplément, non vulnérable", c: ["19957"], t: 19.55, p: PLEIN, k: "inscription nouveau patient orphelin prise en charge guichet gamf",
      note: "Au premier examen ou à la première visite de la prise en charge, guichet d'accès ou non (EP 40, par. 4.12)." },
    { g: "formulaires", n: "Patient sans médecin de famille : supplément, vulnérable, hors guichet", c: ["19958"], t: 60.15, p: PLEIN, k: "inscription nouveau patient orphelin prise en charge",
      note: "Au premier examen ou à la première visite de la prise en charge (EP 40, par. 4.12)." },
    { g: "formulaires", n: "Patient sans médecin de famille : supplément, vulnérable, du guichet", c: ["19959"], t: 128.90, p: PLEIN, k: "inscription nouveau patient orphelin prise en charge guichet gamf transfert bloc",
      note: "Patient attribué par le guichet d'accès ou par un transfert en bloc (EP 40, par. 4.12 ; lettre d'entente no 304)." },
    { g: "formulaires", n: "Patient sans médecin de famille : supplément, très vulnérable, du guichet", c: ["19960"], t: 257.80, p: PLEIN, k: "inscription nouveau patient orphelin prise en charge guichet gamf transfert bloc",
      note: "Patient attribué par le guichet d'accès ou par un transfert en bloc (EP 40, par. 13.01 ; lettre d'entente no 304)." },
    { g: "formulaires", n: "Forfait de responsabilité, patient vulnérable inscrit", c: ["15169", "15170"], t: 8.25, p: PLEIN, k: "vulnerable supplement",
      note: "Avec l'intervention de supervision, ou avec une intervention clinique ou une psychothérapie (annexe II à l'annexe XXIII)." },
    { g: "formulaires", n: "Supplément à l'examen périodique d'un enfant de 0 à 5 ans", c: ["08877"], t: 13.35, p: PLEIN, k: "enfant pediatrique", note: "Avec l'intervention de supervision, ou avec une intervention clinique." },
    { g: "formulaires", n: "Supplément à l'examen de suivi de grossesse", c: ["15145"], t: 8.95, p: PLEIN, k: "obstetrique enceinte", note: "Avec l'intervention de supervision, ou avec une intervention clinique." },
    { g: "formulaires", n: "Supplément au premier examen de grossesse au 1er trimestre", c: ["15159"], t: 35.60, p: PLEIN, k: "obstetrique enceinte" },
    { g: "formulaires", n: "Supplément pour un interprète, patient inscrit", c: ["15188"], t: 27.25, p: MED, k: "langue traduction" },
    { g: "formulaires", n: "Communication avec un médecin spécialiste (500 inscrits ou plus)", c: ["15841", "15842", "15843"], t: 22.00, p: MED, k: "telephone discussion" },
    { g: "formulaires", n: "Communication avec un autre professionnel de la santé (500 inscrits ou plus)", c: ["15844", "15845", "15846"], t: 15.75, p: MED, k: "telephone pharmacien" },
    { g: "formulaires", n: "Communication par conseil numérique (eConsult)", c: ["15894"], t: 22.00, p: MED, k: "econsult specialiste" },
    { g: "formulaires", n: "Interruption volontaire de grossesse par médicament : évaluation globale", c: ["15314"], t: 104.60, p: MED, k: "ivg avortement" },
    { g: "formulaires", n: "Échographie requise pour une IVG par médicament", c: ["15316"], t: 13.10, p: MED, k: "ivg echographie" },
    { g: "formulaires", n: "Enfant présumé victime de mauvais traitements : évaluation et rapport", c: ["09070"], t: 116.10, p: MED, k: "dpj maltraitance", note: "09073 : 46,25 $ par demi-heure de plus (moins de 14 ans)." },
    { g: "formulaires", n: "Demande anticipée d'aide médicale à mourir : formulaire et démarches", c: ["15879"], t: 261.50, p: MED, k: "amm" },
    { g: "formulaires", n: "Retrait d'une demande anticipée d'aide médicale à mourir", c: ["15899"], t: 52.30, p: MED, k: "amm" },
    { g: "formulaires", n: "Coroner, sans déplacement", c: ["09054"], t: 61.65, p: MED, k: "deces" },
    // Suppléments payés à 100 % au mixte (Brochure no 1, annexe II à l'annexe XXIII, version en vigueur au 5 novembre
    // 2026) ; tarifs de l'onglet B du manuel (28 octobre 2026), les mêmes en cabinet et en établissement.
    { g: "formulaires", n: "Constatation de décès, sans déplacement", c: ["00013"], t: 23.35, p: PLEIN, k: "deces mort constat" },
    { g: "formulaires", n: "Constatation de décès aux fins de transplantation (2e constat), sans déplacement", c: ["00016"], t: 23.35, p: PLEIN, k: "deces don organes" },
    { g: "formulaires", n: "Bulletin de décès (formulaire SP-3)", c: ["15265"], t: 19.80, p: PLEIN, k: "deces formulaire" },
    { g: "formulaires", n: "Évaluation à distance d'un décès en CHSLD, hors centre désigné", c: ["15889"], t: 25.00, p: PLEIN, k: "deces chsld" },
    { g: "formulaires", n: "Évaluation à distance d'un décès à domicile (soins à domicile du CLSC)", c: ["15890"], t: 25.00, p: PLEIN, k: "deces domicile palliatif" },
    { g: "formulaires", n: "Réanimation cardio-respiratoire, premier quart d'heure", c: ["00828"], t: 113.20, p: PLEIN, k: "rcr arret cardiaque code bleu" },
    { g: "formulaires", n: "Réanimation cardio-respiratoire, chaque quart d'heure de plus", c: ["00829"], t: 28.25, p: PLEIN, k: "rcr arret cardiaque code bleu" },
    { g: "formulaires", n: "Forfait de congé en établissement d'un patient admis", c: ["15158"], t: 35.55, p: PLEIN, k: "hospitalisation sortie conge",
      note: "Au transfert d'un patient admis (EP – Médecine de famille, par. 9.00 C)." },
    { g: "formulaires", n: "Perte d'autonomie : examen d'évaluation médicale", c: ["09100"], t: 163.50, p: MED, k: "autonomie chsld ressource",
      note: "Pas dans l'annexe II : au mixte, la part des services médicaux." },
    { g: "formulaires", n: "Perte d'autonomie : supplément si l'examen est fait à domicile", c: ["09063"], t: 28.15, p: PLEIN, k: "autonomie domicile" },
    { g: "formulaires", n: "Perte d'autonomie : rédaction du formulaire", c: ["09101"], t: 35.95, p: PLEIN, k: "autonomie formulaire" },
    { g: "formulaires", n: "Sécurité du revenu : rapport médical", c: ["09800"], t: 20.00, p: PLEIN, k: "aide sociale contraintes emploi formulaire" },
    { g: "formulaires", n: "Sécurité du revenu : information médicale complémentaire, verbale", c: ["09801"], t: 20.00, p: PLEIN, k: "aide sociale" },
    { g: "formulaires", n: "Curateur public : évaluation médicale (rapport du directeur général)", c: ["09825"], t: 26.15, p: PLEIN, k: "inaptitude regime protection" },
    { g: "formulaires", n: "Curateur public : réévaluation médicale", c: ["09826"], t: 26.15, p: PLEIN, k: "inaptitude regime protection" },
    { g: "formulaires", n: "Dépistage du cancer du sein : rapport de confirmation diagnostique (AH-509)", c: ["09817"], t: null, p: PLEIN, k: "pqdcs mammographie",
      note: "Payé à 100 % au mixte. Montant absent du manuel du 28 octobre 2026 et de la Brochure no 1 : à confirmer auprès de la RAMQ." },
    { g: "formulaires", n: "Prise en charge temporaire d'une cliente enceinte, sans devenir son médecin de famille", c: ["15189", "19074"], t: null, p: PLEIN,
      k: "grossesse obstetrique temporaire", note: "Payé à 100 % au mixte, aussi pendant l'intervention de supervision. Montant absent du manuel du 28 octobre 2026 et de la Brochure no 1 : à confirmer auprès de la RAMQ." },

    // Non facturables à part (annexe I du préambule général : compris dans la visite) ou hors GMF-U.
    { g: "non", n: "Cryothérapie d'une lésion (verrue, lésion bénigne)", c: [], t: null, p: 0, k: "azote verrue", note: "Comprise dans la visite (annexe I du préambule général)." },
    { g: "non", n: "Chimiothérapie d'une lésion cutanée", c: [], t: null, p: 0, k: "verrue", note: "Comprise dans la visite (annexe I du préambule général)." },
    { g: "non", n: "Extraction simple de stérilet", c: [], t: null, p: 0, k: "diu", note: "Comprise dans la visite ; l'extraction compliquée se facture (20025)." },
    { g: "non", n: "Insertion de pessaire", c: [], t: null, p: 0, k: "gynecologie", note: "Comprise dans la visite (annexe I du préambule général)." },
    { g: "non", n: "Exérèse de cérumen, nettoyage de l'oreille", c: [], t: null, p: 0, k: "oreille lavage", note: "Comprise dans la visite (annexe I du préambule général)." },
    { g: "non", n: "Injection sous-cutanée, intramusculaire ou intraveineuse", c: [], t: null, p: 0, k: "vaccin piqure", note: "Comprise dans la visite, sauf injection prévue au tarif." },
    { g: "non", n: "Manœuvre d'Epley", c: [], t: null, p: 0, k: "vertige", note: "Comprise dans la visite (annexe I du préambule général)." },
    { g: "non", n: "Problème musculosquelettique : prise en charge, suivi, opinion", c: ["08775", "08776", "08777"], t: null, p: 0, k: "msk", note: "Payés au mixte en CLSC seulement : pas en GMF-U (Brochure no 1, annexe XXIII, section B-2)." },
  ];
  // Les dix actes les plus fréquents (premier code de chaque acte), montrés au départ.
  const FREQUENTS = ["42094", "42096", "15803", "15823", "15765", "15773", "15819", "15801", "15821", "09926"];
  const Repertoire = { GROUPES, ACTES, FREQUENTS, MED, TEMPS, PLEIN, source: "Manuel des médecins omnipraticiens (28 octobre 2026) et Brochure no 1 (5 novembre 2026)" };
  if (typeof module !== "undefined" && module.exports) module.exports = Repertoire;
  else racine.Repertoire = Repertoire;
})(typeof window !== "undefined" ? window : globalThis);
