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
        items: [
          { text: 'Resume (EN)', link: '/posts/resume_en' },
          { text: 'Resume (CN)', link: '/posts/resume' },
          { text: 'Resume (Nordic)', link: '/posts/resume_nordic' },
          { text: 'Cover Letter (Nordic)', link: '/posts/cover-letter-nordic' },
          { text: 'Building This Blog', link: '/posts/hello-world' },
          { text: 'Knowledge about AB Test', link: '/posts/ab-test' },
          { text: 'Nordic Interview Culture', link: '/posts/nordic-interview-culture' },
          { text: 'Nordic DE Interview Guide', link: '/posts/nordic-de-interview' },
          { text: 'Nordic DE Job Market', link: '/posts/nordic-data-engineer-job-market' },
          { text: 'GrabJobs JD Analysis', link: '/posts/grabjobs-jd-analysis' },
          { text: 'GrabJobs JD List', link: '/posts/grabjobs-jd-list' },
          { text: 'DE Job Vocabulary', link: '/posts/jd-vocabulary' },
          { text: 'Dimensional vs. Medallion', link: '/posts/dimensional-vs-medallion' },
          { text: 'Bloom Filters Explained', link: '/posts/bloom-filter' },
          { text: 'Nordic 90s Self-Intro', link: '/posts/nordic-self-intro' }
        ]
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
