(function (global) {
  'use strict';
  function tr(text) { return global.AbasI18n ? global.AbasI18n.t(text) : String(text).replace(/VOLTA|Volta Lab/g, 'ABAS SOFT'); }
  function english() { return global.AbasI18n && global.AbasI18n.getLanguage() === 'en'; }
  var encoder = new TextEncoder();
  var crcTable = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  function crc32(bytes) {
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  // A standard, uncompressed ZIP keeps XLSX export synchronous and entirely offline.
  function zip(files) {
    var chunks = [], directory = [], offset = 0, count = 0, now = new Date();
    var time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    var date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    Object.keys(files).forEach(function (name) {
      var nameBytes = encoder.encode(name), data = typeof files[name] === 'string' ? encoder.encode(files[name]) : files[name];
      var crc = crc32(data), header = new Uint8Array(30 + nameBytes.length), view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
      view.setUint16(10, time, true); view.setUint16(12, date, true); view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, nameBytes.length, true); header.set(nameBytes, 30);
      chunks.push(header, data);
      var central = new Uint8Array(46 + nameBytes.length), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true);
      cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); central.set(nameBytes, 46);
      directory.push(central); offset += header.length + data.length; count++;
    });
    var dirSize = directory.reduce(function (sum, item) { return sum + item.length; }, 0);
    var end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, count, true); ev.setUint16(10, count, true); ev.setUint32(12, dirSize, true); ev.setUint32(16, offset, true);
    return new Blob(chunks.concat(directory, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xml(value) {
    return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[<>&"']/g, function (ch) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]; });
  }
  function col(index) { var out = ''; do { out = String.fromCharCode(65 + index % 26) + out; index = Math.floor(index / 26) - 1; } while (index >= 0); return out; }
  function cell(reference, value, style, expression, literal) {
    if (typeof value === 'string' && !literal) value = tr(value);
    var base = '<c r="' + reference + '" s="' + (style || 0) + '"';
    if (expression) return base + (typeof value === 'string' ? ' t="str"' : '') + '><f>' + xml(expression) + '</f><v>' + xml(value) + '</v></c>';
    if (typeof value === 'number' && Number.isFinite(value)) return base + '><v>' + value + '</v></c>';
    return base + ' t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>';
  }
  function sheet(rows, widths, options) {
    options = options || {};
    var data = rows.map(function (row, index) {
      return '<row r="' + (index + 1) + '" ht="' + (index === 0 ? 34 : index < 4 ? 30 : options.rowHeight || 48) + '" customHeight="1">' + row.map(function (item, c) {
        var spec = item && typeof item === 'object' ? item : { value: item };
        return cell(col(c) + (index + 1), spec.value, spec.style, spec.formula, spec.literal);
      }).join('') + '</row>';
    }).join('');
    var lastCol = col(widths.length - 1);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:' + lastCol + rows.length + '"/><sheetViews><sheetView rightToLeft="' + (english() ? '0' : '1') + '" showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="D5" sqref="D5"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="23"/>' +
      '<cols>' + widths.map(function (width, index) { return '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + width + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>' + data + '</sheetData>' +
      (options.filter ? '<autoFilter ref="A4:' + lastCol + rows.length + '"/>' : '') +
      '<mergeCells count="3"><mergeCell ref="A1:' + lastCol + '1"/><mergeCell ref="A2:' + lastCol + '2"/><mergeCell ref="A3:' + lastCol + '3"/></mergeCells>' +
      (options.validation || '') + '<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;CABAS SOFT | &amp;P / &amp;N</oddFooter></headerFooter></worksheet>';
  }
  var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0000;[Red]-0.0000;0"/></numFmts>' +
    '<fonts count="6"><font><sz val="11"/><name val="Calibri"/><color rgb="FF35283E"/></font><font><b/><sz val="20"/><name val="Calibri"/><color rgb="FFF2E9F6"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFE2BC96"/></font><font><b/><sz val="12"/><name val="Calibri"/><color rgb="FF885A31"/></font><font><sz val="9"/><name val="Consolas"/><color rgb="FF74657D"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FF6F4595"/></font></fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF24172F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1E8F8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFAF3EA"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="hair"><color rgb="FFE5DDEB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right" wrapText="1" readingOrder="2"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right" readingOrder="2"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right" wrapText="1" readingOrder="2"/></xf><xf numFmtId="164" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf><xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1" readingOrder="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="right" wrapText="1" readingOrder="2"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function heading(title, project, caption, columns) {
    return [[{ value: title, style: 1 }], [{ value: project.name + ' | ' + new Date().toISOString().slice(0, 19).replace('T', ' '), style: 6, literal: true }], [{ value: caption, style: 6 }], columns.map(function (text) { return { value: text, style: 2 }; })];
  }
  function workbook(result, project, activeModule) {
    var E = global.VoltaEngine;
    var configuration = {
      supplyType: project.supplyType === undefined ? E.supplyType : project.supplyType,
      topology: project.topology === undefined ? E.topology : project.topology
    };
    if (!E.supportsConfiguration(configuration)) throw new Error(tr('نوع منبع و توپولوژی انتخاب‌شده در این نسخه پشتیبانی نمی‌شود.'));
    if (!E.modules[activeModule]) throw new Error('بخش محاسباتی مشخص نشده است.');
    var supplyLabels = { 'ac-dc-isolated': 'AC/DC ایزوله', 'ac-ac': 'AC/AC متناوب', 'dc': 'DC / باتری' };
    var topologyLabels = {
      'flyback-dcm': 'فلای‌بک DCM',
      'iron-ei': 'ترانس EI هسته آهن', 'iron-ei-ind': 'ترانس EI صنعتی Hi-B',
      'induction-motor': 'الکتروموتور القایی', 'induction-motor-ind': 'الکتروموتور صنعتی IE3/IE4',
      'bldc-general': 'موتور براشلس عمومی', 'bldc-industrial': 'موتور براشلس صنعتی'
    };
    var supplyLabel = supplyLabels[configuration.supplyType] || configuration.supplyType;
    var topologyLabel = topologyLabels[configuration.topology] || configuration.topology;
    if (result.scope !== activeModule) result = E.calculate(result.values, activeModule);
    if (!result.valid || !result.modelValid) throw new Error('ورودی‌ها یا شرط DCM برای خروجی معتبر نیستند.');
    var sectionTitle = E.modules[activeModule].title;
    var references = {}, inputRows = heading('ABAS SOFT / ورودی‌های ' + sectionTitle, project, 'فقط ورودی‌های استفاده‌شده در این بخش. ستون D را ویرایش کنید؛ نتایج در Calculations و کنترل‌ها در Checks هستند.', ['نماد', 'پارامتر', 'واحد', 'مقدار', 'حداقل', 'حداکثر', 'توضیح']);
    result.fields.forEach(function (f, i) {
      references[f.key] = 'Inputs!$D$' + (i + 5);
      inputRows.push([{ value: f.symbol, style: 5 }, f.label, { value: f.unit, style: 5 }, { value: result.values[f.key], style: 3 }, f.min, f.max, f.note]);
    });
    // Configuration metadata is appended so the numeric input references keep their row addresses.
    inputRows.push(['SUPPLY_TYPE', 'نوع منبع', '', supplyLabel, '', '', 'نوع منبع و توپولوژی، محدوده مدل این گزارش هستند.']);
    inputRows.push(['TOPOLOGY', 'توپولوژی', '', topologyLabel, '', '', 'نوع منبع و توپولوژی، محدوده مدل این گزارش هستند.']);
    result.displayRows.forEach(function (r, i) { references[r.key] = 'Calculations!$E$' + (i + 5); });
    result.supportRows.forEach(function (r, i) { references[r.key] = 'Dependencies!$E$' + (i + 5); });
    var headers = ['مرحله', 'پارامتر', 'نماد', 'رابطه', 'نتیجه', 'واحد', 'فرض / توضیح'];
    var calculationRows = heading('ABAS SOFT / ' + sectionTitle, project, 'فقط محاسبات این بخش و مبنای مشترک آن، به ترتیب وابستگی. مقادیر کمکی در Dependencies قابل بررسی‌اند.', headers);
    var dependencyRows = heading('ABAS SOFT / مبنای محاسبه‌شده مشترک', project, 'این برگه فقط روابط کمکی موردنیاز ' + sectionTitle + ' را نگه می‌دارد؛ گزارش بخش‌های دیگر نیست.', headers);
    function reportRow(r, i) {
      return [i + 1, r.label, { value: r.key, style: 5 }, { value: r.formula, style: 5 }, { value: r.value, style: 4, formula: E.formula(r.expr, references, true) }, { value: r.unit, style: 5 }, r.note];
    }
    result.displayRows.forEach(function (r, i) { calculationRows.push(reportRow(r, i)); });
    result.supportRows.forEach(function (r, i) { dependencyRows.push(reportRow(r, i)); });
    if (!result.supportRows.length) dependencyRows.push(['', 'این بخش به نتیجه محاسباتی بخش دیگری وابسته نیست.', '', '', '', '', '']);
    result.rows.forEach(function (row) {
      if (E.referencesOf(row.expr).some(function (key) { return !references[key]; })) throw new Error('یک وابستگی فرمول Excel پیدا نشد: ' + row.key);
    });
    var checkRows = heading('ABAS SOFT / کنترل‌های ' + sectionTitle, project, 'PASS فقط یعنی شرط عددی همین بخش برقرار است؛ تأیید ساخت، کل سیستم یا ایمنی نیست.', ['کنترل', 'وضعیت', 'توضیح']);
    function check(label, condition, pass, note) {
      checkRows.push([label, { value: pass ? 'PASS' : 'CHECK', formula: 'IFERROR(IF(' + condition + ',"PASS","CHECK"),"CHECK")', style: 3 }, note]);
    }
    var v = result.values, r = references;
    function has(key) { return Object.prototype.hasOwnProperty.call(r, key); }
    if (has('vacMax') && has('vacMin')) check('حداقل و حداکثر ورودی', r.vacMax + '>=' + r.vacMin, v.vacMax >= v.vacMin, 'بازه ورودی باید مرتب باشد.');
    if (has('busMin')) check('کف باس مثبت', r.busMin + '>5', v.busMin > 5, 'مدل با کف باس کمتر از ۵ ولت معتبر نیست.');
    if (has('holdCutoff') && has('busMin')) check('حد نگه‌داری زیر کف باس', r.holdCutoff + '<' + r.busMin, v.holdCutoff < v.busMin, 'فقط انرژی نگه‌داری محاسبه می‌شود.');
    if (has('ta') && has('tj')) check('دمای محیط و پیوند', r.ta + '<' + r.tj, v.ta < v.tj, 'دمای محیط باید از سقف دمای پیوند کمتر باشد.');
    check('محدوده ورودی‌های همین بخش', 'AND(' + result.fields.map(function (f) { return r[f.key] + '>=' + f.min + ',' + r[f.key] + '<=' + f.max; }).join(',') + ')', true, 'ورودی‌های نامرتبط در این workbook نیستند.')
    if (has('psec')) check('سازگاری بودجه توان', r.pin + '>=' + r.psec, v.pin >= v.psec, 'توان ورودی حداقل باید خروجی و دیود را تأمین کند.');
    if (has('designIdleWorst')) check('DCM با تلرانس Lp', 'AND(' + r.idle + '>0,' + r.designIdle + '>0,' + r.designIdleWorst + '>0)', v.idle > 0 && v.designIdle > 0 && v.designIdleWorst > 0, 'در غیر این صورت روابط مراحل مغناطیسی معتبر نیستند.');
    if (has('bLimit')) check('شار در حد جریان', r.bLimit + '<=' + r.bmax, v.bLimit <= v.bmax, 'با Bsat و منحنی تلفات در دمای واقعی مقایسه شود.');
    if (has('fill')) check('پرشدگی پنجره', r.fill + '<=' + r.ku, v.fill <= v.ku, 'فضای عایق و بوبین مستقل بررسی شود.');
    if (has('rippleActual')) check('ریپل خروجی', r.rippleActual + '<=' + r.rippleTarget, v.rippleActual <= v.rippleTarget, 'ESL و نویز سوئیچینگ محاسبه نشده.');
    if (has('safeV')) check('هدف تخلیه', r.safeV + '<' + r.rectMax, v.safeV < v.rectMax, 'هدف تخلیه باید کمتر از پیک باس باشد.');
    if (has('fbRef')) check('مرجع فیدبک', r.vo + '>' + r.fbRef, v.vo > v.fbRef, 'مقاومت بالایی باید مثبت باشد.');
    if (has('sinkTheta')) check('مسیر حرارتی', r.sinkTheta + '>0', v.sinkTheta > 0, 'تحلیل پایا و برآوردی.')
    if (has('esr')) check('بودجه افت گذرای ESR', '(' + r.vo + '*' + r.droop + '*10)>(' + r.stepI + '*' + r.esr + ')', v.vo * v.droop * 10 > v.stepI * v.esr, 'بودجه باقی‌مانده باید مثبت باشد.');
    if (has('vPrim')) check('سطح ولتاژ', r.vPrim + '>=' + r.vSec, v.vPrim >= v.vSec, 'برای ترانس‌های کاهنده باید برقرار باشد؛ افزاینده مجاز است.');
    if (has('regComp')) check('تنظیم ولتاژ', r.regComp + '<=15', v.regComp <= 15, 'جبران بیش از ۱۵٪ به معنی امپدانس بالای ترانس است.');
    if (has('mSlip')) check('محدوده لغزش', r.mSlip + '<10', v.mSlip <= 10, 'لغزش بالای ۱۰٪ نشانه بهره‌وری پایین است.');
    if (has('backEMF')) check('سهم Back-EMF از باس', r.backEMF + '>' + r.bldcVbus + '*0.5', v.backEMF > v.bldcVbus * 0.5, 'افت مقاومتی زیاد یعنی سیم‌پیچ ضعیف یا جریان بیش از حد.');
    var sourceRows = heading('ABAS SOFT / فرض‌ها و منابع ' + sectionTitle, project, 'Engine ' + E.version + ' | ' + E.topology + ' | پیش‌طراحی اختصاصی یک بخش، نه طرح تأییدشده.', ['نوع', 'متن / منبع', 'نشانی']);
    sourceRows.push(['نوع منبع', supplyLabel, '']);
    sourceRows.push(['توپولوژی', topologyLabel, '']);
    sourceRows.push(['یادداشت پروژه', { value: project.notes || tr('بدون یادداشت'), literal: true }, '']);
    E.assumptions.forEach(function (text) { sourceRows.push(['فرض / محدودیت', text, '']); });
    result.issues.forEach(function (issue) { sourceRows.push([issue.level, issue.text, '']); });
    E.sources.forEach(function (source) { sourceRows.push(['مرجع', source.title, source.url]); });
    var standardRows = heading('ABAS SOFT / مقادیر ترجیحی E12', project, 'جدول کمکی فرمول‌های ظرفیت؛ مقدار ردیف اول برابر یا بزرگ‌تر از نیاز انتخاب می‌شود.', ['E12', 'کاربرد']);
    E.series.forEach(function (value) { standardRows.push([{ value: value, style: 4 }, 'ظرفیت نامی / uF']); });
    var validation = '<dataValidations count="' + result.fields.length + '">' + result.fields.map(function (f, i) { return '<dataValidation type="decimal" operator="between" allowBlank="0" showErrorMessage="1" errorTitle="Invalid input" error="Check the allowed input range" sqref="D' + (i + 5) + '"><formula1>' + f.min + '</formula1><formula2>' + f.max + '</formula2></dataValidation>'; }).join('') + '</dataValidations>';
    var sheets = [
      { name: 'Inputs', xml: sheet(inputRows, [24, 35, 13, 19, 13, 13, 58], { filter: true, validation: validation, rowHeight: 52 }) },
      { name: 'Calculations', xml: sheet(calculationRows, [8, 43, 24, 60, 21, 13, 65], { filter: true, rowHeight: 58 }) },
      { name: 'Dependencies', xml: sheet(dependencyRows, [8, 43, 24, 60, 21, 13, 65], { rowHeight: 58 }) },
      { name: 'Checks', xml: sheet(checkRows, [35, 18, 90]) },
      { name: 'References', xml: sheet(sourceRows, [22, 115, 75], { rowHeight: 78 }) },
      { name: 'Standards', xml: sheet(standardRows, [25, 65], { rowHeight: 24 }) }
    ];
    var files = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (_, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' + sheets.map(function (item, i) { return '<sheet name="' + item.name + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (_, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml': english() ? styles.replace(/horizontal="right"/g, 'horizontal="left"').replace(/readingOrder="2"/g, 'readingOrder="1"') : styles
    };
    sheets.forEach(function (item, i) { files['xl/worksheets/sheet' + (i + 1) + '.xml'] = item.xml; });
    return zip(files);
  }
  global.VoltaReports = { workbook: workbook, crc32: crc32, zip: zip };
})(typeof globalThis !== 'undefined' ? globalThis : window);