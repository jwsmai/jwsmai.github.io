---
title: "Building This Blog: VitePress + GitHub Pages from Scratch"
description: "How this blog was built — project setup, site configuration, and automated deployment."
date: 2026-08-23
tags:
  - VitePress
  - GitHub Pages
---

# Building This Blog: VitePress + GitHub Pages from Scratch

## Why VitePress

- Built on Vite — great developer experience and fast builds
- Focus on writing Markdown, no need to worry about page details
- Search, dark mode, and code highlighting out of the box

## Project Setup

```bash
# Create the project directory
mkdir blog && cd blog

# Initialize package.json
npm init -y

# Install VitePress
npm install -D vitepress
```

## Directory Structure

```
blog/
├── .github/workflows/deploy.yml   # Auto-deploy to GitHub Pages
├── docs/
│   ├── .vitepress/config.mts      # VitePress configuration
│   ├── index.md                   # Home page
│   └── posts/                     # Posts directory
└── package.json
```

## Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Local development preview |
| `npm run build` | Build the production version |
| `npm run preview` | Preview the build output locally |

## Writing a Post Is That Simple

Create a new Markdown file and write your content:

```md
---
title: Post Title
date: 2026-08-23
---

# Content starts here

This is the first paragraph, supporting **bold**, *italic*, [links](https://example.com), and more.
```

> **Tip**: This is a sample post — feel free to edit or delete it.

Code blocks are highlighted automatically and support most popular languages:

```ts
function greet(name: string): string {
  return `Hello, ${name}!`
}
```

## Next Steps

1. Push the project to a GitHub repository
2. Enable GitHub Pages (Settings → Pages → choose GitHub Actions)
3. Every `git push` will automatically redeploy from now on
