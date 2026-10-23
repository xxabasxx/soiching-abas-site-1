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

test('output stage uses its own capacitor for effective value, not the input bulk', () => {
  const v = E.calculate(E.defaults, 'output').values;
  assert.ok(v.coutStd > 0 && v.coutStd !== v.bulkStd);
  assert.equal(v.coutEff, v.coutStd * (1 - E.defaults.outTol / 100));
});

test('BLDC back-EMF is a voltage bounded by the bus, never an RPM figure', () => {
  const v = E.calculate(E.defaults, 'bldc').values;
  assert.ok(v.backEMF > 0 && v.backEMF <= v.bldcVbus, `backEMF=${v.backEMF}`);
  assert.notEqual(v.backEMF, v.bldcRPM);
});

test('a DC motor type keeps its DC frame suggestion instead of an AC one', () => {
  const result = E.calculate({ ...E.defaults, mType: 2, mPower: 1.5 }, 'motor');
  const note = result.rows.find((row) => row.key === 'suggestedMotor').note;
  assert.ok(note.includes('پیشنهاد DC'), note);
});

test('every module configuration pair is backed by a real engine model', () => {
  for (const module of Object.values(E.modules)) {
    const config = { supplyType: module.supplyType || E.supplyType, topology: module.topology || E.topology };
    assert.ok(E.supportsConfiguration(config), `${module.title}: ${config.supplyType}|${config.topology}`);
  }
  assert.equal(E.supportsConfiguration({ supplyType: 'ac-dc-isolated', topology: 'flyback-ccm' }), false);
  assert.equal(E.supportsConfiguration({ supplyType: 'dc-dc-isolated', topology: 'flyback-dcm' }), false);
  assert.equal(E.supportsConfiguration({ supplyType: 'ac-ac', topology: 'iron-ei' }), true);
  assert.equal(E.supportsConfiguration({ supplyType: 'dc', topology: 'bldc-industrial' }), true);
});

test('unsupported topology labels are marked in the sharing options', () => {
  const supported = E.designOptions.topologies.filter((item) => item.supported).map((item) => item.value);
  assert.equal(supported.join('|'), E.topology);
});

test('cross-parameter conflicts are rejected only inside their own section', () => {
  assert.equal(E.calculate({ ...E.defaults, vacMax: 30 }).valid, false);
  assert.equal(E.calculate({ ...E.defaults, ta: 80, tj: 60 }, 'switching').valid, false);
  assert.equal(E.calculate({ ...E.defaults, ta: 80, tj: 60 }, 'transformer').valid, true);
  assert.equal(E.calculate({ ...E.defaults, holdCutoff: 400 }, 'input').valid, false);
  assert.equal(E.calculate({ ...E.defaults, holdCutoff: 400 }, 'transformer').valid, true);
  assert.equal(E.calculate({ ...E.defaults, esr: 500 }, 'output').valid, false);
  assert.equal(E.calculate({ ...E.defaults, esr: 500 }, 'transformer').valid, true);
});

test('a DCM violation surfaces error-level issues and blocks the Excel export', () => {
  const broken = E.calculate({ ...E.defaults, duty: 65, vref: 20 }, 'transformer');
  assert.equal(broken.valid, true);
  assert.equal(broken.modelValid, false);
  assert.ok(broken.issues.some((issue) => issue.level === 'error'));
  assert.throws(() => R.workbook(broken, { name: 'X', notes: '' }, 'transformer'));
  const scopedBroken = E.calculate({ ...E.defaults, duty: 65, vref: 20 }, 'output');
  assert.equal(scopedBroken.valid, true);
  assert.equal(scopedBroken.modelValid, false);
  const scopedClean = E.calculate({ ...E.defaults, duty: 65, vref: 20 }, 'input');
  assert.equal(scopedClean.modelValid, true, 'the line-side section must stay DCM-independent');
});

test('window-fill exceedance raises a warning instead of hiding silently', () => {
  const result = E.calculate({ ...E.defaults, strand: 2.5, aw: 5 }, 'transformer');
  if (result.valid) {
    assert.ok(result.issues.some((issue) => issue.key === 'fill'), 'expected a fill-related issue');
  }
});

test('all six standalone sections calculate and export clean workbooks', async () => {
  for (const id of ['ironcore', 'ironcore-ind', 'motor', 'motor-ind', 'bldc', 'bldc-ind']) {
    const result = E.calculate(E.defaults, id);
    assert.equal(result.valid, true, id);
    assert.ok(result.rows.every((row) => Number.isFinite(row.value)), id);
    const blob = R.workbook(result, { name: id, notes: '' }, id);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
    for (const path of Object.keys(zip.files).filter((p) => p.endsWith('.xml'))) {
      const xml = await zip.file(path).async('string');
      assert.equal(xml.includes('undefined'), false, `${id}: ${path}`);
    }
  }
});

test('self-test really executes numeric identities across modules', () => {
  const result = E.selfTest();
  assert.equal(result.ok, true, result.failures && result.failures.join(', '));
  assert.ok(result.count >= 20, `count=${result.count}`);
  assert.equal(result.failures.length, 0);
});

test('Excel formulas use valid spreadsheet functions, not raw operator names', async () => {
  const result = E.calculate(E.defaults, 'output');
  const blob = R.workbook(result, { name: 'F', notes: '' }, 'output');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
  const sheet = await zip.file('xl/worksheets/sheet2.xml').async('string');
  for (const broken of ['MAXe', 'eMAX', 'SQRTe', 'eSQRT', '(<', 'COUNTIFe']) assert.equal(sheet.includes(broken), false, broken);
  assert.ok(sheet.includes('MAX(') || sheet.includes('SQRT('));
  assert.ok(sheet.includes('Standards!$A$5:$A$' + (E.series.length + 4)), 'E12 lookup range');
});

test('engine exposes real assumptions and reachable sources for the reports', () => {
  assert.ok(E.assumptions.length >= 8);
  assert.ok(E.sources.length >= 4);
  E.sources.forEach((source) => {
    assert.ok(/^https:\/\//.test(source.url), source.url);
    assert.ok(source.title.length > 8);
  });
});
