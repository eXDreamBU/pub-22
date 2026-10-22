<script lang="ts">
  import { app } from '../state.svelte';
  import { deleteShift, shiftDeleteBlocker, type Shift } from '../lib/db';
  import { formatEuro } from '../lib/money';
  import { formatDay, formatTime } from './format';

  let dialog: HTMLDialogElement;
  let shown = $state<Shift | null>(null);

  // Newest first by start; copy before sorting, the db array stays as is.
  let shifts = $derived([...app.db.shifts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
  let tabs = $derived(
    shown ? app.db.history.filter((t) => t.shiftId === shown!.id).sort((a, b) => a.closedAt.localeCompare(b.closedAt)) : [],
  );

  function show(shift: Shift) {
    shown = shift;
    dialog.showModal();
  }

  function remove() {
    const blocker = shiftDeleteBlocker(app.db, shown!.id);
    if (blocker) return alert(blocker);
    if (!confirm('Schicht mit allen Deckeln löschen? Die gesammelten Punkte werden zurückgebucht.')) return;
    deleteShift(app.db, shown!.id);
    dialog.close();
  }
</script>

<table class="report">
  <thead>
    <tr><th>Tag</th><th>Zeit</th><th class="num">Deckel</th><th class="num">Rabatt</th><th class="num">Aufs Haus</th><th class="num">Umsatz</th></tr>
  </thead>
  <tbody>
    {#each shifts as s (s.id)}
      <tr class="tap" onclick={() => show(s)}>
        <td>{formatDay(s.startedAt)}{#if s.note === 'vor 0.2'} <span class="badge">vor 0.2</span>{/if}</td>
        <td>{formatTime(s.startedAt)}–{formatTime(s.closedAt)}</td>
        <td class="num">{s.tabCount}</td>
        <td class="num">{s.discountCents ? `−${formatEuro(s.discountCents)}` : '–'}</td>
        <td class="num">{s.houseCents ? `−${formatEuro(s.houseCents)}` : '–'}</td>
        <td class="num"><b>{formatEuro(s.paidCents)}</b></td>
      </tr>
    {:else}
      <tr><td colspan="6" class="muted">Noch keine abgeschlossene Schicht.</td></tr>
    {/each}
  </tbody>
</table>

<dialog bind:this={dialog} onclose={() => (shown = null)}>
  {#if shown}
    <h2>{formatDay(shown.startedAt)}, {formatTime(shown.startedAt)}–{formatTime(shown.closedAt)}</h2>
    <p class="muted">{shown.tabCount} Deckel</p>
    <table class="report">
      <tbody>
        {#each shown.byCategory as c (c.category)}
          <tr><td>{c.category}</td><td class="num">{formatEuro(c.cents)}</td></tr>
        {/each}
        {#if shown.discountCents}
          <tr><td>Rabatt (Punkte)</td><td class="num">−{formatEuro(shown.discountCents)}</td></tr>
        {/if}
        {#if shown.houseCents}
          <tr class="gold"><td>Aufs Haus</td><td class="num">−{formatEuro(shown.houseCents)}</td></tr>
        {/if}
        <tr><th>Gesamt</th><th class="num">{formatEuro(shown.paidCents)}</th></tr>
      </tbody>
    </table>
    {#if shown.rewards.length}
      <p>Freigetränke: {shown.rewards.map((r) => `${r.count}× ${r.name}`).join(', ')}</p>
    {/if}
    {#if shown.creditCents}<p class="muted">Angeschrieben offen beim Abschluss: {formatEuro(shown.creditCents)}</p>{/if}
    {#if shown.note}<p>Notiz: {shown.note}</p>{/if}
    <h3>Deckel</h3>
    <div class="tabs">
      {#each tabs as t (t.id)}
        <div class="row">
          <span class="muted">{formatTime(t.closedAt)}</span>
          <span class="grow"
            >{t.label}{#if t.paidBy}<span class="muted">{` · bezahlt von ${t.paidBy}`}</span>{/if}{#if t.houseCents}<span class="gold"
                >{` · aufs Haus ${formatEuro(t.houseCents)}${t.houseReason ? ` · ${t.houseReason}` : ''}`}</span
              >{/if}</span
          >
          <span class="num">{formatEuro(t.paidCents)}</span>
        </div>
      {/each}
    </div>
    <button class="primary full" onclick={() => dialog.close()}>Schließen</button>
    <button class="danger full" onclick={remove}>Schicht löschen</button>
  {/if}
</dialog>

<style>
  dialog {
    width: min(620px, 92vw);
    max-height: 92vh;
    overflow-y: auto;
  }
  h2,
  h3 {
    margin: 0 0 0.4rem;
  }
  p {
    margin: 0.5rem 0;
  }
  .tabs {
    display: grid;
    gap: 0.4rem;
  }
  .full {
    width: 100%;
    margin-top: 1rem;
  }
</style>
