import jsQR from 'jsqr';
import { parseCardPayload } from './db';

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Customer id if the picture shows one of our cards, else null. */
export function readCard(image: Pixels): string | null {
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
  return code ? parseCardPayload(code.data) : null;
}
