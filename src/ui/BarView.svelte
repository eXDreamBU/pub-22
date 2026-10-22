<script lang="ts">
  import { app, now } from '../state.svelte';
  import { checkIn, openGuestTab, tabSummary } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import Scanner from './Scanner.svelte';
  import TabPanel from './TabPanel.svelte';
  import Icon from './Icon.svelte';
  import { icons, initials } from './icons';

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
    <div class="start">
      <button class="primary iconbtn" onclick={() => (scanning = true)}><Icon svg={icons.camera} /> Karte scannen</button>
      <button onclick={showOpenDialog}>+ Deckel</button>
    </div>
    <p class="muted heading">In der Bar · {app.db.tabs.length}</p>
    <ul>
      {#each app.db.tabs as tab (tab.id)}
        <li>
          <button class="tab" class:selected={tab.id === app.selectedTabId} onclick={() => (app.selectedTabId = tab.id)}>
            <span class="avatar">{initials(tab.label)}</span>
            <span class="who">
              <b>{tab.label}</b>
              {#if tab.customerId}
                <span class="gold small-text">★ {points(tab.customerId)} Punkte</span>
              {:else}
                <span class="muted small-text">ohne Karte</span>
              {/if}
            </span>
            <span class="num amount">{formatEuro(tabSummary(app.db, tab).paidCents)}</span>
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
  <div class="seg modes">
    <button class="grow" class:active={withCard} onclick={() => (withCard = true)}>Kunde mit Karte</button>
    <button class="grow" class:active={!withCard} onclick={() => (withCard = false)}>Gast ohne Karte</button>
  </div>
  {#if withCard}
    <input placeholder="Kunde suchen" aria-label="Kunde suchen" bind:value={search} bind:this={searchInput} />
    <ul class="found">
      {#each found as c (c.id)}
        <li>
          <button class="tab" onclick={() => pickCustomer(c.id)}>
            <span class="avatar">{initials(c.name)}</span>
            <b class="who">{c.name}</b>
            {#if hasTab(c.id)}<span class="badge">schon in der Bar</span>{:else}<span class="gold small-text">★ {c.points} Punkte</span>{/if}
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
    grid-template-columns: minmax(250px, 290px) 1fr;
    height: 100%;
  }
  aside {
    border-right: 1px solid var(--line);
    padding: 1rem;
    overflow-y: auto;
  }
  .start {
    display: grid;
    gap: 0.5rem;
  }
  .start .primary {
    min-height: 54px;
  }
  .iconbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }
  .heading {
    font-size: 0.85rem;
    margin: 1.1rem 0 0.5rem;
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
    display: flex;
    align-items: center;
    gap: 0.7rem;
    text-align: left;
    padding: 0.6rem;
    border: 1.5px solid var(--card-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .tab.selected {
    border-color: var(--accent);
  }
  .who {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.1rem;
    overflow-wrap: anywhere;
  }
  .small-text {
    font-size: 0.82rem;
    font-weight: 500;
  }
  .amount {
    font-weight: 600;
  }
  .empty {
    padding: 1rem 0;
  }
  section {
    min-height: 0;
  }
  .hint {
    margin-top: 30vh;
    text-align: center;
  }
  .modes {
    margin-bottom: 0.8rem;
  }
  .found {
    max-height: 40vh;
    overflow-y: auto;
    margin: 0.6rem 0;
  }
  .found .tab {
    box-shadow: none;
    background: var(--panel-2);
    border-color: transparent;
  }
  .full {
    width: 100%;
    margin-top: 0.5rem;
  }
</style>
