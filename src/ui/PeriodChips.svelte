<script lang="ts">
  import type { Period } from '../lib/report';

  let { value = $bindable() }: { value: Period } = $props();

  const periods: [Period, string][] = [
    ['week', 'Woche'],
    ['month', 'Monat'],
    ['year', 'Jahr'],
    ['all', 'Alles'],
  ];
</script>

<div class="row">
  {#each periods as [period, label] (period)}
    <button class="small" class:primary={value === period} onclick={() => (value = period)}>{label}</button>
  {/each}
</div>
