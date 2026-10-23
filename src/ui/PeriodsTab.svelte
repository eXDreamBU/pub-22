<script lang="ts">
  import { app } from '../state.svelte';
  import { formatEuro, formatSigned } from '../lib/money';
  import { periodTotals, type PeriodTotal } from '../lib/report';

  let weeks = $derived(periodTotals(app.db.shifts, 'week'));
  let months = $derived(periodTotals(app.db.shifts, 'month'));
</script>

{#snippet table(title: string, rows: PeriodTotal[])}
  <section class="panel">
    <h3>{title}</h3>
    <table class="report">
      <thead><tr><th></th><th class="num">Deckel</th><th class="num">Rabatt</th><th class="num">Aufs Haus</th><th class="num">Anzahlungen</th><th class="num">Umsatz</th></tr></thead>
      <tbody>
        {#each rows as r (r.key)}
          <tr>
            <td>{r.label}</td>
            <td class="num">{r.tabCount}</td>
            <td class="num">{r.discountCents ? `−${formatEuro(r.discountCents)}` : '–'}</td>
            <td class="num">{r.houseCents ? `−${formatEuro(r.houseCents)}` : '–'}</td>
            <td class="num">{r.depositCents ? formatSigned(r.depositCents) : '–'}</td>
            <td class="num"><b>{formatEuro(r.paidCents)}</b></td>
          </tr>
        {:else}
          <tr><td colspan="6" class="muted">Noch keine Schicht.</td></tr>
        {/each}
      </tbody>
    </table>
  </section>
{/snippet}

<div class="two">
  {@render table('Wochen', weeks)}
  {@render table('Monate', months)}
</div>

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }
  h3 {
    margin: 0 0 0.4rem;
  }
</style>
