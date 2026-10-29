<script setup lang="ts">
import Arrow from './Arrow.vue'
</script>

<template>
  <section class="section tight-top" data-bg="paper-2" aria-labelledby="cta-title">
    <div class="wrap">
      <div class="cta-band gridded has-ticks rv-band">
        <span class="ticks" aria-hidden="true"></span>
        <div>
          <p class="sec-label">Contact</p>
          <h2 id="cta-title">Contact us</h2>
          <p>Feedback, questions, or press and business inquiries. The Contact page lists the email address and other ways to reach me.</p>
        </div>
        <a class="btn alt" href="/contact">Go to Contact<span class="ico" aria-hidden="true"><Arrow kind="right" :width="1.6" /></span></a>
      </div>
    </div>
  </section>
</template>
