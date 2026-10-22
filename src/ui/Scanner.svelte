<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../state.svelte';
  import { readCard } from '../lib/scan';

  let { onCard, onClose }: { onCard: (customerId: string) => void; onClose: () => void } = $props();

  let video: HTMLVideoElement;
  let dialog: HTMLDialogElement;
  let message = $state('Karte vor die Kamera halten.');
  let facing = $state<'user' | 'environment'>('user');
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let generation = 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  async function start() {
    stop();
    const current = generation;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      if (current !== generation) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = media;
      video.srcObject = stream;
      await video.play();
      if (current !== generation) return;
      timer = setInterval(tick, 150);
    } catch {
      if (current !== generation) return;
      message = 'Kamera nicht verfügbar. Bitte Kamerazugriff erlauben.';
    }
  }

  function stop() {
    generation++;
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
  }

  function tick() {
    if (video.readyState < 2) return;
    // Downscale: jsQR is fast enough at this size and the card fills much of the frame.
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const id = readCard(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (!id) return;
    if (app.db.customers.some((c) => c.id === id)) {
      stop();
      onCard(id);
    } else {
      message = 'Unbekannte Karte. Ist der Kunde gelöscht?';
    }
  }

  function flip() {
    facing = facing === 'user' ? 'environment' : 'user';
    start();
  }

  onMount(() => {
    dialog.showModal();
    start();
    return stop;
  });
</script>

<dialog bind:this={dialog} onclose={onClose}>
  <h2>Karte scannen</h2>
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted class:mirror={facing === 'user'}></video>
  <p class="muted">{message}</p>
  <div class="row">
    <button class="grow" onclick={flip}>Kamera wechseln</button>
    <button class="grow" onclick={() => dialog.close()}>Schließen</button>
  </div>
</dialog>

<style>
  video {
    width: 100%;
    border-radius: 8px;
    background: #000;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }
  .mirror {
    transform: scaleX(-1);
  }
</style>
