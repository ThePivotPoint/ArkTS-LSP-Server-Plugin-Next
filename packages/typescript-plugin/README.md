# ArkTS Language Plugin

![GitHub Repo stars](https://img.shields.io/github/stars/groupguanfang/arkTS?style=flat)&nbsp;
[![NPM version](https://img.shields.io/npm/v/@arkts/language-plugin?color=a1b858)](https://www.npmjs.com/package/@arkts/language-plugin)

The unofficial language plugin for Huawei HarmonyOS's [ArkTS Programming Language](https://developer.huawei.com/consumer/cn/arkts) (Superset of TypeScript).

It is part of the [Naily's ArkTS Support VSCode Extension](https://github.com/Groupguanfang/arkTS).

## About `__etsTypescriptPluginFeature` environment variable

This environment variable must be a json string that contains the configuration for the plugin.

You can see the type definition in `@arkts/shared` package, specifically in `packages/shared/src/ts-plugin-option.ts`.

```ts
export interface ETSPluginOptions {
  // Current workspace folder path.
  workspaceFolder: string | undefined
  // The LSP options for the plugin.
  lspOptions: EtsServerClientOptions
}
```
