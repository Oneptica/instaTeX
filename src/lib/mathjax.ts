import mathJaxScriptUrl from 'mathjax/es5/tex-svg.js?url'
import bboxScriptUrl from 'mathjax/es5/input/tex/extensions/bbox.js?url'
import cancelScriptUrl from 'mathjax/es5/input/tex/extensions/cancel.js?url'
import colorScriptUrl from 'mathjax/es5/input/tex/extensions/color.js?url'
import mhchemScriptUrl from 'mathjax/es5/input/tex/extensions/mhchem.js?url'
import noundefinedScriptUrl from 'mathjax/es5/input/tex/extensions/noundefined.js?url'
import physicsScriptUrl from 'mathjax/es5/input/tex/extensions/physics.js?url'
import texHtmlScriptUrl from 'mathjax/es5/input/tex/extensions/texhtml.js?url'

export const mathJaxFonts = [
  'mathjax-asana',
  'mathjax-bonum',
  'mathjax-dejavu',
  'mathjax-fira',
  'mathjax-modern',
  'mathjax-newcm',
  'mathjax-pagella',
  'mathjax-schola',
  'mathjax-stix2',
  'mathjax-termes',
  'mathjax-tex',
] as const

export type MathJaxFont = (typeof mathJaxFonts)[number]

export type RenderOptions = {
  allowHtml: boolean
  display: boolean
  font: MathJaxFont
  mathmlSpacing: boolean
}

type MathJaxStartupDocument = {
  clear: () => void
  inputJax: {
    tex: {
      parseOptions: {
        options: {
          allowTexHTML: boolean
        }
      }
    }
  }
  outputJax: {
    font: unknown
    options: {
      mathmlSpacing: boolean
    }
    reset: () => void
    styleSheet: () => HTMLElement
    svgStyles: unknown
  }
  updateDocument: () => void
}

type MathJaxGlobal = {
  _: {
    output: {
      fonts: Record<string, { svg_ts?: Record<string, MathJaxFontDataConstructor> }>
    }
    util: {
      Options: {
        selectOptionsFromKeys: (
          options: Record<string, unknown>,
          keys: Record<string, unknown>,
        ) => Record<string, unknown>
      }
    }
  }
  config: {
    fontUrl: (font: string) => string
    loader: {
      paths: Record<string, string>
    }
    svg: {
      fontData: {
        OPTIONS: Record<string, unknown>
      }
      [key: string]: unknown
    }
  }
  getMetricsFor: (element: HTMLElement) => { display?: boolean }
  loader: {
    load: (component: string) => Promise<void>
  }
  startup: {
    defaultReady: () => void
    document: MathJaxStartupDocument
  }
  tex2svgPromise: (input: string, options: Record<string, unknown>) => Promise<HTMLElement>
  texReset: () => void
  whenReady: (callback: () => void) => Promise<void>
}

type MathJaxFontDataConstructor = {
  new (options: Record<string, unknown>): {
    setOptions: (options: Record<string, unknown>) => void
  }
  OPTIONS: Record<string, unknown>
}

type MathJaxWindow = Window &
  typeof globalThis & {
    MathJax?: Partial<MathJaxGlobal> & Record<string, unknown>
  }

const mathJaxWindow = window as MathJaxWindow
const defaultFont: MathJaxFont = 'mathjax-newcm'
let activeFont: MathJaxFont = defaultFont

const mathJaxReady = loadMathJax()

