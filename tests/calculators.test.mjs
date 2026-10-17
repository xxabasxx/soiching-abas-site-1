import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import JSZip from 'jszip';

const context = vm.createContext({ TextEncoder, Blob });
for (const name of ['engine.js', 'workbook.js']) {
  const source = await readFile(new URL(`../public/calculations/${name}`, import.meta.url), 'utf8');
  vm.runInContext(source, context, { filename: name });
}
const E = context.VoltaEngine;
const R = context.VoltaReports;
const baseline = E.calculate(E.defaults);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('built-in checks and every default calculation are finite', () => {
  assert.equal(E.selfTest().ok, true);
  assert.equal(baseline.valid, true);
  assert.equal(baseline.modelValid, true);
  assert.ok(baseline.rows.length >= 90);
  baseline.rows.forEach((row) => assert.ok(Number.isFinite(row.value), row.key));
});

test('independent 80 V bus reference produces the expected Lp and peak current', () => {
  const result = E.calculate({ ...E.defaults, vacMin: 102 / Math.SQRT2, vo: 19.5, io: 1, eff: 78, fs: 50, duty: 40 });
  assert.equal(result.valid && result.modelValid, true);
  near(result.values.busMin, 80);
  near(result.values.pin, 25);
  near(result.values.lp, 409.6);
  near(result.values.ipDesign, 1.5625);
  assert.equal(result.values.bulkStd, 680);
});

test('operating and sizing currents obey their distinct power balances', () => {
  const v = baseline.values;
  near(0.5 * v.lp * 1e-6 * v.ipDesign ** 2 * v.fHz, v.pin);
  near(0.5 * v.lp * 1e-6 * v.ipOp ** 2 * v.fHz, v.psec);
  near(v.isPeak * v.dDemag / 200, v.io);
  near(v.capRms ** 2, v.isRms ** 2 - v.io ** 2);
  near(v.ton + v.tdemag + v.tidle, v.period);
  assert.ok(v.bLimit <= v.bmax);
});

test('Persian and Arabic digits are accepted, blanks and expressions are rejected', () => {
  near(E.parseNumber('۱۲٫۵'), 12.5);
  near(E.parseNumber('١٢٫٥'), 12.5);
  near(E.parseNumber('1e-3'), 0.001);
  for (const value of ['', ' ', 'Infinity', '1/0', 'alert(1)', null, {}]) {
    assert.ok(!Number.isFinite(E.parseNumber(value)), String(value));
  }
});

test('invalid domains are blocked before numeric results are exposed', () => {
  const cases = [
    { io: 0 }, { vacMax: 30 }, { holdCutoff: 400 },
    { eff: 98 }, { esr: 500 }, { tj: 60, ta: 80 },
    { ae: 0 }, { fs: '' }, { rippleIn: 149 },
  ];
  for (const changes of cases) {
    const result = E.calculate({ ...E.defaults, ...changes });
    assert.equal(result.valid, false, JSON.stringify(changes));
    assert.equal(result.rows.length, 0);
  }
});

test('DCM violation blocks design exports rather than silently applying CCM', () => {
  const result = E.calculate({ ...E.defaults, duty: 65, vref: 20 });
  assert.equal(result.valid, true);
  assert.equal(result.modelValid, false);
  assert.ok(result.issues.some((item) => item.level === 'error'));
  assert.throws(() => R.workbook(result, { name: 'Invalid', notes: '' }, 'transformer'));
});

test('formula references are unique and always point to inputs or preceding rows', () => {
  const known = new Set(E.fields.map((field) => field.key));
  const walk = (expr) => {
    if (typeof expr === 'string') assert.ok(known.has(expr), `Unresolved reference: ${expr}`);
    else if (Array.isArray(expr)) expr.slice(1).forEach(walk);
  };
  for (const row of E.rows) {
    assert.equal(known.has(row.key), false, row.key);
    walk(row.expr);
    known.add(row.key);
  }
});

