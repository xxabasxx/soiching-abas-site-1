import JSZip from 'jszip';
import arabicFontData from '@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?inline';
import latinFontData from '@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2?inline';
import fontLicense from '@fontsource-variable/vazirmatn/LICENSE?raw';
import monoFontData from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline';
import monoFontLicense from '@fontsource-variable/jetbrains-mono/LICENSE?raw';
import heroData from '../../public/images/volta-copper-hero.jpg?inline';
import template from '../../public/offline.html?raw';
import favicon from '../../public/favicon.svg?raw';
import inputHtml from '../../public/calculations/input.html?raw';
import transformerHtml from '../../public/calculations/transformer.html?raw';
import switchingHtml from '../../public/calculations/switching.html?raw';
import outputHtml from '../../public/calculations/output.html?raw';
import calculatorCss from '../../public/calculations/calculator.css?raw';
import calculatorEngine from '../../public/calculations/engine.js?raw';
import calculatorWorkbook from '../../public/calculations/workbook.js?raw';
import calculatorUi from '../../public/calculations/calculator.js?raw';
import calculationsReadme from '../../public/calculations/README.txt?raw';
import languageSource from '../../public/i18n.js?raw';
import languageDomSource from '../../public/i18n-dom.js?raw';
import { DEFAULT_MODULES } from '../types';
import { getCalculatorRuntime } from './calculationRuntime';

export const OFFLINE_FILENAME = 'abas-soft-offline.zip';

const REQUIRED_MOTION_MARKERS = [
  'content="standalone-v2"',
  'name="volta-offline-motion" content="native-v1"',
  'id="volta-motion-styles"',
  '<script id="volta-offline-motion">',
  'id="motion-preference"',
  'id="motion-replay"',
];

export interface OfflinePackage {
  archive: Blob;
  fileCount: number;
}

const textAssets: Record<string, string> = {
  'i18n.js': languageSource,
  'i18n-dom.js': languageDomSource,
  'favicon.svg': favicon,
  'calculations/input.html': inputHtml,
  'calculations/transformer.html': transformerHtml,
  'calculations/switching.html': switchingHtml,
  'calculations/output.html': outputHtml,
  'calculations/calculator.css': calculatorCss,
  'calculations/engine.js': calculatorEngine,
  'calculations/workbook.js': calculatorWorkbook,
  'calculations/calculator.js': calculatorUi,
  'calculations/README.txt': calculationsReadme,
  'fonts/LICENSE.txt': fontLicense,
  'fonts/JETBRAINS-MONO-LICENSE.txt': monoFontLicense,
};

