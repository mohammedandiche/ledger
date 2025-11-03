// .eslintrc.js
module.exports = {
  extends: ['expo', 'prettier'],
  ignorePatterns: ['node_modules/', 'dist/', '.expo/'],
  rules: {
    // These rules are from @typescript-eslint v8+ but we use v6 (constrained
    // by prettier-eslint peer dep). Disable until we can upgrade.
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',
  },
};
