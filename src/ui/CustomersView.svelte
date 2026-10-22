<script lang="ts">
  import { app, now } from '../state.svelte';
  import { addCustomer, checkIn, lastVisits } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import CardImage from './CardImage.svelte';
  import { formatDate } from './format';

  let search = $state('');
  let selectedId = $state<string | null>(null);
  let newDialog: HTMLDialogElement;
  let newName = $state('');
  let newPhone = $state('');
  let adjust = $state(0);

  let customers = $derived(
    app.db.customers
      .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  );
  let selected = $derived(app.db.customers.find((c) => c.id === selectedId));

  function create(e: SubmitEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    selectedId = addCustomer(app.db, newName, newPhone, now()).id;
    newName = newPhone = '';
    newDialog.close();
  }

  function checkInSelected() {
    app.selectedTabId = checkIn(app.db, selected!.id, now()).id;
    app.view = 'bar';
  }

  function applyAdjust() {
    selected!.points = Math.max(0, selected!.points + adjust);
    adjust = 0;
  }

  function remove() {
    if (app.db.tabs.some((t) => t.customerId === selected!.id)) {
      alert('Der Kunde hat noch einen offenen Deckel. Erst abrechnen.');
      return;
    }
    if (!confirm(`${selected!.name} löschen? Die Karte funktioniert danach nicht mehr.`)) return;
    app.db.customers = app.db.customers.filter((c) => c.id !== selected!.id);
    selectedId = null;
  }
</script>

<div class="split">
  <aside>
    <div class="row">
      <input class="grow" placeholder="Suchen" bind:value={search} />
      <button class="primary" onclick={() => newDialog.showModal()}>+ Kunde</button>
    </div>
    <ul>
      {#each customers as c (c.id)}
        <li>
          <button class="item" class:selected={c.id === selectedId} onclick={() => (selectedId = c.id)}>
            <b class="grow">{c.name}</b>
            <span class="muted">⭐ {c.points}</span>
          </button>
        </li>
      {:else}
        <li class="muted">Keine Kunden.</li>
      {/each}
    </ul>
  </aside>

  <section>
    {#if selected}
      <div class="detail">
        <div class="col">
          <label>Name <input bind:value={selected.name} /></label>
          <label>Telefon (optional) <input type="tel" bind:value={selected.phone} /></label>
          <p class="points">⭐ <b>{selected.points}</b> Punkte</p>
          <div class="row">
            <label class="grow">Punkte korrigieren (+/−) <input type="number" step="1" bind:value={adjust} /></label>
            <button onclick={applyAdjust} disabled={!adjust}>Übernehmen</button>
          </div>
          <h3>Letzte Besuche</h3>
          {#each lastVisits(app.db, selected.id, 5) as v (v.id)}
            <div class="row">
              <span class="grow">{formatDate(v.closedAt)}</span>
              <span class="num">{formatEuro(v.paidCents)}</span>
              <span class="muted">+{v.pointsEarned} P.</span>
            </div>
          {:else}
            <p class="muted">Noch keine.</p>
          {/each}
          <div class="row actions">
            <button class="danger" onclick={remove}>Löschen</button>
            <button class="primary grow" onclick={checkInSelected}>Einchecken (ohne Karte)</button>
          </div>
        </div>
        <div class="col">
          {#key selected.id + selected.name}
            <CardImage customer={selected} />
          {/key}
        </div>
      </div>
    {:else}
      <p class="muted hint">Kunden wählen oder „+ Kunde“ anlegen. Die App erzeugt die Karte mit QR-Code.</p>
    {/if}
  </section>
</div>

<dialog bind:this={newDialog}>
  <form onsubmit={create}>
    <h2>Neuer Kunde</h2>
    <label>Name <input bind:value={newName} required /></label>
    <label>Telefon (optional) <input type="tel" bind:value={newPhone} /></label>
    <div class="row buttons">
      <button type="button" class="grow" onclick={() => newDialog.close()}>Abbrechen</button>
      <button type="submit" class="primary grow">Anlegen</button>
    </div>
  </form>
</dialog>

<style>
  .split {
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
    display: grid;
    gap: 0.4rem;
  }
  .item {
    width: 100%;
    display: flex;
    text-align: left;
    background: var(--panel);
  }
  .item.selected {
    border: 2px solid var(--accent);
  }
  section {
    padding: 1rem;
    overflow-y: auto;
  }
  .detail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .col {
    display: grid;
    gap: 0.7rem;
    align-content: start;
  }
  .points {
    font-size: 1.4rem;
    margin: 0;
  }
  h3 {
    margin: 0.5rem 0 0;
  }
  .actions {
    margin-top: 1rem;
  }
  .buttons {
    margin-top: 1rem;
  }
  form {
    display: grid;
    gap: 0.7rem;
  }
  .hint {
    margin-top: 30vh;
    text-align: center;
  }
</style>
