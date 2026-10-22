<script lang="ts">
  import { app, now } from '../state.svelte';
  import { checkIn, openGuestTab, tabSummary } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import Scanner from './Scanner.svelte';
  import TabPanel from './TabPanel.svelte';

  let scanning = $state(false);
  let openDialog: HTMLDialogElement;
  let withCard = $state(true);
  let search = $state('');
  let searchInput = $state<HTMLInputElement>();
  let guestName = $state('');

  let found = $derived(
    app.db.customers
      .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  );

  let selected = $derived(app.db.tabs.find((t) => t.id === app.selectedTabId));

  function onCard(customerId: string) {
    scanning = false;
    app.selectedTabId = checkIn(app.db, customerId, now()).id;
  }

  function showOpenDialog() {
    withCard = true;
    search = guestName = '';
    openDialog.showModal();
    searchInput?.focus();
  }

  function pickCustomer(customerId: string) {
    app.selectedTabId = checkIn(app.db, customerId, now()).id;
    openDialog.close();
  }

  function asGuest() {
    guestName = search;
    withCard = false;
  }

  function addGuest(e: SubmitEvent) {
    e.preventDefault();
    app.selectedTabId = openGuestTab(app.db, guestName, now()).id;
    openDialog.close();
  }

  function hasTab(customerId: string) {
    return app.db.tabs.some((t) => t.customerId === customerId);
  }

  function points(customerId?: string) {
    return app.db.customers.find((c) => c.id === customerId)?.points;
  }
</script>

<div class="bar">
  <aside>
    <div class="row">
      <button class="primary grow" onclick={() => (scanning = true)}>📷 Karte scannen</button>
      <button class="grow" onclick={showOpenDialog}>+ Deckel</button>
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
      <p class="muted hint">Karte scannen, „+ Deckel“ tippen oder links einen Deckel wählen.</p>
    {/if}
  </section>
</div>

{#if scanning}
  <Scanner onCard={onCard} onClose={() => (scanning = false)} />
{/if}

<dialog bind:this={openDialog}>
  <h2>Deckel öffnen</h2>
  <div class="row modes">
    <button class="small grow" class:primary={withCard} onclick={() => (withCard = true)}>Kunde mit Karte</button>
    <button class="small grow" class:primary={!withCard} onclick={() => (withCard = false)}>Gast ohne Karte</button>
  </div>
  {#if withCard}
    <input placeholder="Kunde suchen" aria-label="Kunde suchen" bind:value={search} bind:this={searchInput} />
    <ul class="found">
      {#each found as c (c.id)}
        <li>
          <button class="tab" onclick={() => pickCustomer(c.id)}>
            <span class="row">
              <b class="grow">{c.name}</b>
              {#if hasTab(c.id)}<span class="badge">schon in der Bar</span>{:else}<span class="muted">⭐ {c.points} Punkte</span>{/if}
            </span>
          </button>
        </li>
      {:else}
        <li class="muted empty">Kein Kunde gefunden.</li>
      {/each}
    </ul>
    {#if search.trim()}
      <button class="full" onclick={asGuest}>Als Gast ohne Karte öffnen: {search.trim()}</button>
    {/if}
    <button class="full" onclick={() => openDialog.close()}>Abbrechen</button>
  {:else}
    <form onsubmit={addGuest}>
      <label>Name oder Tisch <input bind:value={guestName} placeholder="z. B. Tisch 3" /></label>
      <p class="muted">Deckel ohne Punkte.</p>
      <div class="row">
        <button type="button" class="grow" onclick={() => openDialog.close()}>Abbrechen</button>
        <button type="submit" class="primary grow">Deckel öffnen</button>
      </div>
    </form>
  {/if}
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
  .tab .badge {
    justify-self: start;
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
  .modes {
    margin-bottom: 0.8rem;
  }
  .found {
    max-height: 40vh;
    overflow-y: auto;
    margin: 0.6rem 0;
  }
  .full {
    width: 100%;
    margin-top: 0.5rem;
  }
  .hint {
    margin-top: 30vh;
    text-align: center;
  }
</style>
