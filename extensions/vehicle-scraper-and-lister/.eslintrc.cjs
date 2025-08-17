module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  plugins: ["import"],
  extends: ["eslint:recommended", "plugin:import/recommended", "plugin:import/typescript", "prettier"],
  rules: {
    "no-unused-vars": "warn",
    "import/order": [
      "error",
      {
        "groups": [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
        "newlines-between": "always"
      }
    ]
  }
};