test('section XLSX is a CRC-valid ZIP with scoped formulas and cached numerical values', async () => {
  assert.equal(R.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const section = E.calculate(E.defaults, 'transformer');
  const blob = R.workbook(section, { name: 'Reference & <test>', notes: '=1+1 is a note, not a formula' }, 'transformer');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
  for (const path of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/_rels/workbook.xml.rels']) assert.ok(zip.file(path), path);
  const sheet = await zip.file('xl/worksheets/sheet2.xml').async('string');
  assert.equal((sheet.match(/<f>/g) || []).length, section.displayRows.length);
  assert.equal(sheet.includes('E12_UP('), false);
  assert.equal(sheet.includes('Cout'), false);
  const lpRow = section.displayRows.findIndex((row) => row.key === 'lp') + 5;
  const cached = sheet.match(new RegExp(`<c r="E${lpRow}"[^>]*><f>[^<]+</f><v>([^<]+)</v>`));
  assert.ok(cached);
  near(Number(cached[1]), baseline.values.lp);
  const workbook = await zip.file('xl/workbook.xml').async('string');
  for (const name of ['Inputs', 'Calculations', 'Dependencies', 'Checks', 'References', 'Standards']) assert.ok(workbook.includes(`name="${name}"`));
  const inputs = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.ok(inputs.includes('Reference &amp; &lt;test&gt;'));
  const references = await zip.file('xl/worksheets/sheet5.xml').async('string');
  assert.ok(references.includes('t="inlineStr"'));
});

test('each scope exposes only its section and preserves the full-engine numerical results', () => {
  for (const id of ['input', 'transformer', 'switching', 'output']) {
    const result = E.calculate(E.defaults, id);
    assert.equal(result.valid && result.modelValid, true, id);
    assert.equal(result.scope, id);
    assert.ok(result.displayRows.length > 10 && result.displayRows.length < E.rows.length);
    result.displayRows.forEach((row) => {
      assert.ok(row.module === 'common' || row.module === id, `${id}: ${row.module}`);
      near(row.value, baseline.values[row.key]);
    });
    const required = new Set(result.fields.map((field) => field.key));
    result.rows.forEach((row) => {
      E.referencesOf(row.expr).forEach((key) => assert.ok(required.has(key), `${id}: unresolved ${key}`));
      required.add(row.key);
    });
    assert.equal(result.displayRows.length + result.supportRows.length, result.rows.length);
  }
});

test('unrelated input mistakes do not block another section', () => {
  assert.equal(E.calculate({ ...E.defaults, esr: 500, tj: 20, holdCutoff: 400 }, 'transformer').valid, true);
  assert.equal(E.calculate({ ...E.defaults, ae: 0, esr: 500, duty: 65, vref: 20 }, 'input').modelValid, true);
  assert.equal(E.calculate({ ...E.defaults, rds: 0, pf: 0 }, 'output').valid, true);
  assert.equal(E.calculate({ ...E.defaults, esr: 500 }, 'output').valid, false);
  assert.equal(E.calculate({ ...E.defaults, ae: 0 }, 'transformer').valid, false);
  const inputFields = E.scope('input').fields.map((field) => field.key);
  for (const name of ['esr', 'ae', 'rds', 'duty']) assert.equal(inputFields.includes(name), false, name);
  assert.equal(E.scope('input').supportRows.length, 0);
});

test('all four workbooks preserve every required formula and exclude unrelated result rows', async () => {
  for (const id of ['input', 'transformer', 'switching', 'output']) {
    const result = E.calculate(E.defaults, id);
    const blob = R.workbook(result, { name: id, notes: '' }, id);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
    const main = await zip.file('xl/worksheets/sheet2.xml').async('string');
    const deps = await zip.file('xl/worksheets/sheet3.xml').async('string');
    const inputs = await zip.file('xl/worksheets/sheet1.xml').async('string');
    assert.equal((main.match(/<f>/g) || []).length, result.displayRows.length, id);
    assert.equal((deps.match(/<f>/g) || []).length, result.supportRows.length, id);
    for (const row of E.rows.filter((row) => row.module !== 'common' && row.module !== id)) {
      assert.equal(main.includes(`<t xml:space="preserve">${row.key}</t>`), false, `${id}: leaked ${row.key}`);
    }
    assert.ok(inputs.includes(`count="${result.fields.length}"`));
    for (const path of Object.keys(zip.files).filter((path) => path.endsWith('.xml'))) {
      assert.equal((await zip.file(path).async('string')).includes('undefined'), false, path);
    }
    if (id === 'input' || id === 'output') assert.ok(main.includes('Standards!$A$5:$A$' + (E.series.length + 4)));
    if (id === 'switching' || id === 'output') assert.ok(main.includes('Dependencies!$E$'));
  }
});

test('the four calculator themes share one accent and one stylesheet', async () => {
  for (const id of Object.keys(E.modules)) assert.equal(E.modules[id].accent, '#d8a77f');
  const script = await readFile(new URL('../public/calculations/calculator.js', import.meta.url), 'utf8');
  new vm.Script(script, { filename: 'calculator.js' });
  assert.ok(script.includes('E.calculate(state, moduleId)'));
  assert.ok(script.includes('plan.fields'));
  assert.equal(script.includes("setProperty('--module-accent'"), false);
  assert.ok(script.includes('prefers-reduced-motion'));
});

test('worksheet starts idle and only explicit controls call the calculation entry point', async () => {
  const script = await readFile(new URL('../public/calculations/calculator.js', import.meta.url), 'utf8');
  new vm.Script(script, { filename: 'calculator.js' });
  assert.ok(script.includes('var engineTest = null;'));
  assert.ok(script.includes('waitForStart();'));
  const localeHandler = script.slice(script.indexOf("window.addEventListener('abas-language-change'"));
  assert.equal(/\bcalculate\(/.test(localeHandler), false);
  assert.equal(script.includes('auto-update'), false);
  assert.equal(script.includes('fieldTimer'), false);
  assert.equal(script.includes('ensureCurrent'), false);
  const callSites = script.split('\n').filter((line) => /\bcalculate\(\);/.test(line));
  assert.equal(callSites.length, 2);
  assert.ok(callSites.some((line) => line.includes('event.preventDefault()')));
  assert.ok(callSites.some((line) => line.includes("action === 'replay'")));
  const editAndRestore = script.slice(script.indexOf('function invalidate()'), script.indexOf('function focusField('));
  assert.equal(/\bcalculate\(/.test(editAndRestore), false);
  assert.ok(editAndRestore.includes('waitForStart('));
  const printHandler = script.slice(script.indexOf("window.addEventListener('beforeprint'"), script.indexOf("window.addEventListener('afterprint'"));
  assert.equal(/\bcalculate\(/.test(printHandler), false);
  assert.ok(printHandler.includes('hasCurrentResult()'));
});

test('slow playback has cancellable pause/resume and vertical-only automatic following', async () => {
  const script = await readFile(new URL('../public/calculations/calculator.js', import.meta.url), 'utf8');
  const delay = script.match(/STEP_DELAY_MS\s*=\s*(\d+)/);
  assert.ok(delay);
  assert.ok(Number(delay[1]) >= 650 && Number(delay[1]) <= 1500);
  const pause = script.slice(script.indexOf('function pauseSequence('), script.indexOf('function advanceSequence('));
  assert.ok(pause.includes('clearTimeout(stepTimer)'));
  assert.ok(pause.includes('cancelFollowScroll()'));
  assert.ok(pause.includes('runToken++'));
  const advance = script.slice(script.indexOf('function advanceSequence('), script.indexOf('function resumeSequence('));
  assert.ok(advance.includes('token !== runToken'));
  assert.ok(advance.includes('followActiveRow(index'));
  assert.ok(advance.includes('STEP_DELAY_MS'));
  const following = script.slice(script.indexOf('function followActiveRow('), script.indexOf('function selectRow('));
  assert.ok(following.includes('followRows.checked'));
  assert.ok(following.includes('paused'));
  assert.ok(following.includes('left: window.scrollX'));
  assert.ok(following.includes('getBoundingClientRect()'));
  const visibility = script.split('\n').find((line) => line.includes("document.addEventListener('visibilitychange'"));
  assert.ok(visibility.includes('pauseSequence('));
  assert.equal(visibility.includes('finishSequence('), false);
});

test('future worksheet rows are truly empty, including labels, formulas and result attributes', async () => {
  const script = await readFile(new URL('../public/calculations/calculator.js', import.meta.url), 'utf8');
  const start = script.indexOf('function blankRow(');
  const end = script.indexOf('function renderResults()', start);
  assert.ok(start > 0 && end > start);
  const blankRow = vm.runInNewContext('(' + script.slice(start, end).trim() + ')');
  const html = blankRow(12);
  assert.equal(html.replace(/<[^>]*>/g, '').trim(), '');
  assert.equal((html.match(/<td\b/g) || []).length, 6);
  assert.ok(html.includes('aria-hidden="true"'));
  for (const text of ['title=', 'aria-label=', '<button', '...', 'formula-value', 'data-select-row']) assert.equal(html.includes(text), false, text);
  const renderSource = script.slice(end, script.indexOf('function renderDependencies()', end));
  assert.ok(renderSource.includes('blankRow(index)'));
  assert.equal(renderSource.includes('esc(r.formula)'), false);
  assert.equal(renderSource.includes('fullNumber(r.value)'), false);
  assert.ok(renderSource.includes('hidden></tr>'));
});

test('a row receives its content and a unique active-step frame only when revealed', async () => {
  const script = await readFile(new URL('../public/calculations/calculator.js', import.meta.url), 'utf8');
  const source = script.slice(script.indexOf('function revealStep('), script.indexOf('function completionStatus()'));
  const makeNode = () => {
    const classes = new Set(['is-pending']);
    const attrs = new Map([['aria-hidden', 'true']]);
    return {
      innerHTML: '', classes, attrs,
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
      setAttribute: (name, value) => attrs.set(name, value),
      removeAttribute: (name) => attrs.delete(name),
    };
  };
  const nodes = [makeNode(), makeNode()];
  const environment = vm.createContext({
    result: { displayRows: [
      { label: 'First parameter', note: 'First note', key: 'a', formula: '(3*4)', value: 12, unit: 'V' },
      { label: 'Second parameter', note: '', key: 'b', formula: '(12/2)', value: 6, unit: 'A' },
    ] },
    outputs: {
      querySelector: (selector) => nodes[Number(selector.match(/data-step="(\d+)"/)[1])],
      querySelectorAll: (selector) => selector === '.is-active-step' ? nodes.filter((node) => node.classes.has('is-active-step')) : [],
    },
    stageGroups: [], completed: 0, selectionPinned: true,
    esc: String, number: String, fullNumber: String, unit: String,
  });
  vm.runInContext(source + '\nrevealStep(0, false);', environment);
  for (const content of ['First parameter', 'First note', '(3*4)', '>12<', '>V<']) assert.ok(nodes[0].innerHTML.includes(content), content);
  assert.equal(nodes[1].innerHTML, '');
  assert.equal(nodes[0].attrs.has('aria-hidden'), false);
  assert.ok(nodes[0].classes.has('is-active-step'));
  vm.runInContext('revealStep(1, false);', environment);
  assert.equal(nodes[0].classes.has('is-active-step'), false);
  assert.ok(nodes[1].classes.has('is-active-step'));
  assert.equal(nodes[1].attrs.get('aria-current'), 'step');
  assert.ok(nodes[1].innerHTML.includes('Second parameter'));
});

test('supply and topology metadata are explicit and unsupported models cannot be exported', async () => {
  assert.equal(E.supportsConfiguration({ supplyType: E.supplyType, topology: E.topology }), true);
  assert.equal(E.supportsConfiguration({ supplyType: 'dc-dc-isolated', topology: E.topology }), false);
  assert.equal(E.supportsConfiguration({ supplyType: E.supplyType, topology: 'llc' }), false);
  assert.equal(E.designOptions.topologies.filter((item) => item.supported).length, 1);
  const result = E.calculate(E.defaults, 'transformer');
  assert.throws(() => R.workbook(result, { name: 'Wrong source', supplyType: 'dc-dc-isolated' }, 'transformer'));
  assert.throws(() => R.workbook(result, { name: 'Wrong topology', topology: 'flyback-ccm' }, 'transformer'));
  const blob = R.workbook(result, { name: 'Correct model', supplyType: E.supplyType, topology: E.topology }, 'transformer');
  const archive = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
  const inputSheet = await archive.file('xl/worksheets/sheet1.xml').async('string');
  assert.ok(inputSheet.includes('SUPPLY_TYPE'));
  assert.ok(inputSheet.includes('TOPOLOGY'));
  const css = await readFile(new URL('../public/calculations/calculator.css', import.meta.url), 'utf8');
  assert.ok(css.includes('--active-row-green: #6bc593'));
  assert.ok(css.includes('.calculation-row.is-active-step > td'));
  assert.ok(css.includes('.calculation-row.is-active-step { background: var(--active-row-bg)'));
});

test('all four direct HTML pages include the offline calculator dependencies', async () => {
  for (const id of ['input', 'transformer', 'switching', 'output']) {
    const html = await readFile(new URL(`../public/calculations/${id}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`data-module="${id}"`));
    for (const file of ['engine.js', 'workbook.js', 'calculator.js', 'calculator.css']) assert.ok(html.includes(`./${file}`));
  }
});