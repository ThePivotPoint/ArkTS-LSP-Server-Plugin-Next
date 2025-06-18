import path from 'node:path'
import * as vscode from 'vscode'
import { FileSystem } from '../fs/file-system'
import { ResourceFinder } from './resource-finder'
import { ResourceMatcher } from './resource-matcher'
import { typeAssert } from '@arkts/shared'

export class ResourceProvider extends FileSystem implements vscode.DefinitionProvider, vscode.HoverProvider, vscode.CompletionItemProvider {
  private constructor() {
    super()
  }

  static from(context: vscode.ExtensionContext): ResourceProvider {
    const resourceProvider = new ResourceProvider()
    context.subscriptions.push(
      vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'ets' }, resourceProvider),
    )
    context.subscriptions.push(
      vscode.languages.registerHoverProvider({ scheme: 'file', language: 'ets' }, resourceProvider),
    )
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'ets' },
        resourceProvider,
        '.',
        '\'',
        '"',
        '`',
        '.',
      ),
    )
    return resourceProvider
  }

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Definition | undefined> {
    const resourceMatcher = new ResourceMatcher()
    const resourceMatcherResult = resourceMatcher.match(document, position)
    if (!resourceMatcherResult)
      return undefined
    return new ResourceFinder(document.uri).findRelativeResource(resourceMatcherResult.content)
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    const resourceMatcher = new ResourceMatcher()
    const resourceMatcherResult = resourceMatcher.match(document, position)
    if (!resourceMatcherResult)
      return undefined
    const resourceFinder = new ResourceFinder(document.uri)
    const resourceLocations = await resourceFinder.findRelativeResource(resourceMatcherResult.content)
    if (!resourceLocations)
      return undefined

    const workspaceFolder = this.getCurrentWorkspaceDir()
    return {
      contents: resourceLocations.map((location) => {
        return new vscode.MarkdownString(`[${workspaceFolder ? path.relative(workspaceFolder.fsPath, location.uri.fsPath) : location.uri.fsPath}](${location.uri.fsPath})`)
      }),
    }
  }

  private firstLevel = ['app', 'sys'] as const
  private secondLevel = {
    app: ['color', 'float', 'string', 'plural', 'media', 'profile'],
    sys: ['color', 'float', 'string', 'media', 'symbol', 'name'],
  }

  async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const resourceMatcher = new ResourceMatcher()
    const resourceMatcherResult = resourceMatcher.match(document, position)
    if (!resourceMatcherResult)
      return []

    const { pathParts } = resourceMatcherResult
    const completionItems: vscode.CompletionItem[] = []

    // 新增：如果已经完全匹配如 app.color、sys.media 等，则不再补全
    if (
      this.firstLevel.includes(pathParts[0] as keyof typeof this.secondLevel) &&
      this.secondLevel[pathParts[0] as keyof typeof this.secondLevel]?.includes(pathParts[1])
    ) {
      return []
    }

    // 只有在第一层不是 app/sys 时，才补全 app/sys 及其下属类型
    if (!this.firstLevel.includes(pathParts[0] as keyof typeof this.secondLevel)) {
      for (const level of this.firstLevel) {
        typeAssert<keyof typeof this.secondLevel>(level)
        completionItems.push(new vscode.CompletionItem(level, vscode.CompletionItemKind.Field))
        for (const sub of this.secondLevel[level]) {
          completionItems.push(new vscode.CompletionItem(`${level}.${sub}`, vscode.CompletionItemKind.Field))
        }
      }
    }

    // 在 app. 或 sys. 下，只补全第二层
    if (this.firstLevel.includes(pathParts[0] as keyof typeof this.secondLevel)) {
      const level = pathParts[0] as keyof typeof this.secondLevel
      for (const sub of this.secondLevel[level]) {
        if (pathParts[1] !== sub) {
          completionItems.push(new vscode.CompletionItem(sub, vscode.CompletionItemKind.Field))
        }
      }
    }

    return new vscode.CompletionList(completionItems)
  }
}
