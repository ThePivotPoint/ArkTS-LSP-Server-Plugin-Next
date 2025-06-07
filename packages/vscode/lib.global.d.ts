// eslint-disable-next-line ts/ban-ts-comment
// @ts-nocheck

declare global {
  const console: typeof import('@internal/full/global').console
  const setInterval: typeof import('@internal/full/global').setInterval
  const setTimeout: typeof import('@internal/full/global').setTimeout
  const clearInterval: typeof import('@internal/full/global').clearInterval
  const clearTimeout: typeof import('@internal/full/global').clearTimeout
  const canIUse: typeof import('@internal/full/global').canIUse
  const getInspectorByKey: typeof import('@internal/full/global').getInspectorByKey
  const getInspectorTree: typeof import('@internal/full/global').getInspectorTree
  const sendEventByKey: typeof import('@internal/full/global').sendEventByKey
  const sendTouchEvent: typeof import('@internal/full/global').sendTouchEvent
  const sendKeyEvent: typeof import('@internal/full/global').sendKeyEvent
  const sendMouseEvent: typeof import('@internal/full/global').sendMouseEvent
  const loadNativeModule: typeof import('@internal/full/global').loadNativeModule
}

export {}
