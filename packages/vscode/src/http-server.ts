import * as http from 'http'
import * as url from 'url'
import { LanguageClient } from '@volar/vscode/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { Position } from '@volar/language-server'
import { HttpServerConfigManager, type HttpServerConfig } from './http-config'
import { sleep } from './utils'


interface HttpServerOptions {
  port?: number
  host?: string
}

interface DefinitionRequest {
  uri: string
  line: number
  character: number
}

interface ReferenceRequest {
  uri: string
  line: number
  character: number
  includeDeclaration?: boolean
}

interface SignatureRequest {
  uri: string
  line: number
  character: number
}

interface HoverRequest {
  uri: string
  line: number
  character: number
}

export class ArkTSHttpServer {
  private server: http.Server | null = null
  private languageClient: LanguageClient | null = null
  private port: number
  private host: string

  constructor(options: HttpServerOptions = {}) {
    const config = HttpServerConfigManager.getConfig()
    this.port = options.port || config.port
    this.host = options.host || config.host
  }

  setLanguageClient(client: LanguageClient) {
    console.log(`[HTTP Server] Setting language client`)
    console.log(`[HTTP Server] Client info:`, {
      name: client.name,
      isRunning: client.isRunning(),
      outputChannel: client.outputChannel?.name
    })
    this.languageClient = client
    console.log(`[HTTP Server] Language client set successfully`)
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[HTTP Server] Starting server on ${this.host}:${this.port}`)
      
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res)
        } catch (error) {
          console.error('[HTTP Server] Server Error:', error)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Internal Server Error' }))
        }
      })

      this.server.listen(this.port, this.host, () => {
        console.log(`[HTTP Server] Server started successfully at http://${this.host}:${this.port}`)
        resolve()
      })

      this.server.on('error', (error) => {
        console.error('[HTTP Server] Server Error:', error)
        reject(error)
      })
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        console.log(`[HTTP Server] Stopping server`)
        this.server.close(() => {
          console.log('[HTTP Server] Server stopped successfully')
          resolve()
        })
      } else {
        console.log(`[HTTP Server] No server to stop`)
        resolve()
      }
    })
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const parsedUrl = url.parse(req.url || '', true)
    const path = parsedUrl.pathname
    const method = req.method

    console.log(`[HTTP Server] ===== 收到新请求 =====`)
    console.log(`[HTTP Server] 请求方法: ${method}`)
    console.log(`[HTTP Server] 请求路径: ${path}`)
    console.log(`[HTTP Server] 请求头:`, JSON.stringify(req.headers, null, 2))

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (method === 'OPTIONS') {
      console.log(`[HTTP Server] 处理OPTIONS请求`)
      res.writeHead(200)
      res.end()
      return
    }

    if (method !== 'POST') {
      console.log(`[HTTP Server] 方法不允许: ${method}`)
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    if (!this.languageClient) {
      console.log(`[HTTP Server] ❌ 语言客户端不可用`)
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Language server not ready' }))
      return
    }

    console.log(`[HTTP Server] 语言客户端状态:`, {
      isRunning: this.languageClient.isRunning(),
      name: this.languageClient.name
    })

    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
      console.log(`[HTTP Server] 接收到数据块: ${chunk.length} 字节`)
    })

    req.on('end', async () => {
      console.log(`[HTTP Server] 请求体接收完成，总长度: ${body.length} 字符`)
      
      try {
        const data = JSON.parse(body)
        console.log(`[HTTP Server] 解析的请求数据:`, JSON.stringify(data, null, 2))
        
        let result

        switch (path) {
          case '/definition':
            console.log(`[HTTP Server] 🔍 处理查找定义请求`)
            result = await this.getDefinition(data as DefinitionRequest)
            break
          case '/references':
            console.log(`[HTTP Server] 🔍 处理查找引用请求`)
            result = await this.getReferences(data as ReferenceRequest)
            break
          case '/signature':
            console.log(`[HTTP Server] 🔍 处理签名帮助请求`)
            result = await this.getSignatureHelp(data as SignatureRequest)
            break
          case '/hover':
            console.log(`[HTTP Server] 🔍 处理悬停信息请求`)
            result = await this.getHover(data as HoverRequest)
            break
          case '/completion':
            console.log(`[HTTP Server] 🔍 处理代码补全请求`)
            result = await this.getCompletion(data as SignatureRequest)
            break
          case '/symbols':
            console.log(`[HTTP Server] 🔍 处理文档符号请求`)
            result = await this.getDocumentSymbols(data as { uri: string })
            break
          default:
            console.log(`[HTTP Server] ❌ 未知端点: ${path}`)
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Endpoint not found' }))
            return
        }

        console.log(`[HTTP Server] 📤 发送响应:`, JSON.stringify(result, null, 2))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
        console.log(`[HTTP Server] ===== 请求处理完成 =====`)
      } catch (error) {
        console.error('[HTTP Server] ❌ 请求处理错误:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
  }

  private async getDefinition(request: DefinitionRequest) {
    console.log(`[HTTP Server] getDefinition called with:`, JSON.stringify(request, null, 2))
    
    if (!this.languageClient) {
      console.log(`[HTTP Server] Language client not available`)
      return []
    }

    if (!this.languageClient.isRunning()) {
      console.log(`[HTTP Server] Language client is not running`)
      return []
    }

    // 读取文件内容
    const fs = require('fs')
    const path = require('path')
    
    let content = ''
    try {
      // 跨平台 URI 转换处理
      let filePath = request.uri.replace('file://', '')
      // Windows 路径处理：file:///C:/path 转换为 C:/path
      if (filePath.startsWith('/') && filePath.length > 2 && filePath.charAt(2) === ':') {
        filePath = filePath.substring(1)
      }
      console.log(`[HTTP Server] Original URI: ${request.uri}`)
      console.log(`[HTTP Server] Parsed file path: ${filePath}`)
      
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
        console.log(`[HTTP Server] File content length: ${content.length} characters`)
      } else {
        console.log(`[HTTP Server] File does not exist: ${filePath}`)
        return []
      }
    } catch (error) {
      console.error('[HTTP Server] Failed to read file:', error)
      return []
    }

    const textDocument = TextDocument.create(
      request.uri,
      'ets',
      1,
      content
    )

    const position = Position.create(request.line, request.character)
    console.log(`[HTTP Server] Created position: line=${position.line}, character=${position.character}`)

    console.log(`[HTTP Server] Sending textDocument/definition request to language server`)
    try {
      // 先通过 didOpen 将文本同步到语言服务器
      try {
        await this.languageClient.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: request.uri,
            languageId: 'ets',
            version: 1,
            text: content,
          },
        })
        console.log(`[HTTP Server] Sent didOpen for ${request.uri}`)
        // 等待语言服务器索引
        await sleep(100)
      } catch (e) {
        console.log(`[HTTP Server] didOpen failed:`, e)
      }

      // 使用标准 LSP 形状（仅传 uri 与 position）
      // 优先尝试调用自定义的 ets/findDefinition 以避免被默认处理器覆盖
      let result: any
      try {
        result = await this.languageClient.sendRequest('ets/findDefinition', {
          textDocument: { uri: request.uri },
          position,
        })
        console.log(`[HTTP Server] Language server (custom) response:`, JSON.stringify(result, null, 2))
      } catch (e) {
        console.log(`[HTTP Server] 调用 ets/findDefinition 失败，回退到标准 definition:`, e)
      }

      if (!result) {
        result = await this.languageClient.sendRequest('textDocument/definition', {
          textDocument: { uri: request.uri },
          position,
        })
      }

      console.log(`[HTTP Server] Language server response:`, JSON.stringify(result, null, 2))
      
      // 检查结果类型
      if (result && Array.isArray(result)) {
        console.log(`[HTTP Server] Result is array with ${result.length} items`)
        if (result.length > 0) {
          console.log(`[HTTP Server] First result:`, JSON.stringify(result[0], null, 2))
        }
      } else if (result && typeof result === 'object') {
        console.log(`[HTTP Server] Result is object:`, JSON.stringify(result, null, 2))
      } else {
        console.log(`[HTTP Server] Result is null or undefined`)
      }
      
      return result || []
    } catch (error) {
      console.error(`[HTTP Server] Error calling language server:`, error)
      return []
    }
  }

  private async getReferences(request: ReferenceRequest) {
    console.log(`[HTTP Server] getReferences called with:`, JSON.stringify(request, null, 2))
    
    if (!this.languageClient) {
      console.log(`[HTTP Server] Language client not available`)
      throw new Error('Language client not available')
    }

    if (!this.languageClient.isRunning()) {
      console.log(`[HTTP Server] Language client is not running`)
      throw new Error('Language client is not running')
    }

    // 读取文件内容
    const fs = require('fs')
    let content = ''
    try {
      // 跨平台 URI 转换处理
      let filePath = request.uri.replace('file://', '')
      // Windows 路径处理：file:///C:/path 转换为 C:/path
      if (filePath.startsWith('/') && filePath.length > 2 && filePath.charAt(2) === ':') {
        filePath = filePath.substring(1)
      }
      console.log(`[HTTP Server] Original URI (references): ${request.uri}`)
      console.log(`[HTTP Server] Parsed file path (references): ${filePath}`)
      
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
        console.log(`[HTTP Server] File content length: ${content.length} characters`)
      } else {
        console.log(`[HTTP Server] File does not exist: ${filePath}`)
      }
    } catch (error) {
      console.error('[HTTP Server] Failed to read file:', error)
    }

    const textDocument = TextDocument.create(
      request.uri,
      'ets',
      1,
      content
    )

    const position = Position.create(request.line, request.character)
    console.log(`[HTTP Server] Created position: line=${position.line}, character=${position.character}`)

    console.log(`[HTTP Server] Sending textDocument/references request to language server`)
    try {
      // didOpen 确保内容同步
      try {
        await this.languageClient.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: request.uri,
            languageId: 'ets',
            version: 1,
            text: content,
          },
        })
        console.log(`[HTTP Server] Sent didOpen for ${request.uri} (references)`)
      } catch {}

      // 优先自定义请求
      let result: any
      try {
        result = await this.languageClient.sendRequest('ets/findReferences', {
          textDocument: { uri: request.uri },
          position,
          context: { includeDeclaration: request.includeDeclaration ?? true },
        })
        console.log(`[HTTP Server] Language server (custom references) response:`, JSON.stringify(result, null, 2))
      } catch {}

      if (!result) {
        result = await this.languageClient.sendRequest('textDocument/references', {
          textDocument: { uri: request.uri },
          position,
          context: { includeDeclaration: request.includeDeclaration ?? true },
        })
      }

      console.log(`[HTTP Server] Language server references response:`, JSON.stringify(result, null, 2))
      return result
    } catch (error) {
      console.error(`[HTTP Server] Error calling language server for references:`, error)
      throw error
    }
  }

  private async getSignatureHelp(request: SignatureRequest) {
    if (!this.languageClient) {
      throw new Error('Language client not available')
    }

    if (!this.languageClient.isRunning()) {
      throw new Error('Language client is not running')
    }

    // 读取文件内容
    const fs = require('fs')
    let content = ''
    try {
      // 跨平台 URI 转换处理
      let filePath = request.uri.replace('file://', '')
      // Windows 路径处理：file:///C:/path 转换为 C:/path
      if (filePath.startsWith('/') && filePath.length > 2 && filePath.charAt(2) === ':') {
        filePath = filePath.substring(1)
      }
      console.log(`[HTTP Server] Original URI (signature): ${request.uri}`)
      console.log(`[HTTP Server] Parsed file path (signature): ${filePath}`)
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
        console.log(`[HTTP Server] File content length: ${content.length} characters (signature)`)
      } else {
        console.log(`[HTTP Server] File does not exist: ${filePath} (signature)`)
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }

    const textDocument = TextDocument.create(
      request.uri,
      'ets',
      1,
      content
    )

    const position = Position.create(request.line, request.character)

    try {
      // didOpen 确保内容同步
      try {
        await this.languageClient.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: request.uri,
            languageId: 'ets',
            version: 1,
            text: content,
          },
        })
        console.log(`[HTTP Server] Sent didOpen for ${request.uri} (signature)`)
      } catch {}

      // 优先自定义请求
      let result: any
      try {
        result = await this.languageClient.sendRequest('ets/signatureHelp', {
          textDocument: { uri: request.uri },
          position,
        })
        console.log(`[HTTP Server] Language server (custom signature) response:`, JSON.stringify(result, null, 2))
      } catch {}

      if (!result) {
        result = await this.languageClient.sendRequest('textDocument/signatureHelp', {
          textDocument: { uri: request.uri },
          position,
        })
      }

      return result
    } catch (error) {
      console.error(`[HTTP Server] Error calling language server for signature help:`, error)
      throw error
    }
  }

  private async getHover(request: HoverRequest) {
    if (!this.languageClient) {
      throw new Error('Language client not available')
    }

    if (!this.languageClient.isRunning()) {
      throw new Error('Language client is not running')
    }

    // 读取文件内容
    const fs = require('fs')
    let content = ''
    try {
      // 跨平台 URI 转换处理
      let filePath = request.uri.replace('file://', '')
      // Windows 路径处理：file:///C:/path 转换为 C:/path
      if (filePath.startsWith('/') && filePath.length > 2 && filePath.charAt(2) === ':') {
        filePath = filePath.substring(1)
      }
      console.log(`[HTTP Server] Original URI (hover): ${request.uri}`)
      console.log(`[HTTP Server] Parsed file path (hover): ${filePath}`)
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
        console.log(`[HTTP Server] File content length: ${content.length} characters (hover)`)
      } else {
        console.log(`[HTTP Server] File does not exist: ${filePath} (hover)`)
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }

    const textDocument = TextDocument.create(
      request.uri,
      'ets',
      1,
      content
    )

    const position = Position.create(request.line, request.character)

    try {
      const result = await this.languageClient.sendRequest('textDocument/hover', {
        textDocument,
        position,
      })

      return result
    } catch (error) {
      console.error(`[HTTP Server] Error calling language server for hover:`, error)
      throw error
    }
  }

  private async getCompletion(request: SignatureRequest) {
    if (!this.languageClient) {
      throw new Error('Language client not available')
    }

    if (!this.languageClient.isRunning()) {
      throw new Error('Language client is not running')
    }

    // 读取文件内容
    const fs = require('fs')
    let content = ''
    try {
      const filePath = request.uri.replace('file://', '')
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }

    const textDocument = TextDocument.create(
      request.uri,
      'ets',
      1,
      content
    )

    const position = Position.create(request.line, request.character)

    try {
      const result = await this.languageClient.sendRequest('textDocument/completion', {
        textDocument,
        position,
      })

      return result
    } catch (error) {
      console.error(`[HTTP Server] Error calling language server for completion:`, error)
      throw error
    }
  }

  private async getDocumentSymbols(request: { uri: string }) {
    if (!this.languageClient) {
      throw new Error('Language client not available')
    }

    if (!this.languageClient.isRunning()) {
      throw new Error('Language client is not running')
    }

    // 读取文件内容
    const fs = require('fs')
    let content = ''
    try {
      const filePath = request.uri.replace('file://', '')
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8')
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }

    const textDocument = TextDocument.create(
      request.uri,
      'ets',
      1,
      content
    )

    try {
      const result = await this.languageClient.sendRequest('textDocument/documentSymbol', {
        textDocument,
      })

      return result
    } catch (error) {
      console.error(`[HTTP Server] Error calling language server for symbols:`, error)
      throw error
    }
  }
} 