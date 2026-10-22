<script lang="ts">
  import QRCode from 'qrcode';
  import { cardPayload, type Customer } from '../lib/db';

  let { customer }: { customer: Customer } = $props();
  let src = $state('');

  // Card in credit-card proportions, drawn once as a PNG so it can be printed or sent as a picture.
  async function draw(c: Customer): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1012;
    canvas.height = 638;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f0e0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const logo = new Image();
    logo.src = './logo.jpg';
    await logo.decode().catch(() => {}); // card still works without the logo
    if (logo.naturalWidth) ctx.drawImage(logo, 50, 50, 150, 150);
    ctx.fillStyle = '#d2ae62';
    ctx.font = '600 80px Didot, "Bodoni 72", Georgia, serif';
    ctx.fillText('Pub 22', 225, 140);
    ctx.font = '500 36px "Avenir Next", system-ui, sans-serif';
    ctx.fillText('Kundenkarte', 228, 192);
    ctx.fillStyle = '#f1ece2';
    ctx.font = '600 52px "Avenir Next", system-ui, sans-serif';
    ctx.fillText(c.name, 60, 540, 470);
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, cardPayload(c.id), { width: 420, margin: 2, errorCorrectionLevel: 'M' });
    ctx.drawImage(qr, 552, 109);
    return canvas.toDataURL('image/png');
  }

  $effect(() => {
    draw(customer).then((url) => (src = url));
  });

  async function share() {
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], `Pub22-Karte-${customer.name}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => {});
    else {
      const a = document.createElement('a');
      a.href = src;
      a.download = file.name;
      a.click();
    }
  }
</script>

{#if src}
  <img class="card print-only-card" {src} alt="Kundenkarte {customer.name}" />
  <div class="row">
    <button class="grow" onclick={() => window.print()}>Drucken</button>
    <button class="grow" onclick={share}>Als Bild senden</button>
  </div>
{/if}

<style>
  .card {
    width: 100%;
    border-radius: 14px;
    border: 1px solid var(--line);
    margin-bottom: 0.6rem;
  }
  @media print {
    :global(body *) {
      visibility: hidden;
    }
    .card {
      visibility: visible;
      position: fixed;
      top: 0;
      left: 0;
      width: 85.6mm;
      border-radius: 3mm;
    }
  }
</style>
