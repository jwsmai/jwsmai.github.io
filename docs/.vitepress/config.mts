import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { scanPosts, sortPosts } from './posts-utils'

// The base path is injected by GitHub Actions via an env var:
// - Repo named <username>.github.io  -> '/'
// - Repo named blog or other names   -> '/blog/'
// Local dev/preview defaults to '/'
const base = process.env.BASE_PATH || '/'

// Auto-discover posts for the sidebar — no manual list to maintain.
// New .md files under docs/posts/ appear here automatically.
const postsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../posts')
const sidebarPosts = sortPosts(scanPosts(postsDir)).map((p) => ({
  text: p.title,
  link: p.url
}))

export default defineConfig({
  title: 'Ryan\'s  Blog',
  description: 'Tech notes, debugging records, and tutorials',
  lang: 'en-US',
  base,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap' }]
  ],

  themeConfig: {
    // Top navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Posts', link: '/posts/' },
      { text: 'Reflections', link: '/reflection/' }
    ],

    // Sidebar
    sidebar: [
      {
        text: 'Posts',
        items: sidebarPosts
      },
      {
        text: 'Reflections',
        items: [
          { text: 'All Reflections', link: '/reflection/' },
          { text: '2026-08-24', link: '/reflection/2026-08-24' },
          { text: '2026-08-23', link: '/reflection/2026-08-23' },
          { text: '2026-08-22', link: '/reflection/2026-08-22' }
        ]
      }
    ],

    // Footer
    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright © 2023'
    },

    // Local search (no external service required)
    search: {
      provider: 'local'
    },

    // Show last updated time on posts
    lastUpdated: {
      text: 'Last updated',
      formatOptions: { dateStyle: 'full', timeStyle: 'short', forceLocale: true }
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jwsmai' }
    ]
  }
})
