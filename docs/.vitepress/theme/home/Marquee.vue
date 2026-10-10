<script setup lang="ts">
const items = ['Game Development', 'Unreal Engine', 'C++', 'Networking', 'Unity', 'C#', 'AI-Assisted Tools', 'Game Design']
</script>

<template>
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <span v-for="(t, i) in [...items, ...items]" :key="i">{{ t }}</span>
    </div>
  </div>
</template>
