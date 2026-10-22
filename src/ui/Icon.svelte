<script lang="ts">
  // Icon markup comes only from icons.ts (our own constants), never from user input.
  let { svg, size = 20 }: { svg: string; size?: number } = $props();
</script>

<svg
  class="icon"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.7"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true">{@html svg}</svg
>
