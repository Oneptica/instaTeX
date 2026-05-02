# LaTeXgO

LaTeXgO is a lightweight TeX equation editor for writing, previewing, and exporting formulas as SVG or PNG.

The app includes:

- MathJax-powered formula preview
- TeX input with autocomplete and syntax highlighting
- SVG/PNG export
- reusable templates for common math, physics, and chemistry notation
- TeXShelf formula library integration

## TeXShelf

TeXShelf is the formula library used by LaTeXgO.

Formula data lives in:

```txt
texshelf/
  algebra.json
  calculus.json
  physics.json
  chemistry.json
  schema.json
```

LaTeXgO reads those JSON files and turns entries into insertable examples in the editor.

See [texshelf/README.md](texshelf/README.md) for the formula format and contribution rules.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run lint
```
