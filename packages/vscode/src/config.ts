import { defineConfigObject } from 'reactive-vscode'
import * as Meta from './generated/meta'

export const ConfigUtil = defineConfigObject<Meta.ConfigKeyTypeMap>(
  Meta.scopedConfigs.scope,
  Meta.scopedConfigs.defaults,
)
