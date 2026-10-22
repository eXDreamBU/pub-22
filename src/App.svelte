<script lang="ts">
  import { app, type View } from './state.svelte';
  import BarView from './ui/BarView.svelte';
  import CustomersView from './ui/CustomersView.svelte';
  import SettingsView from './ui/SettingsView.svelte';

  const views: [View, string][] = [
    ['bar', '🍺 Bar'],
    ['customers', '👥 Kunden'],
    ['settings', '⚙️ Einstellungen'],
  ];

  const WEEK = 7 * 24 * 60 * 60 * 1000;
  let backupDue = $derived(
    app.db.customers.length > 0 && Date.now() - Date.parse(app.db.lastBackupAt ?? app.db.createdAt) > WEEK,
  );
</script>

<div class="shell">
  <nav>
    <strong class="brand">Pub 22</strong>
    {#each views as [view, label] (view)}
      <button class:active={app.view === view} onclick={() => (app.view = view)}>{label}</button>
    {/each}
  </nav>

  {#if backupDue}
    <button class="reminder" onclick={() => (app.view = 'settings')}>
      Seit über einer Woche nicht gesichert. Jetzt unter Einstellungen → Sichern.
    </button>
  {/if}

  <main>
    {#if app.view === 'bar'}
      <BarView />
    {:else if app.view === 'customers'}
      <CustomersView />
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
    gap: 0.5rem;
    align-items: center;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--line);
  }
  .brand {
    color: var(--accent);
    font-size: 1.3rem;
    margin-right: auto;
  }
  nav button {
    background: none;
    border-color: transparent;
  }
  nav button.active {
    background: var(--panel-2);
    border-color: var(--line);
  }
  .reminder {
    border-radius: 0;
    border: none;
    background: #5a3b12;
    min-height: 40px;
    padding: 0.5rem 1rem;
    text-align: left;
  }
  main {
    flex: 1;
    min-height: 0;
  }
</style>
