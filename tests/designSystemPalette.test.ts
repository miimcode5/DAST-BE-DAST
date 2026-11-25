import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Official DAST BE DAST Palette & CSS Variables', () => {
  const indexCss = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');

  it('defines all official palette CSS variables in :root', () => {
    expect(indexCss).toContain('--color-primary: #174D35');
    expect(indexCss).toContain('--color-green: #26734B');
    expect(indexCss).toContain('--color-soft-green: #78B98A');
    expect(indexCss).toContain('--color-surface-green: #DCEBDD');
    expect(indexCss).toContain('--color-bg: #F6F7F2');
    expect(indexCss).toContain('--color-text: #202820');
    expect(indexCss).toContain('--color-gold: #E9B949');
    expect(indexCss).toContain('--color-white: #FFFFFF');
  });

  it('forbids substitute hexes, off-palette utility colors, gradients, and rounded-3xl in UI code', () => {
    const uiFiles = collectSourceFiles(path.join(ROOT, 'src')).filter(
      (file) => !file.includes('__tests__')
    );

    const forbiddenPatterns = [
      /#EAF3EC/i,
      /#F7F9F7/i,
      /#E5ECE6/i,
      /\b(amber|rose|emerald|teal|lime|sky|purple|orange|red|stone)-\d+/,
      /\bbg-gradient-/,
      /\brounded-3xl\b/,
    ];

    for (const file of uiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content, `${path.relative(ROOT, file)} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
