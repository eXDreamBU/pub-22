<script lang="ts">
  import { app, now } from '../state.svelte';
  import { shiftsCsv, shiftsInPeriod, tabsCsv, tabsInPeriod, type Period } from '../lib/report';
  import PeriodChips from './PeriodChips.svelte';
  import { shareOrDownload } from './share';

  let period = $state<Period>('month');
  let message = $state('');

  async function exportCsv(kind: 'schichten' | 'deckel') {
    const at = new Date();
    const text =
      kind === 'schichten'
        ? shiftsCsv(shiftsInPeriod(app.db.shifts, period, at))
        : tabsCsv(tabsInPeriod(app.db.history, period, at));
    const file = new File([text], `pub22-${kind}-${now().slice(0, 10)}.csv`, { type: 'text/csv' });
    message = (await shareOrDownload(file)) ? 'Datei erstellt.' : 'Abgebrochen.';
  }
</script>

<div class="stack panel">
  <h3>Export für Excel (CSV)</h3>
  <p class="muted">Zeitraum wählen, dann über das Teilen-Menü sichern (am iPad: „In Dateien sichern“).</p>
  <PeriodChips bind:value={period} />
  <div class="row">
    <button class="primary grow" onclick={() => exportCsv('schichten')}>Schichten als CSV</button>
    <button class="primary grow" onclick={() => exportCsv('deckel')}>Deckel als CSV</button>
  </div>
  {#if message}<p>{message}</p>{/if}
</div>

<style>
  .stack {
    display: grid;
    gap: 0.8rem;
    max-width: 640px;
  }
  h3,
  p {
    margin: 0;
  }
</style>
