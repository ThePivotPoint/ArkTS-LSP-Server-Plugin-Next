import type { INode } from 'html5parser'
import type { Plugin } from 'vite'
import { parse, SyntaxKind } from 'html5parser'
import MagicString from 'magic-string'

export function InternalTransformHtmlPlugin(): Plugin {
  return {
    name: 'internal:transform-html-for-vscode',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        const htmlAst = parse(html)
        const ms = new MagicString(html)
        return transformHtml(html, htmlAst, ms)
      },
    },
  }
}

function transformHtml(_html: string, ast: INode[], ms: MagicString): string {
  function transformScriptSrc(node: INode): void {
    if (node.type !== SyntaxKind.Tag || node.name !== 'script')
      return
    for (const attr of node.attributes) {
      if (attr.name.value !== 'src' || !attr.value)
        continue
      const src = attr.value.value
      ms.overwrite(attr.value.start + 1, attr.value.end - 1, `{{${src}}}`)
    }
  }

  function transformLinkStylesheetHref(node: INode): void {
    if (node.type !== SyntaxKind.Tag || node.name !== 'link' || !node.attributes)
      return
    for (const attr of node.attributes) {
      if (attr.name.value !== 'href' || !attr.value)
        continue
      const href = attr.value.value
      ms.overwrite(attr.value.start + 1, attr.value.end - 1, `{{${href}}}`)
    }
  }

  function walk(node: INode[]) {
    for (const child of node) {
      transformScriptSrc(child)
      transformLinkStylesheetHref(child)
      if (child.type === SyntaxKind.Tag && child.body)
        walk(child.body)
    }
  }
  walk(ast)
  return ms.toString()
}
