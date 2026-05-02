import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const texshelfDir = path.join(root, 'texshelf')
const requiredFields = ['id', 'title', 'category', 'latex', 'tags']
const categories = new Set([
  'Algebra',
  'Calculus',
  'Linear Algebra',
  'Probability',
  'Physics',
  'Chemistry',
])
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function checkString(entry, field, errors, location) {
  if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
    errors.push(`${location}: "${field}" must be a non-empty string.`)
  }
}

function validateEntry(entry, errors, ids, location) {
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

  if ('subcategory' in entry && typeof entry.subcategory !== 'string') {
    errors.push(`${location}: "subcategory" must be a string when present.`)
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

async function main() {
  const files = (await readdir(texshelfDir))
    .filter((file) => file.endsWith('.json') && file !== 'schema.json')
    .sort()

  const errors = []
  const ids = new Set()

  for (const file of files) {
    const fullPath = path.join(texshelfDir, file)
    const content = await readFile(fullPath, 'utf8')
    let entries

    try {
      entries = JSON.parse(content)
    } catch (error) {
      errors.push(`${file}: invalid JSON: ${error.message}`)
      continue
    }

    if (!Array.isArray(entries)) {
      errors.push(`${file}: root value must be an array.`)
      continue
    }

    entries.forEach((entry, index) => validateEntry(entry, errors, ids, `${file}[${index}]`))
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
