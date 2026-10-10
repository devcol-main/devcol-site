<script setup lang="ts">
defineProps<{ kind?: 'right' | 'diag' | 'left'; width?: number }>()
</script>

<template>
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path v-if="kind === 'diag'" d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" :stroke-width="width ?? 1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path v-else-if="kind === 'left'" d="M13 8H3M7 4 3 8l4 4" fill="none" stroke="currentColor" :stroke-width="width ?? 1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path v-else d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" :stroke-width="width ?? 1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
