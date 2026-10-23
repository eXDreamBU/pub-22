<script lang="ts">
  import { app, now } from '../state.svelte';
  import { backupDue } from '../lib/backup';
  import { closeShift, creditTotal, runningTabs, summarizeShift, tabSummary, tabsToCredit } from '../lib/db';
  import { formatEuro, formatSigned } from '../lib/money';
  import { runningShift } from '../lib/report';
  import { formatDay, formatTime } from './format';

  let dialog: HTMLDialogElement;
  let isOpen = $state(false);
  let note = $state('');
  let error = $state('');
  let closingAt = $state('');

  // Only computed while the dialog is open.
  let summary = $derived(isOpen ? summarizeShift(runningTabs(app.db)) : null);
  let toCredit = $derived(isOpen ? tabsToCredit(app.db) : []);
  let startedAt = $derived(isOpen ? runningShift(app.db).startedAt : undefined);
  let creditCents = $derived(
    isOpen ? creditTotal(app.db) + toCredit.reduce((sum, t) => sum + tabSummary(app.db, t).paidCents, 0) : 0,
  );

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
      {startedAt ? `${formatDay(startedAt)}, ${formatTime(startedAt)} – ` : ''}{formatTime(closingAt)} · {summary.tabCount} Deckel bezahlt
    </p>
    {#if toCredit.length}
      <div class="credit">
        <b>Noch offen, wird angeschrieben:</b>
        {#each toCredit as t (t.id)}
          <div class="row"><span class="grow">{t.label}</span><span class="num">{formatEuro(tabSummary(app.db, t).paidCents)}</span></div>
        {/each}
      </div>
    {/if}
    <p class="muted">In den Kassenbericht eintragen:</p>
    <table class="report">
      <tbody>
        {#each summary.byCategory as c (c.category)}
          <tr><td>{c.category}</td><td class="num">{formatEuro(c.cents)}</td></tr>
        {/each}
        {#if summary.discountCents}
          <tr><td>Rabatt (Punkte)</td><td class="num">−{formatEuro(summary.discountCents)}</td></tr>
        {/if}
        {#if summary.houseCents}
          <tr class="gold"><td>Aufs Haus</td><td class="num">−{formatEuro(summary.houseCents)}</td></tr>
        {/if}
        {#if summary.depositCents}
          <tr class="gold"><td>Anzahlungen</td><td class="num">{formatSigned(summary.depositCents)}</td></tr>
        {/if}
        <tr class="total"><th>Gesamt</th><th class="num">{formatEuro(summary.paidCents)}</th></tr>
      </tbody>
    </table>
    {#if summary.rewards.length}
      <p>Freigetränke ausgegeben: {summary.rewards.map((r) => `${r.count}× ${r.name}`).join(', ')}</p>
    {/if}
    {#if creditCents}
      <p class="muted">Angeschrieben offen (nicht in der Kasse): <span class="num">{formatEuro(creditCents)}</span></p>
    {/if}
    <input
      bind:value={note}
      placeholder="Notiz, z. B. Abweichung zum gezählten Kassenbestand (optional)"
      aria-label="Notiz"
    />
    {#if error}<p class="error">{error}</p>{/if}
    <div class="row buttons">
      <button class="grow" onclick={() => dialog.close()}>Zurück</button>
      <button class="ok grow" onclick={close}>{toCredit.length ? 'Anschreiben und abschließen' : 'Schicht abschließen'}</button>
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
  .credit {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem;
    border: 1.5px solid var(--accent);
    border-radius: var(--radius);
  }
  .error {
    color: var(--danger);
  }
  .buttons {
    margin-top: 0.5rem;
  }
</style>
