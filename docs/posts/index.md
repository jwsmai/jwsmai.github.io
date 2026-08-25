---
title: Posts
---

<script setup>
import { data } from './posts.data'
</script>

# Posts

<!-- Auto-generated from docs/posts/*.md — no need to edit this list manually. -->

<ul class="posts-list">
  <li v-for="post in data" :key="post.url">
    <a :href="post.url">{{ post.title }}</a>
    <span v-if="post.date" class="posts-list-date">{{ post.date }}</span>
    <span v-if="post.tags?.length" class="posts-list-tags">
      <span v-for="tag in post.tags" :key="tag" class="posts-list-tag">{{ tag }}</span>
    </span>
  </li>
</ul>
