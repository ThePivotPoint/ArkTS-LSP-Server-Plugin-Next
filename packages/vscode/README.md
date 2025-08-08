<div align="center">

<img src="https://github.com/Groupguanfang/arkTS/blob/next-dev/packages/vscode/assets/icon.png?raw=true" width="100" />

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
  - `code-linter.json5` 模块级别/项目级别配置
  - `resources/element/`下所有的`color.json`等的kv值配置
  - `module.json5` 配置
  - `mock-config.json5`配置
  - `hvigor-config.json5`配置
  - `main_pages.json5`配置
- 📦 1.x版本开始支持安装和管理`OpenHarmony SDK`，并且支持根据当前打开的项目自动探测`API版本`，发出弹窗提示`下载`或`切换`
- ✨ 1.x版本开始支持`.ets`文件的`代码格式化`和`大纲`展示功能
- ✂️ 支持和`TypeScript`一样的`snippets`，并且添加了`Struct Declaration`等`ArkTS`独有的`Snippets`
- 🆓 `$r`，`$rawfile` 补全、`hilog`日志等功能正在计划支持的路上，欢迎PR👀
- 🌐 **HTTP API**: 新增HTTP服务器功能，可以暴露LSP功能供外部调用，支持查找定义、查找引用、签名帮助等功能

## VSCode 文件图标包 🖼️

推荐使用[Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)，我已经给`Material Icon Theme`提交了PR，目前将`.ets`、`.d.ets`直接用上了`TypeScript官方的文件图标包`，升级到`v5.22.0`之后的版本都可用，这样至少好看一些了 👇

![Material icon theme](./screenshots/icon-theme.png)

PR地址: [https://github.com/material-extensions/vscode-material-icon-theme/pull/2966](https://github.com/material-extensions/vscode-material-icon-theme/pull/2966)

## 配置

<!-- configs -->

| Key                | Description                                                                                                | Type      | Default                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| `ets.sdkPath`      | %configuration.ets.sdkPath.description%                                                                    | `string`  | `""`                          |
| `ets.baseSdkPath`  | %configuration.ets.baseSdkPath.description%                                                                | `string`  | `"${os.homedir}/OpenHarmony"` |
| `ets.lspDebugMode` | %configuration.ets.lspDebugMode.description%                                                               | `boolean` | `false`                       |
| `ets.sdkList`      | A list of installed OpenHarmony SDK paths. Keys should follow the pattern API[number] (e.g., API9, API10). | `object`  | `{}`                          |
| `ets.httpServer`   | HTTP Server configuration for exposing LSP functionality | `object`  | `{"enabled": true, "port": 3000, "host": "localhost"}` |

<!-- configs -->

## 命令

<!-- commands -->

## HTTP API

这个扩展现在包含一个HTTP服务器，可以暴露LSP功能供外部调用。

### 功能特性

- ✅ 查找定义 (Go to Definition)
- ✅ 查找引用 (Find References)  
- ✅ 签名帮助 (Signature Help)
- ✅ 悬停信息 (Hover)
- ✅ 代码补全 (Completion)
- ✅ 文档符号 (Document Symbols)

### 配置

在VSCode设置中配置HTTP服务器：

```json
{
  "ets.httpServer": {
    "enabled": true,
    "port": 3000,
    "host": "localhost"
  }
}
```

### 使用方法

1. 安装并启动VSCode插件
2. HTTP服务器会自动在配置的端口启动
3. 使用HTTP API调用LSP功能

详细API文档请参考 [HTTP_API.md](./HTTP_API.md)

### 测试

运行测试脚本来验证HTTP API：

```bash
npm run test:http
```

### 示例

#### JavaScript 示例

```javascript
// 查找定义
const response = await fetch('http://localhost:3000/definition', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uri: 'file:///path/to/your/file.ets',
    line: 10,
    character: 15
  })
});
```

#### Python 示例

```python
import requests

def get_definition(uri, line, character):
    url = "http://localhost:3000/definition"
    data = {
        "uri": uri,
        "line": line,
        "character": character
    }
    
    response = requests.post(url, json=data)
    return response.json()

# 使用示例
definition = get_definition("file:///path/to/your/file.ets", 10, 15)
print(definition)
```

更多Python示例请参考 [examples/](./examples/) 目录。

| Command             | Title                        |
| ------------------- | ---------------------------- |
| `ets.restartServer` | ETS: %command.restartServer% |
| `ets.installSDK`    | ETS: %command.installSDK%    |
| `ets.restartHttpServer` | Restart HTTP Server    |

<!-- commands -->
