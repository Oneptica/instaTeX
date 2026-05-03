import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import Ajv2020 from 'ajv/dist/2020.js'

const root = process.cwd()
const latexgoRoot = path.join(root, 'LaTeXgO')
const schemaPath = path.join(latexgoRoot, 'schema.json')
const latexgoBuckets = [
  { name: 'formulas', label: 'formula' },
  { name: 'plots', label: 'plot' },
]

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function getJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await getJsonFiles(entryPath)))
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
  const files = []

  for (const bucket of latexgoBuckets) {
    const bucketPath = path.join(latexgoRoot, bucket.name)

    try {
      files.push(...(await getJsonFiles(bucketPath)))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
  }

  const errors = []
  const ids = new Set()
  let entryCount = 0

  for (const fullPath of files) {
    const relativePath = path.relative(latexgoRoot, fullPath)
    const pathParts = relativePath.split(path.sep)

    if (pathParts.length !== 3) {
      errors.push(
        `${relativePath}: data files must live at formulas|plots/<category>/<subcategory>.json.`,
      )
      continue
    }

    const [bucketName, categorySlug, fileName] = pathParts
    const bucket = latexgoBuckets.find((entry) => entry.name === bucketName)

    if (!bucket) {
      errors.push(`${relativePath}: unsupported data bucket "${bucketName}".`)
      continue
    }

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
      entryCount += 1

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

      if (entry.kind && entry.kind !== bucket.label) {
        errors.push(`${relativePath}[${index}]: kind "${entry.kind}" must match bucket "${bucket.label}".`)
      }

      ids.add(entry.id)
    })
  }

  if (errors.length > 0) {
    console.error(`LaTeXgO validation failed with ${errors.length} error(s):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`LaTeXgO validation passed: ${entryCount} entries in ${files.length} files.`)
}

await main()
