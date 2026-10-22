<script lang="ts">
  import { formatEuro, pointsFor } from './lib/money';
</script>

<main>
  <h1>Pub 22</h1>
  <p>Grundgerüst. {formatEuro(1850)} ergeben {pointsFor(1850, 1)} Punkte.</p>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #15120f;
    color: #f3ece4;
    font-family: system-ui, sans-serif;
  }
  main {
    padding: 2rem;
  }
</style>
