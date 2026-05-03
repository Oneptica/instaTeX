import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const texshelfDir = path.join(root, 'TexShelf', 'formulas')
const requiredFields = ['id', 'title', 'category', 'subcategory', 'latex', 'tags']
const categories = new Set([
  'Algebra',
  'Calculus',
  'Linear Algebra',
  'Probability',
  'Physics',
  'Chemistry',
  'Control Theory',
  'Signal Processing',
  'Image Processing',
])
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function checkString(entry, field, errors, location) {
  if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
    errors.push(`${location}: "${field}" must be a non-empty string.`)
  }
}

function validateEntry(entry, errors, ids, location, expectedCategory, expectedSubcategory) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`${location}: entry must be an object.`)
    return
  }

  for (const field of requiredFields) {
    if (!(field in entry)) errors.push(`${location}: missing required field "${field}".`)
  }

  checkString(entry, 'id', errors, location)
  checkString(entry, 'title', errors, location)
  checkString(entry, 'category', errors, location)
  checkString(entry, 'subcategory', errors, location)
  checkString(entry, 'latex', errors, location)

  if (typeof entry.id === 'string' && !idPattern.test(entry.id)) {
    errors.push(`${location}: id "${entry.id}" must use lowercase hyphen-case.`)
  }

  if (typeof entry.id === 'string') {
    if (ids.has(entry.id)) {
      errors.push(`${location}: duplicate id "${entry.id}".`)
    }
    ids.add(entry.id)
  }

  if (typeof entry.category === 'string' && !categories.has(entry.category)) {
    errors.push(`${location}: unsupported category "${entry.category}".`)
  }

  if (typeof entry.category === 'string' && entry.category !== expectedCategory) {
    errors.push(`${location}: category "${entry.category}" must match folder "${expectedCategory}".`)
  }

  if (typeof entry.subcategory === 'string' && entry.subcategory !== expectedSubcategory) {
    errors.push(`${location}: subcategory "${entry.subcategory}" must match file "${expectedSubcategory}".`)
  }

  if ('description' in entry && typeof entry.description !== 'string') {
    errors.push(`${location}: "description" must be a string when present.`)
  }

  if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
    errors.push(`${location}: "tags" must be a non-empty string array.`)
  } else {
    const tagSet = new Set()

    for (const tag of entry.tags) {
      if (typeof tag !== 'string' || tag.trim() === '') {
        errors.push(`${location}: every tag must be a non-empty string.`)
      }
      if (tagSet.has(tag)) errors.push(`${location}: duplicate tag "${tag}".`)
      tagSet.add(tag)
    }
  }

  const allowedFields = new Set([
    'id',
    'title',
    'category',
    'subcategory',
    'latex',
    'description',
    'tags',
    'source',
  ])

  for (const field of Object.keys(entry)) {
    if (!allowedFields.has(field)) errors.push(`${location}: unknown field "${field}".`)
  }
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

async function main() {
  const files = await getFormulaFiles(texshelfDir)
  const errors = []
  const ids = new Set()

  for (const fullPath of files) {
    const relativePath = path.relative(texshelfDir, fullPath)
    const pathParts = relativePath.split(path.sep)

    if (pathParts.length !== 2) {
      errors.push(`${relativePath}: formula files must live at formulas/<category>/<subcategory>.json.`)
      continue
    }

    const [categorySlug, fileName] = pathParts
    const subcategorySlug = path.basename(fileName, '.json')
    const expectedCategory = titleFromSlug(categorySlug)
    const expectedSubcategory = titleFromSlug(subcategorySlug)
    const content = await readFile(fullPath, 'utf8')
    let entries

    try {
      entries = JSON.parse(content)
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON: ${error.message}`)
      continue
    }

    if (!Array.isArray(entries)) {
      errors.push(`${relativePath}: root value must be an array.`)
      continue
    }

    entries.forEach((entry, index) =>
      validateEntry(entry, errors, ids, `${relativePath}[${index}]`, expectedCategory, expectedSubcategory),
    )
  }

  if (errors.length > 0) {
    console.error(`TeXShelf validation failed with ${errors.length} error(s):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`TeXShelf validation passed: ${ids.size} formulas in ${files.length} files.`)
}

await main()
