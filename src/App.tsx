import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type UIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type MathJaxFont,
  type RenderOptions,
  mathJaxFonts,
  renderLatexToSvg,
} from './lib/mathjax'
import {
  type LatexTemplate,
  type TexShelfFormula,
  backgroundTemplates,
  colorTemplates,
  exampleTemplates,
  functionTemplates,
  pairedCharacters,
  scienceTemplates,
  sizeTemplates,
  texShelfFormulas,
  toolbarGroups,
} from './lib/latexTemplates'
import './App.css'

const starterLatex = String.raw`%
% Enter TeX commands below
%
x = {-b \pm \sqrt{b^2-4ac} \over 2a}.`

const historyStorageKey = 'latexgo.history'
const favoritesStorageKey = 'latexgo.favorites'

type ExportBackground = 'transparent' | 'white' | 'black' | 'custom'
type ExportFormat = 'svg' | 'png'
type ExportSnippet = 'latex' | 'svg' | 'data-url' | 'html' | 'markdown' | 'mathjax'
type AppPage = 'editor' | 'texshelf'

type HighlightToken = {
  kind: string
  text: string
}

type AutocompleteItem = {
  label: string
  value: string
  description: string
  tabStops?: number[]
}

type SearchableTemplate = LatexTemplate & {
  group: string
}

type ExportPreset = {
  label: string
  background: ExportBackground
  format: ExportFormat
  scale: number
  dpi: number
  snippet: ExportSnippet
  inline: boolean
}

function getInitialPage(): AppPage {
  return window.location.pathname.endsWith('/texshelf') ? 'texshelf' : 'editor'
}

const autocompleteItems: AutocompleteItem[] = [
  { label: '\\frac', value: '\\frac{}{}', description: 'Fraction', tabStops: [6, 8] },
  { label: '\\sqrt', value: '\\sqrt{}', description: 'Square root', tabStops: [6] },
  { label: '\\sum', value: '\\sum_{}^{} ', description: 'Sum', tabStops: [6, 9] },
  { label: '\\prod', value: '\\prod_{}^{} ', description: 'Product', tabStops: [7, 10] },
  { label: '\\int', value: '\\int_{}^{} ', description: 'Integral', tabStops: [6, 9] },
  { label: '\\lim', value: '\\lim_{x \\to 0} ', description: 'Limit', tabStops: [6] },
  { label: '\\begin{aligned}', value: '\\begin{aligned}\n  &= \\\\\n  &= \n\\end{aligned}', description: 'Aligned equations', tabStops: [18, 27, 35] },
  { label: '\\begin{matrix}', value: '\\begin{matrix}\n & \\\\\n & \n\\end{matrix}', description: 'Matrix', tabStops: [15, 17, 22, 24] },
  { label: '\\ce', value: '\\ce{}', description: 'Chemistry', tabStops: [4] },
  { label: '\\dv', value: '\\dv{}{x}', description: 'Derivative', tabStops: [4, 6] },
  { label: '\\pdv', value: '\\pdv{}{x}', description: 'Partial derivative', tabStops: [5, 7] },
  { label: '\\color', value: '\\color{} ', description: 'Text color', tabStops: [7] },
  { label: '\\bbox', value: '\\bbox[yellow]{}', description: 'Background box', tabStops: [14] },
  ...toolbarGroups.flatMap((group) =>
    group.templates
      .filter((template) => template.prefix.startsWith('\\'))
      .map((template) => ({
        label: template.prefix.trim(),
        value: `${template.prefix}${template.suffix ?? ''}`,
        description: template.description ?? group.name,
        tabStops: template.tabStops,
      })),
  ),
]

const exportBackgrounds: { label: string; value: ExportBackground }[] = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'White', value: 'white' },
  { label: 'Black', value: 'black' },
  { label: 'Custom', value: 'custom' },
]

const exportPresets: ExportPreset[] = [
  {
    label: 'Transparent SVG',
    background: 'transparent',
    format: 'svg',
    scale: 1,
    dpi: 96,
    snippet: 'svg',
    inline: true,
  },
  {
    label: 'White PNG 2x',
    background: 'white',
    format: 'png',
    scale: 2,
    dpi: 192,
    snippet: 'html',
    inline: true,
  },
  {
    label: 'Markdown',
    background: 'transparent',
    format: 'svg',
    scale: 1,
    dpi: 96,
    snippet: 'markdown',
    inline: true,
  },
  {
    label: 'HTML Block',
    background: 'white',
    format: 'svg',
    scale: 1,
    dpi: 96,
    snippet: 'html',
    inline: false,
  },
]

const templateGroups = [
  { name: 'Functions', templates: functionTemplates },
]

const inputOptionGroups = [
  { name: 'Color', templates: colorTemplates },
  { name: 'TeX size', templates: sizeTemplates },
  { name: 'Background', templates: backgroundTemplates },
]

function TemplateButtonLabel({ template }: { template: LatexTemplate }) {
  return (
    <>
      {template.swatch ? (
        <span
          className="template-swatch"
          style={{ backgroundColor: template.swatch }}
          aria-hidden="true"
        />
      ) : null}
      <span>{template.label}</span>
    </>
  )
}

const texShelfPreviewOptions: RenderOptions = {
  allowHtml: false,
  display: true,
  font: 'mathjax-newcm',
  mathmlSpacing: false,
}

let texShelfPreviewQueue = Promise.resolve()

