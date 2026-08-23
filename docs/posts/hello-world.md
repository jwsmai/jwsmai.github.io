---
title: 博客搭建记录：从零开始用 VitePress + GitHub Pages 建站
description: 本文记录了这个博客的搭建过程，包括项目初始化、站点配置和自动化部署。
date: 2026-08-23
tags:
  - VitePress
  - GitHub Pages
---

# 博客搭建记录：从零开始用 VitePress + GitHub Pages 建站

## 为什么选择 VitePress

- 基于 Vite，开发体验好，构建速度快
- 专注写 Markdown，无需关心页面细节
- 默认支持搜索、暗色模式、代码高亮，开箱即用

## 项目初始化

```bash
# 创建项目目录
mkdir blog && cd blog

# 初始化 package.json
npm init -y

# 安装 VitePress
npm install -D vitepress
```

## 目录结构

```
blog/
├── .github/workflows/deploy.yml   # 自动部署到 GitHub Pages
├── docs/
│   ├── .vitepress/config.mts      # VitePress 配置
│   ├── index.md                   # 首页
│   └── posts/                     # 文章目录
└── package.json
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发预览 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 本地预览构建产物 |

## 写文章就是这么简单

新建一个 Markdown 文件，写上文章内容：

```md
---
title: 文章标题
date: 2026-08-23
---

# 正文从这里开始

这是第一段内容，支持 **粗体**、*斜体*、[链接](https://example.com) 等语法。
```

> **提示**：本文是示例文章，你可以直接修改或删除它。

代码块自动高亮，支持大多数主流语言：

```ts
function greet(name: string): string {
  return `Hello, ${name}!`
}
```

## 下一步

1. 把项目推送到 GitHub 仓库
2. 开启 GitHub Pages（Settings → Pages → 选择 GitHub Actions）
3. 之后每次 `git push` 都会自动重新部署
