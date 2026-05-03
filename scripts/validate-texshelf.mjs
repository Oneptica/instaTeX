import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'

const root = process.cwd()
const texshelfRoot = path.join(root, 'TexShelf')
const texshelfDir = path.join(texshelfRoot, 'formulas')
const schemaPath = path.join(texshelfRoot, 'schema.json')

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function getFormulaFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await getFormulaFiles(entryPath)))
    } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'schema.json') {
      files.push(entryPath)
    }
  }

  return files.sort()
}

function formatAjvErrors(relativePath, errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || '/'
    const detail = error.params?.missingProperty
      ? `${error.message}: ${error.params.missingProperty}`
      : error.message

    return `${relativePath}${location}: ${detail}`
  })
}

async function main() {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'))
  const ajv = new Ajv2020({ allErrors: true })
  const validateFormulaFile = ajv.compile(schema)
  const files = await getFormulaFiles(texshelfDir)
  const errors = []
  const ids = new Set()
  let formulaCount = 0

  for (const fullPath of files) {
    const relativePath = path.relative(texshelfDir, fullPath)
    const pathParts = relativePath.split(path.sep)

    if (pathParts.length !== 2) {
      errors.push(`${relativePath}: formula files must live at formulas/<category>/<subcategory>.json.`)
      continue
    }

    const [categorySlug, fileName] = pathParts
    const expectedCategory = titleFromSlug(categorySlug)
    const expectedSubcategory = titleFromSlug(path.basename(fileName, '.json'))
    let entries

    try {
      entries = JSON.parse(await readFile(fullPath, 'utf8'))
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON: ${error.message}`)
      continue
    }

    if (!validateFormulaFile(entries)) {
      errors.push(...formatAjvErrors(relativePath, validateFormulaFile.errors))
      continue
    }

    entries.forEach((entry, index) => {
      formulaCount += 1

      if (entry.category !== expectedCategory) {
        errors.push(
          `${relativePath}[${index}]: category "${entry.category}" must match folder "${expectedCategory}".`,
        )
      }

      if (entry.subcategory !== expectedSubcategory) {
        errors.push(
          `${relativePath}[${index}]: subcategory "${entry.subcategory}" must match file "${expectedSubcategory}".`,
        )
      }

      if (ids.has(entry.id)) {
        errors.push(`${relativePath}[${index}]: duplicate id "${entry.id}".`)
      }

      ids.add(entry.id)
    })
  }

  if (errors.length > 0) {
    console.error(`TeXShelf validation failed with ${errors.length} error(s):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`TeXShelf validation passed: ${formulaCount} formulas in ${files.length} files.`)
}

await main()
