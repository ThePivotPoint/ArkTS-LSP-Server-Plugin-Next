import type { EtsServerClientOptions } from './client-options'

type GetAPI = (n: number) => {
  configurePlugin: <PluginName extends keyof PluginOptions>(
    pluginName: PluginName,
    options: PluginOptions[PluginName],
  ) => void
}

export interface TypescriptLanguageFeatures {
  getAPI?: GetAPI
}

export interface ETSPluginOptions {
  workspaceFolder: string | undefined
  lspOptions: EtsServerClientOptions
}

export interface PluginOptions {
  'ets-typescript-plugin': ETSPluginOptions
}
