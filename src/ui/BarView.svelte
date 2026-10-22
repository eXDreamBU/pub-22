<script lang="ts">
  import { app, now } from '../state.svelte';
  import { checkIn, openGuestTab, tabSummary } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import Scanner from './Scanner.svelte';
  import TabPanel from './TabPanel.svelte';

  let scanning = $state(false);
  let guestDialog: HTMLDialogElement;
  let guestName = $state('');

  let selected = $derived(app.db.tabs.find((t) => t.id === app.selectedTabId));

  function onCard(customerId: string) {
    scanning = false;
    app.selectedTabId = checkIn(app.db, customerId, now()).id;
  }

  function addGuest(e: SubmitEvent) {
    e.preventDefault();
    app.selectedTabId = openGuestTab(app.db, guestName, now()).id;
    guestName = '';
    guestDialog.close();
  }

  function points(customerId?: string) {
    return app.db.customers.find((c) => c.id === customerId)?.points;
  }
</script>

<div class="bar">
  <aside>
    <div class="row">
      <button class="primary grow" onclick={() => (scanning = true)}>📷 Karte scannen</button>
      <button class="grow" onclick={() => guestDialog.showModal()}>+ Gast</button>
    </div>
    <p class="muted">In der Bar ({app.db.tabs.length})</p>
    <ul>
      {#each app.db.tabs as tab (tab.id)}
        <li>
          <button class="tab" class:selected={tab.id === app.selectedTabId} onclick={() => (app.selectedTabId = tab.id)}>
            <span class="row">
              <b class="grow">{tab.label}</b>
              <span class="num">{formatEuro(tabSummary(app.db, tab).paidCents)}</span>
            </span>
            {#if tab.customerId}
              <span class="muted">⭐ {points(tab.customerId)} Punkte</span>
            {:else}
              <span class="badge">ohne Karte</span>
            {/if}
          </button>
        </li>
      {:else}
        <li class="muted empty">Noch niemand eingecheckt.</li>
      {/each}
    </ul>
  </aside>

  <section>
    {#if selected}
      {#key selected.id}
        <TabPanel tab={selected} />
      {/key}
    {:else}
      <p class="muted hint">Karte scannen, „+ Gast“ tippen oder links einen Deckel wählen.</p>
    {/if}
  </section>
</div>

{#if scanning}
  <Scanner onCard={onCard} onClose={() => (scanning = false)} />
{/if}

<dialog bind:this={guestDialog}>
  <form onsubmit={addGuest}>
    <h2>Gast ohne Karte</h2>
    <label>Name oder Tisch <input bind:value={guestName} placeholder="z. B. Tisch 3" /></label>
    <p class="muted">Deckel ohne Punkte.</p>
    <div class="row">
      <button type="button" class="grow" onclick={() => guestDialog.close()}>Abbrechen</button>
      <button type="submit" class="primary grow">Deckel öffnen</button>
    </div>
  </form>
</dialog>

<style>
  .bar {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 2fr;
    height: 100%;
  }
  aside {
    border-right: 1px solid var(--line);
    padding: 1rem;
    overflow-y: auto;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .tab {
    width: 100%;
    text-align: left;
    background: var(--panel);
    display: grid;
    gap: 0.2rem;
  }
  .tab.selected {
    border: 2px solid var(--accent);
  }
  .empty {
    padding: 1rem 0;
  }
  section {
    min-height: 0;
    padding: 1rem;
  }
  .hint {
    margin-top: 30vh;
    text-align: center;
  }
</style>
