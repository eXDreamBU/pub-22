<script lang="ts">
  import { app, now } from '../state.svelte';
  import {
    addItem,
    availablePoints,
    cancelTab,
    payPart,
    redeemReward,
    removeItem,
    setDiscountSteps,
    settleTogether,
    tabSummary,
    type Tab,
  } from '../lib/db';
  import { formatEuro, pointsFor, tabTotal } from '../lib/money';
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
  let partDialog: HTMLDialogElement;
  let renameDialog: HTMLDialogElement;
  let error = $state('');

  // Paying together: other open tabs this guest also pays, and whose tab pays (gets all points).
  let others = $derived(app.db.tabs.filter((t) => t.id !== tab.id));
  let together = $state<string[]>([]);
  let payerId = $state('');
  let group = $derived([tab, ...others.filter((t) => together.includes(t.id))]);
  let payer = $derived(group.find((t) => t.id === payerId) ?? tab);
  let groupPaid = $derived(group.reduce((sum, t) => sum + tabSummary(app.db, t).paidCents, 0));
  let groupPoints = $derived(payer.customerId ? pointsFor(groupPaid, app.db.settings.pointsPerEuro) : 0);

  // Paying part: how many of each line are paid now.
  let partQtys = $state<number[]>([]);
  let partCents = $derived(tabTotal(tab.lines.map((l, i) => ({ priceCents: l.priceCents, qty: partQtys[i] ?? 0 }))));

  let newLabel = $state('');

  function tryRedeem(action: () => void) {
    try {
      action();
      error = '';
    } catch (e) {
      error = (e as Error).message;
    }
  }

  function showSettle() {
    together = [];
    payerId = tab.id;
    settleDialog.showModal();
  }

  function doSettle() {
    settleTogether(app.db, group.map((t) => t.id), payer.id, now());
    settleDialog.close();
    app.selectedTabId = null;
  }

  function showPart() {
    partQtys = tab.lines.map(() => 0);
    partDialog.showModal();
  }

  function doPayPart() {
    try {
      payPart(app.db, tab.id, partQtys, now());
    } catch (e) {
      error = (e as Error).message;
      return;
    }
    partDialog.close();
    if (!app.db.tabs.includes(tab)) app.selectedTabId = null;
  }

  function showRename() {
    newLabel = tab.label;
    renameDialog.showModal();
  }

  function doRename(e: SubmitEvent) {
    e.preventDefault();
    if (newLabel.trim()) tab.label = newLabel.trim();
    renameDialog.close();
  }

  function doCancel() {
    if (tab.lines.length && !confirm(`Deckel „${tab.label}“ ohne Abrechnen löschen?`)) return;
    cancelTab(app.db, tab.id);
    app.selectedTabId = null;
  }
</script>