function decodeAsset(dataUrl: string): Uint8Array<ArrayBuffer> {
  const separator = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || separator === -1 || !dataUrl.slice(0, separator).endsWith(';base64')) {
    throw new Error('An offline asset was not embedded during the build.');
  }
  const binary = atob(dataUrl.slice(separator + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function createStandaloneHtml() {
  if (REQUIRED_MOTION_MARKERS.some((marker) => !template.includes(marker)) || !template.includes('<!-- OFFLINE_FONT_STYLES -->')) {
    throw new Error('The standalone template or its local animations are missing.');
  }
  const inlineLanguages = template
    .replace('<script src="./i18n.js"></script>', () => '<script>' + languageSource.replace(/<\/script/gi, '<\\/script') + '</script>')
    .replace('<script src="./i18n-dom.js"></script>', () => '<script>' + languageDomSource.replace(/<\/script/gi, '<\\/script') + '</script>');
  if (/<script\b[^>]*\bsrc\s*=/i.test(inlineLanguages) || inlineLanguages.includes('type="module"')) {
    throw new Error('Offline animations must be embedded, not loaded from a script URL.');
  }
  const fonts = `<style>
@font-face{font-family:'Vazirmatn Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url('${arabicFontData}') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+0870-089F,U+08A0-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:'Vazirmatn Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url('${latinFontData}') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
</style>`;
  return inlineLanguages
    .replace('<!-- OFFLINE_FONT_STYLES -->', fonts)
    .replace('src="./images/volta-copper-hero.jpg"', `src="${heroData}"`)
    .replace('href="./favicon.svg"', `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`);
}

const readme = `ABAS SOFT | نسخه آماده آفلاین و هاست

۱. تمام فایل‌های ZIP را Extract کنید.
۲. فایل index.html داخل پوشه استخراج‌شده را باز کنید.
۳. پوشه calculations باید کنار index.html باقی بماند.

برای آپلود روی هاست، تمام محتویات همین پوشه را در پوشه مقصد آپلود کنید.
این نسخه به Node.js، React، سرور محلی یا نصب برنامه برای نمایش صفحه اصلی نیاز ندارد.
تصویر و فونت صفحه اصلی داخل HTML هم جاسازی شده‌اند.

خوانایی صفحه‌های محاسبات:
چهار صفحه از پس‌زمینه زغالی تیره‌تر، متن روشن ملایم و ردیف‌های بازتر استفاده می‌کنند. متن فارسی با Vazirmatn و فرمول‌های لاتین با JetBrains Mono نمایش داده می‌شوند. این فونت‌ها در HTML ماشین‌حساب‌ها هم جاسازی شده‌اند؛ اینترنت لازم نیست. شروع دستی، سرعت ۰٫۸ ثانیه و اسکرول همراه ردیف بدون تغییر باقی مانده‌اند.

انیمیشن‌ها:
ورود تصویر و عنوان، نمایش مرحله‌ای کارت‌ها با اسکرول و ترسیم مدارها با یک اسکریپت معمولی داخل HTML اجرا می‌شوند. اینترنت، React، CDN یا فایل JavaScript جداگانه لازم نیست. JavaScript مرورگر باید برای این حرکت‌های تکمیلی فعال باشد؛ در صورت غیرفعال بودن آن، محتوای صفحه و لینک‌ها همچنان کار می‌کنند.
در پایین صفحه بخش «انیمیشن‌ها و تنظیمات حرکت» را باز کنید. حالت پیش‌فرض از تنظیم کاهش حرکت دستگاه پیروی می‌کند؛ انتخاب «روشن» درخواست صریح شما برای پخش حرکت‌هاست و گزینه «خاموش» آن‌ها را متوقف می‌کند. «پخش دوباره از ابتدا» صفحه را به بالا برمی‌گرداند و ورودها را دوباره اجرا می‌کند.
انیمیشن کارت‌ها پس از ورود به دید اجرا می‌شود، نه هم‌زمان با بارگذاری صفحه در پایین صفحه. حرکت‌های ورود یک‌بار اجرا می‌شوند؛ برای تکرار از دکمه بازپخش استفاده کنید.
فایل‌های دانلودشده قدیمی خودکار به‌روز نمی‌شوند. بسته جدید را در پوشه جدا Extract کنید تا فایل‌های محاسبات خودتان بازنویسی نشوند.

چهار ماشین‌حساب آماده در این مسیرها قرار دارند:
${DEFAULT_MODULES.map((module) => `${module.title}: ${module.path.replace('./', '')}`).join('\n')}

این بسته از فایل‌های همراه نسخه ساخته‌شده تهیه می‌شود؛ HTMLهایی که بعد از آخرین build فقط روی هاست عوض شده‌اند، در آن نیستند. نسخه دانلودی چهار مسیر ثابت دارد و workspace.json را نمی‌خواند. برای تغییر نام و مسیر کارت‌ها، متن و href آن‌ها را در index.html و offline.html ویرایش کنید.

همه صفحات دو‌زبانه فارسی/انگلیسی و با نام ABAS SOFT هستند. زبان را از بالای صفحه انتخاب کنید؛ جهت نوشتار و گزارش‌ها هماهنگ می‌شوند. فایل‌های i18n.js و i18n-dom.js همراه پوشه محاسبات بمانند. پروژه‌های قدیمی .volta.json هم با فایل جدید .abas.json سازگارند.
همه صفحات مدل مشترک Flyback DCM دارند: ورودی و پل، ترانسفورماتور، کلید و کنترل، فیلتر خروجی. بالای هر صفحه، ورود پروژه JSON، ذخیره پروژه JSON، چاپ، گزارش TXT و Excel با فرمول قرار دارد.
بالای ورودی‌ها، نوع منبع و توپولوژی مشخص است. ترکیب فعلی AC/DC ایزوله / فلای‌بک DCM است؛ انواع دیگر به‌صراحت غیرفعال‌اند و برای آن‌ها محاسبه نامعتبر اجرا نمی‌شود. این دو مشخصه در فایل پروژه و گزارش‌ها نیز ثبت می‌شوند.
شروع فقط با دکمه «محاسبه گام‌به‌گام» است؛ بازکردن صفحه، تغییر ورودی یا بارگذاری پروژه هیچ محاسبه‌ای را خودکار اجرا نمی‌کند. بعد از شروع، ردیف‌های همان بخش با فاصله حدود ۰٫۸ ثانیه نمایش داده می‌شوند و صفحه همراه ردیف فعال به پایین اسکرول می‌شود. کنترل توقف/ادامه، نمایش همه و خاموش‌کردن دنبال‌کردن ردیف در پایین صفحه موجود است.
ردیف‌های آینده کاملاً خالی‌اند. عنوان، شماره، فرمول، نتیجه و واحد فقط در زمان نمایش همان ردیف ظاهر می‌شوند. کادر سبز ردیف جاری را دنبال می‌کند؛ این کادر نشانه تأیید طراحی نیست. روابط کمکی پس از پایان یا «نمایش همه» نمایش داده می‌شوند.
با تغییر ورودی، اجرای قبلی متوقف می‌شود و باید دکمه محاسبه را دوباره بزنید. در حالت کاهش حرکت دستگاه، دنبال‌کردن خودکار به‌صورت پیش‌فرض خاموش است. چاپ و خروجی تنها از نتایج اجرای معتبر قبلی استفاده می‌کنند و هیچ‌گاه خودکار محاسبه نمی‌کنند.
خروجی Excel فایل واقعی XLSX و مخصوص همان بخش است. شش برگه دارد: Inputs، Calculations، Dependencies، Checks، References و Standards. ورودی‌ها و نتایج نامرتبط در آن نیستند؛ فقط روابط کمکی لازم جداگانه حفظ می‌شوند. برای ادامه پروژه در سایت، فایل abas.json را وارد کنید؛ ورود Excel پشتیبانی نمی‌شود.
اسکریپت‌ها و استایل محاسبات داخل همین بسته‌اند؛ JavaScript مرورگر باید فعال باشد. نیازی به اینترنت یا نصب برنامه نیست.
مدل پیش‌طراحی است: تلفات کامل هسته، عایق‌بندی، EMI و پایداری حلقه تأیید نشده‌اند. هشدارها و فرض‌ها را بخوانید؛ این خروجی نقشه آماده اتصال به برق شهر نیست.
اگر می‌خواهید HTML شخصی خودتان را جایگزین یکی از صفحات کنید، از نسخه ماشین‌حساب فعلی پشتیبان بگیرید و وابستگی‌های فایل شخصی را هم کنار آن نگه دارید.

فایل offline.html همان صفحه اصلی است و برای لینک بازگشت ماشین‌حساب‌ها در بسته قرار دارد.
مجوز فونت در fonts/LICENSE.txt است.
`;

async function buildOfflinePackage(): Promise<OfflinePackage> {
  const zip = new JSZip();
  const html = createStandaloneHtml();
  const runtime = getCalculatorRuntime();
  const engineChecks = runtime.engine.selfTest();
  if (!engineChecks.ok || runtime.reports.crc32(new TextEncoder().encode('123456789')) !== 0xcbf43926) {
    throw new Error('The calculation engine or XLSX archive writer did not pass its checks.');
  }
  for (const section of DEFAULT_MODULES) {
    const trial = runtime.engine.calculate(runtime.engine.defaults, section.id);
    const trialWorkbook = runtime.reports.workbook(trial, { name: 'Workbook verification', notes: '' }, section.id);
    const trialZip = await JSZip.loadAsync(await trialWorkbook.arrayBuffer(), { checkCRC32: true });
    const trialSheet = await trialZip.file('xl/worksheets/sheet2.xml')?.async('string');
    const dependencySheet = await trialZip.file('xl/worksheets/sheet3.xml')?.async('string');
    if (!trialSheet || (trialSheet.match(/<f>/g) ?? []).length !== trial.displayRows.length
      || !dependencySheet || (dependencySheet.match(/<f>/g) ?? []).length !== trial.supportRows.length) {
      throw new Error('A section workbook is missing calculation or dependency formulas: ' + section.id);
    }
    for (const path of Object.keys(trialZip.files).filter((entry) => entry.endsWith('.xml') || entry.endsWith('.rels'))) {
      const contents = await trialZip.file(path)!.async('string');
      if (new DOMParser().parseFromString(contents, 'application/xml').querySelector('parsererror')) {
        throw new Error('An Excel XML part failed validation: ' + section.id + '/' + path);
      }
    }
  }
  zip.file('index.html', html);
  zip.file('offline.html', html);
  zip.file('images/volta-copper-hero.jpg', decodeAsset(heroData));
  zip.file('fonts/vazirmatn-arabic.woff2', decodeAsset(arabicFontData));
  zip.file('fonts/vazirmatn-latin.woff2', decodeAsset(latinFontData));
  zip.file('fonts/jetbrains-mono-latin.woff2', decodeAsset(monoFontData));
  zip.file('README-FA.txt', readme);
  zip.file('README-EN.txt', 'ABAS SOFT - Offline edition\n\nExtract the complete ZIP and open index.html. Keep calculations/, i18n.js and i18n-dom.js beside it. Select EN or Persian in the header of any page. The selected language follows links, including on file://.\n\nSupply type and topology are shown above the numeric inputs. The implemented model is isolated AC/DC, Flyback DCM. Other configurations are labelled unsupported and disabled. The supply type and topology are saved in project files and included in reports.\n\nCalculators start only after Calculate is pressed. They show one row about every 0.8 seconds, with pause/resume and automatic following. Future rows contain no labels, formulas, values or tooltips. The full row is populated only on its turn and marked with a soft green frame. This frame shows playback position, not engineering approval. Shared prerequisite results appear when playback completes or Show All is selected.\n\nProject files use .abas.json; legacy .volta.json projects remain compatible. Excel and text reports use the active language; user project names and notes are not translated.\n\nUpload the complete folder to any static host to publish. No Node.js or internet is needed to run the downloaded calculators. Enable JavaScript.\n\nThese are preliminary Flyback DCM worksheets, not validated hardware designs. Read the assumptions and safety notes.\n');
  const calculatorFonts = `<style>@font-face{font-family:'Vazirmatn Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url('${arabicFontData}') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC}@font-face{font-family:'Vazirmatn Variable';font-style:normal;font-weight:100 900;font-display:swap;src:url('${latinFontData}') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}@font-face{font-family:'JetBrains Mono Variable';font-style:normal;font-weight:100 800;font-display:swap;src:url('${monoFontData}') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2191,U+2193,U+2212,U+2215}</style>`;
  Object.entries(textAssets).forEach(([path, contents]) => zip.file(path, path.endsWith('.html') ? contents.replace('<!-- CALCULATOR_FONTS -->', calculatorFonts) : contents));

  // Assets and calculator dependencies are bundled; no network is needed to assemble the package.
  const buffer = await zip.generateAsync({
    type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 },
  });

  // Offer a download only after the archive has passed a CRC check and every required entry exists.
  const verified = await JSZip.loadAsync(buffer, { checkCRC32: true });
  const expectedPaths = [
    'index.html', 'offline.html', 'images/volta-copper-hero.jpg',
    'fonts/vazirmatn-arabic.woff2', 'fonts/vazirmatn-latin.woff2', 'fonts/jetbrains-mono-latin.woff2',
    'README-FA.txt', 'README-EN.txt', ...Object.keys(textAssets),
  ];
  for (const path of expectedPaths) {
    const file = verified.file(path);
    if (!file || (await file.async('uint8array')).byteLength === 0) {
      throw new Error(`The offline archive is missing ${path}.`);
    }
  }
  const restoredHtml = await verified.file('index.html')!.async('string');
  if (restoredHtml !== html
    || DEFAULT_MODULES.some((module) => !restoredHtml.includes(`href="${module.path}"`))
    || REQUIRED_MOTION_MARKERS.some((marker) => !restoredHtml.includes(marker))) {
    throw new Error('The offline homepage or its embedded animations did not pass validation.');
  }
  if (!restoredHtml.includes('data-language="en"') || !restoredHtml.includes('global.AbasI18n') || !verified.file('i18n-dom.js')) {
    throw new Error('The offline package is missing its bilingual interface.');
  }

  return {
    archive: new Blob([buffer], { type: 'application/zip' }),
    fileCount: expectedPaths.length,
  };
}

let preparedPackage: Promise<OfflinePackage> | undefined;

export function prepareOfflinePackage(): Promise<OfflinePackage> {
  if (!preparedPackage) {
    preparedPackage = buildOfflinePackage().catch((error: unknown) => {
      preparedPackage = undefined;
      throw error;
    });
  }
  return preparedPackage;
}