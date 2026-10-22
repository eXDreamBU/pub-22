import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { cardPayload } from './db';
import { readCard } from './scan';

// Rasterise a QR code the way the printed card shows it, as camera-like RGBA pixels.
function qrImage(text: string, scale = 4, margin = 4) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = (modules.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - margin;
      const my = Math.floor(y / scale) - margin;
      const dark = mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx);
      if (dark) data.fill(0, (y * size + x) * 4, (y * size + x) * 4 + 3);
    }
  }
  return { data, width: size, height: size };
}

describe('readCard', () => {
  it('reads the customer id from a card QR code', () => {
    expect(readCard(qrImage(cardPayload('k3x9a0b1c2d3e4f5')))).toBe('k3x9a0b1c2d3e4f5');
  });

  it('returns null for a foreign QR code', () => {
    expect(readCard(qrImage('https://example.com'))).toBeNull();
  });

  it('returns null when there is no code in the picture', () => {
    expect(readCard({ data: new Uint8ClampedArray(64 * 64 * 4).fill(255), width: 64, height: 64 })).toBeNull();
  });
});
