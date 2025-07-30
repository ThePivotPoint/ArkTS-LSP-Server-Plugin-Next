import type { Connection } from '@arkts/headless-jsonrpc'
import { Autowired, Service } from 'unioc'
import { IOnActivate } from 'unioc/vscode'

@Service
export class HiLogServerService implements IOnActivate {
  @Autowired('hilog/connection')
  readonly connection: Connection

  async onActivate(): Promise<void> {
  }
}
