module.exports = {
  // TODO: override this to always be true in CI
  forbidOnly: true,
  forbidPending: true,
  failZero: true,
  bail: true,
  timeout: "120000",
  "node-option": ["import=tsx"]
};