function TexShelfFormulaCard({
  formula,
  onUse,
}: {
  formula: TexShelfFormula
  onUse: (formula: TexShelfFormula) => void
}) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewError, setPreviewError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    const renderPreview = texShelfPreviewQueue.then(async () => {
      if (!previewRef.current) return

      try {
        setPreviewError('')
        await renderLatexToSvg(formula.latex, previewRef.current, texShelfPreviewOptions)
      } catch (error) {
        if (cancelled) return

        previewRef.current.innerHTML = ''
        setPreviewError(error instanceof Error ? error.message : 'Preview failed.')
      }
    })

    texShelfPreviewQueue = renderPreview.catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [formula.latex])

  async function copyFormulaCode() {
    try {
      await navigator.clipboard.writeText(formula.latex)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="texshelf-card">
      <div className="texshelf-card-main">
        <div>
          <h3>{formula.title}</h3>
        </div>
      </div>
      {formula.description ? <p>{formula.description}</p> : null}
      <div className="texshelf-preview" ref={previewRef} aria-label={`${formula.title} preview`}>
        {previewError ? <span>{previewError}</span> : null}
      </div>
      <div className="texshelf-code-row">
        <code>{formula.latex}</code>
        <div className="texshelf-card-actions">
          <button type="button" className="secondary-button" onClick={copyFormulaCode}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" onClick={() => onUse(formula)}>
            Use in LaTeXgO
          </button>
        </div>
      </div>
    </article>
  )
}

function readStoredStringArray(key: string, fallback: string[]) {
  try {
    const storedValue = window.localStorage.getItem(key)

    if (!storedValue) return fallback

    const parsedValue = JSON.parse(storedValue)

    if (!Array.isArray(parsedValue)) return fallback

    const values = parsedValue.filter((value): value is string => typeof value === 'string')

    return values.length > 0 ? values : fallback
  } catch {
    return fallback
  }
}

function writeStoredStringArray(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can fail in private or locked-down browser contexts.
  }
}

function tokenizeLatex(input: string): HighlightToken[] {
  const tokens: HighlightToken[] = []
  let index = 0

  while (index < input.length) {
    const rest = input.slice(index)
    const command = rest.match(/^\\[a-zA-Z]+|^\\./)
    const number = rest.match(/^\d+(?:\.\d+)?/)
    const word = rest.match(/^[a-zA-Z]+/)

    if (rest[0] === '%') {
      const nextLine = rest.indexOf('\n')
      const text = nextLine === -1 ? rest : rest.slice(0, nextLine)

      tokens.push({ kind: 'comment', text })
      index += text.length
    } else if (command) {
      tokens.push({ kind: 'command', text: command[0] })
      index += command[0].length
    } else if (number) {
      tokens.push({ kind: 'number', text: number[0] })
      index += number[0].length
    } else if ('{}[]()'.includes(rest[0])) {
      tokens.push({ kind: 'bracket', text: rest[0] })
      index += 1
    } else if ('_^&=+-*/<>|,'.includes(rest[0])) {
      tokens.push({ kind: 'operator', text: rest[0] })
      index += 1
    } else if (word) {
      tokens.push({ kind: 'word', text: word[0] })
      index += word[0].length
    } else {
      tokens.push({ kind: 'plain', text: rest[0] })
      index += 1
    }
  }

  return tokens
}

function getAutocompleteQuery(input: string, cursor: number) {
  const beforeCursor = input.slice(0, cursor)
  const match = beforeCursor.match(/\\[a-zA-Z]*$/)

  if (!match) return null

  return {
    query: match[0],
    start: cursor - match[0].length,
  }
}

function getExportBackgroundColor(background: ExportBackground, customColor: string) {
  if (background === 'white') return '#ffffff'
  if (background === 'black') return '#000000'
  if (background === 'custom') return customColor || '#ffffff'

  return ''
}

function getExportInkColor(background: ExportBackground) {
  return background === 'black' ? '#ffffff' : '#1d1d1f'
}

function buildExportSvg(markup: string, background: ExportBackground, customColor: string) {
  if (!markup.trim()) return ''

  const parser = new DOMParser()
  const document = parser.parseFromString(markup, 'image/svg+xml')
  const svg = document.querySelector('svg')

  if (!svg) return markup

  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('color', getExportInkColor(background))

  const existingBackground = svg.querySelector('[data-latexgo-background="true"]')
  existingBackground?.remove()

  const backgroundColor = getExportBackgroundColor(background, customColor)

  if (backgroundColor) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')

    rect.setAttribute('data-latexgo-background', 'true')
    rect.setAttribute('x', '0')
    rect.setAttribute('y', '0')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', backgroundColor)
    svg.insertBefore(rect, svg.firstChild)
  }

  return new XMLSerializer().serializeToString(svg)
}

function makeDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function tableTextToLatex(text: string, matrixType: string) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean))

  if (rows.length === 0 || !rows.some((row) => row.length > 1)) return ''

  const width = Math.max(...rows.map((row) => row.length))
  const body = rows
    .map((row) =>
      Array.from({ length: width }, (_, index) => row[index] || '').join(' & '),
    )
    .join(' \\\\\n')

  return `\\begin{${matrixType}}\n${body}\n\\end{${matrixType}}`
}

function getNavigationStops(input: string) {
  const stops = new Set<number>()

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]

    if ('{[('.includes(character)) stops.add(index + 1)
    if ('}])'.includes(character)) stops.add(index)
    if (character === '&') stops.add(Math.min(input.length, index + 2))
    if (character === '\\' && input[index + 1] === '\\') {
      stops.add(Math.min(input.length, index + 3))
    }
  }

  return [...stops].sort((a, b) => a - b)
}

