<script lang="ts">
  import { app, now } from '../state.svelte';
  import { backupDue } from '../lib/backup';
  import { closeShift, runningTabs, summarizeShift } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import { formatDay, formatTime } from './format';

  let dialog: HTMLDialogElement;
  let isOpen = $state(false);
  let note = $state('');
  let error = $state('');
  let closingAt = $state('');

  // Only computed while the dialog is open.
  let summary = $derived.by(() => {
    const tabs = isOpen ? runningTabs(app.db) : [];
    return tabs.length ? summarizeShift(tabs) : null;
  });

  export function open() {
    note = error = '';
    closingAt = now();
    isOpen = true;
    dialog.showModal();
  }

  function close() {
    try {
      closeShift(app.db, note, closingAt);
    } catch (e) {
      error = (e as Error).message;
      return;
    }
    dialog.close();
    if (backupDue(app.db) && confirm('Seit über einer Woche nicht gesichert. Jetzt sichern?')) app.view = 'settings';
  }
</script>

<dialog bind:this={dialog} onclose={() => (isOpen = false)}>
  <h2>Schicht abschließen</h2>
  {#if summary}
    <p class="muted">
      {formatDay(summary.startedAt)}, {formatTime(summary.startedAt)} – {formatTime(closingAt)} · {summary.tabCount} Deckel
    </p>
    <p class="muted">In den Kassenbericht eintragen:</p>
    <table class="report">
      <tbody>
        {#each summary.byCategory as c (c.category)}
          <tr><td>{c.category}</td><td class="num">{formatEuro(c.cents)}</td></tr>
        {/each}
        {#if summary.discountCents}
          <tr><td>Rabatt (Punkte)</td><td class="num">−{formatEuro(summary.discountCents)}</td></tr>
        {/if}
        <tr class="total"><th>Gesamt</th><th class="num">{formatEuro(summary.paidCents)}</th></tr>
      </tbody>
    </table>
    {#if summary.rewards.length}
      <p>Freigetränke ausgegeben: {summary.rewards.map((r) => `${r.count}× ${r.name}`).join(', ')}</p>
    {/if}
    <input
      bind:value={note}
      placeholder="Notiz, z. B. Abweichung zum gezählten Kassenbestand (optional)"
      aria-label="Notiz"
    />
    {#if error}<p class="error">{error}</p>{/if}
    <div class="row buttons">
      <button class="grow" onclick={() => dialog.close()}>Zurück</button>
      <button class="ok grow" onclick={close}>Schicht abschließen</button>
    </div>
  {/if}
</dialog>

<style>
  dialog {
    display: none;
    width: min(620px, 92vw);
    max-height: 92vh;
    overflow-y: auto;
  }
  dialog[open] {
    display: grid;
    gap: 0.7rem;
  }
  h2,
  p {
    margin: 0;
  }
  .total th {
    font-size: 1.2rem;
    color: var(--text);
  }
  .error {
    color: var(--danger);
  }
  .buttons {
    margin-top: 0.5rem;
  }
</style>
