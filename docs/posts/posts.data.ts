import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanPosts, sortPosts } from '../.vitepress/posts-utils'

/**
 * VitePress data loader — powers the auto-generated list on /posts/.
 * See https://vitepress.dev/guide/data-loading
 */
export default {
  load() {
    return sortPosts(scanPosts(path.dirname(fileURLToPath(import.meta.url))))
  }
}
