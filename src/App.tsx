import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { type Completion, type CompletionContext, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view'
import { stexMath } from '@codemirror/legacy-modes/mode/stex'
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
  sizeTemplates,
  texShelfFormulas,
  toolbarGroups,
} from './lib/latexTemplates'
import './App.css'

const starterLatex = ''
const visibleToolbarTemplateCount = 4

const historyStorageKey = 'latexgo.history'

type ExportBackground = 'transparent' | 'white' | 'black' | 'custom'
type AppPage = 'editor' | 'texshelf'

type AutocompleteItem = {
  label: string
  value: string
  description: string
  tabStops?: number[]
}

function getInitialPage(): AppPage {
  return window.location.pathname.startsWith('/texshelf') ? 'texshelf' : 'editor'
}

function getInitialFormulaId() {
  const [, page, formulaId] = window.location.pathname.split('/')

  return page === 'texshelf' ? formulaId ?? '' : ''
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

const inputOptionGroups = [
  { name: 'Color', templates: colorTemplates },
  { name: 'TeX size', templates: sizeTemplates },
  { name: 'Background', templates: backgroundTemplates },
]

function getLatexCompletions(context: CompletionContext) {
  const match = context.matchBefore(/\\[A-Za-z]*/)

  if (!match || (match.from === match.to && !context.explicit)) return null

  const query = match.text.toLowerCase()
  const seen = new Set<string>()
  const options: Completion[] = autocompleteItems
    .filter((item) => item.label.toLowerCase().startsWith(query))
    .filter((item) => {
      if (seen.has(item.label)) return false
      seen.add(item.label)
      return true
    })
    .slice(0, 8)
    .map((item) => ({
      label: item.label,
      detail: item.description,
      type: 'keyword',
      apply(view, _completion, from, to) {
        const firstTabStop = item.tabStops?.[0]

        view.dispatch({
          changes: { from, to, insert: item.value },
          selection:
            firstTabStop === undefined
              ? { anchor: from + item.value.length }
              : { anchor: from + firstTabStop },
          scrollIntoView: true,
        })
      },
    }))

  return { from: match.from, options }
}

function slugifyAssetPart(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

function getTemplateAssetPath(groupName: string, template: LatexTemplate, index: number) {
  const groupSlug = slugifyAssetPart(groupName)
  const itemSlug = slugifyAssetPart(template.description ?? template.label)

  return `/symbols/${groupSlug}/${String(index + 1).padStart(2, '0')}-${itemSlug}.svg`
}

function TemplateButtonLabel({
  template,
  assetPath,
}: {
  template: LatexTemplate
  assetPath?: string
}) {
  const [assetFailed, setAssetFailed] = useState(false)

  return (
    <>
      {template.swatch ? (
        <span
          className="template-swatch"
          style={{ backgroundColor: template.swatch }}
          aria-hidden="true"
        />
      ) : null}
      {assetPath && !assetFailed ? (
        <span className="template-symbol-frame" aria-hidden="true">
          <img
            className="template-symbol-image"
            src={assetPath}
            alt=""
            onError={() => setAssetFailed(true)}
          />
        </span>
      ) : (
        <span>{template.label}</span>
      )}
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
  onOpen,
  onUse,
}: {
  formula: TexShelfFormula
  onOpen: (formula: TexShelfFormula) => void
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
          <button className="texshelf-title-button" type="button" onClick={() => onOpen(formula)}>
            {formula.title}
          </button>
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
  const [currentFormulaId, setCurrentFormulaId] = useState(() => getInitialFormulaId())
  const [latex, setLatex] = useState(initialHistory[initialHistory.length - 1] ?? starterLatex)
  const [display, setDisplay] = useState(true)
  const [font, setFont] = useState<MathJaxFont>('mathjax-newcm')
  const [previewSize, setPreviewSize] = useState(20)
  const [matrixType, setMatrixType] = useState('pmatrix')
  const [matrixRows, setMatrixRows] = useState(2)
  const [matrixColumns, setMatrixColumns] = useState(2)
  const [svgMarkup, setSvgMarkup] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [isRendering, setIsRendering] = useState(true)
  const [canUndo, setCanUndo] = useState(initialHistory.length > 1)
  const [canRedo, setCanRedo] = useState(false)
  const [historySnapshot, setHistorySnapshot] = useState(initialHistory)
  const [historyIndex, setHistoryIndex] = useState(initialHistory.length - 1)
  const [texShelfSearch, setTexShelfSearch] = useState('')
  const [texShelfCategory, setTexShelfCategory] = useState('All')
  const [exportBackground, setExportBackground] = useState<ExportBackground>('transparent')
  const [customBackground, setCustomBackground] = useState('#f5f5f7')
  const [fileName, setFileName] = useState('latexgo-formula')
  const editorFrameRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)
  const matrixTypeRef = useRef(matrixType)
  const historyRef = useRef(initialHistory)
  const historyIndexRef = useRef(initialHistory.length - 1)
  const pngScale = 2
  const exportDpi = 192

  useEffect(() => {
    matrixTypeRef.current = matrixType
  }, [matrixType])

  const renderOptions = useMemo<RenderOptions>(
    () => ({ allowHtml: false, display, font, mathmlSpacing: false }),
    [display, font],
  )
  const canExport = svgMarkup.trim().length > 0 && !error && !isRendering
  const exportSvgMarkup = useMemo(
    () => buildExportSvg(svgMarkup, exportBackground, customBackground),
    [customBackground, exportBackground, svgMarkup],
  )
  const historyItems = useMemo(
    () =>
      historySnapshot.map((item, index) => ({
        label: `${index + 1}. ${item.split('\n').find((line) => line.trim())?.trim() || 'Empty'}`,
        value: index,
      })),
    [historySnapshot],
  )
  const texShelfCategories = useMemo(
    () => ['All', ...Array.from(new Set(texShelfFormulas.map((formula) => formula.category))).sort()],
    [],
  )
  const selectedTexShelfFormula = useMemo(
    () => texShelfFormulas.find((formula) => formula.id === currentFormulaId),
    [currentFormulaId],
  )
  const filteredTexShelfFormulas = useMemo(() => {
    if (selectedTexShelfFormula) return [selectedTexShelfFormula]

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
        ...formula.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [selectedTexShelfFormula, texShelfCategory, texShelfSearch])

  function navigateTo(page: AppPage, formulaId = '') {
    const path = page === 'texshelf' ? `/texshelf${formulaId ? `/${formulaId}` : ''}` : '/'

    window.history.pushState({}, '', path)
    setCurrentPage(page)
    setCurrentFormulaId(page === 'texshelf' ? formulaId : '')
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentPage(getInitialPage())
      setCurrentFormulaId(getInitialFormulaId())
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function syncHistoryState() {
    setHistorySnapshot([...historyRef.current])
    setHistoryIndex(historyIndexRef.current)
    writeStoredStringArray(historyStorageKey, historyRef.current)
  }

  function syncEditorUndoState() {
    const editor = editorViewRef.current

    setCanUndo(editor ? undoDepth(editor.state) > 0 : false)
    setCanRedo(editor ? redoDepth(editor.state) > 0 : false)
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
      const editor = editorViewRef.current

      if (!editor) return

      editor.focus()

      if (selectionStart !== undefined) {
        editor.dispatch({
          selection: { anchor: selectionStart, head: selectionEnd ?? selectionStart },
          scrollIntoView: true,
        })
      }
    })
  }

  function updateLatex(
    nextLatex: string,
    selectionStart?: number,
    selectionEnd = selectionStart,
    tabStops: number[] = [],
  ) {
    const editor = editorViewRef.current

    if (!editor) {
      setLatex(nextLatex)
      pushHistory(nextLatex)
      return
    }

    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: nextLatex },
      selection:
        selectionStart === undefined
          ? undefined
          : { anchor: selectionStart, head: selectionEnd ?? selectionStart },
      scrollIntoView: true,
    })

    if (tabStops.length > 0) focusEditor(tabStops[0])
  }

  function undoLatex() {
    const editor = editorViewRef.current

    if (editor) undo(editor)
  }

  function redoLatex() {
    const editor = editorViewRef.current

    if (editor) redo(editor)
  }

  function restoreHistory(index: number) {
    if (!historyRef.current[index]) return

    historyIndexRef.current = index
    updateLatex(historyRef.current[index])
    syncHistoryState()
    focusEditor()
  }

  function clearHistory() {
    historyRef.current = [latex]
    historyIndexRef.current = 0
    syncHistoryState()
  }

  function insertTemplate(template: LatexTemplate) {
    const editor = editorViewRef.current
    const selection = editor?.state.selection.main
    const selectionStart = selection?.from ?? latex.length
    const selectionEnd = selection?.to ?? latex.length
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

  function openTexShelfFormula(formula: TexShelfFormula) {
    navigateTo('texshelf', formula.id)
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

  function jumpToStructure(direction: 'left' | 'right') {
    const editor = editorViewRef.current

    if (!editor) return false

    const currentLatex = editor.state.doc.toString()
    const stops = getNavigationStops(currentLatex)
    const current = editor.state.selection.main.head
    const nextStop =
      direction === 'right'
        ? stops.find((stop) => stop > current)
        : [...stops].reverse().find((stop) => stop < current)

    if (nextStop === undefined) return false

    focusEditor(nextStop)
    return true
  }

  useEffect(() => {
    if (!editorFrameRef.current || editorViewRef.current) return

    const editor = new EditorView({
      parent: editorFrameRef.current,
      state: EditorState.create({
        doc: latex,
        extensions: [
          history(),
          closeBrackets(),
          drawSelection(),
          placeholder(''),
          StreamLanguage.define(stexMath),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          autocompletion({
            override: [getLatexCompletions],
            activateOnTyping: true,
          }),
          keymap.of([
            {
              key: 'Mod-ArrowRight',
              run() {
                return jumpToStructure('right')
              },
            },
            {
              key: 'Mod-ArrowLeft',
              run() {
                return jumpToStructure('left')
              },
            },
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorView.domEventHandlers({
            paste(event, view) {
              const text = event.clipboardData?.getData('text/plain') ?? ''
              const matrix = tableTextToLatex(text, matrixTypeRef.current)

              if (!matrix) return false

              event.preventDefault()
              const selection = view.state.selection.main

              view.dispatch({
                changes: { from: selection.from, to: selection.to, insert: matrix },
                selection: { anchor: selection.from + matrix.length },
                scrollIntoView: true,
              })
              return true
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const nextLatex = update.state.doc.toString()

              setLatex(nextLatex)
              pushHistory(nextLatex)
            }

            if (update.docChanged || update.transactions.some((transaction) => transaction.selection)) {
              syncEditorUndoState()
            }
          }),
        ],
      }),
    })

    editorViewRef.current = editor
    syncEditorUndoState()

    return () => {
      editor.destroy()
      editorViewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editor = editorViewRef.current

    if (!editor || editor.state.doc.toString() === latex) return

    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: latex },
    })
  }, [latex])

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

  async function copyLatex() {
    if (!latex) return

    await navigator.clipboard.writeText(latex)
    setCopied('latex')
  }

  async function copySvg() {
    if (!canExport) return

    try {
      const svgBlob = new Blob([exportSvgMarkup], { type: 'image/svg+xml' })

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/svg+xml': svgBlob,
        }),
      ])
      setCopied('svg')
    } catch (error) {
      console.error('Failed to copy SVG:', error)
    }
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
            <div className="library-actions">
              <a
                className="secondary-button link-button"
                href="https://github.com/tzhaoo/LaTeXgO"
                rel="noreferrer"
                target="_blank"
              >
                Contribute on GitHub
              </a>
              <button type="button" className="secondary-button" onClick={() => navigateTo('editor')}>
                LaTeXgO editor
              </button>
            </div>
          </header>

          <div className="library-layout">
            <aside className="library-sidebar" aria-label="TeXShelf filters">
              <p>Domains</p>
              <div className="texshelf-categories" aria-label="TeXShelf categories">
                {texShelfCategories.map((category) => (
                  <button
                    className={category === texShelfCategory && !selectedTexShelfFormula ? 'active' : ''}
                    key={category}
                    type="button"
                    aria-pressed={category === texShelfCategory && !selectedTexShelfFormula}
                    onClick={() => {
                      setTexShelfCategory(category)
                      setCurrentFormulaId('')
                      window.history.pushState({}, '', '/texshelf')
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </aside>

            <section className="texshelf-panel texshelf-page-panel" aria-label="TeXShelf formulas">
              <div className="texshelf-heading">
                <div>
                  <p className="eyebrow">{selectedTexShelfFormula ? 'Formula' : 'Browse'}</p>
                  <h2>
                    {selectedTexShelfFormula
                      ? selectedTexShelfFormula.title
                      : `${filteredTexShelfFormulas.length} formulas`}
                  </h2>
                </div>
                {selectedTexShelfFormula ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigateTo('texshelf')}
                  >
                    All formulas
                  </button>
                ) : null}
              </div>

              <div className="texshelf-controls">
                <label htmlFor="texshelf-search">
                  Search formulas
                  <input
                    id="texshelf-search"
                    type="search"
                    value={texShelfSearch}
                    onChange={(event) => {
                      setTexShelfSearch(event.target.value)
                      setCurrentFormulaId('')
                      window.history.pushState({}, '', '/texshelf')
                    }}
                    placeholder="maxwell, bayes, system..."
                  />
                </label>
              </div>

              <p className="texshelf-count" aria-live="polite">
                {selectedTexShelfFormula
                  ? `/texshelf/${selectedTexShelfFormula.id}`
                  : `${filteredTexShelfFormulas.length} result${
                      filteredTexShelfFormulas.length === 1 ? '' : 's'
                    }`}
              </p>

              <div className="texshelf-list" aria-live="polite">
                {filteredTexShelfFormulas.length > 0 ? (
                  filteredTexShelfFormulas.map((formula) => (
                    <TexShelfFormulaCard
                      formula={formula}
                      key={formula.id}
                      onOpen={openTexShelfFormula}
                      onUse={insertTexShelfFormula}
                    />
                  ))
                ) : (
                  <p className="texshelf-empty">No matching formulas</p>
                )}
              </div>
            </section>
          </div>
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
            <label className="toolbar-checkbox">
              <input
                type="checkbox"
                checked={display}
                onChange={(event) => updateDisplay(event.target.checked)}
                disabled={isRendering}
              />
              Display
            </label>
            <label className="toolbar-select" htmlFor="font-select">
              Font
              <select
                id="font-select"
                value={font}
                onChange={(event) => updateFont(event.target.value as MathJaxFont)}
                disabled={isRendering}
              >
                {mathJaxFonts.map((mathJaxFont) => (
                  <option key={mathJaxFont} value={mathJaxFont}>
                    {mathJaxFont}
                  </option>
                ))}
              </select>
            </label>
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
              </div>
            </details>
          </div>
        </div>

        <div className="symbol-strip" aria-label="Symbol templates">
          {toolbarGroups.map((group) => (
            <section className="github-symbol-group" key={group.name} aria-label={group.name}>
              <p>{group.name}</p>
              <div className="github-symbol-preview">
                {group.templates.slice(0, visibleToolbarTemplateCount).map((template, index) => (
                  <button
                    key={`${group.name}-preview-${template.label}-${template.prefix}`}
                    type="button"
                    title={`${template.description ?? template.label}: ${template.prefix}${
                      template.suffix ?? ''
                    }`}
                    aria-label={template.description ?? template.label}
                    onClick={() => insertTemplate(template)}
                  >
                    <TemplateButtonLabel
                      template={template}
                      assetPath={getTemplateAssetPath(group.name, template, index)}
                    />
                  </button>
                ))}
              </div>
              {group.templates.length > visibleToolbarTemplateCount ? (
                <div className="github-symbol-popover">
                  {group.templates.slice(visibleToolbarTemplateCount).map((template, index) => {
                    const templateIndex = index + visibleToolbarTemplateCount

                    return (
                    <button
                      key={`${group.name}-${template.label}-${template.prefix}-${template.suffix ?? ''}`}
                      type="button"
                      title={`${template.description ?? template.label}: ${template.prefix}${
                        template.suffix ?? ''
                      }`}
                      aria-label={template.description ?? template.label}
                      onClick={() => insertTemplate(template)}
                    >
                      <TemplateButtonLabel
                        template={template}
                        assetPath={getTemplateAssetPath(group.name, template, templateIndex)}
                      />
                    </button>
                    )
                  })}
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <div className="editor-frame" id="latex-input" ref={editorFrameRef} />

        <section className="preview-pane" aria-label="Rendered formula preview">
          <div className="preview-surface">
            <div
              ref={outputRef}
              id="output"
              className="formula-preview"
              style={{ fontSize: `${previewSize}px` }}
            />
            <label className="preview-size-slider" htmlFor="preview-size">
              <span>Size</span>
              <input
                id="preview-size"
                min="12"
                max="64"
                type="range"
                value={previewSize}
                onChange={(event) => setPreviewSize(Number(event.target.value))}
                aria-valuetext={`${previewSize}px`}
              />
            </label>
          </div>
        </section>

        <section className="export-panel" aria-label="Export options">
          <div className="export-row">
            <div className="export-section-title">
              <h2>Download</h2>
            </div>
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
              <label className="export-color-control" htmlFor="custom-background">
                Color
                <input
                  id="custom-background"
                  type="color"
                  value={customBackground}
                  onChange={(event) => setCustomBackground(event.target.value)}
                />
              </label>
            ) : null}
            <div className="export-actions">
              <button type="button" onClick={downloadSvg} disabled={!canExport}>
                SVG
              </button>
              <button type="button" onClick={downloadPng} disabled={!canExport}>
                PNG
              </button>
            </div>
          </div>

          <div className="export-row">
            <div className="export-section-title">
              <h2>Copy</h2>
            </div>
            <div className="export-actions">
              <button type="button" onClick={copyLatex}>
                {copied === 'latex' ? 'Copied' : 'Copy LaTeX'}
              </button>
              <button type="button" onClick={copySvg} disabled={!canExport}>
                {copied === 'svg' ? 'Copied' : 'Copy SVG'}
              </button>
            </div>
          </div>
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
          <button type="button" className="secondary-button" onClick={clearHistory}>
            Clear History
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  )
}

export default App
