<script lang="ts">
  import { app } from '../state.svelte';
  import { formatEuro } from '../lib/money';
  import { runningShift } from '../lib/report';
  import { formatTime } from './format';
  import CustomersTab from './CustomersTab.svelte';
  import DrinksTab from './DrinksTab.svelte';
  import ExportTab from './ExportTab.svelte';
  import PeriodsTab from './PeriodsTab.svelte';
  import ShiftCloseDialog from './ShiftCloseDialog.svelte';
  import ShiftsTab from './ShiftsTab.svelte';

  const tabs = [
    ['shifts', 'Schichten'],
    ['periods', 'Woche / Monat'],
    ['drinks', 'Getränke'],
    ['customers', 'Kunden'],
    ['export', 'Export'],
  ] as const;

  let active = $state<(typeof tabs)[number][0]>('shifts');
  let running = $derived(runningShift(app.db));
  let closeDialog: ShiftCloseDialog;

  function openTab(tabId: string) {
    app.selectedTabId = tabId;
    app.view = 'bar';
  }
</script>

<div class="revenue">
  <div class="panel head">
    <div class="grow">
      <p class="muted">
        {running.startedAt ? `Laufende Schicht seit ${formatTime(running.startedAt)}` : 'Laufende Schicht'}
      </p>
      <b class="big">{formatEuro(running.paidCents)}</b>
      <span class="muted">bezahlt · {running.tabCount} Deckel</span>
    </div>
    {#if running.openTabs}
      <span>Noch offen: {running.openTabs} Deckel, {formatEuro(running.openCents)}</span>
    {/if}
    <div class="close">
      <button class="primary" disabled={running.openTabs > 0 || running.tabCount === 0} onclick={() => closeDialog.open()}
        >Schicht abschließen</button
      >
      {#if running.openTabs}<span class="muted">Erst alle Deckel abrechnen</span>{/if}
    </div>
    {#if running.openTabs}
      <div class="row open">
        {#each app.db.tabs as tab (tab.id)}
          <button class="small" onclick={() => openTab(tab.id)}>{tab.label}</button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="seg chips">
    {#each tabs as [id, label] (id)}
      <button class:active={active === id} onclick={() => (active = id)}>{label}</button>
    {/each}
  </div>

  <div class="body">
    {#if active === 'shifts'}
      <ShiftsTab />
    {:else if active === 'periods'}
      <PeriodsTab />
    {:else if active === 'drinks'}
      <DrinksTab />
    {:else if active === 'customers'}
      <CustomersTab />
    {:else}
      <ExportTab />
    {/if}
  </div>
</div>

<ShiftCloseDialog bind:this={closeDialog} />

<style>
  .revenue {
    height: 100%;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 1rem;
    padding: 1.2rem 1.5rem;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5rem;
    border-color: var(--accent);
    padding: 1.2rem 1.4rem;
  }
  .head p {
    margin: 0;
  }
  .big {
    font-size: 2.1rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .close {
    display: grid;
    gap: 0.3rem;
    justify-items: end;
  }
  .close button {
    min-height: 56px;
  }
  .open {
    flex-basis: 100%;
    flex-wrap: wrap;
  }
  .chips {
    justify-self: start;
    flex-wrap: wrap;
  }
  .body {
    overflow-y: auto;
    min-height: 0;
  }
</style>
