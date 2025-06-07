import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  ignores: [
    'ohos-typescript/**/*',
    'sample/**/*',
    'packages/declarations/ets/**/*',
  ],
  rules: {
    'ts/no-namespace': 'off',
  },
})
