import { defineConfig } from 'vitepress'

// The base path is injected by GitHub Actions via an env var:
// - Repo named <username>.github.io  -> '/'
// - Repo named blog or other names   -> '/blog/'
// Local dev/preview defaults to '/'
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  title: 'Ryan\'s  Blog',
  description: 'Tech notes, debugging records, and tutorials',
  lang: 'en-US',
  base,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }]
  ],

  themeConfig: {
    // Top navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Posts', link: '/posts/' },
      { text: 'Resume', link: '/posts/resume' }
    ],

    // Sidebar
    sidebar: [
      {
        text: 'Posts',
        items: [
          { text: 'Building This Blog', link: '/posts/hello-world' }
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
