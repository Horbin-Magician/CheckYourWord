import JSZip from 'jszip'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/**
 * 移除指定命名空间下的所有元素（连同子节点）
 */
function removeElements(doc, ns, localName) {
  const elements = Array.from(doc.getElementsByTagNameNS(ns, localName))
  for (const el of elements) {
    el.parentNode.removeChild(el)
  }
}

/**
 * 解包指定命名空间下的所有元素（保留子节点，移除包装标签）
 */
function unwrapElements(doc, ns, localName) {
  const elements = Array.from(doc.getElementsByTagNameNS(ns, localName))
  for (const el of elements) {
    const parent = el.parentNode
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el)
    }
    parent.removeChild(el)
  }
}

/**
 * 对已解析的 XML 文档执行所有清理操作
 * 顺序很重要：先接受插入，再删除已删内容
 */
function cleanXmlDoc(doc) {
  // 1. 接受插入（保留内容，移除修订标记）
  unwrapElements(doc, W_NS, 'ins')
  unwrapElements(doc, W_NS, 'moveTo')

  // 2. 移除删除内容
  removeElements(doc, W_NS, 'del')
  removeElements(doc, W_NS, 'moveFrom')

  // 3. 移除格式变更标记（接受当前格式）
  removeElements(doc, W_NS, 'rPrChange')
  removeElements(doc, W_NS, 'pPrChange')
  removeElements(doc, W_NS, 'sectPrChange')
  removeElements(doc, W_NS, 'tblPrChange')
  removeElements(doc, W_NS, 'tblGridChange')
  removeElements(doc, W_NS, 'tcPrChange')
  removeElements(doc, W_NS, 'trPrChange')

  // 4. 移除评注标记
  removeElements(doc, W_NS, 'commentRangeStart')
  removeElements(doc, W_NS, 'commentRangeEnd')
  removeElements(doc, W_NS, 'commentReference')
  removeElements(doc, W_NS, 'annotationRef')
}

/**
 * 清理 ZIP 中的单个 XML 部件
 */
async function cleanDocxPart(zip, partPath, parser, serializer) {
  const file = zip.file(partPath)
  if (!file) return

  const xmlString = await file.async('string')
  const doc = parser.parseFromString(xmlString, 'application/xml')

  if (doc.getElementsByTagName('parsererror').length > 0) {
    console.warn(`Failed to parse ${partPath}, skipping cleanup`)
    return
  }

  cleanXmlDoc(doc)
  zip.file(partPath, serializer.serializeToString(doc))
}

/**
 * 预处理 DOCX 文件：接受所有修订、删除所有评注
 * @param {ArrayBuffer} arrayBuffer - 原始 .docx 文件
 * @returns {Promise<ArrayBuffer>} - 清理后的 .docx 文件
 */
export async function cleanDocxForProofreading(arrayBuffer) {
  let zip
  try {
    zip = await JSZip.loadAsync(arrayBuffer)
  } catch {
    return arrayBuffer
  }

  if (!zip.file('word/document.xml')) {
    return arrayBuffer
  }

  const parser = new DOMParser()
  const serializer = new XMLSerializer()

  // 清理主文档
  await cleanDocxPart(zip, 'word/document.xml', parser, serializer)

  // 清理页眉、页脚、脚注、尾注
  const partsToClean = []
  zip.forEach((relativePath) => {
    if (/^word\/(header|footer|footnotes|endnotes)\d*\.xml$/.test(relativePath)) {
      partsToClean.push(relativePath)
    }
  })
  for (const partPath of partsToClean) {
    await cleanDocxPart(zip, partPath, parser, serializer)
  }

  // 删除评注文件
  zip.remove('word/comments.xml')

  return await zip.generateAsync({ type: 'arraybuffer' })
}
