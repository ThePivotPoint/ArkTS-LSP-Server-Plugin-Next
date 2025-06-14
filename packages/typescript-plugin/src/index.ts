import type * as ts from 'typescript'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'

/** Current configuration */
let currentConfig: any = {}

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
const volarPlugin: ts.server.PluginModuleFactory = createLanguageServicePlugin((ts, info) => {
  const sdkPath = currentConfig?.lspOptions?.ohos?.sdkPath

  console.warn(`ETS typescript plugin loaded! sdkPath: ${sdkPath}`)
  console.warn(`Current config: ${JSON.stringify(info.config)}`)

  return {
    languagePlugins: [ETSLanguagePlugin(ts, { sdkPath })],
  }
})

const plugin: ts.server.PluginModuleFactory = (mod) => {
  const volarTSPlugin = volarPlugin(mod)

  return {
    create(createInfo) {
      currentConfig = createInfo.config
      return volarTSPlugin.create(createInfo)
    },
    getExternalFiles: volarTSPlugin.getExternalFiles,
    onConfigurationChanged(config) {
      currentConfig = config
    },
  }
}

// eslint-disable-next-line no-restricted-syntax
export = plugin
