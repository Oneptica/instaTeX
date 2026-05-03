# Contributing

Thanks for considering a contribution.

The best first contribution is usually a TeXShelf formula entry. TeXShelf lives in `TexShelf/` and is the open formula library used by LaTeXgO.

## Formula Contributions

1. Choose the closest JSON file in `TexShelf/formulas/`.
2. Add one formula entry following `TexShelf/schema.json`.
3. Keep `id` unique, stable, lowercase, and hyphenated.
4. Use TeX source only.
5. Add useful tags.
6. Run `npm run validate:texshelf`.

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
npm run validate:texshelf
npm run lint
npm run build
```

The validator checks JSON shape, required fields, duplicate IDs, supported categories, and duplicate tags.

## License

TeXShelf formula data is licensed in the TeXShelf repository. See `TexShelf/README.md` for the current terms.

LaTeXgO application code licensing is controlled separately by the project owner.
