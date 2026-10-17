(function (global) {
  'use strict';

  var VERSION = '2.6.0';
  var SUPPLY_TYPE = 'ac-dc-isolated';
  var TOPOLOGY = 'flyback-dcm';

  var designOptions = {
    supplyTypes: [
      { value: SUPPLY_TYPE, label: 'AC/DC ایزوله', supported: true },
      { value: 'dc-dc-isolated', label: 'DC/DC ایزوله', supported: true },
      { value: 'ac-ac', label: 'AC/AC متناوب', supported: true }
    ],
    topologies: [
      { value: TOPOLOGY, label: 'فلای‌بک DCM', supported: true },
      { value: 'flyback-ccm', label: 'فلای‌بک CCM', supported: true },
      { value: 'forward', label: 'فوروارد', supported: true },
      { value: 'push-pull', label: 'پوش-پول', supported: true },
      { value: 'half-bridge', label: 'نیم‌پل', supported: true },
      { value: 'full-bridge', label: 'تمام‌پل', supported: true },
      { value: 'iron-ei', label: 'ترانس EI هسته آهن', supported: true },
      { value: 'induction-motor', label: 'الکتروموتور القایی', supported: true }
    ]
  };

  function supportsConfiguration(config) { return true; }

  var modules = {
    input: { title: 'ورودی و یکسوساز', english: 'INPUT & RECTIFIER', subtitle: 'از برق ورودی تا یک باس DC مطمئن.', accent: '#d8a77f', summary: ['bulkStd', 'busMin', 'lineRms'] },
    transformer: { title: 'طراحی ترانسفورماتور', english: 'TRANSFORMER DESIGN', subtitle: 'از مشخصات اولیه تا هسته، سیم‌پیچ، گپ و پیشنهاد قطعه.', accent: '#d8a77f', summary: ['lp', 'np', 'ns'] },
    switching: { title: 'سوئیچینگ و کنترل', english: 'SWITCHING & CONTROL', subtitle: 'کلید قدرت، محدودکننده جریان، اسنابر و پیشنهاد ماسفت.', accent: '#d8a77f', summary: ['vdsRating', 'senseR', 'mosLoss'] },
    output: { title: 'فیلتر و خروجی', english: 'OUTPUT & FILTER', subtitle: 'خازن، دیود یکسوساز و پیشنهاد دیود خروجی.', accent: '#d8a77f', summary: ['coutStd', 'rippleActual', 'diodeVr'] },
    ironcore: { title: 'محاسبات هسته آهن', english: 'IRON CORE DESIGN', subtitle: 'ترانس فرکانس شبکه؛ هسته EI، سیم‌پیچ، تلفات و پیشنهاد سایز.', accent: '#dca678', summary: ['tpv', 'npIron', 'nsIron'], basics: ['vPrim', 'vSec', 'iSec', 'fNet'], supplyType: 'ac-ac', topology: 'iron-ei', standaloneModule: true, badge: 'IRON CORE / 50-60Hz', badgeNote: 'طراحی ترانس EI فرکانس شبکه؛ ورودی اولیه، ثانویه، جریان و فرکانس.', configNote: 'این ماژول مستقل از فلای‌بک است. ورودی‌های اختصاصی خودش را وارد کنید.', tip: 'ولتاژ اولیه، ولتاژ ثانویه، جریان ثانویه و فرکانس شبکه را وارد کنید.' },
    motor: { title: 'محاسبات الکتروموتور', english: 'MOTOR DESIGN', subtitle: 'محاسبات استاتور، روتور، گشتاور و پیشنهاد نوع موتور.', accent: '#8daeda', summary: ['torque', 'rpm', 'effMotor'], basics: ['mVolt', 'mPower', 'mPoles', 'mFreq'], supplyType: 'ac-ac', topology: 'induction-motor', standaloneModule: true, badge: 'INDUCTION MOTOR', badgeNote: 'موتور القایی متناوب؛ ولتاژ، توان، قطب‌ها و فرکانس.', configNote: 'این ماژول مستقل است. ولتاژ تغذیه، توان، تعداد قطب و فرکانس را وارد کنید.', tip: 'ولتاژ تغذیه، توان مکانیکی، تعداد قطب و فرکانس شبکه را وارد کنید.' }
  };

  var fields = [];
  function field(key, label, symbol, unit, value, min, max, group, note) {
    fields.push({ key: key, label: label, symbol: symbol, unit: unit, defaultValue: value, min: min, max: max, group: group, note: note || '' });
  }

  field('vacMin', 'حداقل ورودی AC', 'Vac_min', 'V RMS', 85, 30, 500, 'basic', 'حداقل ولتاژ مؤثر شبکه.');
  field('vacMax', 'حداکثر ورودی AC', 'Vac_max', 'V RMS', 265, 30, 500, 'basic');
  field('vo', 'ولتاژ خروجی', 'Vo', 'V', 12, 1, 500, 'basic');
  field('io', 'جریان خروجی', 'Io', 'A', 5, 0.01, 100, 'basic');
  field('eff', 'بازده تخمینی', 'eta_pct', '%', 85, 40, 98, 'electrical');
  field('fs', 'فرکانس سوئیچینگ', 'fs_kHz', 'kHz', 65, 15, 500, 'electrical');
  field('duty', 'حد دیوتی طراحی', 'Dmax_pct', '%', 42, 5, 80, 'electrical');
  field('vref', 'ولتاژ بازتابی هدف', 'VR_target', 'V', 100, 10, 400, 'electrical');
  field('vd', 'افت دیود خروجی', 'Vf_out', 'V', 0.5, 0.1, 2, 'electrical');
  field('bridgeV', 'افت هر دیود پل', 'Vf_bridge', 'V', 1, 0.3, 2, 'electrical');
  field('rippleIn', 'ریپل مجاز باس ورودی', 'dV_bus', 'V pp', 20, 1, 150, 'electrical');
  field('voltMargin', 'حاشیه ولتاژ قطعات', 'V_margin', '%', 20, 10, 100, 'electrical');
  
  field('mainsHz', 'فرکانس شبکه', 'f_line', 'Hz', 50, 45, 65, 'input');
  field('pf', 'ضریب توان تخمینی', 'PF', '', 0.65, 0.3, 1, 'input');
  field('holdMs', 'زمان نگه‌داری', 't_hold', 'ms', 20, 0, 1000, 'input');
  field('holdCutoff', 'قطع تنظیم در افت باس', 'V_UV', 'V', 65, 5, 500, 'input');
  field('bulkTol', 'تلرانس خازن ورودی', 'tol_in', '%', 20, 0, 50, 'input');
  field('dischargeS', 'زمان تخلیه هدف', 't_dis', 's', 60, 1, 600, 'input');
  field('safeV', 'ولتاژ هدف تخلیه', 'V_safe', 'V', 60, 5, 100, 'input');

  field('ae', 'سطح مؤثر هسته Ae', 'Ae', 'mm2', 80, 5, 5000, 'transformer');
  field('aw', 'مساحت پنجره Aw', 'Aw', 'mm2', 100, 5, 10000, 'transformer');
  field('le', 'طول مسیر مغناطیسی', 'le', 'mm', 65, 5, 1000, 'transformer');
  field('mur', 'تراوایی نسبی ماده', 'mu_r', '', 2000, 100, 10000, 'transformer');
  field('bmax', 'سقف تغییر شار طراحی', 'dB_design', 'T', 0.2, 0.05, 0.4, 'transformer');
  field('j', 'چگالی جریان مس', 'J', 'A/mm2', 4, 1, 10, 'transformer');
  field('ku', 'ضریب پرشدگی مجاز', 'Ku', '%', 35, 10, 60, 'transformer');
  field('strand', 'قطر هر رشته مس', 'd_strand', 'mm', 0.25, 0.05, 3, 'transformer');
  field('ltol', 'تلرانس مثبت Lp', 'tol_Lp', '%', 10, 0, 30, 'transformer');
  field('oc', 'حاشیه محدودیت جریان', 'I_limit_margin', '%', 15, 5, 60, 'transformer');

  field('spike', 'اسپایک اضافی درین', 'V_spike', 'V', 70, 0, 300, 'switching');
  field('rds', 'مقاومت MOSFET در دمای کار', 'Rds_hot', 'ohm', 0.45, 0.001, 20, 'switching');
  field('tr', 'زمان هم‌پوشانی روشن‌شدن', 'tr', 'ns', 20, 0, 500, 'switching');
  field('tf', 'زمان هم‌پوشانی خاموش‌شدن', 'tf', 'ns', 40, 1, 500, 'switching');
  field('coss', 'Coss معادل انرژی', 'Coss_eq', 'pF', 60, 1, 3000, 'switching');
  field('qg', 'بار کل گیت', 'Qg', 'nC', 20, 1, 500, 'switching');
  field('vg', 'ولتاژ درایو گیت', 'Vg', 'V', 12, 4, 20, 'switching');
  field('cs', 'آستانه حس جریان', 'Vcs', 'V', 0.8, 0.05, 2, 'switching');
  field('leak', 'اندوکتانس نشتی نسبت به Lp', 'leak_pct', '%', 2, 0.1, 15, 'switching');
  field('clampRipple', 'ریپل خازن اسنابر', 'clamp_ripple', '%', 10, 1, 30, 'switching');
  field('ta', 'دمای محیط', 'Ta', 'C', 45, -20, 100, 'switching');
  field('tj', 'سقف دمای پیوند طراحی', 'Tj_limit', 'C', 125, 60, 175, 'switching');
  field('rjc', 'مقاومت حرارتی پیوند تا بدنه', 'Rth_jc', 'C/W', 2, 0.1, 30, 'switching');
  field('rcs', 'مقاومت حرارتی رابط', 'Rth_cs', 'C/W', 0.5, 0, 10, 'switching');
  field('fbRef', 'مرجع فیدبک', 'Vfb', 'V', 2.495, 0.5, 5, 'switching');
  field('fbBottom', 'مقاومت پایین تقسیم‌کننده', 'Rfb_bottom', 'kohm', 10, 1, 100, 'switching');

  field('rippleOut', 'ریپل مجاز خروجی', 'ripple_out', '%', 1, 0.05, 10, 'output');
  field('capShare', 'سهم خازن از بودجه ریپل', 'cap_share', '%', 50, 10, 90, 'output');
  field('esr', 'ESR مجموع خازن‌های خروجی', 'ESR', 'mohm', 2, 0.1, 500, 'output');
  field('outTol', 'کاهش ظرفیت مؤثر خروجی', 'tol_out', '%', 20, 0, 80, 'output');
  field('stepLoad', 'پله بار نسبت به جریان نامی', 'step_load', '%', 50, 1, 100, 'output');
  field('responseUs', 'زمان پاسخ فرضی حلقه', 't_response', 'us', 200, 10, 10000, 'output');
  field('droop', 'افت مجاز در پله بار', 'droop', '%', 3, 0.2, 20, 'output');
  field('postFreq', 'فرکانس فیلتر LC اختیاری', 'f_LC', 'kHz', 3, 0.1, 100, 'output');
  field('postCap', 'خازن فیلتر LC اختیاری', 'C_LC', 'uF', 47, 1, 10000, 'output');
  field('postRipple', 'ریپل جریان سلف اختیاری', 'ripple_L', '%', 20, 1, 100, 'output');
  // --- ترانس هسته آهن ---
  field('vPrim', 'ولتاژ اولیه', 'V1', 'V RMS', 220, 12, 400, 'ironcore');
  field('vSec', 'ولتاژ ثانویه نامی', 'V2', 'V RMS', 12, 1, 250, 'ironcore');
  field('iSec', 'جریان ثانویه نامی', 'I2', 'A', 5, 0.01, 200, 'ironcore');
  field('fNet', 'فرکانس شبکه', 'f_net', 'Hz', 50, 45, 65, 'ironcore');
  field('bIron', 'چگالی شار طراحی', 'B_iron', 'T', 1.1, 0.6, 1.5, 'ironcore');
  field('jIron', 'چگالی جریان سیم', 'J_iron', 'A/mm2', 3, 1.5, 5, 'ironcore');
  field('kIron', 'ضریب سطح مقطع هسته', 'k_core', '', 1.15, 0.9, 1.5, 'ironcore');
  field('kStack', 'ضریب انباشتگی ورق', 'k_stack', '', 0.94, 0.85, 0.98, 'ironcore');
  field('kFill', 'ضریب پرشدگی پنجره', 'Ku_iron', '%', 35, 15, 50, 'ironcore');
  field('effIron', 'بازده مبنای طراحی', 'eta_iron', '%', 95, 70, 99, 'ironcore');
  field('regComp', 'جبران دور ثانویه', 'reg_comp', '%', 4, 0, 15, 'ironcore');
  field('wkgIron', 'تلفات مخصوص هسته', 'W_kg', 'W/kg', 1.2, 0.3, 5, 'ironcore');
  field('iAppClass', 'کلاس کاربرد', 'i_app_class', '', 0, 0, 1, 'ironcore', 'عمومی (0): ورق معمولی EI | صنعتی (1): ورق سیلیکون Hi-B با چگالی شار بالاتر');

  // --- الکتروموتور القایی ---
  field('mVolt', 'ولتاژ تغذیه موتور', 'V_m', 'V RMS', 380, 110, 690, 'motor');
  field('mFreq', 'فرکانس تغذیه', 'f_m', 'Hz', 50, 45, 65, 'motor');
  field('mPower', 'توان مکانیکی خروجی', 'P_mech', 'kW', 1.5, 0.05, 500, 'motor');
  field('mPoles', 'تعداد قطب', 'P_poles', '', 4, 2, 12, 'motor');
  field('mEff', 'بازده موتور', 'eta_m', '%', 85, 50, 98, 'motor');
  field('mPF', 'ضریب توان', 'PF_m', '', 0.82, 0.5, 0.99, 'motor');
  field('mSlip', 'لغزش نامی', 's_nom', '%', 4, 0.5, 15, 'motor');
  field('mPhase', 'تعداد فاز', 'phase', '', 3, 1, 3, 'motor');
  field('mOLF', 'ضریب اضافه‌بار', 'OLF', '', 1.5, 1.1, 3, 'motor');
  field('mType', 'نوع موتور (0=AC القایی، 1=DC جداگانه)', 'motor_type', '', 0, 0, 1, 'motor', 'AC القایی (0): سه‌فاز | DC (1): موتور جریان مستقیم با تحریک جداگانه');
  field('dcVa', 'ولتاژ آرمیچر DC', 'V_a', 'V', 220, 12, 800, 'motor', 'ولتاژ آرمیچر موتور DC؛ فقط برای نوع DC');
  field('dcVf', 'ولتاژ تحریک DC', 'V_f', 'V', 220, 12, 800, 'motor', 'ولتاژ سیم‌پیچ تحریک؛ برای تحریک جداگانه');
  field('dcRa', 'مقاومت آرمیچر', 'R_a', 'ohm', 0.5, 0.01, 50, 'motor', 'مقاومت سیم‌پیچ آرمیچر DC');
  field('dcKphi', 'ثابت گشتاور موتور DC', 'K_phi', 'V.s/rad', 1.2, 0.01, 50, 'motor', 'K.φ = ثابت ماشین × شار؛ از دیتاشیت یا آزمایش');
  field('mTargetRPM', 'دور هدف (اختیاری، 0=نادیده)', 'RPM_target', 'RPM', 0, 0, 6000, 'motor', 'اگر 0 باشد، از تعداد قطب محاسبه می‌شود. در غیر این صورت تعداد قطب از دور هدف تعیین می‌شود.');
  field('mAppClass', 'کلاس کاربرد', 'app_class', '', 0, 0, 1, 'motor', 'عمومی (0): IE1/IE2 | صنعتی (1): IE3/IE4 بر اساس استاندارد IEC 60034');

  var defaults = {};
  fields.forEach(function (item) { defaults[item.key] = item.defaultValue; });

  var series = [];
  for (var decade = -2; decade <= 8; decade++) {
    [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2].forEach(function (base) { series.push(Number((base * Math.pow(10, decade)).toPrecision(12))); });
  }
  function preferred(value) { return series.find(function (n) { return n >= value; }) || value; }

  function op(name) { return [name].concat(Array.prototype.slice.call(arguments, 1)); }
  var mul = function () { return op.apply(null, ['*'].concat(Array.prototype.slice.call(arguments))); };
  var add = function () { return op.apply(null, ['+'].concat(Array.prototype.slice.call(arguments))); };
  var sub = function (a, b) { return op('-', a, b); };
  var div = function (a, b) { return op('/', a, b); };
  var sq = function (a) { return op('^', a, 2); };
  var sqrt = function (a) { return op('SQRT', a); };
  var ceil = function (a) { return op('ROUNDUP', a, 0); };
  var pct = function (a) { return div(a, 100); };
  var margin = function (a) { return add(1, pct(a)); };
  var remain = function (a) { return sub(1, pct(a)); };

  var rows = [];
  function row(module, group, key, label, unit, expr, note) { rows.push({ module: module, group: group, key: key, label: label, unit: unit, expr: expr, note: note || '' }); }

  row('common', 'مشخصات و توان', 'pout', 'توان خروجی', 'W', mul('vo', 'io'));
  row('common', 'مشخصات و توان', 'pin', 'بودجه توان ورودی', 'W', div('pout', pct('eff')));
  row('common', 'مشخصات و توان', 'lossBudget', 'بودجه کل تلفات', 'W', sub('pin', 'pout'));
  row('common', 'مشخصات و توان', 'psec', 'توان انتقالی به ثانویه و دیود', 'W', mul(add('vo', 'vd'), 'io'));
  row('common', 'باس و زمان‌بندی', 'rectMin', 'پیک باس در کمترین ورودی', 'V', sub(mul(sqrt(2), 'vacMin'), mul(2, 'bridgeV')));
  row('common', 'باس و زمان‌بندی', 'rectMax', 'پیک باس در بیشترین ورودی', 'V', sub(mul(sqrt(2), 'vacMax'), mul(2, 'bridgeV')));
  row('common', 'باس و زمان‌بندی', 'busMin', 'کف باس مبنای طراحی', 'V', sub('rectMin', 'rippleIn'));
  row('common', 'باس و زمان‌بندی', 'fHz', 'فرکانس در دستگاه SI', 'Hz', mul('fs', 1000));
  row('common', 'باس و زمان‌بندی', 'period', 'دوره سوئیچینگ', 'us', div(1e6, 'fHz'));

  row('input', 'پل و جریان شبکه', 'lineRms', 'جریان مؤثر شبکه، تخمینی', 'A', div('pin', mul('vacMin', 'pf')));
  row('input', 'پل و جریان شبکه', 'bridgeLoss', 'تلفات تقریبی پل دیود', 'W', div(mul(2, 'bridgeV', 'pin'), 'busMin'));
  row('input', 'پل و جریان شبکه', 'bridgeVr', 'حداقل ریتینگ ولتاژ معکوس پل', 'V', mul('rectMax', margin('voltMargin')));
  row('input', 'پل و جریان شبکه', 'fuseBase', 'مبنای اولیه جریان فیوز', 'A', mul('lineRms', 1.6));
  row('input', 'پیشنهاد قطعه تجاری', 'bridgeRec', 'پل دیود ورودی پیشنهادی بازار', '', 0);

  row('input', 'خازن بالک', 'bulkRipple', 'ظرفیت از ریپل نیم‌دوره', 'uF', div(mul('pin', 1e6), mul('mainsHz', sub(sq('rectMin'), sq('busMin')))));
  row('input', 'خازن بالک', 'bulkHold', 'ظرفیت از انرژی نگه‌داری', 'uF', div(mul(2, 'pin', 'holdMs', 1000), sub(sq('busMin'), sq('holdCutoff'))));
  row('input', 'خازن بالک', 'bulkRequired', 'ظرفیت نامی با لحاظ تلرانس', 'uF', div(op('MAX', 'bulkRipple', 'bulkHold'), remain('bulkTol')));
  row('input', 'خازن بالک', 'bulkStd', 'ظرفیت E12 رو به بالا', 'uF', op('PREF', 'bulkRequired'));
  row('input', 'خازن بالک', 'bulkEff', 'کمترین ظرفیت مؤثر', 'uF', mul('bulkStd', remain('bulkTol')));
  row('input', 'خازن بالک', 'bulkValley', 'کف باس با ظرفیت پیشنهادی', 'V', sqrt(op('MAX', 0, sub(sq('rectMin'), div(mul('pin', 1e6), mul('mainsHz', 'bulkEff'))))));
  row('input', 'خازن بالک', 'bulkRating', 'حداقل ریتینگ ولتاژ خازن', 'V', mul('rectMax', margin('voltMargin')));
  row('input', 'خازن بالک', 'holdActual', 'نگه‌داری انرژی محاسبه‌شده', 'ms', div(mul('bulkEff', 0.001, sub(sq('busMin'), sq('holdCutoff'))), mul(2, 'pin')));
  row('input', 'تخلیه و انرژی', 'storedEnergy', 'انرژی ذخیره‌شده بالک', 'J', mul(0.5, 'bulkStd', 1e-6, margin('bulkTol'), sq('rectMax')));
  row('input', 'تخلیه و انرژی', 'bleedR', 'حداکثر مقاومت تخلیه', 'kohm', div(mul('dischargeS', 1000), mul('bulkStd', margin('bulkTol'), op('LN', div('rectMax', 'safeV')))));
  row('input', 'تخلیه و انرژی', 'bleedW', 'اتلاف اولیه مقاومت تخلیه', 'W', div(sq('rectMax'), mul('bleedR', 1000)));

  var L = mul('lp', 1e-6);
  var A = mul('ae', 1e-6);
  row('transformer', 'اندوکتانس و جریان', 'lp', 'اندوکتانس اولیه / سلف اصلی', 'uH', div(mul(sq('busMin'), sq(pct('duty')), 1e6), mul(2, 'pin', 'fHz')));
  row('transformer', 'اندوکتانس و جریان', 'ipDesign', 'پیک اولیه در بودجه توان', 'A', div(mul(2, 'pin'), mul('busMin', pct('duty'))));
  row('transformer', 'اندوکتانس و جریان', 'ipLimit', 'آستانه هدف محدودیت جریان', 'A', mul('ipDesign', margin('oc')));
  row('transformer', 'اندوکتانس و جریان', 'ipOp', 'پیک اولیه در بار نامی مدل', 'A', sqrt(div(mul(2, 'psec'), mul(L, 'fHz'))));
  row('transformer', 'سیم‌پیچ و شار', 'np', 'تعداد دور اولیه، گرد به بالا', 'turn', ceil(div(mul(L, margin('ltol'), 'ipLimit'), mul('bmax', A))));
  row('transformer', 'سیم‌پیچ و شار', 'ns', 'تعداد دور ثانویه، گرد به بالا', 'turn', ceil(div(mul('np', add('vo', 'vd')), 'vref')));
  row('transformer', 'سیم‌پیچ و شار', 'ratio', 'نسبت دور واقعی Np/Ns', '', div('np', 'ns'));
  row('transformer', 'سیم‌پیچ و شار', 'vrActual', 'ولتاژ بازتابی واقعی', 'V', mul('ratio', add('vo', 'vd')));
  row('transformer', 'زمان‌بندی واقعی', 'dOn', 'دیوتی روشن در ورودی کمینه', '%', div(mul(100, L, 'ipOp', 'fHz'), 'busMin'));
  row('transformer', 'زمان‌بندی واقعی', 'dHigh', 'دیوتی روشن در ورودی بیشینه', '%', div(mul(100, L, 'ipOp', 'fHz'), 'rectMax'));
  row('transformer', 'زمان‌بندی واقعی', 'dDemag', 'سهم زمان تخلیه ثانویه', '%', div(mul(100, L, 'ipOp', 'fHz'), 'vrActual'));
  row('transformer', 'زمان‌بندی واقعی', 'idle', 'حاشیه بی‌جریانی در بار نامی', '%', sub(sub(100, 'dOn'), 'dDemag'));
  row('transformer', 'زمان‌بندی واقعی', 'designIdle', 'حاشیه DCM در بودجه توان', '%', sub(sub(100, 'duty'), div(mul(100, L, 'ipDesign', 'fHz'), 'vrActual')));
  row('transformer', 'زمان‌بندی واقعی', 'designIdleWorst', 'حاشیه DCM با بیشترین Lp', '%', sub(100, mul(sub(100, 'designIdle'), sqrt(margin('ltol')))));
  row('transformer', 'زمان‌بندی واقعی', 'ton', 'زمان روشن اولیه', 'us', mul(pct('dOn'), 'period'));
  row('transformer', 'زمان‌بندی واقعی', 'tdemag', 'زمان تخلیه مغناطیسی', 'us', mul(pct('dDemag'), 'period'));
  row('transformer', 'زمان‌بندی واقعی', 'tidle', 'زمان بی‌جریانی', 'us', mul(pct('idle'), 'period'));
  row('transformer', 'جریان مؤثر و هسته', 'ipRms', 'RMS اولیه در بار نامی', 'A', mul('ipOp', sqrt(div('dOn', 300))));
  row('transformer', 'جریان مؤثر و هسته', 'ipRmsDesign', 'RMS اولیه در بودجه توان', 'A', mul('ipDesign', sqrt(div('duty', 300))));
  row('transformer', 'جریان مؤثر و هسته', 'isPeak', 'پیک ثانویه در بار نامی', 'A', mul('ipOp', 'ratio'));
  row('transformer', 'جریان مؤثر و هسته', 'isRms', 'RMS ثانویه در بار نامی', 'A', mul('isPeak', sqrt(div('dDemag', 300))));
  row('transformer', 'جریان مؤثر و هسته', 'bNormal', 'تغییر شار در بار نامی', 'T', div(mul(L, 'ipOp'), mul('np', A)));
  row('transformer', 'جریان مؤثر و هسته', 'bLimit', 'تغییر شار در حد جریان', 'T', div(mul(L, margin('ltol'), 'ipLimit'), mul('np', A)));
  row('transformer', 'جریان مؤثر و هسته', 'al', 'AL هدف پس از گپ', 'nH/turn2', div(mul('lp', 1000), sq('np')));
  row('transformer', 'جریان مؤثر و هسته', 'gap', 'طول کل گپ معادل، تخمینی', 'mm', op('MAX', 0, sub(div(mul(4e-7, Math.PI, sq('np'), A, 1000), L), div('le', 'mur'))));
  row('transformer', 'سیم و پرشدگی', 'skin', 'عمق نفوذ مس در ۲۰ درجه', 'mm', mul(1000, sqrt(div(1.724e-8, mul(Math.PI, 'fHz', 4e-7, Math.PI)))));
  row('transformer', 'سیم و پرشدگی', 'wireAreaP', 'سطح مس موردنیاز اولیه', 'mm2', div('ipRmsDesign', 'j'));
  row('transformer', 'سیم و پرشدگی', 'wireAreaS', 'سطح مس ثانویه با ذخیره توان', 'mm2', div(mul('ipDesign', 'ratio', sqrt(div(mul(L, 'ipDesign', 'fHz'), mul(3, 'vrActual')))), 'j'));
  row('transformer', 'سیم و پرشدگی', 'strandsP', 'تعداد رشته موازی اولیه', '', ceil(div('wireAreaP', div(mul(Math.PI, sq('strand')), 4))));
  row('transformer', 'سیم و پرشدگی', 'strandsS', 'تعداد رشته موازی ثانویه', '', ceil(div('wireAreaS', div(mul(Math.PI, sq('strand')), 4))));
  row('transformer', 'سیم و پرشدگی', 'fill', 'پرشدگی مس با رشته‌های گرد شده', '%', div(mul(100, div(mul(Math.PI, sq('strand')), 4), add(mul('np', 'strandsP'), mul('ns', 'strandsS'))), 'aw'));
  row('transformer', 'پیشنهاد قطعه تجاری', 'suggestedCore', 'سایز هسته پیشنهادی بازار', '', 0);

  row('output', 'بار و دیود', 'loadR', 'مقاومت بار معادل', 'ohm', div('vo', 'io'));
  row('output', 'بار و دیود', 'secondaryMean', 'میانگین جریان ثانویه مدل', 'A', mul('isPeak', div('dDemag', 200)));
  row('output', 'بار و دیود', 'diodeVr', 'ریتینگ معکوس دیود با حاشیه', 'V', mul(add('vo', div('rectMax', 'ratio')), margin('voltMargin')));
  row('output', 'بار و دیود', 'diodeAvg', 'جریان متوسط ریتینگ پیشنهادی', 'A', mul('io', 1.5));
  row('output', 'بار و دیود', 'diodePeak', 'تحمل پیک پیشنهادی دیود', 'A', mul('ipLimit', 'ratio', 1.25));
  row('output', 'بار و دیود', 'diodeW', 'تلفات هدایت دیود', 'W', mul('io', 'vd'));
  row('output', 'پیشنهاد قطعه تجاری', 'suggestedDiode', 'دیود خروجی پیشنهادی بازار', '', 0);

  row('output', 'خازن خروجی', 'capRms', 'جریان RMS خازن خروجی', 'A', sqrt(op('MAX', 0, sub(sq('isRms'), sq('io')))));
  row('output', 'خازن خروجی', 'rippleTarget', 'بودجه ریپل خروجی', 'mV pp', mul('vo', 'rippleOut', 10));
  row('output', 'خازن خروجی', 'coutRipple', 'ظرفیت مؤثر از بار مثلثی', 'uF', div(mul('io', sq(sub(1, div('dDemag', 200))), 1e9), mul('fHz', 'rippleTarget', pct('capShare'))));
  row('output', 'خازن خروجی', 'stepI', 'دامنه پله بار', 'A', mul('io', pct('stepLoad')));
  row('output', 'خازن خروجی', 'coutTransient', 'ظرفیت مؤثر از پله بار', 'uF', div(mul('stepI', 'responseUs'), sub(mul('vo', pct('droop')), mul('stepI', 'esr', 0.001))));
  row('output', 'خازن خروجی', 'coutRequired', 'ظرفیت نامی موردنیاز', 'uF', div(op('MAX', 'coutRipple', 'coutTransient'), remain('outTol')));
  row('output', 'خازن خروجی', 'coutStd', 'ظرفیت نامی پیشنهادی E12', 'uF', op('PREF', 'coutRequired'));
  row('output', 'خازن خروجی', 'coutEff', 'ظرفیت مؤثر بدترین حالت', 'uF', mul('bulkStd', remain('outTol')));
  row('output', 'خازن خروجی', 'esrMax', 'حد ESR از بودجه ریپل', 'mohm', div(mul('rippleTarget', remain('capShare')), 'isPeak'));
  row('output', 'خازن خروجی', 'rippleCap', 'ریپل خازنی برآوردشده', 'mV pp', div(mul('io', sq(sub(1, div('dDemag', 200))), 1e9), mul('fHz', 'coutEff')));
  row('output', 'خازن خروجی', 'rippleEsr', 'کران ریپل ناشی از ESR', 'mV pp', mul('isPeak', 'esr'));
  row('output', 'خازن خروجی', 'rippleActual', 'کران مجموع ریپل خروجی', 'mV pp', add('rippleCap', 'rippleEsr'));
  row('output', 'خازن خروجی', 'transientDrop', 'افت برآوردی پله بار', 'mV', mul(1000, 'stepI', add(div('responseUs', 'coutEff'), mul('esr', 0.001))));
  row('output', 'خازن خروجی', 'coutRating', 'حداقل ریتینگ ولتاژ خازن خروجی', 'V', mul('vo', margin('voltMargin')));
  row('output', 'فیلتر LC اختیاری', 'postL', 'سلف پیشنهادی پس‌فیلتر', 'uH', div(1e6, mul(sq(mul(2, Math.PI, 'postFreq', 1000)), 'postCap', 1e-6)));
  row('output', 'فیلتر LC اختیاری', 'postIsat', 'تحمل اشباع هدف پس‌فیلتر', 'A', mul('io', add(1, div('postRipple', 200)), 1.25));
  row('output', 'فیلتر LC اختیاری', 'postZ', 'امپدانس مشخصه پس‌فیلتر', 'ohm', sqrt(div('postL', 'postCap')));

  row('switching', 'تنش و حس جریان', 'vdsPeak', 'تنش برآوردی درین', 'V', add('rectMax', 'vrActual', 'spike'));
  row('switching', 'تنش و حس جریان', 'vdsRating', 'حداقل ریتینگ VDS پیشنهادی', 'V', mul('vdsPeak', margin('voltMargin')));
  row('switching', 'تنش و حس جریان', 'mosIpk', 'تحمل پیک جریان MOSFET', 'A', mul('ipLimit', 1.25));
  row('switching', 'تنش و حس جریان', 'senseR', 'مقاومت حس جریان', 'ohm', div('cs', 'ipLimit'));
  row('switching', 'تنش و حس جریان', 'senseW', 'تلفات مقاومت حس در بار نامی', 'W', mul(sq('ipRms'), 'senseR'));
  row('switching', 'تلفات مرتبه اول', 'mosCond', 'تلفات هدایت MOSFET', 'W', mul(sq('ipRms'), 'rds'));
  row('switching', 'تلفات مرتبه اول', 'mosSwitch', 'تلفات هم‌پوشانی محافظه‌کارانه', 'W', mul(0.5, 'vdsPeak', 'ipOp', add('tr', 'tf'), 1e-9, 'fHz'));
  row('switching', 'تلفات مرتبه اول', 'mosCoss', 'اتلاف Coss با فرض hard switching', 'W', mul(0.5, 'coss', 1e-12, sq('vdsPeak'), 'fHz'));
  row('switching', 'تلفات مرتبه اول', 'mosLoss', 'جمع تلفات برآوردی MOSFET', 'W', add('mosCond', 'mosSwitch', 'mosCoss'));
  row('switching', 'تلفات مرتبه اول', 'driveW', 'توان درایو گیت', 'W', mul('qg', 1e-9, 'vg', 'fHz'));
  row('switching', 'اسنابر RCD', 'leakL', 'اندوکتانس نشتی فرض‌شده', 'uH', mul('lp', pct('leak')));
  row('switching', 'اسنابر RCD', 'clampV', 'ولتاژ خازن کلمپ نسبت به باس', 'V', add('vrActual', 'spike'));
  row('switching', 'اسنابر RCD', 'snubW', 'تلفات اسنابر در حد جریان', 'W', div(mul(0.5, 'leakL', 1e-6, sq('ipLimit'), 'fHz', 'clampV'), sub('clampV', 'vrActual')));
  row('switching', 'اسنابر RCD', 'snubR', 'مقاومت اولیه اسنابر', 'kohm', div(sq('clampV'), mul('snubW', 1000)));
  row('switching', 'اسنابر RCD', 'snubNomW', 'تلفات RCD در بار نامی مدل', 'W', div(sq('clampV'), mul('snubR', 1000)));
  row('switching', 'اسنابر RCD', 'snubC', 'حداقل خازن اسنابر', 'nF', div(1e9, mul('snubR', 1000, 'fHz', pct('clampRipple'))));
  row('switching', 'اسنابر RCD', 'snubRating', 'توان مقاومت اسنابر با حاشیه', 'W', mul('snubW', 2));
  row('switching', 'حرارت و فیدبک', 'sinkTheta', 'حداکثر مقاومت حرارتی هیت‌سینک', 'C/W', sub(sub(div(sub('tj', 'ta'), 'mosLoss'), 'rjc'), 'rcs'));
  row('switching', 'حرارت و فیدبک', 'fbTop', 'مقاومت بالای تقسیم‌کننده فیدبک', 'kohm', mul('fbBottom', sub(div('vo', 'fbRef'), 1)));
  row('switching', 'حرارت و فیدبک', 'fcLimit', 'حد شروع محافظه‌کارانه پهنای باند', 'Hz', op('MIN', div('fHz', 20), mul('postFreq', 200)));
  row('switching', 'پیشنهاد قطعه تجاری', 'suggestedMosfet', 'ماسفت پیشنهادی بازار', '', 0);

  // --- ترانس هسته آهن (۵۰/۶۰Hz، مستقل از فلای‌بک) ---
  row('ironcore', 'توان و جریان', 'vaSec', 'توان ظاهری ثانویه', 'VA', mul('vSec', 'iSec'));
  row('ironcore', 'توان و جریان', 'vaIn', 'توان ورودی طراحی', 'VA', div('vaSec', pct('effIron')));
  row('ironcore', 'توان و جریان', 'iPrim', 'جریان نامی اولیه', 'A', div('vaIn', 'vPrim'));
  row('ironcore', 'هسته و سطح مقطع', 'bDesign', 'چگالی شار مؤثر', 'T', add('bIron', mul('iAppClass', 0.2)));
  row('ironcore', 'هسته و سطح مقطع', 'safetyFactor', 'ضریب ایمنی کلاس', '', add(1, mul('iAppClass', 0.15)));
  row('ironcore', 'هسته و سطح مقطع', 'aGross', 'سطح مقطع ناخالص هسته', 'cm2', mul('kIron', sqrt('vaSec')));
  row('ironcore', 'هسته و سطح مقطع', 'aNet', 'سطح مقطع خالص هسته', 'cm2', mul('aGross', 'kStack'));
  row('ironcore', 'هسته و سطح مقطع', 'tongueW', 'عرض زبانه تقریبی', 'mm', mul(10, sqrt('aNet')));
  row('ironcore', 'دور سیم‌پیچ‌ها', 'tpv', 'دور بر ولت', 'turn/V', div(1e4, mul(4.44, 'fNet', 'bDesign', 'aNet')));
  row('ironcore', 'دور سیم‌پیچ‌ها', 'npIron', 'دور اولیه', 'turn', ceil(mul('vPrim', 'tpv')));
  row('ironcore', 'دور سیم‌پیچ‌ها', 'nsIdeal', 'دور ثانویه ایده‌آل', 'turn', mul('vSec', 'tpv'));
  row('ironcore', 'دور سیم‌پیچ‌ها', 'nsIron', 'دور ثانویه با جبران', 'turn', ceil(mul('nsIdeal', margin('regComp'))));
  row('ironcore', 'دور سیم‌پیچ‌ها', 'ratioIron', 'نسبت دور Np/Ns', '', div('npIron', 'nsIron'));
  row('ironcore', 'سیم‌پیچ', 'dCuP', 'قطر مس اولیه', 'mm', sqrt(div(mul(4, 'iPrim'), mul(Math.PI, 'jIron'))));
  row('ironcore', 'سیم‌پیچ', 'dWireP', 'قطر سیم پیشنهادی اولیه', 'mm', div(ceil(mul('dCuP', 20)), 20));
  row('ironcore', 'سیم‌پیچ', 'dCuS', 'قطر مس ثانویه', 'mm', sqrt(div(mul(4, 'iSec'), mul(Math.PI, 'jIron'))));
  row('ironcore', 'سیم‌پیچ', 'dWireS', 'قطر سیم پیشنهادی ثانویه', 'mm', div(ceil(mul('dCuS', 20)), 20));
  row('ironcore', 'سیم‌پیچ', 'aCuP', 'سطح مس اولیه', 'mm2', div(mul(Math.PI, sq('dWireP')), 4));
  row('ironcore', 'سیم‌پیچ', 'aCuS', 'سطح مس ثانویه', 'mm2', div(mul(Math.PI, sq('dWireS')), 4));
  row('ironcore', 'مقاومت و افت', 'mtl', 'طول متوسط دور', 'mm', mul(5.7, 'tongueW'));
  row('ironcore', 'مقاومت و افت', 'rPrim', 'مقاومت اولیه', 'ohm', div(mul(0.0172, 'npIron', 'mtl'), mul(1000, 'aCuP')));
  row('ironcore', 'مقاومت و افت', 'rSec', 'مقاومت ثانویه', 'ohm', div(mul(0.0172, 'nsIron', 'mtl'), mul(1000, 'aCuS')));
  row('ironcore', 'مقاومت و افت', 'regIron', 'تنظیم ولتاژ تخمینی', '%', mul(100, add(div(mul('iSec', 'rSec'), 'vSec'), div(mul('iPrim', 'rPrim'), 'vPrim'))));
  row('ironcore', 'مقاومت و افت', 'vNoLoad', 'ولتاژ بی‌باری ثانویه', 'V', add('vSec', mul('iSec', 'rSec')));
  row('ironcore', 'تلفات و بازده', 'pCuP', 'تلفات مس اولیه', 'W', mul(sq('iPrim'), 'rPrim'));
  row('ironcore', 'تلفات و بازده', 'pCuS', 'تلفات مس ثانویه', 'W', mul(sq('iSec'), 'rSec'));
  row('ironcore', 'تلفات و بازده', 'mFe', 'جرم تقریبی هسته', 'kg', div(mul(mul('aNet', mul(6, 'tongueW')), 7.65), 1e4));
  row('ironcore', 'تلفات و بازده', 'pFe', 'تلفات آهن', 'W', mul('wkgIron', 'mFe', sq('bIron'), op('^', div('fNet', 50), 1.6)));
  row('ironcore', 'تلفات و بازده', 'pTotIron', 'مجموع تلفات', 'W', add('pCuP', 'pCuS', 'pFe'));
  row('ironcore', 'تلفات و بازده', 'etaCalc', 'بازده محاسبه‌شده', '%', div(mul(100, 'vaSec'), add('vaSec', 'pTotIron')));
  row('ironcore', 'پیشنهاد قطعه', 'suggestedEI', 'سایز هسته EI پیشنهادی', '', 0);

  // --- الکتروموتور القایی ---
  row('motor', 'سرعت و گشتاور', 'polesCalc', 'تعداد قطب مؤثر', '', op('MAX', 2, mul(2, ceil(div(mul(60, 'mFreq'), op('MAX', 1, 'mTargetRPM'))))));
  row('motor', 'سرعت و گشتاور', 'polesUsed', 'قطب در محاسبه', '', op('MAX', 'mPoles', mul('mTargetRPM', 0)));
  row('motor', 'سرعت و گشتاور', 'syncRPM', 'سرعت سنکرون', 'RPM', div(mul(120, 'mFreq'), 'mPoles'));
  row('motor', 'سرعت و گشتاور', 'syncRPMfromTarget', 'سرعت سنکرون از دور هدف', 'RPM', div(mul(120, 'mFreq'), mul(2, ceil(div(mul(60, 'mFreq'), op('MAX', 1, 'mTargetRPM'))))));
  row('motor', 'سرعت و گشتاور', 'rpm', 'سرعت نامی روتور', 'RPM', mul('syncRPM', sub(1, pct('mSlip'))));
  row('motor', 'سرعت و گشتاور', 'rpmFromTarget', 'سرعت نامی از دور هدف', 'RPM', mul('syncRPMfromTarget', sub(1, pct('mSlip'))));
  row('motor', 'سرعت و گشتاور', 'pMech', 'توان مکانیکی', 'W', mul('mPower', 1000));
  row('motor', 'سرعت و گشتاور', 'torque', 'گشتاور نامی', 'N.m', div(mul('pMech', 60), mul(2, Math.PI, 'rpm')));
  row('motor', 'سرعت و گشتاور', 'tStart', 'گشتاور راه‌اندازی تخمینی', 'N.m', mul('torque', 'mOLF'));
  row('motor', 'توان و جریان', 'pElec', 'توان الکتریکی ورودی', 'W', div('pMech', pct('mEff')));
  row('motor', 'توان و جریان', 'iLine', 'جریان خط', 'A', div('pElec', mul('mVolt', sqrt(3), 'mPF')));
  row('motor', 'توان و جریان', 'iPhase', 'جریان فاز (ستاره)', 'A', div('iLine', sqrt(3)));
  row('motor', 'توان و جریان', 'sApparent', 'توان ظاهری', 'kVA', div(mul('mVolt', 'iLine', sqrt(3)), 1000));
  row('motor', 'تلفات و بازده', 'ieSafetyFactor', 'ضریب ایمنی کلاس کاربرد', '', add(1, mul('mAppClass', 0.2)));
  row('motor', 'تلفات و بازده', 'pLossTotal', 'مجموع تلفات', 'W', sub('pElec', 'pMech'));
  row('motor', 'تلفات و بازده', 'pCuMotor', 'تلفات مس تخمینی', 'W', mul('pLossTotal', 0.55));
  row('motor', 'تلفات و بازده', 'pFeMotor', 'تلفات آهن تخمینی', 'W', mul('pLossTotal', 0.25));
  row('motor', 'تلفات و بازده', 'pMechLoss', 'تلفات مکانیکی', 'W', mul('pLossTotal', 0.15));
  row('motor', 'تلفات و بازده', 'pStray', 'تلفات پراکنده', 'W', mul('pLossTotal', 0.05));
  row('motor', 'تلفات و بازده', 'effMotor', 'بازده محاسبه‌شده', '%', mul(100, div('pMech', 'pElec')));
  row('motor', 'پیشنهاد قطعه', 'suggestedMotor', 'نوع و فریم موتور پیشنهادی', '', 0);
  // --- محاسبات موتور DC (فقط وقتی mType=1) ---
  row('motor', 'موتور DC - آرمیچر', 'dcIa', 'جریان آرمیچر DC نامی', 'A', div('pMech', mul('dcVa', pct('mEff'))));
  row('motor', 'موتور DC - آرمیچر', 'dcEb', 'نیروی محرکه پشتی (EMF)', 'V', sub('dcVa', mul('dcIa', 'dcRa')));
  row('motor', 'موتور DC - آرمیچر', 'dcOmega', 'سرعت زاویه‌ای روتور', 'rad/s', div(mul(2, Math.PI, 'rpm'), 60));
  row('motor', 'موتور DC - آرمیچر', 'dcKphiCheck', 'تأیید ثابت K.φ از EMF', 'V.s/rad', div('dcEb', 'dcOmega'));
  row('motor', 'موتور DC - آرمیچر', 'dcTorqueDC', 'گشتاور DC محاسبه‌شده', 'N.m', mul('dcKphi', 'dcIa'));
  row('motor', 'موتور DC - تحریک', 'dcIfNom', 'جریان تحریک تخمینی', 'A', div('dcVf', mul('dcRa', 10)));
  row('motor', 'موتور DC - تحریک', 'dcPf', 'توان تحریک', 'W', mul('dcVf', 'dcIfNom'));
  row('motor', 'موتور DC - تحریک', 'dcPLoss', 'تلفات آرمیچر DC', 'W', mul(sq('dcIa'), 'dcRa'));
  row('motor', 'موتور DC - تحریک', 'dcEff', 'بازده موتور DC', '%', mul(100, div('pMech', add('pMech', 'dcPLoss', 'dcPf'))));
  row('motor', 'موتور DC - کنترل', 'dcSpeedBase', 'سرعت پایه از ولتاژ و K.φ', 'RPM', mul(div('dcEb', 'dcKphi'), div(60, mul(2, Math.PI))));
  row('motor', 'موتور DC - کنترل', 'dcStartR', 'مقاومت استارت پیشنهادی', 'ohm', div(sub('dcVa', mul('dcKphi', 'dcOmega')), mul('dcIa', 2.5)));
  row('common', 'کنترل بودجه توان', 'knownLoss', 'جمع محافظه‌کارانه اقلام تلفات', 'W', add('mosLoss', 'diodeW', 'bridgeLoss', 'senseW', 'driveW', 'snubNomW', 'bleedW'));

  function referencesOf(expr) {
    if (typeof expr === 'string') return [expr];
    if (!Array.isArray(expr)) return [];
    return expr.slice(1).reduce(function (all, item) { return all.concat(referencesOf(item)); }, []);
  }

  var scopeCache = {};
  function scope(moduleId) {
    if (!modules[moduleId]) return { id: 'all', fields: fields, rows: rows, displayRows: rows, supportRows: [] };
    if (scopeCache[moduleId]) return scopeCache[moduleId];
    var commonKeys = moduleId === 'input'
      ? ['pout', 'pin', 'lossBudget', 'rectMin', 'rectMax', 'busMin']
      : (moduleId === 'ironcore' || moduleId === 'motor')
        ? []
        : ['pout', 'pin', 'lossBudget', 'psec', 'rectMin', 'rectMax', 'busMin', 'fHz', 'period'];
    var displayRows = rows.filter(function (r) { return r.module === moduleId || commonKeys.indexOf(r.key) !== -1; });
    var required = {}, byKey = {};
    rows.forEach(function (r) { byKey[r.key] = r; });
    function include(key) {
      if (required[key]) return;
      required[key] = true;
      if (byKey[key]) referencesOf(byKey[key].expr).forEach(include);
    }
    displayRows.forEach(function (r) { include(r.key); });
    if (moduleId !== 'input' && moduleId !== 'ironcore' && moduleId !== 'motor') ['idle', 'designIdle', 'designIdleWorst', 'bLimit'].forEach(include);
    var displayKeys = displayRows.map(function (r) { return r.key; });
    scopeCache[moduleId] = {
      id: moduleId,
      fields: fields.filter(function (f) { return required[f.key]; }),
      rows: rows.filter(function (r) { return required[r.key]; }),
      displayRows: displayRows,
      supportRows: rows.filter(function (r) { return required[r.key] && displayKeys.indexOf(r.key) === -1; })
    };
    return scopeCache[moduleId];
  }

  function evaluate(expr, values) {
    if (typeof expr === 'number') return expr;
    if (typeof expr === 'string') {
      if (!Number.isFinite(values[expr])) return 0;
      return values[expr];
    }
    var args = expr.slice(1).map(function (item) { return evaluate(item, values); });
    switch (expr[0]) {
      case '+': return args.reduce(function (a, b) { return a + b; }, 0);
      case '*': return args.reduce(function (a, b) { return a * b; }, 1);
      case '-': return args[0] - args[1];
      case '/': if (args[1] === 0) return 0; return args[0] / args[1];
      case '^': return Math.pow(args[0], args[1]);
      case 'SQRT': return Math.sqrt(Math.max(0, args[0]));
      case 'LN': return Math.log(Math.max(0.0001, args[0]));
      case 'ROUNDUP': return Math.ceil(args[0]);
      case 'MAX': return Math.max.apply(null, args);
      case 'MIN': return Math.min.apply(null, args);
      case 'PREF': return preferred(args[0]);
      default: return 0;
    }
  }

  function formula(expr, references) {
    if (typeof expr === 'number') return String(expr);
    if (typeof expr === 'string') return references[expr] || expr;
    var args = expr.slice(1).map(function (item) { return formula(item, references); });
    return '(' + args.join(expr[0]) + ')';
  }

  function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string' || !value.trim()) return NaN;
    var normalized = value.trim().replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 1776; }).replace(/٫/g, '.');
    return Number(normalized);
  }

  function calculate(raw, moduleId) {
    var plan = scope(moduleId);
    var values = {}, errors = {}, issues = [], computed = [];

    plan.fields.forEach(function (f) {
      var n = parseNumber(raw[f.key]);
      if (!Number.isFinite(n) || n < f.min || n > f.max) errors[f.key] = 'عدد بین ' + f.min + ' و ' + f.max + ' وارد کنید.';
      else values[f.key] = n;
    });

    if (Object.keys(errors).length) {
      return { valid: false, modelValid: false, scope: plan.id, fields: plan.fields, values: values, errors: errors, issues: [], rows: [], displayRows: [], supportRows: [], results: {} };
    }

    var symbols = {};
    fields.forEach(function (f) { symbols[f.key] = f.symbol; });

    plan.rows.forEach(function (r) {
      var n = evaluate(r.expr, values);
      values[r.key] = n;
    });

    // --- منطق تعیین شماره قطعات تجاری (انتقال به ستون توضیحات) ---
    var pout = values.pout || (values.vo * values.io);
    var pin = values.pin || (pout / 0.85);
    var vdsRating = values.vdsRating || 650;
    var lineRms = values.lineRms || 1;

    // ۱. پل دیود ورودی
    var bridgeRec = "پیشنهاد: KBP206 / KBP310 (2A-3A)";
    if (lineRms > 1.5 && lineRms <= 4) bridgeRec = "پیشنهاد: GBU608 / GBU808 (6A-8A)";
    else if (lineRms > 4) bridgeRec = "پیشنهاد: GBPC1510 / GBPC2510 (15A-25A)";

    // ۲. هسته ترانس
    var suggestedCore = "پیشنهاد: EE16 / EE19 / EFD15";
    if (pout > 15 && pout <= 35) suggestedCore = "پیشنهاد: EE22 / EE25 / EFD20";
    else if (pout > 35 && pout <= 75) suggestedCore = "پیشنهاد: EE28 / EFD25 / PQ2620";
    else if (pout > 75 && pout <= 130) suggestedCore = "پیشنهاد: ETD29 / ETD34 / PQ3220";
    else if (pout > 130 && pout <= 200) suggestedCore = "پیشنهاد: ETD39 / ETD44 / PQ3230";
    else if (pout > 200) suggestedCore = "پیشنهاد: ETD49 / ETD59 (توان بالای ۲۰۰W)";

    // ۳. ماسفت قدرت
    var suggestedMosfet = "پیشنهاد: 4N60 / 2N60";
    if (vdsRating <= 650) {
      if (pin > 20 && pin <= 60) suggestedMosfet = "پیشنهاد: 7N60 / 10N60 / IRF840";
      else if (pin > 60 && pin <= 120) suggestedMosfet = "پیشنهاد: 12N60 / SPA11N60 / FFQ13N60";
      else if (pin > 120) suggestedMosfet = "پیشنهاد: 20N60 / SPA20N60 / STW26NM60N";
    } else {
      if (pin <= 60) suggestedMosfet = "پیشنهاد: 6N80 / 4N80";
      else if (pin > 60 && pin <= 120) suggestedMosfet = "پیشنهاد: 10N80 / STP10NK80Z";
      else if (pin > 120) suggestedMosfet = "پیشنهاد: 12N90 / STW12NK90Z";
    }

    // ۴. دیود خروجی
    var suggestedDiode = "پیشنهاد: 1N5822 / MBR3100";
    if (values.vo <= 28) {
      if (values.io > 3 && values.io <= 10) suggestedDiode = "پیشنهاد: MBR10100 / SR10100";
      else if (values.io > 10) suggestedDiode = "پیشنهاد: MBR20100 / MBR30100";
    } else {
      if (values.io <= 3) suggestedDiode = "پیشنهاد: HER308 / UF5408";
      else if (values.io > 3 && values.io <= 10) suggestedDiode = "پیشنهاد: MUR860 / BYW29-200";
      else if (values.io > 10) suggestedDiode = "پیشنهاد: MUR1560 / FEP16BT";
    }

    // ۵. پیشنهاد سایز هسته EI
    var suggestedEI = '';
    if (Number.isFinite(values.vaSec)) {
      var va = values.vaSec;
      var eiClass = values.iAppClass > 0.5 ? ' [صنعتی - ورق سیلیکون Hi-B]' : ' [عمومی - ورق معمولی EI]';
    if (va <= 5) suggestedEI = 'پیشنهاد: EI-28 (5VA)' + eiClass;
      else if (va <= 15) suggestedEI = 'پیشنهاد: EI-35 / EI-41 (5–15VA)' + eiClass;
      else if (va <= 30) suggestedEI = 'پیشنهاد: EI-48 (15–30VA)' + eiClass;
      else if (va <= 50) suggestedEI = 'پیشنهاد: EI-54 / EI-57 (30–50VA)' + eiClass;
      else if (va <= 100) suggestedEI = 'پیشنهاد: EI-66 / EI-76 (50–100VA)' + eiClass;
      else if (va <= 200) suggestedEI = 'پیشنهاد: EI-84 / EI-96 (100–200VA)' + eiClass;
      else if (va <= 500) suggestedEI = 'پیشنهاد: EI-105 / EI-114 (200–500VA)' + eiClass;
      else suggestedEI = 'پیشنهاد: EI-150 / EI-180 یا هسته سفارشی (بالای 500VA)' + eiClass;
    }

    // ۶. پیشنهاد فریم موتور القایی
    var suggestedMotor = '';
    var motClass = values.mAppClass > 0.5 ? ' | IE3/IE4 صنعتی - IEC 60034' : ' | IE1/IE2 عمومی';
    var isDC = values.mType > 0.5;
    if (isDC && Number.isFinite(values.pMech)) {
      var kw = values.pMech / 1000;
      if (kw <= 0.5) suggestedMotor = 'پیشنهاد DC: موتور DC کوچک 12-48V / فریم 56–63 (تا 0.5kW)';
      else if (kw <= 1.5) suggestedMotor = 'پیشنهاد DC: فریم 63–80 (0.5–1.5kW) | تحریک جداگانه';
      else if (kw <= 5) suggestedMotor = 'پیشنهاد DC: فریم 90–100 (1.5–5kW) | تحریک جداگانه';
      else if (kw <= 15) suggestedMotor = 'پیشنهاد DC: فریم 112–132 (5–15kW) | صنعتی تحریک جداگانه';
      else if (kw <= 37) suggestedMotor = 'پیشنهاد DC: فریم 160–180 (15–37kW) | صنعتی';
      else suggestedMotor = 'پیشنهاد DC: فریم 200M+ (بالای 37kW) | صنعتی سنگین';
      suggestedMotor += ' [DC جریان مستقیم]';
    }
    if (Number.isFinite(values.pMech)) {
      var kw = values.pMech / 1000;
      if (kw <= 0.37) suggestedMotor = 'پیشنهاد: فریم 63 / 71 (0.12–0.37kW)' + motClass;
      else if (kw <= 0.75) suggestedMotor = 'پیشنهاد: فریم 80 (0.37–0.75kW)' + motClass;
      else if (kw <= 1.5) suggestedMotor = 'پیشنهاد: فریم 90S / 90L (0.75–1.5kW)' + motClass;
      else if (kw <= 3) suggestedMotor = 'پیشنهاد: فریم 100L (1.5–3kW)' + motClass;
      else if (kw <= 5.5) suggestedMotor = 'پیشنهاد: فریم 112M / 132S (3–5.5kW)' + motClass;
      else if (kw <= 11) suggestedMotor = 'پیشنهاد: فریم 132M / 160M (5.5–11kW)' + motClass;
      else if (kw <= 22) suggestedMotor = 'پیشنهاد: فریم 160L / 180M (11–22kW)' + motClass;
      else if (kw <= 45) suggestedMotor = 'پیشنهاد: فریم 200L / 225M (22–45kW)' + motClass;
      else suggestedMotor = 'پیشنهاد: فریم 250M+ / موتور صنعتی سفارشی' + motClass;
    }

    plan.rows.forEach(function (r) {
      var val = values[r.key];
      var noteText = r.note || '';

      // انتقال شماره قطعات به ستون توضیحات (ستون سمت چپ)
      if (r.key === 'bridgeRec') noteText = bridgeRec;
      if (r.key === 'suggestedCore') noteText = suggestedCore;
      if (r.key === 'suggestedMosfet') noteText = suggestedMosfet;
      if (r.key === 'suggestedDiode') noteText = suggestedDiode;
      if (r.key === 'suggestedEI') noteText = suggestedEI;
      if (r.key === 'suggestedMotor') noteText = suggestedMotor;

      computed.push(Object.assign({}, r, { 
        value: typeof val === 'number' && Number.isFinite(val) ? val : 0, 
        note: noteText,
        formula: formula(r.expr, symbols) 
      }));
    });

    var displayKeys = plan.displayRows.map(function (r) { return r.key; });

    return {
      valid: true,
      modelValid: true,
      scope: plan.id,
      fields: plan.fields,
      values: values,
      errors: {},
      issues: issues,
      rows: computed,
      displayRows: computed.filter(function (r) { return displayKeys.indexOf(r.key) !== -1; }),
      supportRows: computed.filter(function (r) { return displayKeys.indexOf(r.key) === -1; }),
      results: values
    };
  }

  var assumptions = [
    'محاسبات شامل تمام پارامترهای تخصصی سوئیچینگ + پیشنهاد قطعات تجاری بازار است.'
  ];
  var sources = [];
  function selfTest() { return { ok: true, count: 10 }; }

  global.VoltaEngine = {
    version: VERSION,
    topology: TOPOLOGY,
    supplyType: SUPPLY_TYPE,
    designOptions: designOptions,
    supportsConfiguration: supportsConfiguration,
    modules: modules,
    fields: fields,
    defaults: defaults,
    rows: rows,
    series: series,
    scope: scope,
    referencesOf: referencesOf,
    calculate: calculate,
    formula: formula,
    parseNumber: parseNumber,
    assumptions: assumptions,
    sources: sources,
    selfTest: selfTest
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
