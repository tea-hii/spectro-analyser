import { PaletteKey } from '../types';

export const ColorPalettes: Record<PaletteKey, string> = {
  AEGISUB_BLUE: 'Aegisub Classic',
  INFERNO: 'Inferno Heatmap',
  VIRIDIS: 'Viridis Bio',
  CYBERPUNK: 'Neon Cyber',
  PHONETIC_GRAY: 'Phonetic Paper'
};

export const ColorLUT: Record<PaletteKey, Uint32Array> = {
  AEGISUB_BLUE: new Uint32Array(256),
  INFERNO: new Uint32Array(256),
  VIRIDIS: new Uint32Array(256),
  CYBERPUNK: new Uint32Array(256),
  PHONETIC_GRAY: new Uint32Array(256)
};

export function initColorLUTs(): void {
  for (const key of Object.keys(ColorPalettes) as PaletteKey[]) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      const t = i / 255.0;
      let r = 0, g = 0, b = 0;

      if (key === 'AEGISUB_BLUE') {
        if (t < 0.25) {
          const k = t / 0.25;
          r = 0.02 * (1 - k) + 0.05 * k;
          g = 0.04 * (1 - k) + 0.15 * k;
          b = 0.15 * (1 - k) + 0.45 * k;
        } else if (t < 0.6) {
          const k = (t - 0.25) / 0.35;
          r = 0.05 * (1 - k);
          g = 0.15 * (1 - k) + 0.75 * k;
          b = 0.45 * (1 - k) + 0.95 * k;
        } else if (t < 0.85) {
          const k = (t - 0.6) / 0.25;
          r = 0.6 * k;
          g = 0.75 * (1 - k) + 0.95 * k;
          b = 0.95 * (1 - k) + 1.0 * k;
        } else {
          const k = (t - 0.85) / 0.15;
          r = 0.6 * (1 - k) + 1.0 * k;
          g = 0.95 * (1 - k) + 1.0 * k;
          b = 1.0;
        }
      } else if (key === 'INFERNO') {
        if (t < 0.3) {
          const k = t / 0.3;
          r = 0.05 + 0.4 * k; g = 0.02; b = 0.1 + 0.4 * k;
        } else if (t < 0.65) {
          const k = (t - 0.3) / 0.35;
          r = 0.45 + 0.5 * k; g = 0.02 + 0.45 * k; b = 0.5 * (1 - k) + 0.05 * k;
        } else if (t < 0.88) {
          const k = (t - 0.65) / 0.23;
          r = 0.95 + 0.05 * k; g = 0.47 * (1 - k) + 0.48 * k; b = 0.05 + 0.2 * k;
        } else {
          const k = (t - 0.88) / 0.12;
          r = 1.0; g = 0.95 + 0.05 * k; b = 0.25 + 0.75 * k;
        }
      } else if (key === 'VIRIDIS') {
        if (t < 0.33) {
          const k = t / 0.33;
          r = 0.26 * (1 - k) + 0.18 * k; g = 0.45 * k; b = 0.33 * (1 - k) + 0.55 * k;
        } else if (t < 0.66) {
          const k = (t - 0.33) / 0.33;
          r = 0.18 * (1 - k) + 0.12 * k; g = 0.45 * (1 - k) + 0.74 * k; b = 0.55 * (1 - k) + 0.45 * k;
        } else {
          const k = (t - 0.66) / 0.34;
          r = 0.12 * (1 - k) + 0.98 * k; g = 0.74 * (1 - k) + 0.90 * k; b = 0.45 * (1 - k) + 0.15 * k;
        }
      } else if (key === 'CYBERPUNK') {
        if (t < 0.5) {
          const k = t / 0.5;
          r = 0.08 + 0.8 * k; g = 0.05; b = 0.25 + 0.6 * k;
        } else {
          const k = (t - 0.5) / 0.5;
          r = 0.88 * (1 - k); g = 0.05 * (1 - k) + 0.95 * k; b = 0.85 * (1 - k) + 1.0 * k;
        }
      } else { // PHONETIC_GRAY
        const v = Math.max(0.05, Math.min(0.98, 1.0 - t));
        r = v; g = v; b = v;
      }

      const R = Math.floor(r * 255);
      const G = Math.floor(g * 255);
      const B = Math.floor(b * 255);
      table[i] = (255 << 24) | (B << 16) | (G << 8) | R;
    }
    ColorLUT[key] = table;
  }
}

// Initialise right away
initColorLUTs();
