# Frontend Structure

```text
frontend/
+-- .gitignore
+-- FRONTEND_STRUCTURE.md
+-- README.md
+-- eslint.config.js
+-- index.html
+-- package-lock.json
+-- package.json
+-- tsconfig.app.json
+-- tsconfig.json
+-- tsconfig.node.json
+-- vite.config.ts
+-- public/
|   +-- favicon.svg
|   +-- icons.svg
+-- src/
    +-- App.css
    +-- App.tsx
    +-- index.css
    +-- main.tsx
    +-- assets/
        +-- hero.png
        +-- react.svg
        +-- vite.svg
```

## Notes

- `src/main.tsx` is the React entry point.
- `src/App.tsx` contains the current starter app component.
- `src/index.css` and `src/App.css` contain global and app-level styles.
- `src/assets/` contains frontend images and SVG assets imported by React components.
- `public/` contains static assets served directly by Vite.
- `node_modules/` and `dist/` are generated folders and are intentionally excluded from this structure.
