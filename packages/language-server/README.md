# ArkTS Language Server

![GitHub Repo stars](https://img.shields.io/github/stars/groupguanfang/arkTS?style=flat)&nbsp;
[![NPM version](https://img.shields.io/npm/v/@arkts/language-server?color=a1b858)](https://www.npmjs.com/package/@arkts/language-server)

The unofficial language server for Huawei HarmonyOS's [ArkTS Programming Language](https://developer.huawei.com/consumer/cn/arkts) (Superset of TypeScript).

It is part of the [Naily's ArkTS Support VSCode Extension](https://github.com/Groupguanfang/arkTS).

## Request

### `ets/waitForEtsConfigurationChangedRequested`

When start to initialize the language server this request `must` send the configuration to the server.

#### Parameters

The jsonrpc parameters for this request are:

```ts
export interface VolarClientOptions {
  /** The currently tsdk path. */
  tsdk: string
}

export interface OhosClientOptions {
  /** The currently ohos sdk path. If not exists the lsp will not work. */
  sdkPath: string | undefined
  /** The `ets/component` folder of the SDK. If not exists the lsp will not work. */
  etsComponentPath: string | undefined
  /** The `ets/build-tools/ets-loader/tsconfig.json` path. If not exists the lsp will not work. */
  etsLoaderConfigPath: string | undefined
  /** The `ets/build-tools/ets-loader` path. If not exists the lsp will not work. */
  etsLoaderPath: string | undefined
  /** The libs of the SDK, and typescript compiler options. */
  lib: string[]
  /** typeRoots for the typescript compiler. */
  typeRoots: string[]
  /** The base url for the typescript compiler. */
  baseUrl: string
  /** The paths for the typescript compiler. */
  paths: import('ohos-typescript').MapLike<string[]>
}

export interface EtsServerClientOptions {
  /** Volar client options. */
  typescript: VolarClientOptions
  /** ETS server options. */
  ohos: OhosClientOptions
  /** Debug mode. */
  debug?: boolean
}
```

> See `@arkts/shared`'s `src/client-options.ts` to see the full interface.

### `ets/formatDocument`

This request is used to format the document. The return response is an array of `TextEdit` (like `textDocument/documentFormatting` event).

#### Parameters

The jsonrpc parameters for this request are:

```ts
export interface ETSFormattingDocumentParams {
  /** The text document to format. */
  textDocument: import('vscode').TextDocument
  /** The options for formatting. */
  options: import('vscode').FormattingOptions
}
```
