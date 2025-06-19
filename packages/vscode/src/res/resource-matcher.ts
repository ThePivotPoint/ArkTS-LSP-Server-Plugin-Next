import type * as vscode from 'vscode'

export type ResourceQuote = '`' | '"' | '\''
export type ResourceMatchText = `$r('${string}')` | `$r("${string}")` | `$r(\`${string}\`)`

export interface ResourceMatcherResult {
  content: string
  pathParts: string[]
  quote: ResourceQuote
  fullMatchText: ResourceMatchText
}

export class ResourceMatcher {
  public static readonly $rRegex = /\$r\s*\(\s*([`'"])((?:[^`'"]|\\[`'"])*)\1[^)]*\)/g

  /**
   * 匹配 $r() 调用
   * @param document 文档
   * @param position 位置
   * @returns 匹配结果
   */
  public match(document: vscode.TextDocument, position: vscode.Position): ResourceMatcherResult | undefined {
    const fullText = document.getText()
    // 匹配所有 $r() 调用，支持：
    // 1. 单引号、双引号、反引号
    // 2. 转义字符
    // 3. 字符串中的引号
    // 4. 多行字符串
    const $rMatches = [...fullText.matchAll(ResourceMatcher.$rRegex)]

    // 如果没有匹配到任何内容，返回空数组
    if ($rMatches.length === 0)
      return undefined

    // 找到光标所在的 $r() 调用
    const match = $rMatches.find((match) => {
      const startPos = document.positionAt(match.index!)
      const endPos = document.positionAt(match.index! + match[0].length)
      return position.isAfterOrEqual(startPos) && position.isBeforeOrEqual(endPos)
    })
    if (!match)
      return undefined

    // match[0] 是整个匹配的字符串，如 $r('a.b.c')
    // match[1] 是引号类型，如 ' 或 " 或 `
    // match[2] 是引号内的内容，如 a.b.c
    const content = (match[2] || '').trim()

    return {
      content,
      pathParts: content.split('.'),
      quote: match[1] as ResourceQuote,
      fullMatchText: match[0] as ResourceMatchText,
    }
  }
}
