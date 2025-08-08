import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { ETSLanguagePlugin } from '@arkts/language-plugin'
import { LanguageServerLogger } from '@arkts/shared'
import { createConnection, createServer, createTypeScriptProject } from '@volar/language-server/node'
import * as ets from 'ohos-typescript'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { LanguageServerConfigManager } from './config-manager'
import { createETSLinterDiagnosticService } from './services/diagnostic.service'
import { createETSDocumentSymbolService } from './services/symbol.service'
import { URI } from 'vscode-uri'

const connection = createConnection()
const server = createServer(connection)
const logger = new LanguageServerLogger('ETS Language Server')
const lspConfiguration = new LanguageServerConfigManager(logger)

logger.getConsola().info(`ETS Language Server is running: (pid: ${process.pid})`)
console.log(`[LSP Server] ===== 语言服务器启动测试 =====`)
console.log(`[LSP Server] 进程ID: ${process.pid}`)
console.log(`[LSP Server] 当前时间: ${new Date().toISOString()}`)

connection.onRequest('ets/waitForEtsConfigurationChangedRequested', (e) => {
  logger.getConsola().info(`waitForEtsConfigurationChangedRequested: ${JSON.stringify(e)}`)
  lspConfiguration.setConfiguration(e)
})

interface ETSFormattingDocumentParams {
  options: import('vscode').FormattingOptions
  textDocument: import('vscode').TextDocument
}

let etsLanguageService: ets.LanguageService | undefined
connection.onRequest('ets/formatDocument', async (params: ETSFormattingDocumentParams): Promise<any[]> => {
  if (!etsLanguageService)
    return []

  const doc = TextDocument.create(
    params.textDocument.uri.fsPath,
    params.textDocument.languageId,
    params.textDocument.version,
    fs.existsSync(params.textDocument.uri.fsPath) ? fs.readFileSync(params.textDocument.uri.fsPath, 'utf-8') : '',
  )
  const formatSettings = ets?.getDefaultFormatCodeSettings()
  if (params.options.tabSize !== undefined) {
    formatSettings.tabSize = params.options.tabSize
    formatSettings.indentSize = params.options.tabSize
  }

  const textChanges = etsLanguageService.getFormattingEditsForDocument(params.textDocument.uri.fsPath, formatSettings)
  return textChanges.map(change => ({
    newText: change.newText,
    range: {
      start: doc.positionAt(change.span.start),
      end: doc.positionAt(change.span.start + change.span.length),
    },
  }))
})

// 添加自定义LSP请求处理器，直接使用ETS语言服务
// 在语言服务器初始化之前注册处理器
console.log(`[LSP Server] ===== 注册自定义LSP处理器 =====`)

// 注册definition处理器
connection.onRequest('textDocument/definition', async (params) => {
  console.log(`[LSP Server] ===== 自定义textDocument/definition处理器被调用 =====`)
  console.log(`[LSP Server] 请求参数: ${JSON.stringify(params, null, 2)}`)
  
  // 立即返回，不调用Volar的默认处理器
  if (!etsLanguageService) {
    console.log(`[LSP Server] ETS语言服务不可用，返回空数组`)
    return []
  }
  
  try {
    const fileUri: string = params?.textDocument?.uri
    if (!fileUri) {
      console.log('[LSP Server] 缺少 textDocument.uri')
      return []
    }

    const filePath = URI.parse(fileUri).fsPath
    console.log(`[LSP Server] 文件路径: ${filePath}`)

    // 从磁盘读取内容（不要依赖 params.textDocument.text）
    let content = ''
    try {
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
        console.log(`[LSP Server] 文件内容长度: ${content.length}`)
        console.log(`[LSP Server] 文件前100字符: ${content.substring(0, 100)}`)
      } else {
        console.log(`[LSP Server] 文件不存在: ${filePath}`)
        return []
      }
    } catch (e) {
      console.log(`[LSP Server] 读取文件失败: ${e}`)
      return []
    }
    
    // 使用读取的内容创建源文件
    const sourceFile = ets.createSourceFile(filePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
    console.log(`[LSP Server] 源文件创建成功`)
    
    // 计算位置
    const position = ets.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character)
    console.log(`[LSP Server] 计算位置: ${position}`)
    
    // 查找定义
    const definitions = etsLanguageService.getDefinitionAtPosition(filePath, position)
    console.log(`[LSP Server] ETS语言服务定义查找结果: ${definitions ? definitions.length : 'null'}`)
    
    if (definitions && definitions.length > 0) {
      // 将定义位置映射为 LSP Range
      const lspDefinitions = definitions.map((def: any) => {
        const defFilePath: string = def.fileName
        let defContent = ''
        try {
          if (fs.existsSync(defFilePath)) {
            defContent = fs.readFileSync(defFilePath, 'utf-8')
          }
        } catch {}
        // 若无法读取定义文件，则退回使用当前文件，仅用于避免崩溃
        const defSource = defContent
          ? ets.createSourceFile(defFilePath, defContent, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
          : sourceFile

        const startLc = ets.getLineAndCharacterOfPosition(defSource, def.textSpan.start)
        const endLc = ets.getLineAndCharacterOfPosition(defSource, def.textSpan.start + def.textSpan.length)

        return {
          uri: URI.file(defFilePath).toString(),
          range: {
            start: { line: startLc.line, character: startLc.character },
            end: { line: endLc.line, character: endLc.character },
          },
        }
      })

      console.log(`[LSP Server] 转换后的LSP定义: ${JSON.stringify(lspDefinitions)}`)
      return lspDefinitions
    }
    
    console.log(`[LSP Server] 没有找到定义，返回空数组`)
    return []
  } catch (error) {
    console.log(`[LSP Server] 定义查找失败: ${error}`)
    return []
  }
})

