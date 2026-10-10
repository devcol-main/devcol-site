<script setup lang="ts">
import { useSidebar } from 'vitepress/theme-without-fonts'
import { withBase } from 'vitepress'
import { links } from './site'

const { hasSidebar } = useSidebar()
</script>

<template>
  <footer class="foot" :class="{ 'has-sidebar': hasSidebar }">
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <p class="foot-brand"><span class="chip"><img :src="withBase('/logo.png')" alt="" width="28" height="28" /></span>DevCol</p>
          <p>One developer, one indie game, and a public record of how it gets built. DevLogs, project write-ups, and technical notes.</p>
        </div>
        <div>
          <h3>Site</h3>
          <ul><li><a href="/projects/">Projects</a></li><li><a href="/blog/">DevLog</a></li><li><a href="/study/">Study</a></li></ul>
        </div>
        <div>
          <h3>More</h3>
          <ul><li><a href="/about">About</a></li><li><a href="/faq">FAQ</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy-policy">Privacy Policy</a></li></ul>
        </div>
        <div>
          <h3>Follow</h3>
          <ul>
            <li><a :href="links.youtube">YouTube</a></li>
            <li><a :href="links.itch">itch.io</a></li>
            <li><a :href="links.github">GitHub</a></li>
            <li><a :href="links.discord">Discord</a></li>
            <li><a :href="links.x">X (@DevCol_Main)</a></li>
          </ul>
        </div>
      </div>
      <div class="foot-bottom">Copyright &copy; 2026-present DevCol (by in9)</div>
    </div>
  </footer>
</template>