<div class="panel-grid">
  <header class="row">
    <h2>{tab.label}</h2>
    <button class="small" aria-label="Deckel umbenennen" onclick={showRename}>✏️</button>
    <span class="grow"></span>
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
    <button class="grow" onclick={showPart} disabled={!tab.lines.length}>Teil zahlen</button>
    <button class="ok grow" onclick={showSettle}>Abrechnen</button>
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
  {#if others.length}
    <p class="muted">Zahlt auch für:</p>
    {#each others as t (t.id)}
      <label class="check">
        <input type="checkbox" value={t.id} bind:group={together} />
        <span class="grow">{t.label}</span>
        <span class="num">{formatEuro(tabSummary(app.db, t).paidCents)}</span>
      </label>
    {/each}
  {/if}
  {#if group.length > 1}
    <p class="muted">Wer zahlt?</p>
    <div class="row wrap">
      {#each group as t (t.id)}
        <button class="small" class:primary={t.id === payer.id} onclick={() => (payerId = t.id)}>{t.label}</button>
      {/each}
    </div>
    <div class="sums">
      {#each group as t (t.id)}
        <div class="row"><span class="grow">{t.label}</span><span class="num">{formatEuro(tabSummary(app.db, t).paidCents)}</span></div>
      {/each}
    </div>
  {:else}
    <div class="row"><span class="grow">Summe</span><span class="num">{formatEuro(summary.totalCents)}</span></div>
    {#if summary.discountCents}
      <div class="row"><span class="grow">Rabatt</span><span class="num">−{formatEuro(summary.discountCents)}</span></div>
    {/if}
  {/if}
  <div class="row pay"><b class="grow">Kassieren</b><b class="num">{formatEuro(groupPaid)}</b></div>
  <p class="muted">Zählt in die laufende Schicht.</p>
  {#each group as t (t.id)}
    {#each t.rewards as r, i (i)}
      <p>🎁 Gratis ausgeben: {r.name}{#if group.length > 1} ({t.label}){/if}</p>
    {/each}
  {/each}
  {#if group.length > 1}
    <p>
      {#if payer.customerId}⭐ {payer.label} bekommt +{groupPoints} Punkte (für alle {group.length} Deckel){:else}Keine Punkte:
        {payer.label} zahlt ohne Karte.{/if}
    </p>
  {:else if tab.customerId}
    <p>
      +{summary.pointsEarned} Punkte{#if summary.pointsSpent}, −{summary.pointsSpent} eingelöst{/if}
    </p>
  {/if}
  <div class="row">
    <button class="grow" onclick={() => settleDialog.close()}>Zurück</button>
    <button class="ok grow" onclick={doSettle}>Bezahlt</button>
  </div>
</dialog>

<dialog bind:this={partDialog} onclose={() => (error = '')}>
  <h2>Teil zahlen: {tab.label}</h2>
  <p class="muted">Antippen, was jetzt bezahlt wird:</p>
  {#each tab.lines as line, i (i)}
    <div class="row line">
      <span class="grow">{line.name} {line.size ?? ''} <span class="muted">(von {line.qty})</span></span>
      <button class="small" aria-label="Eins weniger" disabled={!partQtys[i]} onclick={() => partQtys[i]--}>−</button>
      <span class="qty">{partQtys[i]}</span>
      <button class="small" aria-label="Eins mehr" disabled={partQtys[i] >= line.qty} onclick={() => partQtys[i]++}>+</button>
      <span class="num part">{partQtys[i] ? formatEuro(line.priceCents * partQtys[i]) : '–'}</span>
    </div>
  {/each}
  <div class="row pay"><b class="grow">Kassieren</b><b class="num">{formatEuro(partCents)}</b></div>
  <div class="row muted"><span class="grow">Bleibt offen</span><span class="num">{formatEuro(summary.totalCents - partCents)}</span></div>
  <p class="muted">Teilzahlung ohne Punkte. Zählt in die laufende Schicht.</p>
  {#if error}<p class="error">{error}</p>{/if}
  <div class="row">
    <button class="grow" onclick={() => partDialog.close()}>Zurück</button>
    <button class="ok grow" disabled={!partCents} onclick={doPayPart}>Teil bezahlt</button>
  </div>
</dialog>

<dialog bind:this={renameDialog}>
  <form onsubmit={doRename}>
    <h2>Deckel umbenennen</h2>
    <label>Name oder Tisch <input bind:value={newLabel} /></label>
    <div class="row">
      <button type="button" class="grow" onclick={() => renameDialog.close()}>Abbrechen</button>
      <button type="submit" class="primary grow" disabled={!newLabel.trim()}>Speichern</button>
    </div>
  </form>
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
  .check {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    color: var(--text);
    font-size: 1rem;
    padding: 0.2rem 0;
  }
  .check input {
    width: 24px;
    min-height: 24px;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .sums {
    border-top: 1px solid var(--line);
    margin-top: 0.6rem;
    padding-top: 0.4rem;
  }
  .qty {
    min-width: 2ch;
    text-align: center;
  }
  .part {
    min-width: 5rem;
    text-align: right;
  }
  .pay {
    font-size: 1.4rem;
    margin: 0.6rem 0;
  }
</style>
