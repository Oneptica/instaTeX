# InstaTex

InstaTex is a lightweight TeX equation editor for writing, previewing, and exporting formulas as SVG or PNG.

The app includes:

- MathJax-powered formula preview
- TeX input with autocomplete and syntax highlighting
- SVG/PNG export
- reusable templates for common math, physics, and chemistry notation
- LaTeXgO formula library integration

## LaTeXgO

LaTeXgO is the formula library used by InstaTex.

Formula data lives in:

```txt
LaTeXgO/
  formulas/
    algebra/
      equations.json
      piecewise.json
    calculus/
      derivatives.json
      integrals.json
    physics/
      mechanics.json
      electromagnetism.json
  schema.json
```

InstaTex reads every JSON file under `LaTeXgO/formulas/` and turns entries into insertable examples in the editor.

See [LaTeXgO/README.md](LaTeXgO/README.md) for the formula format and contribution rules.

## Development

```bash
git submodule update --init --recursive
npm install
npm run dev
```

## Build

```bash
npm run build
npm run lint
```
