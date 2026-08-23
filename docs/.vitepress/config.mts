import { defineConfig } from 'vitepress'

// GitHub Pages 部署的 base 路径由 GitHub Actions 通过环境变量注入：
// - 仓库名为 <用户名>.github.io 时 -> '/'
// - 仓库名为 blog 等其他名字时   -> '/blog/'
// 本地开发/预览时默认 '/'
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  title: '个人技术博客',
  description: '技术笔记 · 踩坑记录 · 学习教程',
  lang: 'zh-CN',
  base,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }]
  ],

  themeConfig: {
    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/posts/' }
    ],

    // 侧边栏
    sidebar: [
      {
        text: '文章列表',
        items: [
          { text: '博客搭建记录', link: '/posts/hello-world' }
        ]
      }
    ],

    // 页脚
    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026'
    },

    // 站内搜索（本地搜索，无需外部服务）
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '未找到相关内容',
            resetButtonTitle: '清除查询条件',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },

    // 文章页显示最近更新时间
    lastUpdated: {
      text: '最后更新于',
      formatOptions: { dateStyle: 'full', timeStyle: 'short' }
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/jwsmai' }
    ]
  }
})
