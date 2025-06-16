<div align="center">

<img src="./assets/icon.png" width="100" />

# Naily's ArkTS Support

![GitHub Repo stars](https://img.shields.io/github/stars/groupguanfang/arkTS?style=flat)&nbsp;
[![VSCode Marketplace version](https://img.shields.io/visual-studio-marketplace/v/NailyZero.vscode-naily-ets?style=flat&label=vscode%20marketplace%20version)](https://marketplace.visualstudio.com/items?itemName=NailyZero.vscode-naily-ets)&nbsp;
[![@arkts/declarations NPM version](https://img.shields.io/npm/v/%40arkts%2Fdeclarations?logo=npm&logoColor=red&label=arkts%2Fdeclarations)](https://www.npmjs.com/package/@arkts/declarations)&nbsp;
[![@arkts/language-server NPM version](https://img.shields.io/npm/v/%40arkts%2Flanguage-server?logo=npm&logoColor=red&label=arkts%2Flanguage-server)](https://www.npmjs.com/package/@arkts/language-server)&nbsp;
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/groupguanfang/arkTS)&nbsp;
![GitHub repo size](https://img.shields.io/github/repo-size/groupguanfang/arkTS)&nbsp;
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/groupguanfang/arkTS/main?label=Main%20Branch%20Last%20Commit)&nbsp;

</div>

> 刚建了一个QQ群，欢迎加入一起交流学习 (群号: 746153004)

这是一个基于[Volar](https://volarjs.dev)开发的ArkTS VSCode扩展。🌹为似乎到现在还没有支持VSCode，现有的VSCode市场中的ArkTS扩展大都非常简陋，所以决定自己写一个。

## Features

- 🌹 1.x版本开始具备完整的`ArkTS`语言支持，全量支持所有`ArkTS`语法。
- 🖊️ 完善的JSON Schema支持。支持以下文件的JSON Schema：
  - `build-profile.json5` 模块级别/项目级别配置
  - `oh-package.json5` 模块级别/项目级别配置
  - `module.json5` 模块级别/项目级别配置
  - `code-linter.json5` 模块级别/项目级别配置
  - `resources/element/`下所有的`color.json`等的kv值配置
  - `main_pages.json5`
- 📦 1.x版本开始支持安装和管理`OpenHarmony SDK`，并且支持根据当前打开的项目自动探测`API版本`，发出弹窗提示`下载`或`切换`
- 🆓 `$r`、`$rawfile` 补全，以及代码格式化正在计划支持的路上，欢迎PR👀


## 配置

<!-- configs -->

| Key                | Description                                  | Type      | Default                       |
| ------------------ | -------------------------------------------- | --------- | ----------------------------- |
| `ets.sdkPath`      | %configuration.ets.sdkPath.description%      | `string`  | `""`                          |
| `ets.baseSdkPath`  | %configuration.ets.baseSdkPath.description%  | `string`  | `"${os.homedir}/OpenHarmony"` |
| `ets.lspDebugMode` | %configuration.ets.lspDebugMode.description% | `boolean` | `false`                       |

<!-- configs -->

## 命令

<!-- commands -->

| Command             | Title                        |
| ------------------- | ---------------------------- |
| `ets.restartServer` | ETS: %command.restartServer% |
| `ets.installSDK`    | ETS: %command.installSDK%    |

<!-- commands -->
