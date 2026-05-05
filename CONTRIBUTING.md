# Contributing

Thanks for considering a contribution.

The best first contribution is usually a LaTeXgO formula entry. LaTeXgO lives in `LaTeXgO/` and is the open formula library used by instaTeX.

## Formula Contributions

1. Choose the closest file under `LaTeXgO/formulas/<category>/<subcategory>.json`.
2. Add one formula entry following `LaTeXgO/schema.json`.
3. Keep `id` unique, stable, lowercase, and hyphenated.
4. Keep `category` and `subcategory` aligned with the folder and filename.
5. Use TeX source only.
6. Add useful tags.
7. Run `npm run validate:latexgo`.

Good entries are small, reusable formulas from common math, physics, chemistry, or related subjects.

## Do Not Submit

- proprietary code
- images or SVG previews copied from other sites
- scraped third-party formula libraries
- site-specific templates or branding assets
- formulas you are not allowed to share

## Validation

Before opening a PR, run:

```bash
npm run validate:latexgo
npm run lint
npm run build
```

The validator checks JSON shape, required fields, duplicate IDs, supported categories, and duplicate tags.

## License

LaTeXgO formula data is licensed in the LaTeXgO repository. See `LaTeXgO/README.md` for the current terms.

instaTeX application code licensing is controlled separately by the project owner.
