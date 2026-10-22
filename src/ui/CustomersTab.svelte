<script lang="ts">
  import { app } from '../state.svelte';
  import { formatEuro } from '../lib/money';
  import { customerRanking, tabsInPeriod, type Period, type RankingKey } from '../lib/report';
  import PeriodChips from './PeriodChips.svelte';

  let period = $state<Period>('month');
  let sortBy = $state<RankingKey>('paid');
  let rows = $derived(customerRanking(app.db, tabsInPeriod(app.db, period, new Date()), sortBy));

  function open(customerId: string) {
    // A deleted customer has no detail page.
    if (!app.db.customers.some((c) => c.id === customerId)) return;
    app.selectedCustomerId = customerId;
    app.view = 'customers';
  }
</script>

{#snippet sortHead(key: RankingKey, label: string)}
  <th class="num"><button class="sort" onclick={() => (sortBy = key)}>{label}{sortBy === key ? ' ▼' : ''}</button></th>
{/snippet}

<div class="stack">
  <PeriodChips bind:value={period} />
  <table class="report">
    <thead>
      <tr>
        <th>Kunde</th>
        {@render sortHead('paid', 'Umsatz')}
        {@render sortHead('tabs', 'Deckel')}
        <th class="num">Ø pro Deckel</th>
        {@render sortHead('discount', 'Rabatt')}
        <th class="num">Freigetränke</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r (r.customerId ?? 'guests')}
        <tr class:muted={!r.customerId}>
          <td>
            {#if r.customerId}
              <button class="sort link" onclick={() => open(r.customerId!)}>{r.name}</button>
            {:else}
              {r.name}
            {/if}
          </td>
          <td class="num">{formatEuro(r.paidCents)}</td>
          <td class="num">{r.tabCount}</td>
          <td class="num">{formatEuro(r.avgCents)}</td>
          <td class="num">{r.discountCents ? `−${formatEuro(r.discountCents)}` : '–'}</td>
          <td class="num">{r.freeCount || '–'}</td>
        </tr>
      {:else}
        <tr><td colspan="6" class="muted">Keine Deckel in diesem Zeitraum.</td></tr>
      {/each}
    </tbody>
  </table>
  <p class="muted">Spaltenkopf antippen = sortieren. Name antippen = Kunde öffnen.</p>
</div>

<style>
  .stack {
    display: grid;
    gap: 0.8rem;
  }
  p {
    margin: 0;
  }
  .link {
    min-height: 44px;
    text-align: left;
    color: var(--accent);
  }
  th .sort {
    min-height: 44px;
    padding: 0 0.3rem;
  }
</style>
