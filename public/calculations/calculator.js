(function () {
  'use strict';
  var E = window.VoltaEngine, Reports = window.VoltaReports;
  var I = window.AbasI18n;
  function translate(text) { return I ? I.t(text) : text; }
  var root = document.getElementById('calculator-root');
  if (!root || !E || !Reports) return;
  var moduleId = document.body.getAttribute('data-module') || 'transformer';
  if (!E.modules[moduleId]) moduleId = 'transformer';
  var module = E.modules[moduleId], plan = E.scope(moduleId);
  var sectionNumber = Object.keys(E.modules).indexOf(moduleId) + 1;
  var state = Object.assign({}, E.defaults), result = null;
  var configuration = { supplyType: module.supplyType || E.supplyType, topology: module.topology || E.topology };
  function defaultProjectName() {
    if (moduleId === 'ironcore') return translate('پروژه ترانس هسته آهن');
    if (moduleId === 'motor') return translate('پروژه الکتروموتور');
    return translate('پروژه منبع تغذیه ۱۲ ولت');
  }
  var projectName = defaultProjectName(), notes = '';
  var storageKey = 'volta-smps-project-v1', storageOk = true;
  var STEP_DELAY_MS = 800;
  var stepTimer = 0, runToken = 0, running = false, paused = false, dirty = true;
  var completed = 0, selectionPinned = false, stageGroups = [];
  var followScrollTimer = 0, followScrolling = false;
  var exportUrls = [], lastExportFocus = null, toastTimer = 0;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var engineTest = null;
  var groupNames = { electrical: 'فرض‌های الکتریکی', input: 'شبکه و خازن ورودی', transformer: 'هسته و سیم‌پیچ', switching: 'کلید، حفاظت و کنترل', output: 'ریپل و فیلتر خروجی', ironcore: 'هسته آهن و سیم‌پیچ', motor: 'پارامترهای موتور' };
  var icons = {
    import: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
    save: '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8"/>',
    print: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1"/>',
    text: '<path d="M14 2H4v20h16V8l-6-6ZM14 2v6h6M8 12h8M8 16h6"/>',
    excel: '<path d="M14 2H4v20h16V8l-6-6ZM14 2v6h6M8 12l6 6m0-6-6 6"/>',
    arrow: '<path d="M19 12H5m7-7-7 7 7 7"/>',
    back: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    refresh: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    play: '<path d="m8 4 12 8-12 8V4Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    skip: '<path d="m4 5 10 7L4 19V5ZM19 5v14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    fold: '<path d="m6 9 6 6 6-6"/>',
    sliders: '<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M9 3H4v17h17v-5"/>'
  };
  function icon(name, size) { return '<svg width="' + (size || 17) + '" height="' + (size || 17) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.info) + '</svg>'; }
  function esc(text) { return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function number(value, digits) {
    if (!Number.isFinite(value)) return 'نامعتبر';
    if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(3);
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits == null ? 3 : digits }).format(value);
  }
  function fullNumber(value) { return Number.isFinite(value) ? Number(value.toPrecision(12)).toString() : 'INVALID'; }
  function unit(value) { return ({ uH: 'µH', uF: 'µF', us: 'µs', mm2: 'mm²', 'A/mm2': 'A/mm²', ohm: 'Ω', kohm: 'kΩ', mohm: 'mΩ', 'C/W': '°C/W', C: '°C', turn: 'دور', 'nH/turn2': 'nH/N²', cm2: 'cm²', VA: 'VA', 'W/kg': 'W/kg', 'turn/V': 'turn/V', 'N.m': 'N·m', RPM: 'RPM', kVA: 'kVA' })[value] || value; }
  function reducedMotion() { return motionQuery && motionQuery.matches; }

  try {
    var fonts = JSON.parse(sessionStorage.getItem('volta-calculator-fonts') || 'null');
    if (fonts && ['arabic', 'latin'].every(function (key) { return typeof fonts[key] === 'string' && fonts[key].length < 250000 && /^data:[a-z0-9/.-]+;base64,[A-Za-z0-9+/=]+$/.test(fonts[key]); })) {
      var style = document.createElement('style');
      style.textContent = "@font-face{font-family:'Vazirmatn Variable';font-weight:100 900;font-display:swap;src:url('" + fonts.arabic + "') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC}@font-face{font-family:'Vazirmatn Variable';font-weight:100 900;font-display:swap;src:url('" + fonts.latin + "') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}";
      if (typeof fonts.mono === 'string' && fonts.mono.length < 250000 && /^data:[a-z0-9/.-]+;base64,[A-Za-z0-9+/=]+$/.test(fonts.mono)) {
        style.textContent += "@font-face{font-family:'JetBrains Mono Variable';font-style:normal;font-weight:100 800;font-display:swap;src:url('" + fonts.mono + "') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2191,U+2193,U+2212,U+2215}";
      }
      document.head.appendChild(style);
    }
  } catch (error) { /* Local HTML still works when browser storage is unavailable. */ }

  function snapshot() {
    if (!module.standaloneModule && !E.supportsConfiguration(configuration)) throw new Error('نوع منبع و توپولوژی انتخاب‌شده در این نسخه پشتیبانی نمی‌شود.');
    var values = {};
    E.fields.forEach(function (f) {
      var value = E.parseNumber(state[f.key]);
      if (!Number.isFinite(value)) throw new Error('مقدار نامعتبر برای ' + f.label);
      values[f.key] = value;
    });
    return { schema: 'abas-soft-project', version: 1, engine: E.version, topology: configuration.topology, supplyType: configuration.supplyType, name: projectName.trim() || translate('پروژه بدون نام'), notes: notes, language: I ? I.getLanguage() : 'fa', updatedAt: new Date().toISOString(), activeModule: moduleId, values: values };
  }
  function validateProject(input) {
    if (!input || typeof input !== 'object' || ['volta-smps-project', 'abas-soft-project'].indexOf(input.schema) === -1 || input.version !== 1 || input.topology !== E.topology || !input.values || typeof input.values !== 'object') {
      throw new Error('فایل .abas.json معتبر انتخاب کنید؛ فایل Excel ورودی پروژه نیست.');
    }
    var loadedConfiguration = { supplyType: input.supplyType === undefined ? E.supplyType : input.supplyType, topology: input.topology };
    if (!module.standaloneModule && !E.supportsConfiguration(loadedConfiguration)) throw new Error('نوع منبع و توپولوژی انتخاب‌شده در این نسخه پشتیبانی نمی‌شود.');
    var clean = {};
    E.fields.forEach(function (f) {
      if (!Object.prototype.hasOwnProperty.call(input.values, f.key) || typeof input.values[f.key] !== 'number' || !Number.isFinite(input.values[f.key])) throw new Error('ورودی پروژه ناقص یا نامعتبر است: ' + f.label);
      clean[f.key] = input.values[f.key];
    });
    return { values: clean, configuration: loadedConfiguration, name: typeof input.name === 'string' ? input.name.slice(0, 100) : 'پروژه واردشده', notes: typeof input.notes === 'string' ? input.notes.slice(0, 2000) : '' };
  }
  try {
    var carried = location.hash.indexOf('#project=') === 0 ? decodeURIComponent(location.hash.slice(9)) : null;
    var saved = carried || localStorage.getItem(storageKey);
    // Ignore cached project name if switching entirely different modules (e.g. flyback to motor)
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        var expectedTopology = module.standaloneModule ? (module.topology || moduleId) : (module.topology || E.topology);
        if (parsed.topology !== expectedTopology) { saved = null; }
      } catch(e) {}
    }
    if (saved && saved.length < 100000) {
      var parsed = JSON.parse(saved);
      var expectedTopology = module.standaloneModule ? (module.topology || moduleId) : (module.topology || E.topology);
      if (parsed.topology !== expectedTopology) { throw new Error('Topology mismatch, ignoring cache'); }
      var initial = validateProject(parsed);
      state = initial.values; configuration = initial.configuration; projectName = initial.name; notes = initial.notes;
    }
    if (carried) { try { history.replaceState(null, '', location.pathname + location.search); } catch (error) { /* Some file origins do not support replaceState. */ } }
  } catch (error) { storageOk = false; }

  document.title = 'ABAS SOFT | ' + translate(module.title);
  function logo() {
    return '<a class="calc-brand" href="../index.html" data-home-link aria-label="صفحه اصلی ABAS SOFT" dir="ltr"><svg viewBox="0 0 44 44" fill="none"><rect x="1" y="1" width="42" height="42" rx="11" stroke="currentColor"/><path d="M9 22h7l4-11 5 23 4-12h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>ABAS SOFT<i>.</i><small>POWER DESIGN LAB</small></span></a>';
  }
  function tool(action, text, primary) {
    return '<button type="button" class="tool-button' + (primary ? ' tool-primary' : '') + '" data-action="' + action + '"' + (['excel', 'text', 'print'].indexOf(action) !== -1 ? ' data-report-button disabled' : '') + '>' + icon(action) + '<span>' + text + '</span></button>';
  }
  var selectFields = {
    iType:      [{value:0,label:'تک‌فاز'},{value:1,label:'سه‌فاز'}],
    iAppClass:  [{value:0,label:'عمومی'},{value:1,label:'صنعتی'}],
    mType:      [{value:0,label:'تک‌فاز'},{value:1,label:'سه‌فاز'},{value:2,label:'DC جریان مستقیم'}],
    mAppClass:  [{value:0,label:'عمومی'},{value:1,label:'صنعتی'}]
  };
  function fieldMarkup(f) {
    var opts = selectFields[f.key];
    if (opts) {
      var cur = parseFloat(state[f.key]) || 0;
      var sel = opts.map(function(o) { return '<option value="' + o.value + '"' + (Math.abs(o.value - cur) < 0.5 ? ' selected' : '') + '>' + esc(translate(o.label)) + '</option>'; }).join('');
      return '<label class="calc-field" for="field-' + f.key + '"><span class="calc-field-label">' + esc(f.label) + (f.note ? '<span class="field-info" title="' + esc(f.note) + '">' + icon('info', 12) + '</span>' : '') + '</span><select id="field-' + f.key + '" name="' + f.key + '" data-field="' + f.key + '" aria-describedby="error-' + f.key + '">' + sel + '</select><span id="error-' + f.key + '" class="field-error"></span></label>';
    }
    return '<label class="calc-field" for="field-' + f.key + '"><span class="calc-field-label">' + esc(f.label) + (f.note ? '<span class="field-info" title="' + esc(f.note) + '">' + icon('info', 12) + '</span>' : '') + '</span><span class="input-unit"><input id="field-' + f.key + '" name="' + f.key + '" data-field="' + f.key + '" value="' + esc(state[f.key]) + '" type="text" inputmode="decimal" dir="ltr" autocomplete="off" spellcheck="false" aria-describedby="error-' + f.key + '"><span dir="ltr">' + esc(unit(f.unit)) + '</span></span><span id="error-' + f.key + '" class="field-error"></span></label>';
  }
  function parameterGroup(label, items, note) {
    if (!items.length) return '';
    return '<section class="parameter-group"><h3>' + esc(label) + '</h3>' + (note ? '<p>' + esc(note) + '</p>' : '') + '<div class="fields-grid">' + items.map(fieldMarkup).join('') + '</div></section>';
  }
  function configurationOptions(items, selected) {
    return items.map(function (item) {
      return '<option value="' + esc(item.value) + '"' + (item.value === selected ? ' selected' : '') + (!item.supported ? ' disabled' : '') + '>' + esc(item.label) + (!item.supported ? ' (پشتیبانی نشده)' : '') + '</option>';
    }).join('');
  }
  function configurationMarkup() {
    if (module.standaloneModule) {
      return '<p id="configuration-error" class="field-error" role="alert"></p>';
    }
    return '<fieldset class="source-configuration"><legend>نوع منبع و توپولوژی</legend><div class="configuration-fields"><label class="calc-field" for="supply-type"><span class="calc-field-label">نوع منبع</span><select id="supply-type" data-configuration="supplyType" aria-describedby="configuration-note">' + configurationOptions(E.designOptions.supplyTypes, configuration.supplyType) + '</select></label><label class="calc-field" for="design-topology"><span class="calc-field-label">توپولوژی</span><select id="design-topology" data-configuration="topology" aria-describedby="configuration-note">' + configurationOptions(E.designOptions.topologies, configuration.topology) + '</select></label></div><p id="configuration-note">مدل فعال این نسخه: AC/DC ایزوله با فلای‌بک DCM. گزینه‌های دیگر غیرفعال‌اند چون فرمول محاسباتی آن‌ها هنوز پیاده‌سازی نشده است.</p><p id="configuration-error" class="field-error" role="alert"></p></fieldset>';
  }
  var basicKeys = module.basics || null;
  var basics = plan.fields.filter(function (f) { return basicKeys ? basicKeys.indexOf(f.key) !== -1 : f.group === 'basic'; });
  var electrical = plan.fields.filter(function (f) { return f.group === 'electrical'; });
  var specific = plan.fields.filter(function (f) { return f.group === moduleId && (!basicKeys || basicKeys.indexOf(f.key) === -1); });
  var inherited = plan.fields.filter(function (f) { return ['basic', 'electrical', moduleId].indexOf(f.group) === -1; });

  if (module.standaloneModule) root.classList.add('is-standalone');
  root.innerHTML = '<div class="calculator-app">' +
    '<a class="calc-skip-link" href="#worksheet">رفتن به برگه محاسبات</a>' +
    '<header class="calc-topbar"><div class="calc-topbar-inner">' + logo() + '<div class="calc-breadcrumb"><span>آزمایشگاه طراحی توان</span><b>/</b><strong>محاسبات تخصصی</strong></div><div class="calc-language-switch" role="group" aria-label="Language / زبان" dir="ltr" data-no-i18n><button type="button" data-language="fa" lang="fa">فارسی</button><span>/</span><button type="button" data-language="en" lang="en">EN</button></div><a class="home-link" data-home-link href="../index.html#calculations">بازگشت به همه بخش‌ها' + icon('back', 16) + '</a></div></header>' +
    '<div class="calc-commandbar"><div class="calc-command-inner"><div class="project-name-wrap"><span class="project-dot"></span><input id="project-name" aria-label="نام پروژه" maxlength="100" value="' + esc(projectName) + '"><span id="project-state">فضای کار شخصی شما</span></div><div class="calc-tools">' + tool('import', 'بارگذاری پروژه') + tool('save', 'ذخیره پروژه') + '<span class="toolbar-divider"></span>' + tool('print', 'چاپ نتایج') + tool('text', 'خروجی متن') + tool('excel', 'دریافت Excel', true) + '</div></div></div>' +
    '<main class="calc-main"><section class="calculator-heading"><div><div class="calc-eyebrow"><span></span><span dir="ltr">' + module.english + '</span></div><h1>' + module.title + '<span>.</span></h1><p>چند ورودی از شما؛ محاسبات این بخش، گام‌به‌گام از ABAS SOFT.</p></div><div class="heading-signature" aria-hidden="true"><span dir="ltr">0' + sectionNumber + '<small> / 04</small></span><svg viewBox="0 0 180 55" fill="none"><path d="M0 28h25l12-15 17 30L74 5l19 44 17-30 14 19 9-10h47" stroke="currentColor" stroke-width="1.2"/></svg><small dir="ltr">PRECISION, ONE STEP AT A TIME</small></div></section>' +
    '<nav class="calc-tabs" aria-label="بخش‌های طراحی">' + Object.keys(E.modules).map(function (id, i) { return '<a href="./' + id + '.html" data-module-link="' + id + '" class="' + (id === moduleId ? 'active' : '') + '"' + (id === moduleId ? ' aria-current="page"' : '') + '><span dir="ltr">0' + (i + 1) + '</span>' + E.modules[id].title + '</a>'; }).join('') + '</nav>' +
    '<div class="calculator-layout"><aside class="parameters-panel"><div class="panel-title"><div><span class="panel-eyebrow">قدم اول</span><h2>مشخصات اولیه</h2></div><button class="calc-icon-button" data-action="reset" title="بازگشت به مثال پیش‌فرض" aria-label="شروع دوباره با مثال پیش‌فرض">' + icon('refresh', 17) + '</button></div>' +
    '<form id="parameters-form" novalidate>' + configurationMarkup() + '<div class="basic-fields fields-grid">' + basics.map(fieldMarkup).join('') + '</div><p class="parameter-tip">' + esc(module.tip || 'با همین چهار مقدار شروع کنید. فرض‌های تکمیلی از پیش پر شده‌اند و باید با طراحی شما تطبیق داده شوند.') + '</p><div class="input-actions"><button type="submit" class="calculate-button">' + icon('play', 16) + '<span>محاسبه گام‌به‌گام</span>' + icon('arrow', 17) + '</button><p class="manual-start-hint">شروع فقط با این دکمه؛ هر ردیف با فاصله حدود ۰٫۸ ثانیه نمایش داده می‌شود.</p></div>' +
    '<details class="advanced-options" id="advanced-options"><summary>' + icon('sliders', 16) + '<span>فرض‌های پیشرفته این بخش</span>' + icon('fold', 14) + '</summary><div class="advanced-content">' + parameterGroup(groupNames.electrical, electrical) + parameterGroup(groupNames[moduleId], specific) + parameterGroup('فرض‌های مشترک مورد استفاده', inherited, 'فقط مقادیری که در روابط این بخش استفاده می‌شوند؛ نه تنظیمات کامل بخش‌های دیگر.') + '</div></details>' +
    '<details class="project-notes"><summary>یادداشت پروژه' + icon('fold', 14) + '</summary><textarea id="project-notes" rows="3" maxlength="2000" placeholder="نام هسته، شماره قطعه یا نکته طراحی...">' + esc(notes) + '</textarea></details></form><div class="input-model-note">' + icon('shield', 16) + '<div><strong dir="ltr">FLYBACK / DCM</strong><p>' + (moduleId === 'input' ? 'ورودی و یکسوساز، مستقل از محاسبات هسته و خروجی.' : 'پیش‌طراحی ایزوله، تک‌خروجی و فرکانس ثابت.') + '</p></div></div><p id="storage-note" class="storage-note">پشتیبان دائمی: از «ذخیره پروژه» استفاده کنید.</p></aside>' +
    '<section class="worksheet-panel" id="worksheet" aria-label="برگه محاسبات مرحله‌ای"><div class="worksheet-title"><div><span class="sheet-eyebrow" dir="ltr">ABAS SOFT / LIVE WORKSHEET</span><h2>برگه ' + module.title + '</h2></div><div class="live-status" id="live-status" role="status" aria-live="polite"><span></span>آماده محاسبه</div></div>' +
    '<div class="worksheet-runbar"><div><span id="run-icon">' + icon('play', 13) + '</span><span id="run-caption">منتظر شروع محاسبات</span></div><div class="worksheet-run-actions"><button type="button" class="worksheet-replay" data-action="pause" data-pause-button hidden>' + icon('pause', 13) + 'توقف</button><button type="button" class="worksheet-replay" data-action="replay" id="worksheet-replay" disabled>' + icon('refresh', 13) + 'اجرای دوباره</button></div></div><div class="run-progress" role="progressbar" aria-label="پیشرفت نمایش محاسبات" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="run-progress-fill"></span></div>' +
    (module.standaloneModule ? '' : ('<div class="formula-bar"><span class="cell-address" id="cell-address" dir="ltr">E5</span><span class="fx-label" aria-hidden="true">fx</span><input id="formula-expression" aria-label="فرمول ردیف انتخاب‌شده" dir="ltr" readonly value=""><button class="calc-icon-button" data-action="formula" title="نمایش جایگذاری اعداد" aria-label="نمایش جایگذاری اعداد" aria-expanded="false" id="formula-toggle">' + icon('info', 15) + '</button></div><div id="formula-detail" class="formula-detail" hidden><span id="formula-description"></span><code id="numeric-expression" dir="ltr"></code></div>')) +
    '<div id="results-content"></div><div class="worksheet-bottom"><span>' + icon('info', 12) + 'روی نتیجه هر ردیف بزنید تا فرمول آن را ببینید.</span><span id="sheet-row-count"></span></div></section></div>' +
    '<section class="design-notes"><details><summary>' + icon('shield', 17) + '<span>فرض‌ها و محدوده اعتبار این طراحی</span>' + icon('fold', 14) + '</summary><ul>' + E.assumptions.map(function (text) { return '<li>' + esc(text) + '</li>'; }).join('') + '</ul></details><details><summary>' + icon('info', 17) + '<span>منابع و روش محاسبه</span>' + icon('fold', 14) + '</summary><p>گزارش این صفحه فقط شامل محاسبات همین بخش است. روابط کمکی لازم در قسمت «مبنای محاسبه‌شده مشترک» و برگه Dependencies فایل Excel قرار دارند. نمایش مرحله‌ای فقط شیوه ارائه نتیجه است؛ محاسبات واقعی بدون گردکردن میانی انجام می‌شوند.</p><ul>' + E.sources.map(function (source) { return '<li><a href="' + source.url + '" target="_blank" rel="noopener noreferrer" dir="ltr">' + esc(source.title) + '</a></li>'; }).join('') + '</ul><p id="engine-status"></p></details></section>' +
    '<footer class="calc-footer"><span>ساخته‌شده برای ذهن‌های دقیق؛ نه جایگزین تأیید مهندسی.</span><span dir="ltr">ABAS SOFT / ENGINE ' + E.version + '</span></footer></main>' +
    '<div class="print-only print-appendix" id="print-appendix"></div><input id="project-file" type="file" accept=".json,.abas.json,.volta.json,application/json" hidden><div class="calc-toast" id="calc-toast" role="status" aria-live="polite" hidden></div>' +
    '<div class="playback-panel" id="playback-panel" role="region" aria-label="کنترل اجرای محاسبات" hidden><span class="playback-caption" id="playback-caption"></span><label class="follow-rows-label"><input id="follow-rows" type="checkbox"' + (reducedMotion() ? '' : ' checked') + '>دنبال‌کردن ردیف فعال</label><button type="button" data-action="pause" data-pause-button>' + icon('pause', 14) + 'توقف</button><button type="button" data-action="finish">' + icon('skip', 14) + 'نمایش همه</button></div>' +
    '<div id="download-dialog" class="download-overlay" hidden><section role="dialog" aria-modal="true" aria-labelledby="download-title" tabindex="-1" class="export-dialog"><button class="calc-icon-button export-close" data-action="close-export" aria-label="بستن">' + icon('close', 19) + '</button><span class="export-file-icon">' + icon('excel', 31) + '</span><h2 id="download-title" data-no-i18n></h2><p id="download-description"></p><a id="download-link" class="export-link">' + icon('import', 17) + '<span>دریافت فایل</span></a><small>فایل آماده است؛ برای ذخیره روی لینک بالا کلیک کنید.</small></section></div></div>';

  if (location.protocol === 'file:') document.querySelectorAll('[data-home-link]').forEach(function (a) { a.href = '../offline.html#calculations'; });
  var outputs = document.getElementById('results-content');
  var projectInput = document.getElementById('project-name');
  var fileInput = document.getElementById('project-file');
  var dialog = document.getElementById('download-dialog');
  var progress = document.querySelector('.run-progress');
  var progressFill = document.getElementById('run-progress-fill');
  var runCaption = document.getElementById('run-caption');
  var replayButton = document.getElementById('worksheet-replay');
  var live = document.getElementById('live-status');
  var formulaInput = document.getElementById('formula-expression');
  var formulaDetail = document.getElementById('formula-detail');
  var playbackPanel = document.getElementById('playback-panel');
  var playbackCaption = document.getElementById('playback-caption');
  var followRows = document.getElementById('follow-rows');

  if (window.top !== window.self && /^https?:$/.test(location.protocol)) {
    var external = document.createElement('a');
    external.id = 'export-browser-link'; external.className = 'export-browser-link';
    external.target = '_blank'; external.rel = 'noopener noreferrer';
    external.textContent = 'باز کردن همین پروژه در تب مستقل مرورگر';
    dialog.querySelector('section').appendChild(external);
  }

  function toast(text) {
    var node = document.getElementById('calc-toast'); node.textContent = text; node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { node.hidden = true; }, 5500);
  }
  function setLive(text, kind) {
    live.className = 'live-status' + (kind ? ' ' + kind : '');
    live.innerHTML = '<span></span>' + esc(text);
  }
  function hasCurrentResult() {
    var configOk = module.standaloneModule ? true : E.supportsConfiguration(configuration);
    return !dirty && configOk && !!result && result.valid && result.modelValid && !!engineTest && engineTest.ok;
  }
  function reportButtons() {
    document.querySelectorAll('[data-report-button]').forEach(function (button) { button.disabled = !hasCurrentResult(); });
  }
  function cancelFollowScroll() {
    clearTimeout(followScrollTimer);
    if (!followScrolling) return;
    var html = document.documentElement, oldBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'auto' });
    html.style.scrollBehavior = oldBehavior;
    followScrolling = false;
  }
  function syncPlaybackControls() {
    playbackPanel.hidden = !running;
    document.querySelectorAll('[data-pause-button]').forEach(function (button) {
      button.hidden = !running;
      button.innerHTML = icon(paused ? 'play' : 'pause', 14) + (paused ? 'ادامه' : 'توقف');
      button.setAttribute('aria-label', paused ? 'ادامه نمایش محاسبات' : 'توقف نمایش و اسکرول');
    });
    playbackCaption.textContent = (paused ? 'متوقف در گام ' : 'گام ') + number(completed, 0) + ' از ' + number(result ? result.displayRows.length : 0, 0);
  }
  function stopSequence() {
    clearTimeout(stepTimer); stepTimer = 0; runToken++; running = false; paused = false;
    cancelFollowScroll();
    outputs.classList.remove('is-presenting');
    syncPlaybackControls();
  }
  function setProgress(value) {
    progress.setAttribute('aria-valuenow', String(value));
    progressFill.style.width = value + '%';
  }
  function followActiveRow(index, force) {
    if (!followRows.checked || !running || paused || dirty || document.hidden) return;
    var node = outputs.querySelector('[data-step="' + index + '"]');
    if (!node) return;
    var bar = document.querySelector('.calc-commandbar');
    var sticky = window.getComputedStyle(bar).position === 'sticky';
    var topInset = sticky ? Math.max(0, bar.getBoundingClientRect().bottom) + 20 : 24;
    var height = window.innerHeight || document.documentElement.clientHeight;
    var bottomInset = playbackPanel.getBoundingClientRect().height + 28;
    var available = Math.max(80, height - topInset - bottomInset);
    var anchor = topInset + available * .38;
    var box = node.getBoundingClientRect();
    var maxScroll = Math.max(0, document.documentElement.scrollHeight - height);
    var target = Math.max(0, Math.min(maxScroll, window.scrollY + box.top - anchor));
    // Follow only the vertical page axis; never reset a horizontally scrolled worksheet.
    if (index > 0 && !force && target < window.scrollY - 2) return;
    if (Math.abs(target - window.scrollY) < 3) return;
    cancelFollowScroll();
    window.scrollTo({ top: target, left: window.scrollX, behavior: reducedMotion() ? 'auto' : 'smooth' });
    followScrolling = true;
    followScrollTimer = setTimeout(function () { followScrolling = false; }, 650);
  }
  function selectRow(index, focus) {
    if (!result || dirty || index < 0 || index >= completed) return;
    var row = result.displayRows[index];
    outputs.querySelectorAll('[data-step]').forEach(function (node) { node.classList.toggle('is-selected', Number(node.getAttribute('data-step')) === index); });
    outputs.querySelectorAll('[data-select-row]').forEach(function (button) { button.tabIndex = Number(button.getAttribute('data-select-row')) === index ? 0 : -1; });
    var cellAddress = document.getElementById('cell-address'); if (cellAddress) cellAddress.textContent = 'E' + (index + 5);
    if (formulaInput) formulaInput.value = '= ' + row.formula;
    var formulaDesc = document.getElementById('formula-description'); if (formulaDesc) formulaDesc.textContent = row.label;
    var numeric = {};
    Object.keys(result.values).forEach(function (key) { numeric[key] = '(' + fullNumber(result.values[key]) + ')'; });
    var numericExpr = document.getElementById('numeric-expression'); if (numericExpr) numericExpr.textContent = E.formula(row.expr, numeric, false) + ' = ' + fullNumber(row.value) + ' ' + row.unit;
    if (focus) {
      var button = outputs.querySelector('[data-select-row="' + index + '"]');
      if (button) { button.focus({ preventScroll: true }); button.closest('tr').scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
    }
  }
  function revealStep(index, animate) {
    var row = result.displayRows[index], node = outputs.querySelector('[data-step="' + index + '"]');
    if (!node) return;
    stageGroups.forEach(function (group, groupIndex) {
      if (group.start !== index) return;
      var heading = outputs.querySelector('[data-stage="' + groupIndex + '"]');
      if (!heading) return;
      heading.innerHTML = '<th colspan="6"><div><span class="stage-marker" dir="ltr">' + String(groupIndex + 1).padStart(2, '0') + '</span><span>' + esc(translate(group.title)) + '</span><small data-stage-count="' + groupIndex + '" data-start="' + group.start + '" data-total="' + group.length + '"></small></div></th>';
      heading.hidden = false;
    });
    // Future rows contain no text, formula, tooltip, result or accessible label until this point.
    node.innerHTML = '<td class="row-number"><span class="row-content">' + number(index + 1, 0) + '</span></td>' +
      '<td class="parameter-name"><span class="row-content">' + esc(row.label) + (row.note ? '<span class="row-note">' + esc(row.note) + '</span>' : '') + '</span></td>' +
      '<td class="symbol-cell" dir="ltr"><span class="row-content">' + esc(row.key) + '</span></td>' +
      '<td class="formula-cell" dir="ltr"><span class="row-content">' + esc(row.formula) + '</span></td>' +
      '<td class="result-cell"><button type="button" data-select-row="' + index + '" tabindex="-1" title="' + fullNumber(row.value) + '" aria-label="' + esc(row.label + ': ' + number(row.value) + ' ' + unit(row.unit) + '؛ مشاهده فرمول') + '"><span class="cell-value">' + esc(number(row.value)) + '</span></button></td>' +
      '<td class="unit-cell" dir="ltr"><span class="row-content">' + esc(unit(row.unit)) + '</span></td>';
    node.removeAttribute('aria-hidden');
    node.classList.remove('is-pending'); node.classList.add('is-revealed');
    outputs.querySelectorAll('.is-active-step').forEach(function (previous) {
      previous.classList.remove('is-active-step'); previous.removeAttribute('aria-current');
    });
    node.classList.add('is-active-step'); node.setAttribute('aria-current', 'step');
    if (animate) node.classList.add('just-computed');
    completed = index + 1;
    outputs.querySelectorAll('[data-stage-count]').forEach(function (label) {
      var start = Number(label.getAttribute('data-start')), length = Number(label.getAttribute('data-total'));
      label.textContent = number(Math.max(0, Math.min(length, completed - start)), 0) + ' / ' + number(length, 0);
    });
    if (!selectionPinned) selectRow(index, false);
  }
  function completionStatus() {
    clearTimeout(stepTimer); stepTimer = 0; running = false; paused = false;
    outputs.classList.remove('is-presenting');
    setProgress(100);
    runCaption.textContent = number(completed, 0) + ' رابطه، فقط برای این بخش';
    replayButton.innerHTML = icon('refresh', 13) + 'پخش دوباره';
    document.getElementById('run-icon').innerHTML = icon('check', 13);
    setLive(result.modelValid ? 'نمایش محاسبات کامل شد' : 'شرط DCM نیاز به اصلاح دارد', result.modelValid ? '' : 'has-errors');
    renderDependencies();
    syncPlaybackControls();
  }
  function finishSequence() {
    stopSequence();
    if (!result || !result.valid || dirty || !engineTest || !engineTest.ok) return;
    for (var i = completed; i < result.displayRows.length; i++) revealStep(i, false);
    completionStatus();
  }
  function pauseSequence(message) {
    if (!running || paused) return;
    clearTimeout(stepTimer); stepTimer = 0; runToken++; paused = true;
    cancelFollowScroll();
    outputs.classList.remove('is-presenting');
    runCaption.textContent = message || 'نمایش متوقف شد؛ برای ادامه دکمه «ادامه» را بزنید';
    setLive('نمایش موقتاً متوقف است', 'is-waiting');
    document.getElementById('run-icon').innerHTML = icon('pause', 13);
    syncPlaybackControls();
  }
  function advanceSequence(token) {
    if (token !== runToken || dirty || !running || paused || !result) return;
    if (document.hidden) { pauseSequence('تب پنهان شد؛ برای ادامه نمایش دکمه «ادامه» را بزنید'); return; }
    var index = completed;
    revealStep(index, !reducedMotion());
    setProgress(Math.round(completed / result.displayRows.length * 100));
    runCaption.textContent = 'نمایش گام ' + number(completed, 0) + ' از ' + number(result.displayRows.length, 0);
    syncPlaybackControls();
    followActiveRow(index, index === 0);
    if (completed >= result.displayRows.length) { completionStatus(); return; }
    stepTimer = setTimeout(function () { advanceSequence(token); }, STEP_DELAY_MS);
  }
  function resumeSequence() {
    if (!running || !paused || dirty || document.hidden) return;
    paused = false; selectionPinned = false; runToken++;
    outputs.classList.add('is-presenting');
    setLive('نمایش گام‌به‌گام نتایج', 'is-running');
    document.getElementById('run-icon').innerHTML = icon('refresh', 13);
    runCaption.textContent = 'ادامه از گام ' + number(completed + 1, 0);
    syncPlaybackControls();
    var token = runToken;
    stepTimer = setTimeout(function () { advanceSequence(token); }, STEP_DELAY_MS);
  }
  function startSequence() {
    stopSequence();
    completed = 0; selectionPinned = false; setProgress(0);
    running = true; outputs.classList.add('is-presenting');
    var token = runToken;
    replayButton.innerHTML = icon('skip', 13) + 'نمایش همه';
    setLive('نمایش گام‌به‌گام نتایج', 'is-running');
    document.getElementById('run-icon').innerHTML = icon('refresh', 13);
    runCaption.textContent = 'شروع نمایش؛ حدود ۰٫۸ ثانیه برای هر ردیف';
    syncPlaybackControls();
    stepTimer = setTimeout(function () { advanceSequence(token); }, STEP_DELAY_MS);
  }
  function persist() {
    var project;
    try { project = snapshot(); } catch (error) { return false; }
    try { localStorage.setItem(storageKey, JSON.stringify(project)); storageOk = true; } catch (error) { storageOk = false; }
    var hash = '#project=' + encodeURIComponent(JSON.stringify(project));
    document.querySelectorAll('[data-module-link]').forEach(function (a) { var path = './' + a.getAttribute('data-module-link') + '.html' + hash; a.href = I ? I.href(path) : path; });
    document.getElementById('project-state').textContent = storageOk ? 'ورودی‌ها موقتاً در مرورگر ذخیره شدند' : 'نسخه ذخیره‌نشده روی دستگاه';
    document.getElementById('storage-note').textContent = storageOk ? 'برای ادامه در دستگاه دیگر، پروژه را ذخیره کنید.' : 'ذخیره مرورگر محدود است؛ فایل پروژه را دریافت کنید.';
    return true;
  }
  function inputReportRows() {
    return '<tr><td>نوع منبع</td><td>AC/DC ایزوله</td><td></td></tr><tr><td>توپولوژی</td><td>فلای‌بک DCM</td><td></td></tr>' + plan.fields.map(function (f) { return '<tr><td>' + esc(f.label) + '<small dir="ltr">' + esc(f.symbol) + '</small></td><td dir="ltr">' + fullNumber(result.values[f.key]) + '</td><td dir="ltr">' + esc(unit(f.unit)) + '</td></tr>'; }).join('');
  }
  function renderPrint() {
    var appendix = document.getElementById('print-appendix');
    if (!result || !result.valid || dirty) { appendix.innerHTML = ''; return; }
    var printedName = outputs.querySelector('.print-report-heading strong');
    if (printedName) printedName.textContent = projectName;
    var badgeText = module.badge || 'Flyback DCM';
    var dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var siteUrl = 'https://abas-soft.ir';
    appendix.innerHTML =
      '<div class="pdf-header">' +
        '<div class="pdf-logo"><svg viewBox="0 0 44 44" fill="none"><rect x="1" y="1" width="42" height="42" rx="11" stroke="currentColor"/><path d="M9 22h7l4-11 5 23 4-12h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><div><strong dir="ltr">ABAS SOFT.</strong><small dir="ltr">POWER DESIGN LAB</small></div></div>' +
        '<div class="pdf-meta"><span data-no-i18n>' + esc(projectName) + '</span><span>' + esc(module.title) + ' | ' + esc(badgeText) + '</span><span dir="ltr">' + esc(dateStr) + '</span></div>' +
      '</div>' +
      '<div class="pdf-body">' +
        '<h2>' + translate('ورودی‌های') + ' ' + esc(module.title) + '</h2>' +
        '<table><thead><tr><th>' + translate('پارامتر') + '</th><th>' + translate('مقدار') + '</th><th>' + translate('واحد') + '</th></tr></thead><tbody>' + inputReportRows() + '</tbody></table>' +
        (notes ? '<h3>' + translate('یادداشت پروژه') + '</h3><p data-no-i18n>' + esc(notes) + '</p>' : '') +
      '</div>' +
      '<div class="pdf-footer">' +
        '<span dir="ltr">ABAS SOFT | Engine ' + E.version + '</span>' +
        '<span dir="ltr">' + esc(siteUrl) + '</span>' +
        '<span>' + translate('محاسبات پیش‌طراحی؛ تأیید نهایی با دیتاشیت و آزمون واقعی انجام شود.') + '</span>' +
      '</div>';
  }
  function blankRow(index) {
    return '<tr class="calculation-row is-pending" data-step="' + index + '" aria-hidden="true"><td class="row-number"></td><td class="parameter-name"></td><td class="symbol-cell" dir="ltr"></td><td class="formula-cell" dir="ltr"></td><td class="result-cell"></td><td class="unit-cell" dir="ltr"></td></tr>';
  }
  function renderResults() {
    var table = '', last = null;
    stageGroups = [];
    result.displayRows.forEach(function (r, i) {
      if (!last || last.title !== r.group) { last = { title: r.group, start: i, length: 0 }; stageGroups.push(last); }
      last.length++;
    });
    stageGroups.forEach(function (group, groupIndex) {
      table += '<tr class="sheet-stage" data-stage="' + groupIndex + '" hidden></tr>';
      for (var index = group.start; index < group.start + group.length; index++) table += blankRow(index);
    });
    var warnings = result.issues.length ? '<details class="result-warnings"' + (!result.modelValid ? ' open' : '') + '><summary>' + icon('info', 15) + '<span>' + number(result.issues.length, 0) + ' نکته برای بررسی طراحی' + (!result.modelValid ? '؛ شرط DCM برقرار نیست' : '') + '</span>' + icon('fold', 14) + '</summary><div>' + result.issues.map(function (i) { return '<p class="issue-' + i.level + '"><span></span>' + esc(i.text) + '</p>'; }).join('') + '</div></details>' : '';
    outputs.classList.remove('is-stale');
    outputs.innerHTML = '<div class="print-only print-report-heading"><strong data-no-i18n>' + esc(projectName) + '</strong><span>' + esc(module.title) + ' | ' + esc(new Date().toISOString()) + '</span></div>' + warnings + '<div class="worksheet-scroll"><table class="results-table"><caption class="visually-hidden">محاسبات مرحله‌ای ' + esc(module.title) + '</caption><thead><tr><th><small>A</small>گام</th><th><small>B</small>پارامتر محاسباتی</th><th><small>C</small>نماد</th><th><small>D</small>فرمول</th><th><small>E</small>نتیجه</th><th><small>F</small>واحد</th></tr></thead><tbody>' + table + '</tbody></table></div><div id="shared-results"></div><p class="worksheet-disclaimer">' + icon('shield', 13) + 'اعداد، پیش‌طراحی بر مبنای فرض‌های مشخص‌اند؛ دقت نمایش به معنی تأیید عملی مدار نیست.</p>';
    document.getElementById('sheet-row-count').textContent = number(result.displayRows.length, 0) + ' محاسبه / ' + number(stageGroups.length, 0) + ' مرحله';
  }
  function renderDependencies() {
    var target = document.getElementById('shared-results');
    if (!target || target.childElementCount || !result.supportRows.length) return;
    target.innerHTML = '<details class="dependencies-panel"><summary>' + icon('info', 15) + '<span>مبنای محاسبه‌شده مشترک</span><small>' + number(result.supportRows.length) + ' رابطه کمکی</small>' + icon('fold', 14) + '</summary><p>این مقادیر فقط برای روابط ' + esc(module.title) + ' استفاده شده‌اند. نتایج اختصاصی بخش‌های دیگر در این برگه نمایش داده نمی‌شوند.</p><div class="dependency-scroll"><table><thead><tr><th>پارامتر کمکی</th><th>رابطه</th><th>مقدار</th></tr></thead><tbody>' + result.supportRows.map(function (r) { return '<tr><td>' + esc(r.label) + '<small dir="ltr">' + esc(r.key) + '</small></td><td dir="ltr">' + esc(r.formula) + '</td><td dir="ltr">' + number(r.value) + ' ' + esc(unit(r.unit)) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
  }
  function waitForStart(message) {
    stopSequence();
    result = null; dirty = true; completed = 0; selectionPinned = false; stageGroups = [];
    reportButtons(); replayButton.disabled = true;
    replayButton.innerHTML = icon('refresh', 13) + 'اجرای دوباره';
    setProgress(0);
    setLive('منتظر شروع شما', 'is-waiting');
    runCaption.textContent = 'برای شروع، دکمه «محاسبه گام‌به‌گام» را بزنید';
    document.getElementById('run-icon').innerHTML = icon('play', 13);
    var ca = document.getElementById('cell-address'); if (ca) ca.textContent = '-';
    if (formulaInput) formulaInput.value = '';
    var fd = document.getElementById('formula-description'); if (fd) fd.textContent = '';
    var ne = document.getElementById('numeric-expression'); if (ne) ne.textContent = '';
    document.getElementById('sheet-row-count').textContent = 'هنوز محاسبه‌ای انجام نشده';
    document.getElementById('print-appendix').innerHTML = '';
    document.getElementById('project-state').textContent = 'ورودی‌ها آماده؛ محاسبه شروع نشده';
    var cfgErrEl = document.getElementById('configuration-error'); if (cfgErrEl) cfgErrEl.textContent = '';
    document.querySelectorAll('[data-configuration]').forEach(function (select) { select.setAttribute('aria-invalid', 'false'); });
    document.querySelectorAll('[data-field]').forEach(function (input) {
      input.setAttribute('aria-invalid', 'false');
      document.getElementById('error-' + input.getAttribute('data-field')).textContent = '';
    });
    outputs.classList.remove('is-stale');
    outputs.innerHTML = '<div class="calculation-empty calculation-waiting">' + icon('play', 32) + '<h3>شروع، با فرمان شما</h3><p>' + esc(message || 'مشخصات اولیه را وارد کنید و دکمه «محاسبه گام‌به‌گام» را بزنید. تا آن لحظه هیچ محاسبه‌ای اجرا نمی‌شود.') + '</p><small>پس از شروع، ردیف‌ها آهسته نمایش داده می‌شوند و صفحه، ردیف فعال را دنبال می‌کند.</small></div>';
  }
  function calculate() {
    stopSequence();
    if (!module.standaloneModule && !E.supportsConfiguration(configuration)) {
      waitForStart('نوع منبع و توپولوژی انتخاب‌شده در این نسخه پشتیبانی نمی‌شود.');
      var cfgErr = document.getElementById('configuration-error');
      if (cfgErr) cfgErr.textContent = 'نوع منبع و توپولوژی انتخاب‌شده در این نسخه پشتیبانی نمی‌شود.';
      document.querySelectorAll('[data-configuration]').forEach(function (select) { select.setAttribute('aria-invalid', 'true'); });
      setLive('ورودی نیاز به اصلاح دارد', 'has-errors');
      return;
    }
    // Neither engine checks nor project calculations run before an explicit start.
    if (!engineTest) engineTest = E.selfTest();
    document.getElementById('engine-status').textContent = 'کنترل‌های داخلی: ' + (engineTest.ok ? number(engineTest.count, 0) + ' شرط عددی و حالت مرزی' : 'ناموفق') + '. این بررسی‌ها جای آزمون مستقل سخت‌افزار را نمی‌گیرند.';
    result = E.calculate(state, moduleId); dirty = false;
    if (formulaInput) formulaInput.value = '';
    var fd2 = document.getElementById('formula-description'); if (fd2) fd2.textContent = '';
    var ne2 = document.getElementById('numeric-expression'); if (ne2) ne2.textContent = '';
    var ca2 = document.getElementById('cell-address'); if (ca2) ca2.textContent = '-';
    document.querySelectorAll('[data-field]').forEach(function (input) {
      var key = input.getAttribute('data-field'), error = result.errors[key] || '';
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      document.getElementById('error-' + key).textContent = error;
    });
    reportButtons();
    replayButton.disabled = !result.valid || !engineTest.ok;
    outputs.classList.remove('is-stale');
    if (!result.valid || !engineTest.ok) {
      completed = 0; setProgress(0);
      if (formulaInput) formulaInput.value = ''; var ne3 = document.getElementById('numeric-expression'); if (ne3) ne3.textContent = ''; var fd3 = document.getElementById('formula-description'); if (fd3) fd3.textContent = '';
      setLive(engineTest.ok ? 'ورودی نیاز به اصلاح دارد' : 'کنترل داخلی ناموفق بود', 'has-errors');
      runCaption.textContent = 'ابتدا ورودی‌های مشخص‌شده را اصلاح کنید';
      document.getElementById('project-state').textContent = 'تغییرات نامعتبر ذخیره نشد';
      document.getElementById('sheet-row-count').textContent = '';
      outputs.innerHTML = '<div class="calculation-empty">' + icon('info', 30) + '<h3>' + (engineTest.ok ? 'یک قدم تا محاسبات شما' : 'کنترل داخلی مدل ناموفق بود') + '</h3><p>مقادیر زیر را اصلاح کنید. فقط ورودی‌های مربوط به همین بخش بررسی می‌شوند.</p><ul>' + Object.keys(result.errors).map(function (key) { var f = E.fields.find(function (item) { return item.key === key; }); return '<li><button type="button" data-error-focus="' + esc(key) + '">' + esc((f ? f.label + ': ' : '') + result.errors[key]) + '</button></li>'; }).join('') + '</ul></div>';
      renderPrint(); return;
    }
    renderResults(); persist(); renderPrint(); startSequence();
  }
  function invalidate() {
    waitForStart('ورودی‌ها تغییر کرده‌اند. برای محاسبه با مقادیر جدید، دوباره دکمه «محاسبه گام‌به‌گام» را بزنید.');
  }
  function updateForm() {
    document.querySelectorAll('[data-field]').forEach(function (input) { input.value = state[input.getAttribute('data-field')]; });
    projectInput.value = projectName; document.getElementById('project-notes').value = notes;
    var supplyEl = document.getElementById('supply-type'), topoEl = document.getElementById('design-topology');
    if (supplyEl) supplyEl.value = configuration.supplyType;
    if (topoEl) topoEl.value = configuration.topology;
    waitForStart('مشخصات پروژه وارد شد. آن‌ها را بررسی کنید و برای شروع، دکمه «محاسبه گام‌به‌گام» را بزنید.');
  }
  function focusField(key) {
    var input = document.getElementById('field-' + key);
    if (!input) return;
    var parent = input.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    input.focus(); input.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  function prepareExistingReport() {
    if (!hasCurrentResult()) {
      toast('ابتدا با دکمه «محاسبه گام‌به‌گام» یک محاسبه معتبر انجام دهید.');
      return false;
    }
    finishSequence();
    return true;
  }
  function filename() { return (projectName.trim() || 'abas-soft-project').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 65); }
  function textReport() {
    var lines = ['ABAS SOFT | ' + module.title, 'پروژه: __PROJECT_NAME__', 'زمان: ' + new Date().toISOString(), 'نوع منبع: AC/DC ایزوله', 'توپولوژی: فلای‌بک DCM', 'مدل: Flyback DCM / ' + E.version, '', 'ورودی‌های استفاده‌شده در این بخش', '===================='].concat(
      plan.fields.map(function (f) { return f.label + ' [' + f.symbol + '] = ' + fullNumber(result.values[f.key]) + ' ' + f.unit; }),
      ['', 'محاسبات ' + module.title, '===================='],
      result.displayRows.map(function (r, i) { return (i + 1) + '. ' + r.label + ' [' + r.key + ']\n   ' + r.formula + '\n   = ' + fullNumber(r.value) + ' ' + r.unit + (r.note ? '\n   ' + r.note : ''); }),
      result.supportRows.length ? ['', 'روابط کمکی استفاده‌شده در این بخش', '===================='] : [],
      result.supportRows.map(function (r) { return r.label + ' [' + r.key + ']\n   ' + r.formula + ' = ' + fullNumber(r.value) + ' ' + r.unit; }),
      ['', 'نکات بررسی'], result.issues.map(function (issue) { return issue.level.toUpperCase() + ': ' + issue.text; }),
      ['', 'فرض‌ها و محدودیت‌ها'], E.assumptions, ['', 'یادداشت پروژه', '__PROJECT_NOTES__', '', 'منابع'], E.sources.map(function (s) { return s.title + '\n' + s.url; })
    );
    return '\uFEFF' + lines.map(function (line) {
      if (line === 'پروژه: __PROJECT_NAME__') return translate('پروژه: ') + projectName;
      if (line === '__PROJECT_NOTES__') return notes;
      return translate(line);
    }).join('\r\n');
  }
  function showDownload(blob, name, description) {
    if (running && !paused) pauseSequence('نمایش برای دریافت فایل متوقف شد؛ بعداً «ادامه» را بزنید');
    var url = URL.createObjectURL(blob); exportUrls.push(url);
    var link = document.getElementById('download-link'); link.href = url; link.download = name;
    var standalone = document.getElementById('export-browser-link');
    if (standalone) standalone.href = location.href.split('#')[0] + '#project=' + encodeURIComponent(JSON.stringify(snapshot()));
    document.getElementById('download-title').textContent = name;
    document.getElementById('download-description').textContent = description;
    lastExportFocus = document.activeElement; dialog.hidden = false; document.body.style.overflow = 'hidden';
    document.querySelectorAll('.calc-topbar,.calc-commandbar,.calc-main,.playback-panel').forEach(function (node) { node.inert = true; });
    dialog.querySelector('section').focus();
  }
  function closeDownload() {
    dialog.hidden = true; document.body.style.overflow = '';
    document.querySelectorAll('.calc-topbar,.calc-commandbar,.calc-main,.playback-panel').forEach(function (node) { node.inert = false; });
    if (lastExportFocus) lastExportFocus.focus();
  }

  document.getElementById('parameters-form').addEventListener('input', function (event) {
    var key = event.target.getAttribute('data-field');
    if (key) { state[key] = event.target.value; invalidate(); }
    else if (event.target.id === 'project-notes') { notes = event.target.value; persist(); renderPrint(); }
  });
  document.getElementById('parameters-form').addEventListener('change', function (event) {
    var key = event.target.getAttribute('data-field');
    if (key && event.target.tagName === 'SELECT' && !event.target.getAttribute('data-configuration')) { state[key] = event.target.value; invalidate(); return; }
  });
  document.getElementById('parameters-form').addEventListener('change', function (event) {
    var key = event.target.getAttribute('data-configuration');
    if (key === 'supplyType' || key === 'topology') {
      configuration[key] = event.target.value;
      invalidate();
    }
  });
  followRows.addEventListener('change', function () {
    if (!followRows.checked) cancelFollowScroll();
    else if (running && !paused && completed > 0) followActiveRow(completed - 1, true);
  });
  document.getElementById('parameters-form').addEventListener('submit', function (event) {
    event.preventDefault(); calculate();
  });
  projectInput.addEventListener('input', function () { projectName = projectInput.value; persist(); renderPrint(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0]; if (!file) return;
    if (file.size > 1024 * 1024) { toast('حجم فایل پروژه باید کمتر از یک مگابایت باشد.'); fileInput.value = ''; return; }
    file.text().then(function (text) {
      var loaded = validateProject(JSON.parse(text.replace(/^\uFEFF/, '')));
      state = loaded.values; configuration = loaded.configuration; projectName = loaded.name; notes = loaded.notes; updateForm();
      toast('پروژه بارگذاری شد. محاسبات فقط پس از زدن دکمه شروع می‌شوند.');
    }).catch(function (error) { toast(error instanceof SyntaxError ? 'فایل JSON پروژه قابل خواندن نیست.' : error.message || 'فایل پروژه باز نشد.'); }).finally(function () { fileInput.value = ''; });
  });
  document.addEventListener('click', function (event) {
    var sectionLink = event.target.closest('[data-module-link]');
    if (sectionLink) {
      if (!persist()) { event.preventDefault(); toast('برای انتقال پروژه، ورودی‌های عددی خالی یا ناخوانا را کامل کنید؛ نیازی به اجرای محاسبات نیست.'); }
      return;
    }
    var selection = event.target.closest('[data-select-row]');
    if (selection) { pauseSequence('نمایش برای بررسی فرمول متوقف شد؛ برای ادامه دکمه «ادامه» را بزنید'); selectionPinned = true; selectRow(Number(selection.getAttribute('data-select-row')), false); return; }
    var errorButton = event.target.closest('[data-error-focus]');
    if (errorButton) { focusField(errorButton.getAttribute('data-error-focus')); return; }
    var button = event.target.closest('[data-action]'); if (!button) return;
    var action = button.getAttribute('data-action');
    if (action === 'import') { pauseSequence('نمایش برای بارگذاری پروژه متوقف شد'); fileInput.click(); return; }
    if (action === 'close-export') { closeDownload(); return; }
    if (action === 'formula') {
      formulaDetail.hidden = !formulaDetail.hidden;
      button.setAttribute('aria-expanded', String(!formulaDetail.hidden));
      return;
    }
    if (action === 'pause') { if (paused) resumeSequence(); else pauseSequence(); return; }
    if (action === 'finish') { if (running) finishSequence(); return; }
    if (action === 'replay') { if (running) finishSequence(); else if (result && !dirty) calculate(); return; }
    if (action === 'reset') {
      if (window.confirm(translate('پروژه فعلی با مثال اولیه جایگزین شود؟ برای نگهداری پروژه از «ذخیره پروژه» استفاده کنید.'))) {
        state = Object.assign({}, E.defaults); configuration = { supplyType: module.supplyType || E.supplyType, topology: module.topology || E.topology }; projectName = defaultProjectName(); notes = ''; updateForm();
      }
      return;
    }
    try {
      if (action === 'save') { showDownload(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json;charset=utf-8' }), filename() + '.abas.json', 'ورودی‌ها و یادداشت‌ها بدون اجرای محاسبات ذخیره می‌شوند. برای دریافت نتایج، بعداً دکمه محاسبه را بزنید.'); return; }
      if (!prepareExistingReport()) return;
      if (action === 'excel') showDownload(Reports.workbook(result, snapshot(), moduleId), filename() + '-' + moduleId + '.xlsx', 'Excel اختصاصی ' + module.title + '؛ شش برگه با ورودی‌های همین بخش، محاسبات مرحله‌ای، وابستگی‌های لازم و کنترل‌ها. فرمول‌ها با تغییر ورودی قابل محاسبه مجددند.');
      if (action === 'text') showDownload(new Blob([textReport()], { type: 'text/plain;charset=utf-8' }), filename() + '-' + moduleId + '.txt', 'گزارش متنی همین بخش با فرمول‌ها، نتایج، ورودی‌های استفاده‌شده و فرض‌های طراحی.');
      if (action === 'print') window.print();
    } catch (error) { toast('آماده‌سازی فایل کامل نشد: ' + (error.message || 'دوباره تلاش کنید.')); }
  });
  outputs.addEventListener('keydown', function (event) {
    var button = event.target.closest('[data-select-row]'); if (!button) return;
    var index = Number(button.getAttribute('data-select-row'));
    if (event.key === 'ArrowDown') index = Math.min(completed - 1, index + 1);
    else if (event.key === 'ArrowUp') index = Math.max(0, index - 1);
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = completed - 1;
    else return;
    event.preventDefault(); pauseSequence('نمایش برای بررسی ردیف‌ها متوقف شد'); selectionPinned = true; selectRow(index, true);
  });
  outputs.addEventListener('focusin', function (event) {
    var button = event.target.closest('[data-select-row]');
    if (!button) return;
    pauseSequence('نمایش برای بررسی فرمول متوقف شد');
    selectionPinned = true;
    selectRow(Number(button.getAttribute('data-select-row')), false);
  });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) closeDownload(); });
  document.addEventListener('keydown', function (event) {
    if (dialog.hidden) return;
    if (event.key === 'Escape') { closeDownload(); return; }
    if (event.key === 'Tab') {
      var links = dialog.querySelectorAll('a'), first = dialog.querySelector('button'), last = links[links.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog.querySelector('section'))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseSequence('تب پنهان شد؛ برای ادامه نمایش دکمه «ادامه» را بزنید'); });
  if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', function () {
    if (motionQuery.matches) { followRows.checked = false; cancelFollowScroll(); }
  });
  var closedPrintDetails = [];
  window.addEventListener('beforeprint', function () {
    if (hasCurrentResult()) finishSequence();
    else pauseSequence('نمایش برای چاپ متوقف شد');
    renderPrint();
    document.body.classList.toggle('print-invalid', !hasCurrentResult());
    closedPrintDetails = Array.prototype.slice.call(document.querySelectorAll('.design-notes details:not([open]),.result-warnings:not([open]),.dependencies-panel:not([open])'));
    closedPrintDetails.forEach(function (details) { details.open = true; });
    if (I && I.flush) I.flush();
  });
  window.addEventListener('afterprint', function () { closedPrintDetails.forEach(function (details) { details.open = false; }); closedPrintDetails = []; });
  window.addEventListener('pagehide', function (event) { pauseSequence(); if (!event.persisted) exportUrls.forEach(function (url) { URL.revokeObjectURL(url); }); });
  document.getElementById('engine-status').textContent = 'کنترل‌های مدل و محاسبات پروژه فقط پس از شروع توسط شما اجرا می‌شوند.';
  waitForStart();
  if (I && I.attach) I.attach(root);
  window.addEventListener('abas-language-change', function () {
    document.title = 'ABAS SOFT | ' + translate(module.title);
    // Language changes preserve the project and never trigger or restart calculations.
  });
})();