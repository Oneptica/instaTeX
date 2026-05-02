import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import MathJax from 'mathjax'
import ts from 'typescript'

const root = process.cwd()
const sourcePath = path.join(root, 'src', 'lib', 'latexTemplates.ts')
const outputRoot = path.join(root, 'public', 'symbols')

function slugifyAssetPart(value) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

function readLiteral(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text)
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(readLiteral)
  }

  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => {
          const name = property.name
          const key =
            ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
              ? name.text
              : name.getText()

          return [key, readLiteral(property.initializer)]
        }),
    )
  }

  throw new Error(`Unsupported template literal node: ${node.getText()}`)
}

async function loadToolbarGroups() {
  const sourceText = await fs.readFile(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true)

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'toolbarGroups') {
        if (!declaration.initializer) throw new Error('toolbarGroups has no initializer.')

        return readLiteral(declaration.initializer)
      }
    }
  }

  throw new Error('toolbarGroups was not found.')
}

function getTemplatePreviewLatex(template) {
  if (template.previewLatex) return template.previewLatex

  if (template.prefix.startsWith('\\ce')) return template.label

  if (template.suffix) {
    return `${template.prefix}x${template.suffix}`
      .replaceAll('^{}', '^{n}')
      .replaceAll('_{ }', '_{n}')
      .replaceAll('{}', '{y}')
      .trim()
  }

  return template.prefix.trim() || template.label
}

function extractSvg(markup) {
  const match = markup.match(/<svg[\s\S]*<\/svg>/)

  if (!match) {
    throw new Error('MathJax did not produce an SVG element.')
  }

  return match[0]
    .replace(/\s(?:focusable|role|aria-hidden)="[^"]*"/g, '')
    .replace(/\sdata-mml-node="[^"]*"/g, '')
}

await MathJax.init({
  loader: {
    load: ['input/tex', 'output/svg', '[tex]/physics', '[tex]/cancel'],
  },
  tex: {
    packages: { '[+]': ['physics', 'cancel'] },
  },
  svg: {
    fontCache: 'none',
  },
})

const toolbarGroups = await loadToolbarGroups()
let generated = 0

await fs.rm(outputRoot, { recursive: true, force: true })

for (const group of toolbarGroups) {
  const groupSlug = slugifyAssetPart(group.name)
  const groupDirectory = path.join(outputRoot, groupSlug)

  await fs.mkdir(groupDirectory, { recursive: true })

  for (const [index, template] of group.templates.entries()) {
    const itemSlug = slugifyAssetPart(template.description ?? template.label)
    const fileName = `${String(index + 1).padStart(2, '0')}-${itemSlug}.svg`
    const outputPath = path.join(groupDirectory, fileName)
    const latex = getTemplatePreviewLatex(template)

    try {
      const node = await MathJax.tex2svgPromise(latex, {
        display: false,
        em: 16,
        ex: 8,
        containerWidth: 80 * 16,
      })
      const svg = extractSvg(MathJax.startup.adaptor.serializeXML(node))

      await fs.writeFile(outputPath, `${svg}\n`, 'utf8')
      generated += 1
    } catch (error) {
      console.warn(`Skipped ${group.name} / ${template.label}: ${error.message}`)
    }
  }
}

console.log(`Generated ${generated} symbol SVG files.`)
