# TeXShelf

TeXShelf is an open shelf of reusable TeX formulas for math, physics, and chemistry.

It is designed to be used by LaTeXgO and by anyone who wants a clean, searchable formula library. The library stores formula source, not screenshots or copied assets.

## Formula Format

Each JSON file contains an array of entries:

```json
{
  "id": "quadratic-formula",
  "title": "Quadratic formula",
  "category": "Algebra",
  "subcategory": "Equations",
  "latex": "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
  "description": "Solution of ax^2+bx+c=0.",
  "tags": ["algebra", "equation"],
  "level": "school"
}
```

Required fields:

- `id`: stable lowercase identifier, using hyphens
- `title`: short display name
- `category`: broad area
- `latex`: reusable TeX source
- `tags`: searchable keywords

Optional fields:

- `subcategory`: narrower topic
- `description`: short context
- `level`: `school`, `undergraduate`, `graduate`, or `reference`
- `source`: public-domain or contributor-written reference note

## Contribution Rules

- Submit formulas as TeX source only.
- Do not copy proprietary code, images, SVG previews, or site-specific assets.
- Prefer common textbook formulas, public-domain knowledge, or formulas you wrote yourself.
- Keep entries small and reusable.
- Use a unique `id`.
- Put formulas in the most relevant JSON file.
- Run `npm run validate:texshelf` before submitting.

## License

TeXShelf formula data is licensed under CC BY 4.0. See `LICENSE.md`.

Suggested files:

- `algebra.json`
- `calculus.json`
- `physics.json`
- `chemistry.json`

## Relationship With LaTeXgO

LaTeXgO is the editor. TeXShelf is the formula library. LaTeXgO can read TeXShelf entries and insert the selected formula into the editor.