function configureMathJax(resolve: () => void, reject: (error: unknown) => void) {
  const texPackages = ['texhtml', 'physics', 'color', 'bbox', 'cancel', 'mhchem', 'noundefined']

  mathJaxWindow.MathJax = {
    loader: {
      load: texPackages.map((texPackage) => `[tex]/${texPackage}`),
      source: {
        '[tex]/bbox': bboxScriptUrl,
        '[tex]/cancel': cancelScriptUrl,
        '[tex]/color': colorScriptUrl,
        '[tex]/mhchem': mhchemScriptUrl,
        '[tex]/noundefined': noundefinedScriptUrl,
        '[tex]/physics': physicsScriptUrl,
        '[tex]/texhtml': texHtmlScriptUrl,
      },
    },
    tex: {
      packages: { '[+]': texPackages },
    },
    startup: {
      ready() {
        try {
          const mathJax = mathJaxWindow.MathJax as MathJaxGlobal

          mathJax.startup.defaultReady()
          mathJax.whenReady(resolve).catch(reject)
        } catch (error) {
          reject(error)
        }
      },
    },
    options: {
      enableBraille: false,
      enableEnrichment: false,
      enableSpeech: false,
      renderActions: {
        attachSpeech: [],
      },
    },
    svg: {
      fontCache: 'local',
    },
    fontUrl: (font: string) => `https://cdn.jsdelivr.net/npm/@mathjax/${font}-font@4`,
  } as unknown as MathJaxWindow['MathJax']
}

function loadMathJax() {
  if (mathJaxWindow.MathJax?.tex2svgPromise) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    configureMathJax(resolve, reject)

    document.getElementById('mathjax-script')?.remove()

    const script = document.createElement('script')

    script.id = 'mathjax-script'
    script.src = mathJaxScriptUrl
    script.defer = true
    script.onerror = () => {
      reject(new Error('MathJax script failed to load.'))
    }

    document.head.appendChild(script)
  })
}

function getMathJax() {
  const mathJax = mathJaxWindow.MathJax as MathJaxGlobal | undefined

  if (!mathJax?.tex2svgPromise || !mathJax.startup?.document) {
    throw new Error('MathJax SVG renderer is not ready.')
  }

  return mathJax
}

async function setMathJaxFont(font: MathJaxFont) {
  if (font === activeFont) return

  const mathJax = getMathJax()

  if (!mathJax._.output.fonts[font]) {
    mathJax.config.loader.paths[font] = mathJax.config.fontUrl(font)

    for (const key of Object.keys(mathJax.config.svg.fontData.OPTIONS)) {
      delete mathJax.config.svg[key]
    }

    await mathJax.loader.load(`[${font}]/svg.js`)
  }

  const fontData = Object.values(mathJax._.output.fonts[font].svg_ts ?? {})[0]

  if (!fontData) {
    throw new Error(`Unable to load ${font}.`)
  }

  const jax = mathJax.startup.document.outputJax
  const styleSheet = jax.styleSheet()

  if (styleSheet.parentNode) {
    styleSheet.parentNode.removeChild(styleSheet)
  }

  jax.svgStyles = null
  jax.reset()
  jax.font = new fontData(
    mathJax._.util.Options.selectOptionsFromKeys(mathJax.config.svg, fontData.OPTIONS),
  )
  ;(jax.font as { setOptions: (options: Record<string, unknown>) => void }).setOptions({
    mathmlSpacing: jax.options.mathmlSpacing,
  })

  activeFont = font
}

export async function renderLatexToSvg(
  input: string,
  outputElement: HTMLElement,
  options: RenderOptions,
) {
  await mathJaxReady

  const mathJax = getMathJax()
  const document = mathJax.startup.document

  document.inputJax.tex.parseOptions.options.allowTexHTML = options.allowHtml
  document.outputJax.options.mathmlSpacing = options.mathmlSpacing
  await setMathJaxFont(options.font)

  mathJax.texReset()

  const metrics = mathJax.getMetricsFor(outputElement)
  metrics.display = options.display

  document.clear()
  const node = await mathJax.tex2svgPromise(input.trim(), metrics)

  outputElement.innerHTML = ''
  outputElement.appendChild(node)
  document.updateDocument()

  const svgElement = node.querySelector('svg')

  if (!svgElement) {
    throw new Error('No SVG was generated.')
  }

  return svgElement.outerHTML
}
