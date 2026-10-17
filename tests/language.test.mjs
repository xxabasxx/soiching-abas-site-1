import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

const languageSource = await readFile(new URL('../public/i18n.js', import.meta.url), 'utf8');
const engineSource = await readFile(new URL('../public/calculations/engine.js', import.meta.url), 'utf8');
const workbookSource = await readFile(new URL('../public/calculations/workbook.js', import.meta.url), 'utf8');

function runtime(address = 'https://example.test/power/calculations/transformer.html?lang=fa') {
  const storage = new Map();
  const document = { documentElement: { lang: 'fa', dir: 'rtl' } };
  const location = { href: address };
  const context = vm.createContext({
    URL, Blob, TextEncoder, document, location,
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    history: { replaceState: (_, __, href) => { location.href = href; } },
  });
  vm.runInContext(languageSource, context);
  vm.runInContext(engineSource, context);
  vm.runInContext(workbookSource, context);
  return { I: context.AbasI18n, E: context.VoltaEngine, R: context.VoltaReports, document, location, storage };
}

test('language preference changes direction and survives links without losing project fragments', () => {
  const { I, document, storage } = runtime();
  I.setLanguage('en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.documentElement.dir, 'ltr');
  assert.equal(storage.get('abas-soft-language'), 'en');
  const url = new URL(I.href('./output.html#project=%7B%22name%22%3A%22sample%22%7D'));
  assert.equal(url.searchParams.get('lang'), 'en');
  assert.equal(url.hash, '#project=%7B%22name%22%3A%22sample%22%7D');
  I.setLanguage('fa');
  assert.equal(document.documentElement.dir, 'rtl');
});

test('rebranding never modifies the Persian word for voltage', () => {
  const { I } = runtime();
  assert.equal(I.t('ولتاژ خروجی'), 'ولتاژ خروجی');
  assert.equal(I.t('ولتا، آزمایشگاه طراحی توان'), 'ABAS SOFT، آزمایشگاه طراحی توان');
  assert.equal(I.t('VOLTA LAB'), 'ABAS SOFT');
  I.setLanguage('en');
  assert.equal(I.t('ولتاژ خروجی'), 'Output voltage');
  assert.equal(I.t('عدد بین 1 و 120 وارد کنید.'), 'Enter a number between 1 and 120.');
});

test('all engineering labels, notes, row groups and safety assumptions have English translations', () => {
  const { I, E } = runtime();
  I.setLanguage('en');
  const texts = [
    ...E.fields.flatMap((field) => [field.label, field.note]),
    ...E.rows.flatMap((row) => [row.label, row.note, row.group]),
    ...E.assumptions,
    ...Object.values(E.modules).flatMap((module) => [module.title, module.subtitle]),
    ...E.designOptions.supplyTypes.map((item) => item.label),
    ...E.designOptions.topologies.map((item) => item.label),
    'نوع منبع و توپولوژی',
    'مدل فعال این نسخه: AC/DC ایزوله با فلای‌بک DCM. گزینه‌های دیگر غیرفعال‌اند چون فرمول محاسباتی آن‌ها هنوز پیاده‌سازی نشده است.',
  ];
  for (const text of texts.filter(Boolean)) {
    const translated = I.t(text);
    assert.equal(/[\u0600-\u06ff]/.test(translated), false, `Missing translation: ${text}`);
  }
});

test('language switching leaves formulas and numeric results unchanged', () => {
  const { I, E } = runtime();
  const before = E.calculate(E.defaults, 'transformer');
  I.setLanguage('en');
  const after = E.calculate(E.defaults, 'transformer');
  assert.equal(JSON.stringify(before.values), JSON.stringify(after.values));
  assert.equal(JSON.stringify(before.displayRows.map((row) => row.expr)), JSON.stringify(after.displayRows.map((row) => row.expr)));
});

test('English Excel localizes labels and direction without translating user content', async () => {
  const { I, E, R } = runtime();
  I.setLanguage('en');
  const project = { name: 'پروژه شخصی', notes: 'یادداشت شخصی' };
  const result = E.calculate(E.defaults, 'transformer');
  const blob = R.workbook(result, project, 'transformer');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
  const inputs = await zip.file('xl/worksheets/sheet1.xml').async('string');
  const calculations = await zip.file('xl/worksheets/sheet2.xml').async('string');
  const references = await zip.file('xl/worksheets/sheet5.xml').async('string');
  assert.ok(inputs.includes('rightToLeft="0"'));
  assert.ok(inputs.includes('Minimum AC input'));
  assert.ok(inputs.includes(project.name));
  assert.ok(references.includes(project.notes));
  assert.ok(calculations.includes('ABAS SOFT'));
  assert.ok(calculations.includes('Primary magnetizing inductance'));
  assert.equal((calculations.match(/<f>/g) || []).length, result.displayRows.length);
});

test('file URLs also preserve explicit language without a server', () => {
  const { I } = runtime('file:///offline/calculations/input.html?lang=en');
  assert.equal(I.getLanguage(), 'en');
  assert.equal(I.href('./output.html'), 'file:///offline/calculations/output.html?lang=en');
});

test('worksheet no longer forces a clipped minimum width and preserves result/unit on narrow screens', async () => {
  const css = await readFile(new URL('../public/calculations/calculator.css', import.meta.url), 'utf8');
  assert.equal(css.includes('min-width: 820px'), false);
  assert.match(css, /\.results-table\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.result-cell\s*>\s*button\s*\{[^}]*white-space:\s*normal/);
  assert.match(css, /\.unit-cell\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.ok(css.includes('.calculation-row .unit-cell { grid-column: 3; grid-row: 4;'));
  assert.ok(css.includes('.calculation-row .result-cell { grid-column: 2; grid-row: 4;'));
});

test('all standalone calculators include language assets before the engine', async () => {
  for (const id of ['input', 'transformer', 'switching', 'output']) {
    const html = await readFile(new URL(`../public/calculations/${id}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes('<title>ABAS SOFT |'));
    assert.ok(html.indexOf('../i18n.js') < html.indexOf('./engine.js'));
    assert.ok(html.includes('../i18n-dom.js'));
  }
});