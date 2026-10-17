import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../public/calculations/calculator.css', import.meta.url), 'utf8');
const rootTokens = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));

function token(name) {
  const match = rootTokens.match(new RegExp(`--${name}:\\s*(#[a-f0-9]{6})`, 'i'));
  assert.ok(match, `Missing color token: ${name}`);
  return match[1];
}

function luminance(hex) {
  const components = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * components[0] + 0.7152 * components[1] + 0.0722 * components[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('reading text tokens retain at least 4.5:1 contrast on every worksheet surface', () => {
  for (const background of ['canvas', 'surface', 'surface-alt', 'surface-raised', 'surface-inset', 'surface-hover']) {
    for (const foreground of ['ink', 'body-text', 'muted', 'quiet']) {
      assert.ok(contrast(token(foreground), token(background)) >= 4.5, `${foreground} / ${background}`);
    }
  }
});

test('formulas, values and selected cells maintain readable contrast', () => {
  for (const background of [token('surface'), token('surface-alt'), '#22282e', '#2b3238', token('active-row-bg')]) {
    assert.ok(contrast('#c0c9d5', background) >= 4.5);
    assert.ok(contrast('#e0d5c6', background) >= 4.5);
  }
  assert.ok(contrast('#22272d', '#c4ad91') >= 4.5);
  assert.ok(contrast('#25222d', '#b8afc5') >= 4.5);
  assert.ok(contrast(token('active-row-green'), token('active-row-bg')) >= 3);
});

test('the worksheet uses readable text sizes and unambiguous technical typography', () => {
  assert.match(css, /\.parameter-name\s*\{[^}]*font-size:\s*13px/);
  assert.match(css, /\.row-note\s*\{[^}]*font-size:\s*11\.5px/);
  assert.match(css, /\.formula-cell\s*\{[^}]*11\.5px var\(--font-mono\)/);
  assert.match(css, /\.formula-cell\s*\{[^}]*font-variant-ligatures:\s*none/);
  assert.match(css, /\.result-cell\s*>\s*button\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /\.results-table\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.unit-cell\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.ok(css.includes("'JetBrains Mono Variable'"));
  assert.ok(css.includes('@media print'));
});

test('the technical font is cached locally and embedded in the offline archive', async () => {
  const runtime = await readFile(new URL('../src/lib/calculationRuntime.ts', import.meta.url), 'utf8');
  const offline = await readFile(new URL('../src/lib/offline.ts', import.meta.url), 'utf8');
  const calculator = await readFile(new URL('../public/calculations/calculator.js', import.meta.url), 'utf8');
  assert.ok(runtime.includes('mono: monoFont'));
  assert.ok(offline.includes('fonts/jetbrains-mono-latin.woff2'));
  assert.ok(offline.includes('fonts/JETBRAINS-MONO-LICENSE.txt'));
  assert.ok(offline.includes("font-family:'JetBrains Mono Variable'"));
  assert.ok(calculator.includes('fonts.mono'));
  assert.ok(calculator.includes('var STEP_DELAY_MS = 800;'));
  assert.ok(calculator.includes('waitForStart();'));
});