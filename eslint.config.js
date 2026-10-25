// Vérification du code : npx eslint .
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/"] },
  js.configs.recommended,
  {
    // L'app : scripts classiques chargés par la page ; calc.js sert aussi à Node pour les tests.
    files: ["js/**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: { ...globals.browser, module: "readonly" } },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      // Une variable lue avant sa déclaration, dans la même portée, bloquerait le démarrage.
      "no-use-before-define": ["error", { functions: false, classes: false, variables: false }],
      "no-implicit-globals": "error",
      // Espaces insécables voulues dans les textes (« 25 % », « 1 000 $ »).
      "no-irregular-whitespace": ["error", { skipStrings: true, skipTemplates: true, skipComments: true }],
    },
  },
  { files: ["sw.js"], languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: globals.serviceworker } },
  {
    // Tests sous Node ; ceux du navigateur passent aussi du code à la page (window, document…).
    files: ["tests/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: { ...globals.node, ...globals.browser } },
    rules: { "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }] },
  },
];
