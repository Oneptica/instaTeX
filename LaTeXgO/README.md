# LaTeXgO

A curated collection of LaTeX formulas and plot-ready assets for mathematics, physics, chemistry, engineering, and more.

## 📚 Contents

- **Formulas** - Algebra, calculus, linear algebra, probability, physics, chemistry, and engineering formulas
- **Plots** - Graph-ready items for math, physics, and engineering views
- **Algebra** - Quadratic formula, binomial theorem, sequences, etc.
- **Calculus** - Derivatives, integrals, series, transforms
- **Linear Algebra** - Matrices, eigenvalues, vector spaces
- **Probability** - Distributions, theorems, statistics
- **Physics** - Classical mechanics, quantum mechanics, electromagnetism
- **Chemistry** - Reactions, equilibrium, thermodynamics
- **Engineering** - Reserved for engineering-oriented formulas and plots
- **Control Theory** - State-space models, feedback systems, controllers, stability
- **Signal Processing** - Fourier analysis, convolution, sampling, filters, correlation
- **Image Processing** - Filtering, edge detection, morphology, color spaces, image transforms

## Examples

### Quadratic Formula

$$
x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}
$$

### Bayes Theorem

$$
P(A\mid B)=\frac{P(B\mid A)P(A)}{P(B)}
$$

### Maxwell Equations

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J}+\mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

## 📦 Data Format

Formula data lives under `formulas/<category>/<subcategory>.json`.
Plot data lives under `plots/<category>/<subcategory>.json`.

Path names use kebab-case. The `category` and `subcategory` fields inside each entry must match that path in Title Case:

```txt
formulas/
  linear-algebra/
    vector-norms.json

plots/
  physics/
    wave-response.json
```

```json
{
  "category": "Linear Algebra",
  "subcategory": "Vector Norms"
}
```

Each JSON file contains an array of entries with the following shared structure:

```json
{
  "id": "quadratic-formula",
  "title": "Quadratic formula",
  "kind": "formula",
  "category": "Algebra",
  "subcategory": "Equations",
  "latex": "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
  "description": "Solution of ax^2+bx+c=0.",
  "tags": ["algebra", "equation", "polynomial"],
  "source": "https://en.wikipedia.org/wiki/Quadratic_formula"
}
```

### Fields

- `id` (required): Unique identifier in kebab-case
- `title` (required): Human-readable title
- `kind` (optional): Entry type, `formula` or `plot`
- `category` (required): Main category, matching the first-level folder
- `subcategory` (required): Subcategory, matching the JSON filename
- `latex` (required): LaTeX code
- `description` (optional): Brief description
- `tags` (required): Array of searchable tags
- `source` (optional): Reference URL

## 🚀 Usage

### Direct JSON Access

```javascript
// Fetch from GitHub
const response = await fetch('https://raw.githubusercontent.com/YOUR_USERNAME/LaTeXgO/main/formulas/algebra/equations.json')
const formulas = await response.json()
```

### Python

```python
import json
import urllib.request

url = 'https://raw.githubusercontent.com/YOUR_USERNAME/LaTeXgO/main/formulas/algebra/equations.json'
with urllib.request.urlopen(url) as response:
    formulas = json.loads(response.read())
```

### Command Line

```bash
curl https://raw.githubusercontent.com/YOUR_USERNAME/LaTeXgO/main/formulas/algebra/equations.json
```

## 📊 Statistics

- Total formulas: 60+
- Categories: 9
- Plot collections: 0+
- Languages: LaTeX

## 🤝 Contributing

Contributions are welcome! Please:

1. Follow the JSON schema in `schema.json`
2. Place entries under `formulas/<category>/<subcategory>.json`
3. Place plot entries under `plots/<category>/<subcategory>.json`
4. Keep `category` and `subcategory` aligned with the path
5. Set `kind` when you want the entry type to be explicit
6. Ensure LaTeX code is valid
7. Add appropriate tags
8. Include source references when possible

## 📄 License

MIT License - Free to use in any project

## 🔗 Related Projects

- [InstaTex](https://github.com/YOUR_USERNAME/InstaTex) - Web-based LaTeX editor
- [LaTeXgO VSCode](https://github.com/YOUR_USERNAME/LaTeXgO-VSCode) - VSCode extension

## 📮 Contact

Issues and suggestions: [GitHub Issues](https://github.com/YOUR_USERNAME/LaTeXgO/issues)
