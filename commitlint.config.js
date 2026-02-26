/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'style', 'docs', 'test', 'chore', 'perf', 'ci', 'revert'],
    ],
    'scope-enum': [
      1,
      'always',
      ['slack', 'api', 'components', 'charts', 'lib', 'analysis', 'auth', 'data', 'config', 'ui'],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
  },
}
