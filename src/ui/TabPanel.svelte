<script lang="ts">
  import { app, now } from '../state.svelte';
  import {
    addItem,
    availablePoints,
    cancelTab,
    redeemReward,
    removeItem,
    setDiscountSteps,
    settle,
    tabSummary,
    type Tab,
  } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import { formatTime } from './format';

  let { tab }: { tab: Tab } = $props();

  let products = $derived(app.db.products.filter((p) => !p.hidden));
  let categories = $derived([...new Set(products.map((p) => p.category))]);
  let picked = $state('');
  // Falls back to the first category when the picked one has no visible drinks (left).
  let category = $derived(categories.includes(picked) ? picked : categories[0]);
  let summary = $derived(tabSummary(app.db, tab));

  let redeemDialog: HTMLDialogElement;
  let settleDialog: HTMLDialogElement;
  let error = $state('');

  function tryRedeem(action: () => void) {
    try {
      action();
      error = '';
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function doSettle() {
    settle(app.db, tab.id, now());
    settleDialog.close();
    app.selectedTabId = null;
  }

  function doCancel() {
    if (tab.lines.length && !confirm(`Deckel „${tab.label}“ ohne Abrechnen löschen?`)) return;
    cancelTab(app.db, tab.id);
    app.selectedTabId = null;
  }
</script>

<div class="panel-grid">
  <header class="row">
    <h2 class="grow">{tab.label}</h2>
    {#if tab.customerId}<span class="muted">⭐ {availablePoints(app.db, tab)} Punkte frei</span>{/if}
    <span class="muted">seit {formatTime(tab.openedAt)}</span>
  </header>

  <div class="cats">
    {#each categories as c (c)}
      <button class="small" class:primary={c === category} onclick={() => (picked = c)}>{c}</button>
    {/each}
  </div>

  <div class="tiles">
    {#each products.filter((p) => p.category === category) as p (p.id)}
      <button class="tile" onclick={() => addItem(tab, p)}>
        <span>{p.name.replaceAll('/', '/​')}</span>
        <span><span class="muted">{p.size ?? ''}</span> <b>{formatEuro(p.priceCents)}</b></span>
      </button>
    {/each}
  </div>

  <div class="lines panel">
    <div class="scroll">
      {#each tab.lines as line, i (i)}
        <div class="row line">
          <span class="grow">{line.qty}× {line.name} {line.size ?? ''}</span>
          <span class="num">{formatEuro(line.priceCents * line.qty)}</span>
          <button class="small" aria-label="Eins entfernen" onclick={() => removeItem(tab, i)}>−</button>
        </div>
      {:else}
        <p class="muted">Getränk antippen = auf den Deckel.</p>
      {/each}
      {#each tab.rewards as r, i (i)}
        <div class="row line">
          <span class="grow">🎁 {r.name}</span>
          <span class="muted">−{r.points} P.</span>
          <button class="small" aria-label="Prämie zurücknehmen" onclick={() => tab.rewards.splice(i, 1)}>−</button>
        </div>
      {/each}
      {#if summary.discountCents}
        <div class="row line">
          <span class="grow">Rabatt ({tab.discountSteps * app.db.settings.discountPoints} P.)</span>
          <span class="num">−{formatEuro(summary.discountCents)}</span>
        </div>
      {/if}
    </div>
    <div class="row total">
      <b class="grow">Summe</b>
      <b class="num">{formatEuro(summary.paidCents)}</b>
    </div>
    {#if tab.customerId}
      <span class="muted">+{summary.pointsEarned} Punkte beim Abrechnen</span>
    {/if}
  </div>

  <div class="row actions">
    <button class="danger" onclick={doCancel}>Deckel löschen</button>
    {#if tab.customerId}
      <button class="grow" onclick={() => redeemDialog.showModal()}>🎁 Punkte einlösen</button>
    {/if}
    <button class="ok grow" onclick={() => settleDialog.showModal()}>Abrechnen</button>
  </div>
</div>

<dialog bind:this={redeemDialog} onclose={() => (error = '')}>
  <h2>Punkte einlösen</h2>
  <p>Frei: <b>{availablePoints(app.db, tab)} Punkte</b></p>
  <h3>Prämien</h3>
  <p class="muted">Prämien gibt es gratis, also nicht zusätzlich als Getränk buchen.</p>
  {#each app.db.rewards as r (r.id)}
    <div class="row line">
      <span class="grow">{r.name}</span>
      <span class="muted">{r.points} P.</span>
      <button
        class="small primary"
        disabled={availablePoints(app.db, tab) < r.points}
        onclick={() => tryRedeem(() => redeemReward(app.db, tab, r))}>Einlösen</button
      >
    </div>
  {:else}
    <p class="muted">Keine Prämien angelegt (Einstellungen).</p>
  {/each}
  <h3>Rabatt in €</h3>
  <p class="muted">
    {app.db.settings.discountPoints} Punkte = {formatEuro(app.db.settings.discountCents)} Rabatt
  </p>
  <div class="row">
    <button onclick={() => tryRedeem(() => setDiscountSteps(app.db, tab, tab.discountSteps - 1))} disabled={!tab.discountSteps}
      >−</button
    >
    <span class="grow center">{tab.discountSteps}× = {formatEuro(tab.discountSteps * app.db.settings.discountCents)}</span>
    <button onclick={() => tryRedeem(() => setDiscountSteps(app.db, tab, tab.discountSteps + 1))}>+</button>
  </div>
  {#if error}<p class="error">{error}</p>{/if}
  <button class="primary full" onclick={() => redeemDialog.close()}>Fertig</button>
</dialog>

<dialog bind:this={settleDialog}>
  <h2>Abrechnen: {tab.label}</h2>
  <div class="row"><span class="grow">Summe</span><span class="num">{formatEuro(summary.totalCents)}</span></div>
  {#if summary.discountCents}
    <div class="row"><span class="grow">Rabatt</span><span class="num">−{formatEuro(summary.discountCents)}</span></div>
  {/if}
  <div class="row pay"><b class="grow">Kassieren</b><b class="num">{formatEuro(summary.paidCents)}</b></div>
  <p class="muted">Zählt in die laufende Schicht.</p>
  {#each tab.rewards as r, i (i)}
    <p>🎁 Gratis ausgeben: {r.name}</p>
  {/each}
  {#if tab.customerId}
    <p>
      +{summary.pointsEarned} Punkte{#if summary.pointsSpent}, −{summary.pointsSpent} eingelöst{/if}
    </p>
  {/if}
  <div class="row">
    <button class="grow" onclick={() => settleDialog.close()}>Zurück</button>
    <button class="ok grow" onclick={doSettle}>Bezahlt</button>
  </div>
</dialog>

<style>
  .panel-grid {
    height: 100%;
    display: grid;
    grid-template-rows: auto auto fit-content(45%) minmax(0, 1fr) auto;
    gap: 0.7rem;
  }
  h2 {
    margin: 0;
  }
  .cats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .cats button {
    white-space: nowrap;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    grid-auto-rows: min-content;
    gap: 0.5rem;
    overflow-y: auto;
  }
  .tile {
    display: grid;
    gap: 0.15rem;
    background: #6b4718;
    border-color: #7d5520;
    padding: 0.6rem;
    text-align: center;
    overflow-wrap: anywhere;
  }
  .lines {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
  }
  .scroll {
    overflow-y: auto;
  }
  .total {
    border-top: 1px solid var(--line);
    padding-top: 0.5rem;
    margin-top: 0.4rem;
    font-size: 1.2rem;
  }
  .line {
    padding: 0.15rem 0;
  }
  .actions button {
    min-height: 56px;
  }
  .center {
    text-align: center;
  }
  .error {
    color: var(--danger);
  }
  .full {
    width: 100%;
    margin-top: 1rem;
  }
  .pay {
    font-size: 1.4rem;
    margin: 0.6rem 0;
  }
</style>
