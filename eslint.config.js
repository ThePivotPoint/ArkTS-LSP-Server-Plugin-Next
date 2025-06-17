import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  ignores: [
    'ohos-typescript/**/*',
    'sample/**/*',
    'packages/declarations/ets/**/*',
    'packages/vscode/src/generated/**/*',
  ],
  rules: {
    'ts/no-namespace': 'off',
  },
})
