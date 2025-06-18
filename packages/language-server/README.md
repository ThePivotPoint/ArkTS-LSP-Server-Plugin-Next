# ArkTS Language Server

![GitHub Repo stars](https://img.shields.io/github/stars/groupguanfang/arkTS?style=flat)&nbsp;
[![NPM version](https://img.shields.io/npm/v/@arkts/language-server?color=a1b858)](https://www.npmjs.com/package/@arkts/language-server)

The unofficial language server for Huawei HarmonyOS's [ArkTS Programming Language](https://developer.huawei.com/consumer/cn/arkts) (Superset of TypeScript).

It is part of the [Naily's ArkTS Support VSCode Extension](https://github.com/Groupguanfang/arkTS).

## Notification

### `ets/configurationChanged`

The notification is sent when the configuration of the language server is changed & the language server is stored the configuration.

#### Parameters

##### `e`

- type: `import('vscode').DidChangeConfigurationParams`

The configuration settings of the language server.
