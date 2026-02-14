# Rivet Shopify theme

Rivet is an urban fashion Shopify theme built for high-impact visual merchandising and conversion-focused product discovery.

This codebase was designed around Shopify Theme Store expectations and premium-theme patterns, including:

- Dynamic product pages with media-rich merchandising
- Variant swatches and real-time product price updates
- Quick buy and image rollover in product grids
- Collection and search faceted filtering
- Lookbook and editorial storytelling sections
- Multi-level navigation with predictive search
- Country and language selectors
- Related and complementary product recommendations

## Theme architecture

```bash
.
├── assets
├── blocks
├── config
├── layout
├── locales
├── sections
├── snippets
└── templates
```

## Key sections

- `sections/hero-banner.liquid`
- `sections/featured-collection.liquid`
- `sections/featured-product.liquid`
- `sections/lookbook.liquid`
- `sections/editorial-content.liquid`
- `sections/product.liquid`
- `sections/collection.liquid`
- `sections/search.liquid`
- `sections/cart.liquid`

## Notes

- Theme settings include branding, typography, color system, social media, and layout controls.
- Templates are OS 2.0 JSON templates with section groups for header and footer.
- Product and featured product sections both support app blocks and custom Liquid insertion points.

## License

This project is licensed under [MIT](./LICENSE.md).
