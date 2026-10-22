<script lang="ts">
  import { app, now } from '../state.svelte';
  import {
    addItem,
    availablePoints,
    cancelTab,
    checkIn,
    creditTab,
    inBar,
    incrementLine,
    payPart,
    redeemReward,
    removeItem,
    setDiscountSteps,
    settleTogether,
    tabSince,
    tabSummary,
    type Tab,
    type TabLine,
  } from '../lib/db';
  import { formatEuro, parseEuro, pointsFor, tabTotal } from '../lib/money';
  import { formatDay, formatTime } from './format';
  import Icon from './Icon.svelte';
  import { categoryIcon, icons } from './icons';

  let { tab }: { tab: Tab } = $props();

  let products = $derived(app.db.products.filter((p) => !p.hidden));
  let categories = $derived([...new Set(products.map((p) => p.category))]);
  let picked = $state('');
  // Falls back to the first category when the picked one has no visible drinks (left).
  let category = $derived(categories.includes(picked) ? picked : categories[0]);
  let summary = $derived(tabSummary(app.db, tab));
  let count = $derived(tab.lines.reduce((sum, l) => sum + l.qty, 0));

  // Evenings on a tab that was credited: one separator per evening, only when there is more than one.
  const visitOf = (l: TabLine) => l.visit ?? tab.openedAt;
  let evenings = $derived(new Set(tab.lines.map(visitOf)).size);
  const eveningCents = (visit: string) =>
    tab.lines.reduce((sum, l) => sum + (visitOf(l) === visit ? l.priceCents * l.qty : 0), 0);
  // ponytail: separators assume lines of one evening are contiguous, true because new lines are appended
  const eveningStarts = (i: number) => i === 0 || visitOf(tab.lines[i - 1]) !== visitOf(tab.lines[i]);
  const eveningLabel = (l: TabLine) => (!l.visit && !tab.creditedAt ? 'Heute' : formatDay(visitOf(l)));

  let redeemDialog: HTMLDialogElement;
  let settleDialog: HTMLDialogElement;
  let partDialog: HTMLDialogElement;
  let renameDialog: HTMLDialogElement;
  let error = $state('');

  // Paying together: other open tabs this guest also pays, and whose tab pays (gets all points).
  let others = $derived(inBar(app.db).filter((t) => t.id !== tab.id));
  let together = $state<string[]>([]);
  let payerId = $state('');
  let group = $derived([tab, ...others.filter((t) => together.includes(t.id))]);
  let payer = $derived(group.find((t) => t.id === payerId) ?? tab);
  let groupPaid = $derived(group.reduce((sum, t) => sum + tabSummary(app.db, t).paidCents, 0));
  // "Aufs Haus": the owner's own discount on the group's sum, typed in euro.
  let houseText = $state('');
  let houseReason = $state('');
  let houseCents = $derived(houseText.trim() ? parseEuro(houseText) : 0);
  let houseError = $derived(
    houseCents === null ? 'Bitte einen Betrag wie 3,50 eintippen' : houseCents > groupPaid ? `Höchstens ${formatEuro(groupPaid)}` : '',
  );
  let cashCents = $derived(groupPaid - (houseError ? 0 : (houseCents ?? 0)));
  let groupPoints = $derived(payer.customerId ? pointsFor(cashCents, app.db.settings.pointsPerEuro) : 0);

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
    houseText = '';
    houseReason = '';
    settleDialog.showModal();
  }

  function doSettle() {
    settleTogether(app.db, group.map((t) => t.id), payer.id, now(), { cents: houseCents ?? 0, reason: houseReason });
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

  function doCredit() {
    if (!confirm(`${tab.label} anschreiben? ${formatEuro(summary.paidCents)} bleiben offen.`)) return;
    creditTab(app.db, tab.id, now());
    app.selectedTabId = null;
  }

  function doCancel() {
    const question = tab.creditedAt
      ? `„${tab.label}“ löschen? ${formatEuro(summary.paidCents)} angeschrieben gehen verloren.`
      : `Deckel „${tab.label}“ ohne Abrechnen löschen?`;
    if ((tab.lines.length || tab.creditedAt) && !confirm(question)) return;
    cancelTab(app.db, tab.id);
    app.selectedTabId = null;
  }
</script>

<div class="panel-grid">
  <div class="menu">
    <header class="row">
      <h2>{tab.label}</h2>
      <button class="small icon-only" aria-label="Deckel umbenennen" onclick={showRename}><Icon svg={icons.pen} size={18} /></button>
      <span class="grow"></span>
      {#if tab.creditedAt}
        <span class="badge">angeschrieben seit {formatDay(tabSince(tab))}</span>
      {:else}
        <span class="muted">seit {formatTime(tab.openedAt)}</span>
      {/if}
    </header>

    {#if tab.creditedAt}
      <div class="away">
        <p>{tab.label} ist gerade nicht da. Abrechnen geht auch so; für neue Getränke erst „Ist wieder da“ tippen (oder die Karte scannen).</p>
        <button class="primary" onclick={() => checkIn(app.db, tab.customerId!, now())}>Ist wieder da</button>
      </div>
    {:else}

    <div class="cats">
      {#each categories as c (c)}
        <button class="chip" class:active={c === category} onclick={() => (picked = c)}
          ><Icon svg={categoryIcon(c)} size={18} />{c}</button
        >
      {/each}
    </div>

    <div class="tiles">
      {#each products.filter((p) => p.category === category) as p (p.id)}
        <button class="tile" onclick={() => addItem(tab, p)}>
          <span class="tile-icon"><Icon svg={categoryIcon(p.category)} /></span>
          <span class="tile-name">{p.name.replaceAll('/', '/​')}</span>
          <span class="tile-foot">
            <span><span class="muted">{p.size ? `${p.size} · ` : ''}</span><b class="num">{formatEuro(p.priceCents)}</b></span>
            <span class="plus" aria-hidden="true">+</span>
          </span>
        </button>
      {/each}
    </div>
    {/if}
  </div>

  <aside class="deckel">
    <div>
      <h3>Deckel</h3>
      <span class="muted">{count} {count === 1 ? 'Getränk' : 'Getränke'}{tab.customerId ? '' : ' · ohne Karte'}</span>
    </div>
    <div class="scroll">
      {#each tab.lines as line, i (i)}
        {#if evenings > 1 && eveningStarts(i)}
          <div class="evening"><span class="grow">{eveningLabel(line)}</span><span class="num">{formatEuro(eveningCents(visitOf(line)))}</span></div>
        {/if}
        <div class="line">
          <span class="stepper">
            <button class="small" aria-label="Eins entfernen" onclick={() => removeItem(tab, i)}>−</button>
            <b>{line.qty}</b>
            <button class="small" aria-label="Eins mehr" onclick={() => incrementLine(tab, i)}>+</button>
          </span>
          <span class="grow">{line.name.replaceAll('/', '/​')} <span class="muted">{line.size ?? ''}</span></span>
          <span class="num">{formatEuro(line.priceCents * line.qty)}</span>
        </div>
      {:else}
        <p class="muted empty">Getränk antippen, dann steht es hier.</p>
      {/each}
      {#each tab.rewards as r, i (i)}
        <div class="line">
          <span class="gold"><Icon svg={icons.gift} size={18} /></span>
          <span class="grow">{r.name}</span>
          <span class="muted">−{r.points} P.</span>
          <button class="small" aria-label="Prämie zurücknehmen" onclick={() => tab.rewards.splice(i, 1)}>−</button>
        </div>
      {/each}
      {#if summary.discountCents}
        <div class="line">
          <span class="grow">Rabatt ({tab.discountSteps * app.db.settings.discountPoints} P.)</span>
          <span class="num">−{formatEuro(summary.discountCents)}</span>
        </div>
      {/if}
      {#if tab.customerId}
        <button class="points" onclick={() => redeemDialog.showModal()}>
          <span class="gold">★ {availablePoints(app.db, tab)} Punkte frei</span>
          <span class="gold">Einlösen</span>
        </button>
      {/if}
    </div>
    <div class="foot">
      <div class="row total">
        <span class="grow">Summe</span>
        <span class="num">{formatEuro(summary.paidCents)}</span>
      </div>
      {#if tab.customerId}
        <span class="muted">+{summary.pointsEarned} Punkte beim Abrechnen</span>
      {/if}
      <button class="ok pay" onclick={showSettle}>Abrechnen</button>
      {#if tab.customerId && !tab.creditedAt}
        <button onclick={doCredit} disabled={!tab.lines.length && !tab.rewards.length}>Anschreiben</button>
      {/if}
      <div class="row">
        <button class="grow" onclick={showPart} disabled={!tab.lines.length}>Teil zahlen</button>
        <button class="danger grow" onclick={doCancel}>Löschen</button>
      </div>
    </div>
  </aside>
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
  <div class="house">
    <label class="row">
      <span class="grow gold">Aufs Haus</span>
      <input class="house-cents num" inputmode="decimal" placeholder="0,00" bind:value={houseText} />
      <span>€</span>
    </label>
    <button class="small" onclick={() => (houseText = (groupPaid / 100).toFixed(2).replace('.', ','))}>Alles aufs Haus</button>
    <input placeholder="Grund (freiwillig), z. B. Geburtstag" aria-label="Grund" bind:value={houseReason} />
    {#if houseError}<p class="error">{houseError}</p>{/if}
  </div>
  <div class="row kassieren"><b class="grow">Kassieren</b><b class="num">{formatEuro(cashCents)}</b></div>
  <p class="muted">Zählt in die laufende Schicht.</p>
  {#each group as t (t.id)}
    {#each t.rewards as r, i (i)}
      <p>Gratis ausgeben: {r.name}{#if group.length > 1} ({t.label}){/if}</p>
    {/each}
  {/each}
  {#if group.length > 1}
    <p>
      {#if payer.customerId}★ {payer.label} bekommt +{groupPoints} Punkte (für alle {group.length} Deckel){:else}Keine Punkte:
        {payer.label} zahlt ohne Karte.{/if}
    </p>
  {:else if tab.customerId}
    <p>
      +{groupPoints} Punkte{#if summary.pointsSpent}, −{summary.pointsSpent} eingelöst{/if}
    </p>
  {/if}
  <div class="row">
    <button class="grow" onclick={() => settleDialog.close()}>Zurück</button>
    <button class="ok grow" disabled={!!houseError} onclick={doSettle}>Bezahlt</button>
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
  <div class="row kassieren"><b class="grow">Kassieren</b><b class="num">{formatEuro(partCents)}</b></div>
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
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
  .away {
    display: grid;
    gap: 0.8rem;
    justify-items: start;
    margin-top: 2rem;
    max-width: 32rem;
  }
  .away p {
    margin: 0;
  }
  .evening {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0 0.2rem;
    border-top: 1px dashed var(--line);
    color: var(--accent-ink);
    font-size: 0.85rem;
    font-weight: 600;
  }
  .menu {
    min-height: 0;
    padding: 1rem 1.2rem;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 0.9rem;
  }
  h2 {
    margin: 0;
    font-size: 1.6rem;
  }
  h3 {
    margin: 0;
    font-size: 1.15rem;
  }
  .icon-only {
    min-width: 40px;
    display: grid;
    place-items: center;
    color: var(--muted);
    background: none;
    border-color: transparent;
  }
  .cats {
    display: flex;
    gap: 0.45rem;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    grid-auto-rows: min-content;
    gap: 0.7rem;
    overflow-y: auto;
    padding: 2px 2px 1rem;
  }
  .tile {
    display: grid;
    gap: 0.45rem;
    padding: 0.75rem;
    text-align: left;
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .tile-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--panel-2);
    color: var(--accent-ink);
    display: grid;
    place-items: center;
  }
  .tile-name {
    font-weight: 600;
    line-height: 1.25;
  }
  .tile-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    font-size: 0.9rem;
  }
  .plus {
    width: 30px;
    height: 30px;
    flex: none;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-text);
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    font-weight: 700;
  }
  .deckel {
    min-height: 0;
    background: var(--panel);
    border-left: 1px solid var(--line);
    padding: 1rem;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0.8rem;
  }
  .scroll {
    overflow-y: auto;
  }
  .line {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--line);
  }
  .line .grow {
    min-width: 0;
    overflow-wrap: break-word; /* long names wrap at the "/" (zero-width space) */
  }
  .stepper {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    background: var(--panel-2);
    border-radius: 99px;
    padding: 2px;
  }
  .stepper button {
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    border-radius: 50%;
    background: none;
    border-color: transparent;
  }
  .stepper b {
    min-width: 1.5ch;
    text-align: center;
  }
  .empty {
    margin-top: 2rem;
    text-align: center;
  }
  .points {
    width: 100%;
    margin-top: 0.8rem;
    display: flex;
    justify-content: space-between;
    background: var(--panel-2);
    border-color: transparent;
  }
  .foot {
    display: grid;
    gap: 0.5rem;
  }
  .total {
    font-size: 1.35rem;
    font-weight: 600;
  }
  .pay {
    min-height: 56px;
    font-size: 1.1rem;
  }
  @media (max-width: 900px) {
    .panel-grid {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, 1fr) auto;
    }
    .deckel {
      border-left: none;
      border-top: 1px solid var(--line);
      max-height: 45dvh;
    }
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
  .house {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.8rem;
    padding: 0.75rem;
    border-radius: var(--radius);
    background: var(--panel-2);
  }
  .house-cents {
    width: 7rem;
    text-align: right;
  }
  .kassieren {
    font-size: 1.45rem;
    font-weight: 600;
    margin: 0.8rem 0 0.4rem;
  }
</style>
