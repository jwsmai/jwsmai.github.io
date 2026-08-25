import fs from 'node:fs'
import path from 'node:path'

export interface PostMeta {
  title: string
  url: string
  date?: string
  tags?: string[]
}

/** Extract title / sidebarTitle / date / tags from a markdown frontmatter block. */
export function parseFrontmatter(raw: string): { title?: string; sidebarTitle?: string; date?: string; tags?: string[] } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm = match[1]
  const title = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim()
  const sidebarTitle = fm.match(/^sidebarTitle:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim()
  const date = fm.match(/^date:\s*(.+?)\s*$/m)?.[1]?.trim()
  const tags = fm.match(/^tags:\s*$/m)
    ? Array.from(fm.matchAll(/^\s*-\s*(.+?)\s*$/gm)).map((m) => m[1].trim())
    : undefined
  return { title, sidebarTitle, date, tags: tags?.length ? tags : undefined }
}

/**
 * Scan a directory for post markdown files (excluding index.md).
 * Returns metadata parsed from each file's frontmatter.
 */
export function scanPosts(dir: string): PostMeta[] {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .sort()

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
    const { title, sidebarTitle, date, tags } = parseFrontmatter(raw)
    const slug = f.replace(/\.md$/, '')
    return { title: sidebarTitle || title || slug, url: `/posts/${slug}`, date, tags }
  })
}

/**
 * Sort posts: dated posts appear in reverse-chronological order (newest
 * first); undated posts stay pinned at the top in file-name order, so
 * pages like resumes / cover letters remain prominent.
 */
export function sortPosts(posts: PostMeta[]): PostMeta[] {
  const dated = posts
    .filter((p) => p.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
  const undated = posts.filter((p) => !p.date)
  return [...undated, ...dated]
}
