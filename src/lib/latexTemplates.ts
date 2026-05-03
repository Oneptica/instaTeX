import toolbarGroupsData from './toolbarGroups.json'
export type LatexTemplate = {
  label: string
  description?: string
  prefix: string
  suffix?: string
  tabStops?: number[]
  wrap?: boolean
  swatch?: string
}

export type LatexGroup = {
  name: string
  templates: LatexTemplate[]
}

export type TexShelfFormula = {
  id: string
  title: string
  category: string
  subcategory?: string
  latex: string
  description?: string
  tags: string[]
  source?: string
}

const texShelfFormulaModules = import.meta.glob('../../TexShelf/formulas/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, TexShelfFormula[]>

export const texShelfFormulas = Object.entries(texShelfFormulaModules)
  .sort(([left], [right]) => left.localeCompare(right))
  .flatMap(([, formulas]) => formulas)

function formulasToTemplates(categories: string[]): LatexTemplate[] {
  return texShelfFormulas
    .filter((formula) => categories.includes(formula.category))
    .map((formula) => ({
      label: formula.title,
      description: [formula.subcategory, formula.description].filter(Boolean).join(' - '),
      prefix: formula.latex,
    }))
}

export const toolbarGroups = toolbarGroupsData as LatexGroup[]

export const functionTemplates: LatexTemplate[] = [
  { label: 'ln', prefix: '\\ln ' },
  { label: 'log', prefix: '\\log ' },
  { label: 'exp', prefix: '\\exp ' },
  { label: 'sin', prefix: '\\sin ' },
  { label: 'cos', prefix: '\\cos ' },
  { label: 'tan', prefix: '\\tan ' },
  { label: 'arcsin', prefix: '\\arcsin ' },
  { label: 'arccos', prefix: '\\arccos ' },
  { label: 'arctan', prefix: '\\arctan ' },
  { label: 'det', prefix: '\\det ' },
  { label: 'dim', prefix: '\\dim ' },
  { label: 'ker', prefix: '\\ker ' },
]

export const colorTemplates: LatexTemplate[] = [
  { label: 'Red', prefix: '\\color{Red} ', swatch: '#d1242f' },
  { label: 'Green', prefix: '\\color{Green} ', swatch: '#1a7f37' },
  { label: 'Blue', prefix: '\\color{Blue} ', swatch: '#0969da' },
  { label: 'DarkRed', prefix: '\\color{DarkRed} ', swatch: '#86181d' },
  { label: 'DarkGreen', prefix: '\\color{DarkGreen} ', swatch: '#0f5323' },
  { label: 'DarkBlue', prefix: '\\color{DarkBlue} ', swatch: '#033d8b' },
  { label: 'Yellow', prefix: '\\color{Yellow} ', swatch: '#bf8700' },
  { label: 'Cyan', prefix: '\\color{Cyan} ', swatch: '#1b7c83' },
  { label: 'Magenta', prefix: '\\color{Magenta} ', swatch: '#bf3989' },
  { label: 'Brown', prefix: '\\color{Brown} ', swatch: '#7d4e1d' },
  { label: 'Teal', prefix: '\\color{Teal} ', swatch: '#0a7d83' },
  { label: 'Purple', prefix: '\\color{Purple} ', swatch: '#8250df' },
  { label: 'Orange', prefix: '\\color{Orange} ', swatch: '#bc4c00' },
  { label: 'Emerald', prefix: '\\color{Emerald} ', swatch: '#2da44e' },
  { label: 'Orchid', prefix: '\\color{Orchid} ', swatch: '#a475f9' },
  { label: 'Golden', prefix: '\\color{Goldenrod} ', swatch: '#9a6700' },
  { label: 'Pink', prefix: '\\color{Pink} ', swatch: '#ff80c8' },
]

export const backgroundTemplates: LatexTemplate[] = [
  { label: 'Yellow highlight', prefix: '\\bbox[yellow]{', suffix: '}', swatch: '#fff8c5' },
  { label: 'Blue highlight', prefix: '\\bbox[lightblue]{', suffix: '}', swatch: '#ddf4ff' },
  { label: 'Green highlight', prefix: '\\bbox[lightgreen]{', suffix: '}', swatch: '#dafbe1' },
  { label: 'Pink highlight', prefix: '\\bbox[pink]{', suffix: '}', swatch: '#ffeff7' },
  { label: 'Gray box', prefix: '\\bbox[#f2f2f2]{', suffix: '}', swatch: '#f2f2f2' },
  { label: 'Padded box', prefix: '\\bbox[6px]{', suffix: '}' },
  { label: 'Border box', prefix: '\\bbox[5px,border:1px solid #999]{', suffix: '}' },
]

export const sizeTemplates: LatexTemplate[] = [
  { label: 'Huge', prefix: '\\Huge ' },
  { label: 'huge', prefix: '\\huge ' },
  { label: 'Large', prefix: '\\Large ' },
  { label: 'large', prefix: '\\large ' },
  { label: 'normal', prefix: '\\normalsize ' },
  { label: 'small', prefix: '\\small ' },
  { label: 'tiny', prefix: '\\tiny ' },
]

export const exampleTemplates = formulasToTemplates([
  'Algebra',
  'Calculus',
  'Linear Algebra',
  'Probability',
])

export const scienceTemplates = formulasToTemplates(['Physics', 'Chemistry'])

export const pairedCharacters: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
}
