# 个人技术博客

基于 [VitePress](https://vitepress.dev/) 构建的个人技术博客，部署在 GitHub Pages 上。

## 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产版本
npm run build

# 本地预览构建产物
npm run preview
```

## 写文章

1. 在 `docs/posts/` 目录下新建 `.md` 文件，格式如下：

```md
---
title: 文章标题
description: 文章简介（可选）
date: 2026-08-23
tags:
  - 标签1
  - 标签2
---

# 文章正文
```

2. 更新文章列表页 `docs/posts/index.md` 和侧边栏配置 `docs/.vitepress/config.mts` 中的链接。

## 部署到 GitHub Pages

### 1. 创建仓库

在 GitHub 网页上新建一个仓库：

- **仓库名建议用 `blog`**：站点将部署到 `https://<你的用户名>.github.io/blog/`
- 也可以叫 `<你的用户名>.github.io`：站点将部署到 `https://<你的用户名>.github.io/`（无需子路径）

> 部署配置（GitHub Actions）已自动适配以上两种情况，无需手动修改 base 路径。

### 2. 推送代码

```bash
cd blog
git init
git add .
git commit -m "Initial commit: VitePress blog"
git branch -M main
git remote add origin git@github.com:<你的用户名>/blog.git
git push -u origin main
```

### 3. 开启 GitHub Pages

1. 进入仓库页面 → **Settings** → **Pages**
2. **Build and deployment** 的 **Source** 选择 **GitHub Actions**
3. 保存后，回到 **Actions** 标签页查看部署进度
4. 首次部署完成后，站点地址即为 `https://<你的用户名>.github.io/blog/`（或对应域名）

### 4. 日常更新

之后每次 `git push` 到 `main` 分支，GitHub Actions 都会自动重新构建并部署，无需手动操作。

## 自定义

- **站点标题/简介**：修改 `docs/.vitepress/config.mts` 中的 `title`、`description`
- **导航/侧边栏**：修改 `docs/.vitepress/config.mts` 中的 `themeConfig`
- **首页内容**：修改 `docs/index.md`
- **站点图标**：替换 `docs/public/favicon.svg`
- **社交链接**：修改 `docs/.vitepress/config.mts` 中的 `socialLinks`（当前指向 `https://github.com/jwsmai`，请改为你自己的账号）
