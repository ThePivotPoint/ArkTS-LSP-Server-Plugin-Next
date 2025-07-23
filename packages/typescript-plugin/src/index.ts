import type * as ts from 'typescript'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'

/**
 * ### 这个插件做了什么？
 *
 * 将传输过来的ohos SDK路径与当前打开的文件位置进行比对，
 * 如果当前打开的文件位置在ohos SDK路径下，则覆写compilerOptions
 * 让TS服务器将其作为一个`lib`来处理。
 *
 * ---
 *
 * ### 如何查看log？
 *
 * 点开一个`.ts`文件然后按 Ctrl + shift + P 输入`Typescript: Open TS Server Log`
 */
const plugin: ts.server.PluginModuleFactory = createLanguageServicePlugin((ts, info) => {
  const sdkPath = info.config?.lspOptions?.ohos?.sdkPath

  console.warn(`ETS typescript plugin loaded! sdkPath: ${sdkPath}`)
  console.warn(`Current config: ${JSON.stringify(info.config)}`)

  // 如果没有传递这个配置，则不启用插件
  if (!info.config?.lspOptions?.ohos) {
    return { languagePlugins: [] }
  }

  return {
    languagePlugins: [
      ETSLanguagePlugin(ts, { sdkPath, tsdk: info.config?.lspOptions?.typescript?.tsdk }),
    ],
  }
})

// eslint-disable-next-line no-restricted-syntax
export = plugin
