<script lang="ts">
  import { app, now } from '../state.svelte';
  import { newId, parseBackup, type Product } from '../lib/db';
  import { formatEuro, parseEuro } from '../lib/money';
  import { formatDate, formatTime } from './format';

  let categories = $derived([...new Set(app.db.products.map((p) => p.category))]);
  let category = $state(app.db.products[0]?.category ?? '');
  let restoreInput: HTMLInputElement;
  let message = $state('');

  function setPrice(target: { priceCents: number } | { discountCents: number }, key: string, e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const cents = parseEuro(input.value);
    if (cents === null) {
      input.value = formatEuro((target as Record<string, number>)[key]);
      return;
    }
    (target as Record<string, number>)[key] = cents;
    input.value = formatEuro(cents);
  }

  function addProduct() {
    const product: Product = { id: newId(), category: category || 'Neu', name: 'Neues Getränk', priceCents: 0 };
    app.db.products.push(product);
  }

  function removeProduct(p: Product) {
    if (!confirm(`„${p.name}“ von der Karte löschen? (Ausblenden geht auch.)`)) return;
    app.db.products = app.db.products.filter((x) => x.id !== p.id);
  }

  async function backup() {
    app.db.lastBackupAt = now();
    const name = `pub22-sicherung-${app.db.lastBackupAt.slice(0, 10)}.json`;
    const file = new File([JSON.stringify(app.db, null, 1)], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      // iPad: share sheet → "In Dateien sichern" → iCloud Drive.
      await navigator.share({ files: [file] }).catch(() => {});
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    message = 'Sicherung erstellt.';
  }

  async function restore() {
    const file = restoreInput.files?.[0];
    restoreInput.value = '';
    if (!file) return;
    try {
      const restored = parseBackup(await file.text());
      const when = restored.lastBackupAt ? `vom ${formatDate(restored.lastBackupAt)}` : '';
      if (!confirm(`Sicherung ${when} einspielen? Alles Aktuelle wird ersetzt.`)) return;
      app.db = restored;
      app.selectedTabId = null;
      message = 'Sicherung eingespielt.';
    } catch (e) {
      message = (e as Error).message;
    }
  }
</script>

<div class="settings">
  <section class="panel">
    <h2>Punkte</h2>
    <label>Punkte pro 1 € <input type="number" min="0" step="1" bind:value={app.db.settings.pointsPerEuro} /></label>
    <h3>Rabatt in €</h3>
    <div class="row">
      <label class="grow">Punkte <input type="number" min="1" step="1" bind:value={app.db.settings.discountPoints} /></label>
      <span>=</span>
      <label class="grow"
        >Rabatt <input
          inputmode="decimal"
          value={formatEuro(app.db.settings.discountCents)}
          onchange={(e) => setPrice(app.db.settings, 'discountCents', e)}
        /></label
      >
    </div>
    <h3>Prämien</h3>
    {#each app.db.rewards as r, i (r.id)}
      <div class="row">
        <input class="grow" bind:value={r.name} aria-label="Prämie" />
        <input class="pts" type="number" min="1" step="1" bind:value={r.points} aria-label="Punkte" />
        <span class="muted">P.</span>
        <button class="small danger" onclick={() => app.db.rewards.splice(i, 1)}>✕</button>
      </div>
    {/each}
    <button class="small" onclick={() => app.db.rewards.push({ id: newId(), name: 'Neue Prämie', points: 100 })}
      >+ Prämie</button
    >
  </section>

  <section class="panel">
    <h2>Sichern</h2>
    <p class="muted">
      Zuletzt gesichert: {app.db.lastBackupAt
        ? `${formatDate(app.db.lastBackupAt)}, ${formatTime(app.db.lastBackupAt)}`
        : 'noch nie'}
    </p>
    <p class="muted">Am iPad: „Sichern“ → „In Dateien sichern“ → iCloud Drive.</p>
    <div class="row">
      <button class="primary grow" onclick={backup}>💾 Sichern</button>
      <button class="grow" onclick={() => restoreInput.click()}>Wiederherstellen</button>
    </div>
    <input type="file" accept="application/json,.json" bind:this={restoreInput} onchange={restore} hidden />
    {#if message}<p>{message}</p>{/if}
  </section>

  <section class="panel menu">
    <div class="row">
      <h2 class="grow">Getränkekarte</h2>
      <select bind:value={category} class="cat">
        {#each categories as c (c)}<option>{c}</option>{/each}
      </select>
      <button class="small primary" onclick={addProduct}>+ Getränk</button>
    </div>
    <p class="muted">Preisänderungen gelten nur für neue Buchungen. Ausgeblendete Getränke erscheinen nicht beim Buchen.</p>
    <table>
      <thead><tr><th>Getränk</th><th>Größe</th><th>Kategorie</th><th>Preis</th><th>Zeigen</th><th></th></tr></thead>
      <tbody>
        {#each app.db.products.filter((p) => p.category === category) as p (p.id)}
          <tr class:hidden-row={p.hidden}>
            <td><input bind:value={p.name} aria-label="Name" /></td>
            <td><input class="size" bind:value={p.size} aria-label="Größe" /></td>
            <td><input bind:value={p.category} aria-label="Kategorie" /></td>
            <td
              ><input
                class="price"
                inputmode="decimal"
                value={formatEuro(p.priceCents)}
                onchange={(e) => setPrice(p, 'priceCents', e)}
                aria-label="Preis"
              /></td
            >
            <td><input type="checkbox" checked={!p.hidden} onchange={(e) => (p.hidden = !e.currentTarget.checked)} /></td>
            <td><button class="small danger" onclick={() => removeProduct(p)}>✕</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<style>
  .settings {
    height: 100%;
    overflow-y: auto;
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-content: start;
  }
  .menu {
    grid-column: 1 / -1;
  }
  section {
    display: grid;
    gap: 0.6rem;
    align-content: start;
  }
  h2,
  h3 {
    margin: 0.3rem 0 0;
  }
  .pts {
    width: 90px;
  }
  .cat {
    width: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    color: var(--muted);
    font-weight: normal;
    font-size: 0.85rem;
  }
  td {
    padding: 0.2rem;
  }
  .size {
    width: 90px;
  }
  .price {
    width: 110px;
    text-align: right;
  }
  input[type='checkbox'] {
    width: 28px;
    min-height: 28px;
  }
  .hidden-row {
    opacity: 0.45;
  }
</style>
