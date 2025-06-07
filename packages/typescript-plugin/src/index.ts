import type { ETSPluginOptions } from '@arkts/shared'
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
const plugin: ts.server.PluginModuleFactory = createLanguageServicePlugin((_ts, info) => {
  const settings = info.languageServiceHost.getCompilationSettings()
  const configuration = info.config as ETSPluginOptions
  const currentDirectory = info.languageServiceHost.getCurrentDirectory()
  console.warn(`ETS typescript plugin loaded! currentDirectory: ${currentDirectory}, sdkPath: ${configuration?.lspOptions?.ohos?.sdkPath}`)

  if (currentDirectory.startsWith(configuration?.lspOptions?.ohos?.sdkPath || '')) {
    info.languageServiceHost.getCompilationSettings = () => {
      return {
        ...settings,
        noCheck: !!currentDirectory.startsWith(configuration?.lspOptions?.ohos?.sdkPath || ''),
        etsLoaderPath: configuration?.lspOptions?.ohos?.etsLoaderPath,
        typeRoots: configuration?.lspOptions?.ohos?.typeRoots,
        baseUrl: configuration?.lspOptions?.ohos?.baseUrl,
        lib: configuration?.lspOptions?.ohos?.lib,
        paths: configuration?.lspOptions?.ohos?.paths,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strict: true,
        strictPropertyInitialization: false,
      }
    }
  }

  return {
    languagePlugins: [ETSLanguagePlugin()],
  }
})

// eslint-disable-next-line no-restricted-syntax
export = plugin