console.log(`[LSP Server] ===== 自定义LSP处理器注册完成 =====`)

connection.onInitialize(async (params) => {
  console.log(`[LSP Server] ===== 开始初始化语言服务器 =====`)
  // console.log(`[LSP Server] 初始化参数: ${JSON.stringify(params, null, 2)}`)
  logger.getConsola().info(`Initializing ETS Language Server with params: ${JSON.stringify(params, null, 2)}`)
  
  if (params.locale)
    lspConfiguration.setLocale(params.locale)
  lspConfiguration.setConfiguration({ typescript: params.initializationOptions?.typescript })

  const tsdk = lspConfiguration.getTypeScriptTsdk()
  // console.log(`[LSP Server] TypeScript SDK: ${JSON.stringify(tsdk, null, 2)}`)
  // logger.getConsola().info(`TypeScript SDK: ${JSON.stringify(tsdk, null, 2)}`)
  
  const [tsSemanticService, _tsSyntacticService, ...tsOtherServices] = createTypeScriptServices(ets as any, {
    isFormattingEnabled: () => true,
    isSuggestionsEnabled: () => true,
    isAutoClosingTagsEnabled: () => true,
    isValidationEnabled: () => true,
  })

  console.log(`[LSP Server] 创建了TypeScript服务: ${tsSemanticService.name}, ${tsOtherServices.length} 个其他服务`)
  logger.getConsola().info(`Created TypeScript services: ${tsSemanticService.name}, ${tsOtherServices.length} other services`)

  // 检查初始化参数
  console.log(`[LSP Server] 初始化参数:`)
  console.log(`[LSP Server] - 根URI: ${params.rootUri}`)
  console.log(`[LSP Server] - 根路径: ${params.rootPath}`)
  console.log(`[LSP Server] - 工作区文件夹: ${JSON.stringify(params.workspaceFolders, null, 2)}`)
  
  const result = await server.initialize(
    params,
    createTypeScriptProject(ets as any, tsdk.diagnosticMessages, () => {
      console.log(`[LSP Server] 创建TypeScript项目，使用ETS语言插件`)
      logger.getConsola().info(`Creating TypeScript project with ETS language plugin`)
      return {
        languagePlugins: [ETSLanguagePlugin(ets, { sdkPath: lspConfiguration.getSdkPath(), tsdk: lspConfiguration.getTsdkPath() })],
        // 添加文件系统配置
        fileSystem: {
          // 配置文件系统监听器
          watchFile: (uri: string, callback: any) => {
            console.log(`[LSP Server] 文件系统监听器: 监听文件 ${uri}`)
            return { dispose: () => {} }
          },
          watchDirectory: (uri: string, callback: any) => {
            console.log(`[LSP Server] 文件系统监听器: 监听目录 ${uri}`)
            return { dispose: () => {} }
          },
          // 配置文件读取
          readFile: (uri: string) => {
            console.log(`[LSP Server] 文件系统读取: ${uri}`)
            try {
              const content = fs.readFileSync(uri, 'utf-8')
              return content
            } catch (error) {
              console.log(`[LSP Server] 文件读取失败: ${error}`)
              return undefined
            }
          },
          // 配置文件存在检查
          stat: (uri: string) => {
            console.log(`[LSP Server] 文件系统检查: ${uri}`)
            try {
              const stats = fs.statSync(uri)
              return {
                type: stats.isFile() ? 1 : stats.isDirectory() ? 2 : 0,
                size: stats.size,
                ctime: stats.birthtime.getTime(),
                mtime: stats.mtime.getTime()
              }
            } catch (error) {
              console.log(`[LSP Server] 文件检查失败: ${error}`)
              return undefined
            }
          }
        },
        // 添加工作区配置
        workspace: {
          // 配置工作区根目录
          rootUri: params.rootUri || 'file:///Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle',
          // 配置文件发现
          fileExtensions: ['.ets', '.ts', '.js'],
          // 配置忽略文件
          ignorePatterns: ['node_modules/**', 'dist/**', 'build/**']
        },
        setup(options) {
          console.log(`[LSP Server] ===== 开始设置TypeScript项目 =====`)
          console.log(`[LSP Server] 设置TypeScript项目`)
          logger.getConsola().info(`Setting up TypeScript project`)
          if (!options.project || !options.project.typescript || !options.project.typescript.languageServiceHost) {
            console.log(`[LSP Server] 错误: 没有TypeScript项目或语言服务主机可用`)
            logger.getConsola().error(`No TypeScript project or language service host available`)
            return
          }

          const originalSettings = options.project.typescript.languageServiceHost.getCompilationSettings() || {}
          console.log(`[LSP Server] 编译器设置: ${JSON.stringify(lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions), null, 2)}`)
          logger.getConsola().debug(`Settings: ${JSON.stringify(lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions), null, 2)}`)
          options.project.typescript.languageServiceHost.getCompilationSettings = () => {
            return lspConfiguration.getTsConfig(originalSettings as ets.CompilerOptions) as any
          }
          
          // 配置语言服务主机的根目录
          const projectRoot = '/Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle'
          console.log(`[LSP Server] 配置项目根目录: ${projectRoot}`)
          
          // 重写getCurrentDirectory方法
          const originalGetCurrentDirectory = options.project.typescript.languageServiceHost.getCurrentDirectory
          options.project.typescript.languageServiceHost.getCurrentDirectory = () => {
            console.log(`[LSP Server] getCurrentDirectory被调用，返回: ${projectRoot}`)
            return projectRoot
          }
          
          // 重写getScriptFileNames方法，手动添加文件
          const originalGetScriptFileNames = options.project.typescript.languageServiceHost.getScriptFileNames
          options.project.typescript.languageServiceHost.getScriptFileNames = () => {
            console.log(`[LSP Server] getScriptFileNames被调用`)
            const originalFiles = originalGetScriptFileNames()
            console.log(`[LSP Server] 原始文件列表: ${originalFiles.length} 个文件`)
            console.log(`[LSP Server] 原始文件列表内容: ${JSON.stringify(originalFiles)}`)
            
            // 手动添加测试文件
            const testFile = '/Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets'
            if (!originalFiles.includes(testFile)) {
              console.log(`[LSP Server] 手动添加测试文件到文件列表`)
              const newFiles = [...originalFiles, testFile]
              console.log(`[LSP Server] 更新后的文件列表: ${newFiles.length} 个文件`)
              console.log(`[LSP Server] 更新后的文件列表内容: ${JSON.stringify(newFiles)}`)
              
              // 尝试自动发现项目中的.ets文件
              const projectRoot = '/Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle'
              try {
                const { execSync } = require('child_process')
                const findResult = execSync(`find "${projectRoot}" -name "*.ets" -type f`, { encoding: 'utf8' })
                const etsFiles = findResult.trim().split('\n').filter((f: string) => f)
                console.log(`[LSP Server] 发现 ${etsFiles.length} 个.ets文件`)
                console.log(`[LSP Server] .ets文件列表: ${JSON.stringify(etsFiles)}`)
                
                // 添加所有.ets文件
                const allFiles = [...newFiles, ...etsFiles.filter((f: string) => !newFiles.includes(f))]
                console.log(`[LSP Server] 最终文件列表: ${allFiles.length} 个文件`)
                return allFiles
              } catch (error) {
                console.log(`[LSP Server] 自动发现.ets文件失败: ${error}`)
                return newFiles
              }
            }
            return originalFiles
          }
          
          // 添加调试信息到getScriptSnapshot
          const originalGetScriptSnapshot = options.project.typescript.languageServiceHost.getScriptSnapshot
          options.project.typescript.languageServiceHost.getScriptSnapshot = (fileName) => {
            console.log(`[LSP Server] getScriptSnapshot被调用: ${fileName}`)
            
            // 检查是否是我们的测试文件
            const testFile = '/Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets'
            if (fileName === testFile) {
              console.log(`[LSP Server] 检测到测试文件被请求`)
            }
            
            const snapshot = originalGetScriptSnapshot(fileName)
            if (snapshot) {
              console.log(`[LSP Server] 文件快照获取成功: ${fileName}`)
              // 尝试获取文件内容
              try {
                const content = fs.readFileSync(fileName, 'utf-8')
                console.log(`[LSP Server] 文件内容长度: ${content.length}`)
                console.log(`[LSP Server] 文件内容前100字符: ${content.substring(0, 100)}`)
              } catch (error) {
                console.log(`[LSP Server] 文件读取失败: ${error}`)
              }
            } else {
              console.log(`[LSP Server] 文件快照获取失败: ${fileName}`)
            }
            return snapshot
          }
          
          // 添加调试信息到getScriptVersion
          const originalGetScriptVersion = options.project.typescript.languageServiceHost.getScriptVersion
          options.project.typescript.languageServiceHost.getScriptVersion = (fileName) => {
            console.log(`[LSP Server] getScriptVersion被调用: ${fileName}`)
            const version = originalGetScriptVersion(fileName)
            console.log(`[LSP Server] 文件版本: ${version}`)
            return version
          }
          
          etsLanguageService = ets.createLanguageService(options.project.typescript.languageServiceHost as ets.LanguageServiceHost)
          console.log(`[LSP Server] ETS语言服务创建成功`)
          logger.getConsola().info(`ETS Language Service created successfully`)

          // 在语言服务创建后重新注册自定义处理器，确保覆盖任何默认处理器
          connection.onRequest('textDocument/definition', async (params) => {
            console.log(`[LSP Server] ===== 自定义textDocument/definition处理器（late）被调用 =====`)
            try {
              const fileUri: string = params?.textDocument?.uri
              if (!fileUri) return []
              const filePath = URI.parse(fileUri).fsPath
              console.log(`[LSP Server] (late) 文件路径: ${filePath}`)

              if (!fs.existsSync(filePath)) return []
              const content = fs.readFileSync(filePath, 'utf-8')
              const sourceFile = ets.createSourceFile(filePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
              const position = ets.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character)
              const definitions = etsLanguageService!.getDefinitionAtPosition(filePath, position)
              console.log(`[LSP Server] (late) 定义数量: ${definitions ? definitions.length : 'null'}`)

              if (!definitions || definitions.length === 0) return []

              const lspDefinitions = definitions.map((def: any) => {
                const defFilePath: string = def.fileName
                let defContent = ''
                try { if (fs.existsSync(defFilePath)) defContent = fs.readFileSync(defFilePath, 'utf-8') } catch {}
                const defSource = defContent
                  ? ets.createSourceFile(defFilePath, defContent, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
                  : sourceFile
                const startLc = ets.getLineAndCharacterOfPosition(defSource, def.textSpan.start)
                const endLc = ets.getLineAndCharacterOfPosition(defSource, def.textSpan.start + def.textSpan.length)
                return {
                  uri: URI.file(defFilePath).toString(),
                  range: { start: { line: startLc.line, character: startLc.character }, end: { line: endLc.line, character: endLc.character } },
                }
              })
              return lspDefinitions
            } catch (e) {
              console.log(`[LSP Server] (late) 处理失败: ${e}`)
              return []
            }
          })

          // 在语言服务创建后注册自定义 ets/findDefinition 处理器，避免与默认处理器冲突
          connection.onRequest('ets/findDefinition', async (params) => {
            console.log(`[LSP Server] ===== ets/findDefinition 被调用 =====`)
            try {
              const fileUri: string = params?.textDocument?.uri
              if (!fileUri) return []
              const filePath = URI.parse(fileUri).fsPath
              console.log(`[LSP Server] (custom) 文件路径: ${filePath}`)

              if (!fs.existsSync(filePath)) {
                console.log(`[LSP Server] (custom) 文件不存在: ${filePath}`)
                return []
              }

              const content = fs.readFileSync(filePath, 'utf-8')
              console.log(`[LSP Server] (custom) 文件内容长度: ${content.length}`)
              const sourceFile = ets.createSourceFile(filePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
              const position = ets.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character)
              console.log(`[LSP Server] (custom) 位置: ${position}`)
              const definitions = etsLanguageService!.getDefinitionAtPosition(filePath, position)
              console.log(`[LSP Server] (custom) 定义数量: ${definitions ? definitions.length : 'null'}`)

              if (!definitions || definitions.length === 0) return []

              const lspDefinitions = definitions.map((def: any) => {
                const defFilePath: string = def.fileName
                let defContent = ''
                try { if (fs.existsSync(defFilePath)) defContent = fs.readFileSync(defFilePath, 'utf-8') } catch {}
                const defSource = defContent
                  ? ets.createSourceFile(defFilePath, defContent, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
                  : sourceFile
                const startLc = ets.getLineAndCharacterOfPosition(defSource, def.textSpan.start)
                const endLc = ets.getLineAndCharacterOfPosition(defSource, def.textSpan.start + def.textSpan.length)
                return {
                  uri: URI.file(defFilePath).toString(),
                  range: { start: { line: startLc.line, character: startLc.character }, end: { line: endLc.line, character: endLc.character } },
                }
              })
              console.log(`[LSP Server] (custom) 返回定义: ${JSON.stringify(lspDefinitions)}`)
              return lspDefinitions
            } catch (e) {
              console.log(`[LSP Server] (custom) 处理失败: ${e}`)
              return []
            }
          })

          // 自定义：查找引用
          connection.onRequest('ets/findReferences', async (params) => {
            console.log(`[LSP Server] ===== ets/findReferences 被调用 =====`)
            try {
              const fileUri: string = params?.textDocument?.uri
              if (!fileUri) return []
              const filePath = URI.parse(fileUri).fsPath
              const includeDeclaration: boolean = params?.context?.includeDeclaration !== false
              console.log(`[LSP Server] (custom) references 文件路径: ${filePath}, includeDeclaration=${includeDeclaration}`)

              if (!fs.existsSync(filePath)) return []
              const content = fs.readFileSync(filePath, 'utf-8')
              const sourceFile = ets.createSourceFile(filePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
              const position = ets.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character)

              const references = (etsLanguageService as any).getReferencesAtPosition(filePath, position) as any[] | undefined
              console.log(`[LSP Server] (custom) 引用数量: ${references ? references.length : 'null'}`)
              if (!references || references.length === 0) return []

              const filtered = includeDeclaration ? references : references.filter(r => !r.isDefinition)

              const toLocation = (ref: any) => {
                const refFilePath: string = ref.fileName
                let refContent = ''
                try { if (fs.existsSync(refFilePath)) refContent = fs.readFileSync(refFilePath, 'utf-8') } catch {}
                const refSource = refContent
                  ? ets.createSourceFile(refFilePath, refContent, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
                  : sourceFile
                const startLc = ets.getLineAndCharacterOfPosition(refSource, ref.textSpan.start)
                const endLc = ets.getLineAndCharacterOfPosition(refSource, ref.textSpan.start + ref.textSpan.length)
                return {
                  uri: URI.file(refFilePath).toString(),
                  range: { start: { line: startLc.line, character: startLc.character }, end: { line: endLc.line, character: endLc.character } },
                }
              }

              const lspLocations = filtered.map(toLocation)
              console.log(`[LSP Server] (custom) 返回引用: ${JSON.stringify(lspLocations)}`)
              return lspLocations
            } catch (e) {
              console.log(`[LSP Server] (custom) 引用处理失败: ${e}`)
              return []
            }
          })

          // 自定义：签名帮助
          connection.onRequest('ets/signatureHelp', async (params) => {
            console.log(`[LSP Server] ===== ets/signatureHelp 被调用 =====`)
            try {
              const fileUri: string = params?.textDocument?.uri
              if (!fileUri) return null
              const filePath = URI.parse(fileUri).fsPath
              console.log(`[LSP Server] (custom) signature 文件路径: ${filePath}`)

              if (!fs.existsSync(filePath)) return null
              const content = fs.readFileSync(filePath, 'utf-8')
              const sourceFile = ets.createSourceFile(filePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
              const position = ets.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character)

              const items = (etsLanguageService as any).getSignatureHelpItems(filePath, position, undefined)
              if (!items || !items.items || items.items.length === 0) return null

              const displayPartsToString = (parts?: any[]) => (parts || []).map(p => p.text).join('')

              const signatures = items.items.map((it: any) => {
                const label = displayPartsToString(it.prefixDisplayParts)
                  + (it.parameters || []).map((p: any) => displayPartsToString(p.displayParts)).join(', ')
                  + displayPartsToString(it.suffixDisplayParts)
                const documentation = displayPartsToString(it.documentation)
                const params = (it.parameters || []).map((p: any) => ({
                  label: displayPartsToString(p.displayParts),
                  documentation: displayPartsToString(p.documentation),
                }))
                return {
                  label,
                  documentation,
                  parameters: params,
                }
              })

              const result = {
                signatures,
                activeSignature: items.selectedItemIndex ?? 0,
                activeParameter: items.argumentIndex ?? 0,
              }
              console.log(`[LSP Server] (custom) 返回签名: ${JSON.stringify(result)}`)
              return result
            } catch (e) {
              console.log(`[LSP Server] (custom) 签名处理失败: ${e}`)
              return null
            }
          })

          // 测试ETS语言服务的定义查找功能
          const testFilePath = '/Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets'
          if (fs.existsSync(testFilePath)) {
            try {
              const content = fs.readFileSync(testFilePath, 'utf-8')
              console.log(`[LSP Server] 测试ETS语言服务的定义查找功能`)
              
              // 尝试使用ETS语言服务查找定义
              const position = ets.getPositionOfLineAndCharacter(ets.createSourceFile(testFilePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS), 19, 15)
              console.log(`[LSP Server] 位置: ${position}`)
              
              const definitions = etsLanguageService.getDefinitionAtPosition(testFilePath, position)
              console.log(`[LSP Server] ETS语言服务定义查找结果: ${definitions ? definitions.length : 'null'}`)
              if (definitions && definitions.length > 0) {
                console.log(`[LSP Server] 找到定义: ${JSON.stringify(definitions)}`)
              }
              
            } catch (error) {
              console.log(`[LSP Server] ETS语言服务定义查找测试失败: ${error}`)
            }
          }
          
                    // 测试ETS语言服务是否能正确解析ETS文件
          if (fs.existsSync(testFilePath)) {
            try {
              const content = fs.readFileSync(testFilePath, 'utf-8')
              console.log(`[LSP Server] 测试ETS语言服务解析能力`)
              console.log(`[LSP Server] 文件内容长度: ${content.length}`)
              
              // 尝试使用ETS语言服务解析文件
              const sourceFile = ets.createSourceFile(testFilePath, content, ets.ScriptTarget.Latest, true, ets.ScriptKind.ETS)
              console.log(`[LSP Server] ETS源文件创建成功`)
              console.log(`[LSP Server] 源文件节点数量: ${sourceFile.statements.length}`)
              
              // 检查是否有语法错误
              console.log(`[LSP Server] 源文件语法检查完成`)
              
            } catch (error) {
              console.log(`[LSP Server] ETS语言服务测试失败: ${error}`)
            }
          }
          
          // 添加文件识别测试
          const testFile = '/Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets'
          console.log(`[LSP Server] 测试文件路径: ${testFile}`)
          console.log(`[LSP Server] 文件是否存在: ${fs.existsSync(testFile)}`)
          if (fs.existsSync(testFile)) {
            const content = fs.readFileSync(testFile, 'utf-8')
            console.log(`[LSP Server] 文件内容长度: ${content.length}`)
            console.log(`[LSP Server] 文件扩展名: ${path.extname(testFile)}`)
          }
          
          // 检查语言服务主机配置
          console.log(`[LSP Server] 语言服务主机配置:`)
          console.log(`[LSP Server] - 项目类型: ${options.project?.typescript ? 'TypeScript' : 'None'}`)
          console.log(`[LSP Server] - 语言服务主机: ${options.project?.typescript?.languageServiceHost ? 'Available' : 'Not Available'}`)
          
          // 检查编译器设置
          const compilerSettings = options.project?.typescript?.languageServiceHost?.getCompilationSettings()
          console.log(`[LSP Server] 编译器设置: ${JSON.stringify(compilerSettings, null, 2)}`)
          
          // 检查语言服务主机的文件处理能力
          console.log(`[LSP Server] 测试语言服务主机的文件处理:`)
          console.log(`[LSP Server] - 文件路径: ${testFile}`)
          
          // 检查语言服务主机是否有getScriptFileNames方法
          if (options.project?.typescript?.languageServiceHost?.getScriptFileNames) {
            const scriptFiles = options.project.typescript.languageServiceHost.getScriptFileNames()
            console.log(`[LSP Server] - 脚本文件列表: ${scriptFiles.length} 个文件`)
            console.log(`[LSP Server] - 是否包含测试文件: ${scriptFiles.includes(testFile)}`)
          }
          
          // 检查语言服务主机是否有getScriptVersion方法
          if (options.project?.typescript?.languageServiceHost?.getScriptVersion) {
            const scriptVersion = options.project.typescript.languageServiceHost.getScriptVersion(testFile)
            console.log(`[LSP Server] - 测试文件版本: ${scriptVersion}`)
          }
          
          // 尝试手动添加文件到语言服务主机
          console.log(`[LSP Server] 尝试手动添加文件到语言服务主机:`)
          if (options.project?.typescript?.languageServiceHost?.getScriptFileNames) {
            // 检查是否有addScript方法
            if (typeof (options.project.typescript.languageServiceHost as any).addScript === 'function') {
              console.log(`[LSP Server] - 找到addScript方法，尝试添加文件`)
              try {
                const content = fs.readFileSync(testFile, 'utf-8')
                ;(options.project.typescript.languageServiceHost as any).addScript(testFile, content, true)
                console.log(`[LSP Server] - 文件添加成功`)
              } catch (error) {
                console.log(`[LSP Server] - 文件添加失败: ${error}`)
              }
            } else {
              console.log(`[LSP Server] - 没有找到addScript方法`)
            }
            
            // 检查其他可能的方法
            const host = options.project.typescript.languageServiceHost as any
            console.log(`[LSP Server] - 检查语言服务主机的方法:`)
            console.log(`[LSP Server] - getScriptFileNames: ${typeof host.getScriptFileNames}`)
            console.log(`[LSP Server] - getScriptVersion: ${typeof host.getScriptVersion}`)
            console.log(`[LSP Server] - getScriptSnapshot: ${typeof host.getScriptSnapshot}`)
            console.log(`[LSP Server] - getCurrentDirectory: ${typeof host.getCurrentDirectory}`)
            console.log(`[LSP Server] - getDefaultLibFileName: ${typeof host.getDefaultLibFileName}`)
            
            // 尝试使用getScriptSnapshot来加载文件
            if (typeof host.getScriptSnapshot === 'function') {
              console.log(`[LSP Server] - 尝试使用getScriptSnapshot加载文件`)
              try {
                const snapshot = host.getScriptSnapshot(testFile)
                console.log(`[LSP Server] - getScriptSnapshot结果: ${snapshot ? '成功' : '失败'}`)
              } catch (error) {
                console.log(`[LSP Server] - getScriptSnapshot失败: ${error}`)
              }
            }
            
            // 重新检查文件列表
            const updatedScriptFiles = options.project.typescript.languageServiceHost.getScriptFileNames()
            console.log(`[LSP Server] - 更新后的脚本文件列表: ${updatedScriptFiles.length} 个文件`)
            console.log(`[LSP Server] - 是否包含测试文件: ${updatedScriptFiles.includes(testFile)}`)
          }
        },
      }
    }),
    [
      tsSemanticService,
      ...tsOtherServices,
      createETSLinterDiagnosticService(ets, logger),
      createETSDocumentSymbolService(),
    ],
  )

  console.log(`[LSP Server] ETS语言服务器初始化成功`)
  logger.getConsola().info(`ETS Language Server initialized successfully`)
  return result
})

connection.listen()
connection.onInitialized(server.initialized)
connection.onShutdown(server.shutdown)
