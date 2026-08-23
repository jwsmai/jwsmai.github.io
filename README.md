# Personal Tech Blog

A personal tech blog built with [VitePress](https://vitepress.dev/), deployed on GitHub Pages.

## Local Development

```bash
# Install dependencies
npm install

# Start the local dev server (default http://localhost:5173)
npm run dev

# Build the production version
npm run build

# Preview the build output locally
npm run preview
```

## Writing Posts

1. Create a new `.md` file under `docs/posts/` with the following format:

```md
---
title: Post Title
description: Short description (optional)
date: 2026-08-23
tags:
  - tag1
  - tag2
---

# Post body
```

2. Update the links in `docs/posts/index.md` and the sidebar config in `docs/.vitepress/config.mts`.

## Deploying to GitHub Pages

### 1. Create the Repository

Create a new repository on GitHub:

- **Recommended name: `blog`**: the site will be deployed to `https://<your-username>.github.io/blog/`
- Or use `<your-username>.github.io`: the site will be deployed to `https://<your-username>.github.io/` (no subpath)

> The deployment config (GitHub Actions) automatically adapts to both cases — no need to manually change the base path.

### 2. Push the Code

```bash
cd blog
git init
git add .
git commit -m "Initial commit: VitePress blog"
git branch -M main
git remote add origin git@github.com:<your-username>/blog.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to the repository page → **Settings** → **Pages**
2. In **Build and deployment**, set **Source** to **GitHub Actions**
3. Save, then go to the **Actions** tab to watch the deployment progress
4. Once the first deployment finishes, the site will be live at `https://<your-username>.github.io/blog/` (or the corresponding domain)

### 4. Daily Updates

Every `git push` to `main` triggers GitHub Actions to rebuild and redeploy automatically.

## Customization

- **Site title/description**: edit `title` and `description` in `docs/.vitepress/config.mts`
- **Navigation/sidebar**: edit `themeConfig` in `docs/.vitepress/config.mts`
- **Home page content**: edit `docs/index.md`
- **Site favicon**: replace `docs/public/favicon.svg`
- **Social links**: edit `socialLinks` in `docs/.vitepress/config.mts` (currently points to `https://github.com/jwsmai`)
