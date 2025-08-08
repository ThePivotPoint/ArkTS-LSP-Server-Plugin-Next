import * as vscode from 'vscode'

export interface HttpServerConfig {
  enabled: boolean
  port: number
  host: string
}

export class HttpServerConfigManager {
  private static readonly CONFIG_SECTION = 'ets.httpServer'

  static getConfig(): HttpServerConfig {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION)
    
    return {
      enabled: config.get<boolean>('enabled') ?? true,
      port: config.get<number>('port') ?? 3000,
      host: config.get<string>('host') ?? 'localhost',
    }
  }

  static async updateConfig(updates: Partial<HttpServerConfig>): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION)
    
    for (const [key, value] of Object.entries(updates)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global)
    }
  }
} 