function App() {
  const initialHistory = useMemo(() => readStoredStringArray(historyStorageKey, [starterLatex]), [])
  const [currentPage, setCurrentPage] = useState<AppPage>(() => getInitialPage())
  const [latex, setLatex] = useState(initialHistory[initialHistory.length - 1] ?? starterLatex)
  const [display, setDisplay] = useState(true)
  const [allowHtml, setAllowHtml] = useState(false)
  const [mathmlSpacing, setMathmlSpacing] = useState(false)
  const [font, setFont] = useState<MathJaxFont>('mathjax-newcm')
  const [previewSize, setPreviewSize] = useState(20)
  const [matrixType, setMatrixType] = useState('pmatrix')
  const [matrixRows, setMatrixRows] = useState(2)
  const [matrixColumns, setMatrixColumns] = useState(2)
  const [matrixPicker, setMatrixPicker] = useState({ rows: 2, columns: 2 })
  const [svgMarkup, setSvgMarkup] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [isRendering, setIsRendering] = useState(true)
  const [canUndo, setCanUndo] = useState(initialHistory.length > 1)
  const [canRedo, setCanRedo] = useState(false)
  const [historySnapshot, setHistorySnapshot] = useState(initialHistory)
  const [historyIndex, setHistoryIndex] = useState(initialHistory.length - 1)
  const [favorites, setFavorites] = useState(() => readStoredStringArray(favoritesStorageKey, []))
  const [cursorPosition, setCursorPosition] = useState(0)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [templateSearch, setTemplateSearch] = useState('')
  const [texShelfSearch, setTexShelfSearch] = useState('')
  const [texShelfCategory, setTexShelfCategory] = useState('All')
  const [exportBackground, setExportBackground] = useState<ExportBackground>('transparent')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('svg')
  const [customBackground, setCustomBackground] = useState('#f5f5f7')
  const [pngScale, setPngScale] = useState(2)
  const [exportDpi, setExportDpi] = useState(192)
  const [exportInline, setExportInline] = useState(true)
  const [snippetType, setSnippetType] = useState<ExportSnippet>('html')
  const [fileName, setFileName] = useState('latexgo-formula')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const syntaxRef = useRef<HTMLPreElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)
  const historyRef = useRef(initialHistory)
  const historyIndexRef = useRef(initialHistory.length - 1)
  const tabStopsRef = useRef<number[]>([])
  const tabStopIndexRef = useRef(0)

  const renderOptions = useMemo<RenderOptions>(
    () => ({ allowHtml, display, font, mathmlSpacing }),
    [allowHtml, display, font, mathmlSpacing],
  )
  const canExport = svgMarkup.trim().length > 0 && !error && !isRendering
  const exportSvgMarkup = useMemo(
    () => buildExportSvg(svgMarkup, exportBackground, customBackground),
    [customBackground, exportBackground, svgMarkup],
  )
  const svgDataUrl = useMemo(() => (exportSvgMarkup ? makeDataUrl(exportSvgMarkup) : ''), [
    exportSvgMarkup,
  ])
  const historyItems = useMemo(
    () =>
      historySnapshot.map((item, index) => ({
        label: `${index + 1}. ${item.split('\n').find((line) => line.trim())?.trim() || 'Empty'}`,
        value: index,
      })),
    [historySnapshot],
  )
  const allSearchableTemplates = useMemo<SearchableTemplate[]>(
    () => [
      ...toolbarGroups.flatMap((group) =>
        group.templates.map((template) => ({ ...template, group: group.name })),
      ),
      ...functionTemplates.map((template) => ({ ...template, group: 'Functions' })),
      ...colorTemplates.map((template) => ({ ...template, group: 'Color' })),
      ...sizeTemplates.map((template) => ({ ...template, group: 'TeX size' })),
      ...backgroundTemplates.map((template) => ({ ...template, group: 'Background' })),
      ...exampleTemplates.map((template) => ({ ...template, group: 'TeXShelf' })),
      ...scienceTemplates.map((template) => ({ ...template, group: 'Science' })),
    ],
    [],
  )
  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase()

    if (!query) return []

    return allSearchableTemplates
      .filter((template) => {
        const haystack = [
          template.group,
          template.label,
          template.description,
          template.prefix,
          template.suffix,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
      .slice(0, 24)
  }, [allSearchableTemplates, templateSearch])
  const texShelfCategories = useMemo(
    () => ['All', ...Array.from(new Set(texShelfFormulas.map((formula) => formula.category))).sort()],
    [],
  )
  const filteredTexShelfFormulas = useMemo(() => {
    const query = texShelfSearch.trim().toLowerCase()

    return texShelfFormulas.filter((formula) => {
      const matchesCategory =
        texShelfCategory === 'All' || formula.category === texShelfCategory

      if (!matchesCategory) return false
      if (!query) return true

      const haystack = [
        formula.title,
        formula.category,
        formula.subcategory,
        formula.description,
        formula.latex,
        formula.level,
        ...formula.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [texShelfCategory, texShelfSearch])
  const favoriteItems = useMemo(
    () =>
      favorites.map((item, index) => ({
        label: `${index + 1}. ${item.split('\n').find((line) => line.trim())?.trim() || 'Empty'}`,
        value: index,
      })),
    [favorites],
  )
  const isFavorite = favorites.includes(latex)
  const highlightedTokens = useMemo(() => tokenizeLatex(latex), [latex])
  const autocompleteQuery = useMemo(
    () => getAutocompleteQuery(latex, cursorPosition),
    [cursorPosition, latex],
  )
  const autocompleteSuggestions = useMemo(() => {
    if (!autocompleteQuery) return []

    const query = autocompleteQuery.query.toLowerCase()
    const seen = new Set<string>()

    return autocompleteItems
      .filter((item) => item.label.toLowerCase().startsWith(query))
      .filter((item) => {
        if (seen.has(item.label)) return false
        seen.add(item.label)
        return true
      })
      .slice(0, 8)
  }, [autocompleteQuery])
  const exportSnippet = useMemo(() => {
    const blockStart = exportInline ? '' : '<p>'
    const blockEnd = exportInline ? '' : '</p>'

    if (snippetType === 'latex') return latex
    if (snippetType === 'svg') return exportSvgMarkup
    if (snippetType === 'data-url') return svgDataUrl
    if (snippetType === 'markdown') return `![formula](${svgDataUrl})`
    if (snippetType === 'mathjax') return exportInline ? `\\(${latex}\\)` : `\\[\n${latex}\n\\]`

    return `${blockStart}<img src="${svgDataUrl}" alt="LaTeX formula">${blockEnd}`
  }, [exportInline, exportSvgMarkup, latex, snippetType, svgDataUrl])

  function navigateTo(page: AppPage) {
    const path = page === 'texshelf' ? '/texshelf' : '/'

    window.history.pushState({}, '', path)
    setCurrentPage(page)
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentPage(getInitialPage())
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function syncHistoryState() {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
    setHistorySnapshot([...historyRef.current])
    setHistoryIndex(historyIndexRef.current)
    writeStoredStringArray(historyStorageKey, historyRef.current)
  }

  function pushHistory(nextLatex: string) {
    const current = historyRef.current[historyIndexRef.current]

    if (nextLatex === current) return

    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(nextLatex)

    if (historyRef.current.length > 60) {
      historyRef.current.shift()
    }

    historyIndexRef.current = historyRef.current.length - 1
    syncHistoryState()
  }

  function focusEditor(selectionStart?: number, selectionEnd = selectionStart) {
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()

      if (selectionStart !== undefined && selectionEnd !== undefined) {
        textareaRef.current?.setSelectionRange(selectionStart, selectionEnd)
        setCursorPosition(selectionStart)
      }
    })
  }

  function updateLatex(
    nextLatex: string,
    selectionStart?: number,
    selectionEnd = selectionStart,
    tabStops: number[] = [],
  ) {
    setLatex(nextLatex)
    pushHistory(nextLatex)
    tabStopsRef.current = tabStops
    tabStopIndexRef.current = tabStops.length > 0 ? 0 : -1
    focusEditor(selectionStart, selectionEnd)
  }

  function undoLatex() {
    if (historyIndexRef.current <= 0) return

    historyIndexRef.current -= 1
    setLatex(historyRef.current[historyIndexRef.current])
    tabStopsRef.current = []
    tabStopIndexRef.current = -1
    syncHistoryState()
    focusEditor()
  }

  function redoLatex() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return

    historyIndexRef.current += 1
    setLatex(historyRef.current[historyIndexRef.current])
    tabStopsRef.current = []
    tabStopIndexRef.current = -1
    syncHistoryState()
    focusEditor()
  }

  function restoreHistory(index: number) {
    if (!historyRef.current[index]) return

    historyIndexRef.current = index
    setLatex(historyRef.current[index])
    tabStopsRef.current = []
    tabStopIndexRef.current = -1
    syncHistoryState()
    focusEditor()
  }

  function clearHistory() {
    historyRef.current = [latex]
    historyIndexRef.current = 0
    syncHistoryState()
  }

  function saveFavorite() {
    const trimmedLatex = latex.trim()

    if (!trimmedLatex || favorites.includes(latex)) return

    setFavorites((currentFavorites) => {
      const nextFavorites = [latex, ...currentFavorites].slice(0, 40)

      writeStoredStringArray(favoritesStorageKey, nextFavorites)
      return nextFavorites
    })
  }

  function removeCurrentFavorite() {
    setFavorites((currentFavorites) => {
      const nextFavorites = currentFavorites.filter((favorite) => favorite !== latex)

      writeStoredStringArray(favoritesStorageKey, nextFavorites)
      return nextFavorites
    })
  }

  function restoreFavorite(index: number) {
    const favorite = favorites[index]

    if (!favorite) return

    updateLatex(favorite)
  }

  function clearFavorites() {
    setFavorites([])
    writeStoredStringArray(favoritesStorageKey, [])
  }

  function insertTemplate(template: LatexTemplate) {
    const editor = textareaRef.current
    const selectionStart = editor?.selectionStart ?? latex.length
    const selectionEnd = editor?.selectionEnd ?? latex.length
    const selectedText = latex.slice(selectionStart, selectionEnd)
    const suffix = template.suffix ?? ''
    const nextLatex =
      latex.slice(0, selectionStart) +
      template.prefix +
      selectedText +
      suffix +
      latex.slice(selectionEnd)
    const tabStops =
      template.tabStops?.map((tabStop) => selectionStart + tabStop + selectedText.length) ?? []
    const cursorPosition =
      tabStops[0] ?? selectionStart + template.prefix.length + selectedText.length

    updateLatex(nextLatex, cursorPosition, cursorPosition, tabStops)
  }

  function insertTexShelfFormula(formula: TexShelfFormula) {
    if (currentPage === 'texshelf') {
      navigateTo('editor')
      updateLatex(formula.latex, formula.latex.length)
      return
    }

    insertTemplate({
      label: formula.title,
      description: formula.description,
      prefix: formula.latex,
    })
  }

  function handleSearchTemplateClick(event: MouseEvent<HTMLButtonElement>) {
    const template = filteredTemplates[Number(event.currentTarget.dataset.templateIndex)]

    if (template) {
      insertTemplate(template)
    }
  }

  function closeMenuFromClick(event: MouseEvent<HTMLElement>) {
    const menu = event.currentTarget.closest('details')

    if (menu) {
      menu.open = false
    }
  }

  function insertMenuTemplate(template: LatexTemplate, event: MouseEvent<HTMLButtonElement>) {
    insertTemplate(template)
    closeMenuFromClick(event)
  }

  function insertMenuMatrix(event: MouseEvent<HTMLButtonElement>) {
    insertMatrix()
    closeMenuFromClick(event)
  }

  function insertMenuMatrixWithSize(
    rows: number,
    columns: number,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    insertMatrixWithSize(rows, columns)
    closeMenuFromClick(event)
  }

  function handleLatexChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextLatex = event.target.value

    setCursorPosition(event.target.selectionStart)
    setActiveSuggestionIndex(0)

    if (tabStopsRef.current.length > 0) {
      const activeTabStop = tabStopIndexRef.current
      const nextCursorPosition = event.target.selectionStart
      const lengthDelta = nextLatex.length - latex.length

      tabStopsRef.current = tabStopsRef.current.map((tabStop, index) => {
        if (index < activeTabStop) return tabStop
        if (index === activeTabStop) return nextCursorPosition
        return tabStop + lengthDelta
      })

      setLatex(nextLatex)
      pushHistory(nextLatex)
      return
    }

    updateLatex(nextLatex)
  }

  function handleEditorScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (!syntaxRef.current) return

    syntaxRef.current.scrollTop = event.currentTarget.scrollTop
    syntaxRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  function handleEditorSelect(event: UIEvent<HTMLTextAreaElement>) {
    setCursorPosition(event.currentTarget.selectionStart)
  }

  function acceptSuggestion(suggestion: AutocompleteItem) {
    if (!autocompleteQuery) return

    const nextLatex =
      latex.slice(0, autocompleteQuery.start) + suggestion.value + latex.slice(cursorPosition)
    const tabStops = suggestion.tabStops?.map((tabStop) => autocompleteQuery.start + tabStop) ?? []
    const nextCursor = tabStops[0] ?? autocompleteQuery.start + suggestion.value.length

    setActiveSuggestionIndex(0)
    updateLatex(nextLatex, nextCursor, nextCursor, tabStops)
  }

  function jumpToStructure(direction: 'left' | 'right') {
    const editor = textareaRef.current

    if (!editor) return false

    const stops = getNavigationStops(latex)
    const current = editor.selectionStart
    const nextStop =
      direction === 'right'
        ? stops.find((stop) => stop > current)
        : [...stops].reverse().find((stop) => stop < current)

    if (nextStop === undefined) return false

    focusEditor(nextStop)
    return true
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const key = event.key.toLowerCase()

    if (autocompleteSuggestions.length > 0) {
      if (key === 'arrowdown') {
        event.preventDefault()
        setActiveSuggestionIndex((index) => Math.min(index + 1, autocompleteSuggestions.length - 1))
        return
      }

      if (key === 'arrowup') {
        event.preventDefault()
        setActiveSuggestionIndex((index) => Math.max(index - 1, 0))
        return
      }

      if (key === 'enter') {
        event.preventDefault()
        acceptSuggestion(autocompleteSuggestions[activeSuggestionIndex])
        return
      }
    }

    if ((event.ctrlKey || event.metaKey) && key === 'arrowright') {
      if (jumpToStructure('right')) event.preventDefault()
      return
    }

    if ((event.ctrlKey || event.metaKey) && key === 'arrowleft') {
      if (jumpToStructure('left')) event.preventDefault()
      return
    }

    if (key === 'tab' && tabStopsRef.current.length > 0) {
      event.preventDefault()

      const nextIndex =
        event.shiftKey && tabStopIndexRef.current > 0
          ? tabStopIndexRef.current - 1
          : Math.min(tabStopIndexRef.current + 1, tabStopsRef.current.length - 1)

      tabStopIndexRef.current = nextIndex
      focusEditor(tabStopsRef.current[nextIndex])
      return
    }

    if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
      event.preventDefault()
      undoLatex()
      return
    }

    if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault()
      redoLatex()
      return
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return

    const closingCharacter = pairedCharacters[event.key]

    if (!closingCharacter) return

    event.preventDefault()

    const editor = event.currentTarget
    const selectionStart = editor.selectionStart
    const selectionEnd = editor.selectionEnd
    const selectedText = latex.slice(selectionStart, selectionEnd)
    const nextLatex =
      latex.slice(0, selectionStart) +
      event.key +
      selectedText +
      closingCharacter +
      latex.slice(selectionEnd)
    const cursorPosition = selectionStart + event.key.length + selectedText.length

    updateLatex(nextLatex, cursorPosition)
  }

  function handleEditorPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const text = event.clipboardData.getData('text/plain')
    const matrix = tableTextToLatex(text, matrixType)

    if (!matrix) return

    event.preventDefault()
    insertTemplate({ label: 'Pasted table', prefix: matrix })
  }

  async function renderFormula(nextOptions = renderOptions) {
    if (!outputRef.current) return

    const renderId = renderIdRef.current + 1
    renderIdRef.current = renderId

    try {
      setIsRendering(true)
      setError('')
      setCopied('')

      const svg = await renderLatexToSvg(latex, outputRef.current, nextOptions)

      if (renderId !== renderIdRef.current) return

      setSvgMarkup(svg)
    } catch (renderError) {
      if (renderId !== renderIdRef.current) return

      setSvgMarkup('')

      if (outputRef.current) {
        outputRef.current.innerHTML = `<pre>Error: ${
          renderError instanceof Error ? renderError.message : 'Formula render failed.'
        }</pre>`
      }

      setError(renderError instanceof Error ? renderError.message : 'Formula render failed.')
    } finally {
      if (renderId === renderIdRef.current) {
        setIsRendering(false)
      }
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      renderFormula()
    }, 250)

    return () => {
      window.clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, latex, renderOptions])

  async function copyText(text: string, label: string) {
    if (!text) return

    await navigator.clipboard.writeText(text)
    setCopied(label)
  }

  function getDownloadName(extension: string) {
    const cleanedName = fileName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'latexgo-formula'

    return `${cleanedName}.${extension}`
  }

  function downloadSvg() {
    if (!canExport) return

    const blob = new Blob([exportSvgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = getDownloadName('svg')
    link.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPng() {
    if (!canExport || !outputRef.current) return

    const svgElement = outputRef.current.querySelector('svg')

    if (!svgElement) return

    const bounds = svgElement.getBoundingClientRect()
    const serializedSvg = buildExportSvg(svgElement.outerHTML, exportBackground, customBackground)
    const blob = new Blob([serializedSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    try {
      const image = new Image()

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('PNG export failed.'))
        image.src = url
      })

      const scale = Math.max(1, pngScale) * Math.max(1, exportDpi / 96)
      const width = Math.max(1, Math.ceil(bounds.width || image.naturalWidth))
      const height = Math.max(1, Math.ceil(bounds.height || image.naturalHeight))
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Canvas is not available.')
      }

      canvas.width = Math.ceil(width * scale)
      canvas.height = Math.ceil(height * scale)
      context.scale(scale, scale)
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)

      const link = document.createElement('a')

      link.href = canvas.toDataURL('image/png')
      link.download = getDownloadName('png')
      link.click()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  function downloadSelectedFormat() {
    if (exportFormat === 'svg') {
      downloadSvg()
      return
    }

    downloadPng()
  }

  function applyExportPreset(preset: ExportPreset) {
    setExportBackground(preset.background)
    setExportFormat(preset.format)
    setPngScale(preset.scale)
    setExportDpi(preset.dpi)
    setSnippetType(preset.snippet)
    setExportInline(preset.inline)
  }

  function removeLineBreaks() {
    updateLatex(latex.replace(/\n/g, ' '))
  }

  function insertMatrixWithSize(rows: number, columns: number) {
    const row = Array.from({ length: columns }, () => '').join(' & ')
    const body = Array.from({ length: rows }, () => row).join(' \\\\\n')

    insertTemplate({
      label: matrixType,
      prefix: `\\begin{${matrixType}}\n${body}\n\\end{${matrixType}}`,
    })
  }

  function insertMatrix() {
    const rows = Math.max(1, Math.min(12, matrixRows))
    const columns = Math.max(1, Math.min(12, matrixColumns))

    insertMatrixWithSize(rows, columns)
  }

  function resetLatex() {
    updateLatex(starterLatex)
  }

  function updateDisplay(value: boolean) {
    const nextOptions = { ...renderOptions, display: value }

    setDisplay(value)
    renderFormula(nextOptions)
  }

  function updateAllowHtml(value: boolean) {
    const nextOptions = { ...renderOptions, allowHtml: value }

    setAllowHtml(value)
    renderFormula(nextOptions)
  }

  function updateMathmlSpacing(value: boolean) {
    const nextOptions = { ...renderOptions, mathmlSpacing: value }

    setMathmlSpacing(value)
    renderFormula(nextOptions)
  }

  function updateFont(value: MathJaxFont) {
    const nextOptions = { ...renderOptions, font: value }

    setFont(value)
    renderFormula(nextOptions)
  }

  if (currentPage === 'texshelf') {
    return (
      <main className="library-shell">
        <section className="library-page" aria-labelledby="library-title">
          <header className="library-header">
            <div>
              <p className="eyebrow">TeXShelf</p>
              <h1 id="library-title">Formula library</h1>
              <p>Open reusable TeX formulas for math, physics, and chemistry.</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => navigateTo('editor')}>
              LaTeXgO editor
            </button>
          </header>

          <section className="texshelf-panel texshelf-page-panel" aria-label="TeXShelf formulas">
            <div className="texshelf-heading">
              <div>
                <p className="eyebrow">Browse</p>
                <h2>{filteredTexShelfFormulas.length} formulas</h2>
              </div>
            </div>

            <div className="texshelf-controls">
              <label htmlFor="texshelf-search">
                Search formulas
                <input
                  id="texshelf-search"
                  type="search"
                  value={texShelfSearch}
                  onChange={(event) => setTexShelfSearch(event.target.value)}
                  placeholder="maxwell, bayes, system..."
                />
              </label>
              <div className="texshelf-categories" aria-label="TeXShelf categories">
                {texShelfCategories.map((category) => (
                  <button
                    className={category === texShelfCategory ? 'active' : ''}
                    key={category}
                    type="button"
                    aria-pressed={category === texShelfCategory}
                    onClick={() => setTexShelfCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="texshelf-list" aria-live="polite">
              {filteredTexShelfFormulas.length > 0 ? (
                filteredTexShelfFormulas.map((formula) => (
                  <TexShelfFormulaCard
                    formula={formula}
                    key={formula.id}
                    onUse={insertTexShelfFormula}
                  />
                ))
              ) : (
                <p className="texshelf-empty">No matching formulas</p>
              )}
            </div>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="editor-pane" aria-labelledby="editor-title">
        <div className="app-header">
          <div>
            <p className="eyebrow">LaTeXgO</p>
            <h1 id="editor-title">TeX to SVG</h1>
          </div>
          <button type="button" className="secondary-button" onClick={() => navigateTo('texshelf')}>
            Open TeXShelf
          </button>
        </div>

        <label className="input-label" htmlFor="latex-input">
          TeX input
        </label>

        <section className="template-search" aria-label="Template search">
          <label htmlFor="template-search-input">
            Search templates
            <input
              id="template-search-input"
              type="search"
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="fraction, matrix, chemistry..."
            />
          </label>
          {templateSearch.trim() ? (
            <div className="template-results">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template, index) => (
                  <button
                    className="template-result"
                    key={`${template.group}-${template.label}-${template.prefix}-${template.suffix ?? ''}`}
                    type="button"
                    data-template-index={index}
                    onClick={handleSearchTemplateClick}
                  >
                    <span className="template-result-label">
                      <TemplateButtonLabel template={template} />
                    </span>
                    <small>{template.group}</small>
                  </button>
                ))
              ) : (
                <p>No matching templates</p>
              )}
            </div>
          ) : null}
        </section>

        <div className="symbol-panel" aria-label="Symbol templates">
          {templateGroups.map((group) => (
            <section
              className={`symbol-group template-group ${
                group.name === 'TeXShelf' || group.name === 'Science' ? 'is-collapsible' : ''
              }`}
              key={group.name}
              aria-label={group.name}
            >
              <p>{group.name}</p>
              <div>
                {group.templates.map((template) => (
                  <button
                    className="template-chip"
                    key={`${group.name}-${template.label}-${template.prefix}-${template.suffix ?? ''}`}
                    type="button"
                    title={`${template.description ?? template.label}: ${template.prefix}${
                      template.suffix ?? ''
                    }`}
                    aria-label={template.description ?? template.label}
                    onClick={() => insertTemplate(template)}
                  >
                    <TemplateButtonLabel template={template} />
                  </button>
                ))}
              </div>
            </section>
          ))}
          {toolbarGroups.map((group) => (
            <section className="symbol-group" key={group.name} aria-label={group.name}>
              <p>{group.name}</p>
              <div>
                {group.templates.map((template) => (
                  <button
                    className="symbol-button"
                    key={`${group.name}-${template.prefix}-${template.suffix ?? ''}`}
                    type="button"
                    title={`${template.description ?? template.label}: ${template.prefix}${
                      template.suffix ?? ''
                    }`}
                    aria-label={template.description ?? template.label}
                    onClick={() => insertTemplate(template)}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="github-input-header" aria-label="TeX editor toolbar">
          <div className="github-toolbar" aria-label="Editor commands">
            <button type="button" title="Undo" onClick={undoLatex} disabled={!canUndo}>
              Undo
            </button>
            <button type="button" title="Redo" onClick={redoLatex} disabled={!canRedo}>
              Redo
            </button>
            <span className="github-divider" aria-hidden="true" />
            <button type="button" onClick={() => renderFormula()} disabled={isRendering}>
              {isRendering ? 'Rendering' : 'Render'}
            </button>
            <button type="button" onClick={removeLineBreaks}>
              One line
            </button>
            <button type="button" onClick={resetLatex}>
              Reset
            </button>
            <span className="github-divider" aria-hidden="true" />
            {inputOptionGroups.map((group) => (
              <details className="github-menu" key={group.name}>
                <summary>{group.name}</summary>
                <div className="github-menu-panel">
                  {group.templates.map((template) => (
                    <button
                      key={`${group.name}-${template.label}-${template.prefix}-${template.suffix ?? ''}`}
                      type="button"
                      title={`${template.description ?? template.label}: ${template.prefix}${
                        template.suffix ?? ''
                      }`}
                      aria-label={template.description ?? template.label}
                      onClick={(event) => insertMenuTemplate(template, event)}
                    >
                      <TemplateButtonLabel template={template} />
                    </button>
                  ))}
                </div>
              </details>
            ))}
            <details className="github-menu github-matrix-menu">
              <summary>Matrix</summary>
              <div className="github-menu-panel">
                <label htmlFor="matrix-type">
                  Type
                  <select
                    id="matrix-type"
                    value={matrixType}
                    onChange={(event) => setMatrixType(event.target.value)}
                  >
                    <option value="matrix">matrix</option>
                    <option value="pmatrix">pmatrix</option>
                    <option value="bmatrix">bmatrix</option>
                    <option value="vmatrix">vmatrix</option>
                    <option value="Vmatrix">Vmatrix</option>
                    <option value="Bmatrix">Bmatrix</option>
                  </select>
                </label>
                <label htmlFor="matrix-rows">
                  Rows
                  <input
                    id="matrix-rows"
                    min="1"
                    max="12"
                    type="number"
                    value={matrixRows}
                    onChange={(event) => setMatrixRows(Number(event.target.value))}
                  />
                </label>
                <label htmlFor="matrix-columns">
                  Columns
                  <input
                    id="matrix-columns"
                    min="1"
                    max="12"
                    type="number"
                    value={matrixColumns}
                    onChange={(event) => setMatrixColumns(Number(event.target.value))}
                  />
                </label>
                <button type="button" onClick={insertMenuMatrix}>
                  Insert Matrix
                </button>
                <div className="matrix-picker" aria-label="Matrix size picker">
                  {Array.from({ length: 25 }, (_, index) => {
                    const row = Math.floor(index / 5) + 1
                    const column = (index % 5) + 1
                    const active = row <= matrixPicker.rows && column <= matrixPicker.columns

                    return (
                      <button
                        className={active ? 'active' : ''}
                        key={`${row}-${column}`}
                        type="button"
                        title={`${row} x ${column}`}
                        aria-label={`Insert ${row} by ${column} matrix`}
                        onMouseEnter={() => setMatrixPicker({ rows: row, columns: column })}
                        onFocus={() => setMatrixPicker({ rows: row, columns: column })}
                        onClick={(event) => insertMenuMatrixWithSize(row, column, event)}
                      />
                    )
                  })}
                  <span>
                    {matrixPicker.rows} x {matrixPicker.columns}
                  </span>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="editor-frame">
          <pre ref={syntaxRef} className="syntax-layer" aria-hidden="true">
            {highlightedTokens.map((token, index) => (
              <span className={`syntax-${token.kind}`} key={`${token.kind}-${index}`}>
                {token.text}
              </span>
            ))}
          </pre>
          <textarea
            ref={textareaRef}
            id="latex-input"
            value={latex}
            onChange={handleLatexChange}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
            onScroll={handleEditorScroll}
            onSelect={handleEditorSelect}
            onClick={handleEditorSelect}
            onKeyUp={handleEditorSelect}
            spellCheck={false}
          />
          {autocompleteSuggestions.length > 0 ? (
            <div className="autocomplete-panel" role="listbox">
              {autocompleteSuggestions.map((suggestion, index) => (
                <button
                  className={index === activeSuggestionIndex ? 'active' : ''}
                  key={`${suggestion.label}-${suggestion.value}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    acceptSuggestion(suggestion)
                  }}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                >
                  <span>{suggestion.label}</span>
                  <small>{suggestion.description}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <section className="preview-pane" aria-label="Rendered formula preview">
          <div className="preview-surface">
            <div
              ref={outputRef}
              id="output"
              className="formula-preview"
              style={{ fontSize: `${previewSize}px` }}
            />
          </div>
        </section>

        <div className="editor-tools">
          <fieldset className="controls render-controls" disabled={isRendering}>
            <label>
              <input
                type="checkbox"
                checked={display}
                onChange={(event) => updateDisplay(event.target.checked)}
              />
              Display style
            </label>
            <label>
              <input
                type="checkbox"
                checked={allowHtml}
                onChange={(event) => updateAllowHtml(event.target.checked)}
              />
              Allow HTML in TeX
            </label>
            <label>
              <input
                type="checkbox"
                checked={mathmlSpacing}
                onChange={(event) => updateMathmlSpacing(event.target.checked)}
              />
              MathML spacing
            </label>
            <label className="font-control" htmlFor="font-select">
              Font
              <select
                id="font-select"
                value={font}
                onChange={(event) => updateFont(event.target.value as MathJaxFont)}
              >
                {mathJaxFonts.map((mathJaxFont) => (
                  <option key={mathJaxFont} value={mathJaxFont}>
                    {mathJaxFont}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="controls preview-controls">
            <label htmlFor="preview-size">
              Preview size
              <input
                id="preview-size"
                min="12"
                max="64"
                type="number"
                value={previewSize}
                onChange={(event) => setPreviewSize(Number(event.target.value))}
              />
            </label>
          </fieldset>
        </div>

        <section className="export-panel" aria-label="Export options">
          <div className="preset-row" aria-label="Export presets">
            {exportPresets.map((preset) => (
              <button
                className="secondary-button"
                key={preset.label}
                type="button"
                onClick={() => applyExportPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="export-grid">
            <label htmlFor="file-name">
              File name
              <input
                id="file-name"
                type="text"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
              />
            </label>
            <label htmlFor="export-background">
              Background
              <select
                id="export-background"
                value={exportBackground}
                onChange={(event) => setExportBackground(event.target.value as ExportBackground)}
              >
                {exportBackgrounds.map((background) => (
                  <option key={background.value} value={background.value}>
                    {background.label}
                  </option>
                ))}
              </select>
            </label>
            {exportBackground === 'custom' ? (
              <label htmlFor="custom-background">
                Color
                <input
                  id="custom-background"
                  type="color"
                  value={customBackground}
                  onChange={(event) => setCustomBackground(event.target.value)}
                />
              </label>
            ) : null}
            <label htmlFor="png-scale">
              PNG scale
              <input
                id="png-scale"
                min="1"
                max="6"
                step="1"
                type="number"
                value={pngScale}
                onChange={(event) => setPngScale(Number(event.target.value))}
              />
            </label>
            <label htmlFor="export-dpi">
              DPI
              <select
                id="export-dpi"
                value={exportDpi}
                onChange={(event) => setExportDpi(Number(event.target.value))}
              >
                {[96, 144, 192, 300].map((dpi) => (
                  <option key={dpi} value={dpi}>
                    {dpi}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-control">
              <input
                type="checkbox"
                checked={exportInline}
                onChange={(event) => setExportInline(event.target.checked)}
              />
              Inline snippet
            </label>
            <label htmlFor="export-format">
              Download as
              <select
                id="export-format"
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
              >
                <option value="svg">SVG</option>
                <option value="png">PNG</option>
              </select>
            </label>
          </div>

          <div className="snippet-row">
            <label htmlFor="snippet-type">
              Copy as
              <select
                id="snippet-type"
                value={snippetType}
                onChange={(event) => setSnippetType(event.target.value as ExportSnippet)}
              >
                <option value="html">HTML image</option>
                <option value="markdown">Markdown image</option>
                <option value="mathjax">MathJax delimiters</option>
                <option value="latex">Raw TeX</option>
                <option value="svg">SVG markup</option>
                <option value="data-url">SVG data URL</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => copyText(exportSnippet, 'snippet')}
              disabled={!canExport && snippetType !== 'latex' && snippetType !== 'mathjax'}
            >
              {copied === 'snippet' ? 'Copied' : 'Copy Snippet'}
            </button>
            <button type="button" onClick={downloadSvg} disabled={!canExport}>
              Download SVG
            </button>
            <button type="button" onClick={downloadPng} disabled={!canExport}>
              Download PNG
            </button>
            <button type="button" className="secondary-button" onClick={downloadSelectedFormat} disabled={!canExport}>
              Download Current
            </button>
          </div>

          <textarea
            className="export-output"
            value={exportSnippet}
            readOnly
            onClick={(event) => event.currentTarget.select()}
          />
        </section>

        <div className="actions" aria-label="Formula actions">
          <select
            className="history-select"
            aria-label="Formula history"
            value={historyIndex}
            onChange={(event) => restoreHistory(Number(event.target.value))}
          >
            {historyItems.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary-button"
            onClick={isFavorite ? removeCurrentFavorite : saveFavorite}
          >
            {isFavorite ? 'Remove Favorite' : 'Save Favorite'}
          </button>
          <select
            className="history-select"
            aria-label="Favorite formulas"
            defaultValue=""
            onChange={(event) => {
              restoreFavorite(Number(event.target.value))
              event.target.value = ''
            }}
            disabled={favorites.length === 0}
          >
            <option value="" disabled>
              Favorites
            </option>
            {favoriteItems.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary-button"
            onClick={clearFavorites}
            disabled={favorites.length === 0}
          >
            Clear Favorites
          </button>
          <button type="button" className="secondary-button" onClick={clearHistory}>
            Clear History
          </button>
          <button type="button" onClick={() => copyText(exportSvgMarkup, 'svg')} disabled={!canExport}>
            {copied === 'svg' ? 'Copied' : 'Copy SVG'}
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  )
}

export default App
