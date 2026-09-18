import globals from "globals";

export default [
  {
    files: ["app.js", "site.js", "tests.mjs", "pages-check.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node, L: "readonly" }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error"
    }
  }
];
