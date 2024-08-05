module.exports = {
  extends: ["@pcd/eslint-config-custom"],
  rules: {
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "require-extensions/require-extensions": "off",
    "require-extensions/require-index": "off"
  }
};
