<script lang="ts">
  import { app } from '../state.svelte';
  import { tabsInPeriod, topDrinks, type Period } from '../lib/report';
  import PeriodChips from './PeriodChips.svelte';

  let period = $state<Period>('month');
  let drinks = $derived(topDrinks(tabsInPeriod(app.db, period, new Date())));
</script>

<div class="stack">
  <PeriodChips bind:value={period} />
  <table class="report">
    <thead><tr><th>Getränk</th><th class="num">Verkauft</th></tr></thead>
    <tbody>
      {#each drinks as d (d.name + '|' + (d.size ?? ''))}
        <tr><td>{d.name} <span class="muted">{d.size ?? ''}</span></td><td class="num"><b>{d.qty}×</b></td></tr>
      {:else}
        <tr><td colspan="2" class="muted">Keine Verkäufe in diesem Zeitraum.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .stack {
    display: grid;
    gap: 0.8rem;
  }
</style>
