import algebraFormulas from '../../TexShelf/formulas/algebra.json'
import calculusFormulas from '../../TexShelf/formulas/calculus.json'
import chemistryFormulas from '../../TexShelf/formulas/chemistry.json'
import physicsFormulas from '../../TexShelf/formulas/physics.json'

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

export const texShelfFormulas = [
  ...(algebraFormulas as TexShelfFormula[]),
  ...(calculusFormulas as TexShelfFormula[]),
  ...(physicsFormulas as TexShelfFormula[]),
  ...(chemistryFormulas as TexShelfFormula[]),
]

function formulasToTemplates(categories: string[]): LatexTemplate[] {
  return texShelfFormulas
    .filter((formula) => categories.includes(formula.category))
    .map((formula) => ({
      label: formula.title,
      description: [formula.subcategory, formula.description].filter(Boolean).join(' - '),
      prefix: formula.latex,
    }))
}

export const toolbarGroups: LatexGroup[] = [
  {
    name: 'Build',
    templates: [
      { label: 'xⁿ', description: 'Superscript', prefix: '^{', suffix: '}' },
      { label: 'xₙ', description: 'Subscript', prefix: '_{', suffix: '}' },
      { label: '√x', description: 'Square root', prefix: '\\sqrt{', suffix: '}' },
      { label: 'a⁄b', description: 'Fraction', prefix: '\\frac{', suffix: '}{}', tabStops: [6, 8] },
      { label: '∑', description: 'Sum', prefix: '\\sum_{', suffix: '}^{}', tabStops: [6, 9] },
      { label: '∏', description: 'Product', prefix: '\\prod_{', suffix: '}^{}', tabStops: [7, 10] },
      { label: '∫', description: 'Integral', prefix: '\\int_{', suffix: '}^{}', tabStops: [6, 9] },
      { label: 'lim', description: 'Limit', prefix: '\\lim_{x \\to 0} ' },
      { label: 'text', description: 'Text', prefix: '\\text{', suffix: '}' },
      { label: 'ℝ', description: 'Blackboard bold', prefix: '\\mathbb{', suffix: '}' },
      { label: '𝒜', description: 'Calligraphic', prefix: '\\mathcal{', suffix: '}' },
      { label: 'x⃗', description: 'Vector arrow', prefix: '\\vec{', suffix: '}' },
    ],
  },
  {
    name: 'Greek',
    templates: [
      { label: 'α', description: 'alpha', prefix: '\\alpha ' },
      { label: 'β', description: 'beta', prefix: '\\beta ' },
      { label: 'γ', description: 'gamma', prefix: '\\gamma ' },
      { label: 'δ', description: 'delta', prefix: '\\delta ' },
      { label: 'ε', description: 'epsilon', prefix: '\\epsilon ' },
      { label: 'ϵ', description: 'varepsilon', prefix: '\\varepsilon ' },
      { label: 'θ', description: 'theta', prefix: '\\theta ' },
      { label: 'ϑ', description: 'vartheta', prefix: '\\vartheta ' },
      { label: 'ξ', description: 'xi', prefix: '\\xi ' },
      { label: 'λ', description: 'lambda', prefix: '\\lambda ' },
      { label: 'μ', description: 'mu', prefix: '\\mu ' },
      { label: 'ν', description: 'nu', prefix: '\\nu ' },
      { label: 'π', description: 'pi', prefix: '\\pi ' },
      { label: 'ρ', description: 'rho', prefix: '\\rho ' },
      { label: 'σ', description: 'sigma', prefix: '\\sigma ' },
      { label: 'τ', description: 'tau', prefix: '\\tau ' },
      { label: 'φ', description: 'phi', prefix: '\\phi ' },
      { label: 'ψ', description: 'psi', prefix: '\\psi ' },
      { label: 'ω', description: 'omega', prefix: '\\omega ' },
      { label: 'Γ', description: 'Gamma', prefix: '\\Gamma ' },
      { label: 'Δ', description: 'Delta', prefix: '\\Delta ' },
      { label: 'Θ', description: 'Theta', prefix: '\\Theta ' },
      { label: 'Λ', description: 'Lambda', prefix: '\\Lambda ' },
      { label: 'Ξ', description: 'Xi', prefix: '\\Xi ' },
      { label: 'Π', description: 'Pi', prefix: '\\Pi ' },
      { label: 'Σ', description: 'Sigma', prefix: '\\Sigma ' },
      { label: 'Φ', description: 'Phi', prefix: '\\Phi ' },
      { label: 'Ψ', description: 'Psi', prefix: '\\Psi ' },
      { label: 'Ω', description: 'Omega', prefix: '\\Omega ' },
    ],
  },
  {
    name: 'Relations',
    templates: [
      { label: '±', description: 'plus-minus', prefix: '\\pm ' },
      { label: '×', description: 'times', prefix: '\\times ' },
      { label: '·', description: 'dot product', prefix: '\\cdot ' },
      { label: '∞', description: 'infinity', prefix: '\\infty ' },
      { label: '→', description: 'arrow', prefix: '\\to ' },
      { label: '⇒', description: 'implies', prefix: '\\implies ' },
      { label: '⇔', description: 'if and only if', prefix: '\\iff ' },
      { label: '≠', description: 'not equal', prefix: '\\neq ' },
      { label: '≈', description: 'approximately', prefix: '\\approx ' },
      { label: '≤', description: 'less than or equal', prefix: '\\leq ' },
      { label: '≥', description: 'greater than or equal', prefix: '\\geq ' },
      { label: '∈', description: 'in', prefix: '\\in ' },
      { label: '∉', description: 'not in', prefix: '\\notin ' },
      { label: '⊂', description: 'subset', prefix: '\\subset ' },
      { label: '⊊', description: 'proper subset', prefix: '\\subsetneq ' },
      { label: '∪', description: 'union', prefix: '\\cup ' },
      { label: '∩', description: 'intersection', prefix: '\\cap ' },
      { label: '⊄', description: 'not subset or equal', prefix: '\\nsubseteq ' },
      { label: '≡', description: 'equivalent', prefix: '\\equiv ' },
      { label: '≅', description: 'congruent', prefix: '\\cong ' },
      { label: '≃', description: 'asymptotically equal', prefix: '\\simeq ' },
      { label: '≪', description: 'much less than', prefix: '\\ll ' },
      { label: '≫', description: 'much greater than', prefix: '\\gg ' },
      { label: '∼', description: 'similar', prefix: '\\sim ' },
      { label: '∝', description: 'proportional to', prefix: '\\propto ' },
      { label: '∥', description: 'parallel', prefix: '\\parallel ' },
      { label: '⊥', description: 'perpendicular', prefix: '\\perp ' },
      { label: '∠', description: 'angle', prefix: '\\angle ' },
      { label: '∡', description: 'measured angle', prefix: '\\measuredangle ' },
    ],
  },
  {
    name: 'Arrows',
    templates: [
      { label: '←', description: 'left arrow', prefix: '\\leftarrow ' },
      { label: '→', description: 'right arrow', prefix: '\\rightarrow ' },
      { label: '↔', description: 'left right arrow', prefix: '\\leftrightarrow ' },
      { label: '⇐', description: 'Leftarrow', prefix: '\\Leftarrow ' },
      { label: '⇒', description: 'Rightarrow', prefix: '\\Rightarrow ' },
      { label: '⇔', description: 'Leftrightarrow', prefix: '\\Leftrightarrow ' },
      { label: '↦', description: 'mapsto', prefix: '\\mapsto ' },
      { label: '⟼', description: 'long mapsto', prefix: '\\longmapsto ' },
      { label: '⟶', description: 'long right arrow', prefix: '\\longrightarrow ' },
      { label: '↗', description: 'northeast arrow', prefix: '\\nearrow ' },
      { label: '↘', description: 'southeast arrow', prefix: '\\searrow ' },
      { label: '⇌', description: 'right left harpoons', prefix: '\\rightleftharpoons ' },
    ],
  },
  {
    name: 'Logic',
    templates: [
      { label: '∀', description: 'for all', prefix: '\\forall ' },
      { label: '∃', description: 'exists', prefix: '\\exists ' },
      { label: '∄', description: 'does not exist', prefix: '\\nexists ' },
      { label: '∅', description: 'empty set', prefix: '\\emptyset ' },
      { label: '∧', description: 'and', prefix: '\\wedge ' },
      { label: '∨', description: 'or', prefix: '\\vee ' },
      { label: '¬', description: 'not', prefix: '\\neg ' },
      { label: '⊢', description: 'proves', prefix: '\\vdash ' },
      { label: '⊨', description: 'models', prefix: '\\models ' },
      { label: '∴', description: 'therefore', prefix: '\\therefore ' },
      { label: '∵', description: 'because', prefix: '\\because ' },
      { label: '∖', description: 'set minus', prefix: '\\setminus ' },
    ],
  },
  {
    name: 'Sets',
    templates: [
      { label: 'ℕ', description: 'natural numbers', prefix: '\\mathbb{N} ' },
      { label: 'ℤ', description: 'integers', prefix: '\\mathbb{Z} ' },
      { label: 'ℚ', description: 'rational numbers', prefix: '\\mathbb{Q} ' },
      { label: 'ℝ', description: 'real numbers', prefix: '\\mathbb{R} ' },
      { label: 'ℂ', description: 'complex numbers', prefix: '\\mathbb{C} ' },
      { label: '⊆', description: 'subset or equal', prefix: '\\subseteq ' },
      { label: '⊇', description: 'superset or equal', prefix: '\\supseteq ' },
      { label: '⊄', description: 'not subset', prefix: '\\nsubseteq ' },
      { label: '∁', description: 'complement', prefix: '\\complement ' },
      { label: '∂A', description: 'boundary', prefix: '\\partial ' },
      { label: '⋃', description: 'big union', prefix: '\\bigcup_{', suffix: '}^{}', tabStops: [9, 12] },
      { label: '⋂', description: 'big intersection', prefix: '\\bigcap_{', suffix: '}^{}', tabStops: [9, 12] },
      { label: '⋁', description: 'big vee', prefix: '\\bigvee_{', suffix: '}^{}', tabStops: [9, 12] },
      { label: '⋀', description: 'big wedge', prefix: '\\bigwedge_{', suffix: '}^{}', tabStops: [11, 14] },
      { label: '⨿', description: 'big square union', prefix: '\\bigsqcup_{', suffix: '}^{}', tabStops: [11, 14] },
    ],
  },
  {
    name: 'Calculus',
    templates: [
      { label: 'd/dx', description: 'ordinary derivative', prefix: '\\frac{d}{dx} ' },
      { label: '∂/∂x', description: 'partial derivative', prefix: '\\frac{\\partial}{\\partial x} ' },
      { label: '∫ᵃᵇ', description: 'definite integral', prefix: '\\int_{a}^{b} ', tabStops: [6, 10] },
      { label: '∮', description: 'contour integral', prefix: '\\oint ' },
      { label: '∇', description: 'nabla', prefix: '\\nabla ' },
      { label: 'Δ', description: 'laplacian', prefix: '\\Delta ' },
      { label: 'limsup', description: 'limit superior', prefix: '\\limsup ' },
      { label: 'liminf', description: 'limit inferior', prefix: '\\liminf ' },
      { label: '′', description: 'prime', prefix: '\\prime ' },
      { label: '∞', description: 'infinity', prefix: '\\infty ' },
      { label: 'binom', description: 'binomial coefficient', prefix: '\\binom{', suffix: '}{}', tabStops: [7, 9] },
      { label: 'over', description: 'overset', prefix: '\\overset{', suffix: '}{}', tabStops: [9, 11] },
      { label: 'under', description: 'underset', prefix: '\\underset{', suffix: '}{}', tabStops: [10, 12] },
      { label: 'display', description: 'display style', prefix: '\\displaystyle ' },
    ],
  },
  {
    name: 'Brackets',
    templates: [
      { label: '( )', description: 'parentheses', prefix: '\\left( ', suffix: ' \\right)' },
      { label: '[ ]', description: 'brackets', prefix: '\\left[ ', suffix: ' \\right]' },
      { label: '{ }', description: 'braces', prefix: '\\left\\{ ', suffix: ' \\right\\}' },
      { label: '| |', description: 'absolute bars', prefix: '\\left| ', suffix: ' \\right|' },
      { label: '‖ ‖', description: 'norm bars', prefix: '\\left\\| ', suffix: ' \\right\\|' },
      { label: '⌊ ⌋', description: 'floor', prefix: '\\left\\lfloor ', suffix: ' \\right\\rfloor' },
      { label: '⌈ ⌉', description: 'ceil', prefix: '\\left\\lceil ', suffix: ' \\right\\rceil' },
      { label: '⟨ ⟩', description: 'angle brackets', prefix: '\\left\\langle ', suffix: ' \\right\\rangle' },
      { label: '{.', description: 'left brace only', prefix: '\\left\\{ ', suffix: ' \\right.' },
      { label: '.}', description: 'right brace only', prefix: '\\left. ', suffix: ' \\right\\}' },
    ],
  },
  {
    name: 'Accents',
    templates: [
      { label: 'x̂', description: 'hat', prefix: '\\hat{', suffix: '}' },
      { label: 'x̃', description: 'tilde', prefix: '\\tilde{', suffix: '}' },
      { label: 'x̄', description: 'bar', prefix: '\\bar{', suffix: '}' },
      { label: 'ẍ', description: 'ddot', prefix: '\\ddot{', suffix: '}' },
      { label: 'x⃗', description: 'overrightarrow', prefix: '\\overrightarrow{', suffix: '}' },
      { label: 'x̅', description: 'overline', prefix: '\\overline{', suffix: '}' },
      { label: 'x̲', description: 'underline', prefix: '\\underline{', suffix: '}' },
      { label: '⏞', description: 'overbrace', prefix: '\\overbrace{', suffix: '}^{}', tabStops: [11, 14] },
      { label: '⏟', description: 'underbrace', prefix: '\\underbrace{', suffix: '}_{ }', tabStops: [12, 15] },
    ],
  },
  {
    name: 'Physics',
    templates: [
      { label: '(x)', description: 'physics quantity', prefix: '\\qty(', suffix: ')' },
      { label: '|x|', description: 'absolute value', prefix: '\\abs{', suffix: '}' },
      { label: 'd⁄dx', description: 'derivative', prefix: '\\dv{', suffix: '}{x}', tabStops: [4, 6] },
      {
        label: '∂⁄∂x',
        description: 'partial derivative',
        prefix: '\\pdv{',
        suffix: '}{x}',
        tabStops: [5, 7],
      },
      { label: '⟨ψ|', description: 'bra', prefix: '\\bra{', suffix: '}' },
      { label: '|ψ⟩', description: 'ket', prefix: '\\ket{', suffix: '}' },
      { label: '⟨ψ|φ⟩', description: 'braket', prefix: '\\braket{', suffix: '}' },
      { label: '𝐯', description: 'bold vector', prefix: '\\vb{', suffix: '}' },
      { label: '∇', description: 'gradient', prefix: '\\grad ' },
      { label: '∇×', description: 'curl', prefix: '\\curl ' },
      { label: 'H₂O', description: 'chemical equation', prefix: '\\ce{', suffix: '}' },
      { label: 'x̸', description: 'cancel', prefix: '\\cancel{', suffix: '}' },
      { label: '⊕', description: 'direct sum', prefix: '\\oplus ' },
      { label: '⊗', description: 'tensor product', prefix: '\\otimes ' },
      { label: '∐', description: 'coproduct', prefix: '\\coprod_{', suffix: '}^{}', tabStops: [9, 12] },
      { label: '△', description: 'big triangle up', prefix: '\\bigtriangleup ' },
      { label: '▽', description: 'big triangle down', prefix: '\\bigtriangledown ' },
      { label: '◯', description: 'big circle', prefix: '\\bigcirc ' },
      { label: '◁', description: 'triangle left', prefix: '\\triangleleft ' },
      { label: '▷', description: 'triangle right', prefix: '\\triangleright ' },
      { label: '□', description: 'square', prefix: '\\square ' },
    ],
  },
]

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
