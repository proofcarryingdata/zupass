module.exports = {
  extends: [
    "eslint:recommended",
    "turbo",
    "prettier",
    "turbo",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "prettier"],
  ignorePatterns: ["*.d.ts"],
  rules: {
    "no-case-declarations": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "@typescript-eslint/no-empty-interface": "off",
    "react/no-unescaped-entities": "off",
    "import/no-named-as-default-member": "off",
    "import/no-extraneous-dependencies": "error",
    "prettier/prettier": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@pcd/*/**"],
            message:
              "Internal files from other packages should not be imported. Within-package imports should use relative file paths."
          }
        ]
      }
    ]
  },
  settings: {
    "import/resolver": {
      typescript: true,
      node: true
    }
  }
};
