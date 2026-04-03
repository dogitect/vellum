# Content Directory

JSON metadata files for the portfolio site.

## Structure

```
content/
├── about/index.json          # About page section data
└── works/
    └── [category]/
        ├── index.json         # Category metadata
        └── [project]/
            └── metadata.json  # Project metadata
```

## Usage

- **Images** are stored separately in `public/images/`
- **JSON files** define content structure and text
- Add new categories/projects by creating matching folders and JSON files
