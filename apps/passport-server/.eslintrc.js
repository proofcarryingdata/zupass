module.exports = {
  extends: ["@pcd/eslint-config-custom"],
  rules: {
    "no-console": "error",
    // disable the rule for all files
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        accessibility: "explicit",
        overrides: {
          accessors: "explicit",
          constructors: "explicit",
          methods: "explicit",
          properties: "explicit",
          parameterProperties: "explicit"
        }
      }
    ],
    "no-restricted-globals": [
      "error",
      {
        name: "fetch",
        message: "Use instrumentedFetch instead"
      }
    ],
    "require-extensions/require-extensions": "off",
    "require-extensions/require-index": "off"
  },
  overrides: [
    {
      // enable the rule specifically for TypeScript files
      files: ["*.ts", "*.mts", "*.cts", "*.tsx"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": "error"
      }
    }
  ]
};
