import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const EXPECTED_WEIGHTS = [
  { weight: 300, file: 'Pinar-FD-Light.woff2' },
  { weight: 400, file: 'Pinar-FD-Regular.woff2' },
  { weight: 500, file: 'Pinar-FD-Medium.woff2' },
  { weight: 600, file: 'Pinar-FD-SemiBold.woff2' },
  { weight: 700, file: 'Pinar-FD-Bold.woff2' },
  { weight: 800, file: 'Pinar-FD-ExtraBold.woff2' },
  { weight: 900, file: 'Pinar-FD-Black.woff2' },
] as const;

const ROOT = resolve(process.cwd());

describe('Pinar FD font configuration & assets', () => {
  it('provides all 7 valid wOF2 Pinar FD font weights in public/fonts/pinar/', () => {
    for (const { file } of EXPECTED_WEIGHTS) {
      const fontPath = resolve(ROOT, 'public/fonts/pinar', file);
      expect(existsSync(fontPath), `${file} should exist`).toBe(true);
      const buf = readFileSync(fontPath);
      expect(buf.subarray(0, 4).toString('ascii')).toBe('wOF2');
      expect(buf.readUInt32BE(8)).toBe(buf.length);
    }
  });

  it('registers all 7 @font-face rules for Pinar FD with font-display: swap and removes active Vazirmatn usage', () => {
    const css = readFileSync(resolve(ROOT, 'src/index.css'), 'utf8');
    expect(css).not.toMatch(/Vazirmatn/i);
    expect(css).toContain("--font-sans: 'Pinar FD'");
    expect(css).toMatch(/font-family:\s*'Pinar FD'/);

    for (const { weight, file } of EXPECTED_WEIGHTS) {
      const escapedFile = file.replace('.', '\\.');
      const blockRegex = new RegExp(
        `@font-face\\s*\\{[\\s\\S]*?font-family:\\s*['"]Pinar FD['"][\\s\\S]*?url\\(['"]\\/fonts\\/pinar\\/${escapedFile}['"]\\)\\s*format\\(['"]woff2['"]\\)[\\s\\S]*?font-weight:\\s*${weight}[\\s\\S]*?font-display:\\s*swap[\\s\\S]*?\\}`,
        'm'
      );
      expect(css, `@font-face for weight ${weight} (${file})`).toMatch(blockRegex);
    }
  });

  it('uses %BASE_URL% font preloads in index.html and Pinar FD in offline.html', () => {
    const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    expect(indexHtml).toContain('%BASE_URL%fonts/pinar/Pinar-FD-Regular.woff2');
    expect(indexHtml).toContain('%BASE_URL%fonts/pinar/Pinar-FD-Bold.woff2');

    const offlineHtml = readFileSync(resolve(ROOT, 'public/offline.html'), 'utf8');
    expect(offlineHtml).not.toMatch(/Vazirmatn/i);
    expect(offlineHtml).toContain("'Pinar FD'");
    expect(offlineHtml).toContain('./fonts/pinar/Pinar-FD-Regular.woff2');
  });
});
