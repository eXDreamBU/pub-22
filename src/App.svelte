<script lang="ts">
  import { backupDue } from './lib/backup';
  import { app, type View } from './state.svelte';
  import BarView from './ui/BarView.svelte';
  import CustomersView from './ui/CustomersView.svelte';
  import RevenueView from './ui/RevenueView.svelte';
  import SettingsView from './ui/SettingsView.svelte';

  const views: [View, string][] = [
    ['bar', 'Bar'],
    ['customers', 'Kunden'],
    ['revenue', 'Umsatz'],
    ['settings', 'Einstellungen'],
  ];

  let due = $derived(backupDue(app.db));
</script>

<div class="shell">
  <nav>
    <img class="logo" src="./logo.jpg" alt="" />
    <strong class="brand">Pub 22</strong>
    <div class="seg">
      {#each views as [view, label] (view)}
        <button class:active={app.view === view} onclick={() => (app.view = view)}>{label}</button>
      {/each}
    </div>
  </nav>

  {#if due}
    <button class="reminder" onclick={() => (app.view = 'settings')}>
      Seit über einer Woche nicht gesichert. Jetzt unter Einstellungen → Sichern.
    </button>
  {/if}

  <main>
    {#if app.view === 'bar'}
      <BarView />
    {:else if app.view === 'customers'}
      <CustomersView />
    {:else if app.view === 'revenue'}
      <RevenueView />
    {:else}
      <SettingsView />
    {/if}
  </main>
</div>

<style>
  .shell {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
  }
  nav {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    padding: 0.6rem 1rem;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
  }
  .logo {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
  .brand {
    font-family: var(--font-brand);
    font-size: 1.45rem;
    font-weight: 600;
    margin-right: auto;
  }
  .reminder {
    border-radius: 0;
    border: none;
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--accent) 18%, var(--panel));
    color: var(--text);
    font-weight: 500;
    min-height: 40px;
    padding: 0.5rem 1rem;
    text-align: left;
  }
  main {
    flex: 1;
    min-height: 0;
  }
</style>
