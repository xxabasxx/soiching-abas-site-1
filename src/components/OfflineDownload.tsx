import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Download, ExternalLink, FolderOpen, LoaderCircle, RotateCcw } from 'lucide-react';
import { Brand } from './Brand';
import { OFFLINE_FILENAME, prepareOfflinePackage, type OfflinePackage } from '../lib/offline';
import { LanguageSwitch, useLanguage } from '../lib/language';

type PackageState =
  | { status: 'working' }
  | { status: 'error'; detail: string }
  | { status: 'ready'; file: OfflinePackage; href: string };

type SaveWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (contents: Blob) => Promise<void>;
      close: () => Promise<void>;
      abort: () => Promise<void>;
    }>;
  }>;
};

function downloadPageAddress() {
  try {
    const url = new URL(window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.searchParams.set('download', '1');
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function OfflineDownload({ standalone = false }: { standalone?: boolean }) {
  const { language, t, link } = useLanguage();
  const [state, setState] = useState<PackageState>({ status: 'working' });
  const [attempt, setAttempt] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [requested, setRequested] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const addressRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(true);
  const address = downloadPageAddress();
  const pageAddress = address ? link(address) : null;
  const isEmbedded = window.top !== window.self;
  const canSaveToFile = window.isSecureContext && !isEmbedded && typeof (window as SaveWindow).showSaveFilePicker === 'function';

  useEffect(() => { setSaveMessage(''); setCopyMessage(''); }, [language]);

  useEffect(() => {
    let active = true;
    let downloadUrl = '';
    activeRef.current = true;
    setState({ status: 'working' });
    setRequested(false);
    prepareOfflinePackage().then((file) => {
      if (!active) return;
      downloadUrl = URL.createObjectURL(file.archive);
      setState({ status: 'ready', file, href: downloadUrl });
    }).catch((error: unknown) => {
      if (active) setState({ status: 'error', detail: error instanceof Error ? error.message : 'Package preparation failed.' });
    });
    return () => {
      active = false;
      activeRef.current = false;
      // Keep the URL alive while this view is open, and give an in-progress save time to finish.
      if (downloadUrl) window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
    };
  }, [attempt]);

  const saveToFile = async () => {
    const picker = (window as SaveWindow).showSaveFilePicker;
    if (!picker || state.status !== 'ready' || saving) return;
    setSaving(true);
    setSaveMessage('');
    try {
      // The picker is opened directly from the user's click, before any asynchronous work.
      const handle = await picker.call(window, {
        suggestedName: OFFLINE_FILENAME,
        types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
      });
      const stream = await handle.createWritable();
      try {
        await stream.write(state.file.archive);
        await stream.close();
      } catch (error) {
        await stream.abort().catch(() => undefined);
        throw error;
      }
      if (activeRef.current) setSaveMessage(t('فایل در محلی که انتخاب کردید ذخیره شد.', 'File saved to the selected location.'));
    } catch (error) {
      if (!activeRef.current) return;
      setSaveMessage(error instanceof DOMException && error.name === 'AbortError'
        ? t('ذخیره‌سازی لغو شد. می‌توانید دوباره محل ذخیره را انتخاب کنید.', 'Saving was cancelled. You can choose a location again.')
        : t('مرورگر اجازه ذخیره مستقیم نداد. از لینک دانلود ZIP استفاده کنید.', 'Direct saving was blocked. Please use the ZIP download link.'));
    } finally {
      if (activeRef.current) setSaving(false);
    }
  };

  const copyAddress = async () => {
    if (!pageAddress) return;
    try {
      await navigator.clipboard.writeText(pageAddress);
      setCopyMessage(t('آدرس کپی شد؛ آن را در نوار آدرس یک تب جدید مرورگر بچسبانید.', 'Link copied. Paste it into the address bar of a new browser tab.'));
    } catch {
      addressRef.current?.focus();
      addressRef.current?.select();
      setCopyMessage(t('آدرس انتخاب شد؛ آن را کپی کنید و در نوار آدرس یک تب جدید بچسبانید.', 'Link selected. Copy it and paste it into a new browser tab.'));
    }
  };

  return <div className="offline-download-panel">
    <p className="download-intro">{t('چهار برگه دو‌زبانه، محاسبات گام‌به‌گام و Excel هر بخش، همراه صفحه اصلی و فونت؛ همگی در یک فایل ZIP و بدون نیاز به اینترنت.', 'Four bilingual worksheets, step-by-step results and section-specific Excel, together with the homepage and fonts. One ZIP, no internet required.')}</p>

    <div className="download-package" aria-busy={state.status === 'working'}>
      <div className="download-package-heading"><span className="download-package-icon"><FolderOpen size={25} strokeWidth={1.5} /></span><div><strong dir="ltr">{OFFLINE_FILENAME}</strong><p aria-live="polite">{state.status === 'working' ? t('در حال آماده‌سازی و بررسی فایل‌ها...', 'Preparing and checking files...') : state.status === 'ready' ? `${new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fa-IR').format(Math.ceil(state.file.archive.size / 1024))} ${t('کیلوبایت', 'KB')} / ${new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fa-IR').format(state.file.fileCount)} ${t('فایل', 'files')}` : t('بسته آماده نشد', 'Package preparation failed')}</p></div>{state.status === 'ready' && <CheckCircle2 size={19} className="package-ready-icon" aria-label={t('بسته آماده است', 'Package ready')} />}</div>
      {state.status === 'ready'
        ? <a className="primary-button direct-download-button" href={state.href} download={OFFLINE_FILENAME} onClick={() => setRequested(true)}><Download size={18} />{t('دانلود فایل ZIP', 'Download ZIP')}<span dir="ltr">.zip</span></a>
        : <button className="primary-button direct-download-button" disabled={state.status === 'working'} onClick={() => setAttempt((value) => value + 1)}>{state.status === 'working' ? <LoaderCircle size={18} className="download-spinner" /> : <RotateCcw size={17} />}{state.status === 'working' ? t('چند لحظه صبر کنید...', 'Please wait...') : t('تلاش دوباره برای ساخت بسته', 'Try preparing again')}</button>}
      {state.status === 'ready' && canSaveToFile && <button className="save-location-button" onClick={() => void saveToFile()} disabled={saving}>{saving ? <LoaderCircle size={15} className="download-spinner" /> : <FolderOpen size={15} />}{saving ? t('در حال ذخیره...', 'Saving...') : t('یا انتخاب محل ذخیره روی دستگاه', 'Or choose a save location')}</button>}
      {saveMessage && <p className="download-feedback" role="status">{saveMessage}</p>}
      {requested && !saveMessage && <p className="download-feedback" role="status">{t('درخواست دانلود به مرورگر ارسال شد. اگر فایلی دریافت نشد، راه جایگزین پایین را استفاده کنید؛ ذخیره فایل از داخل صفحه قابل تأیید نیست.', 'The download was requested. If no file appears, use the alternative below. This page cannot confirm that the browser saved the file.')}</p>}
      {state.status === 'error' && <div className="download-feedback download-error" role="alert"><div><p>{t('ساخت بسته کامل نشد. دوباره تلاش کنید یا صفحه دانلود را در تب جدا باز کنید.', 'Package preparation failed. Try again or open the download page in a separate tab.')}</p><details className="download-error-details"><summary>{t('جزئیات خطا', 'Error details')}</summary><code dir="ltr">{state.detail}</code></details></div></div>}
    </div>

    <ol className="offline-quick-steps"><li>{t('فایل ZIP را کامل Extract کنید.', 'Extract the entire ZIP archive.')}</li><li>{t('داخل پوشه استخراج‌شده، فایل زیر را باز کنید:', 'Inside the extracted folder, open:')} <code>index.html</code></li><li>{t('بخش را انتخاب و مشخصات را وارد کنید؛ سپس دکمه محاسبه را بزنید.', 'Choose a section, enter your specifications and press Calculate.')}</li></ol>
    <p className="download-footnote">{t('زبان را بالای هر صفحه انتخاب کنید. بسته را در پوشه‌ای تازه باز کنید تا فایل‌های قبلی بازنویسی نشوند.', 'Choose your language at the top of any page. Extract into a new folder to avoid overwriting previous files.')}</p>

    {pageAddress && (!standalone || isEmbedded || requested || state.status === 'error') && <div className="download-alternative"><h3>{t('دانلود شروع نشد؟', 'Download did not start?')}</h3><p>{t('این صفحه را خارج از پیش‌نمایش باز کنید و دوباره دانلود کنید.', 'Open this page outside the preview and try again.')}</p><a href={pageAddress} target="_blank" rel="noopener noreferrer" className="offline-preview-link">{t('باز کردن صفحه دانلود در تب جدا', 'Open download page in a new tab')}<ExternalLink size={14} /></a><details className="copy-download-address"><summary>{t('اگر تب جدید هم باز نشد', 'If the new tab is blocked')}</summary><p>{t('آدرس را کپی و در نوار آدرس مرورگر باز کنید.', 'Copy the address and open it directly in your browser.')}</p><div className="download-address-field"><input ref={addressRef} value={pageAddress} readOnly dir="ltr" aria-label={t('آدرس صفحه دانلود', 'Download page address')} onFocus={(event) => event.currentTarget.select()} /><button className="icon-button" onClick={() => void copyAddress()} aria-label={t('کپی آدرس', 'Copy address')}><Copy size={15} /></button></div>{copyMessage && <p role="status">{copyMessage}</p>}</details></div>}

    <p className="download-footnote">{t('JavaScript مرورگر فعال باشد. محاسبات برای پیش‌طراحی Flyback DCM هستند؛ ایمنی، حرارت و پایداری حلقه به تأیید مستقل نیاز دارند.', 'Enable JavaScript in your browser. These are preliminary Flyback DCM calculations. Safety, thermal behavior and loop stability require independent validation.')}</p>
  </div>;
}

export function OfflineDownloadPage() {
  const { language, t } = useLanguage();
  const home = new URL(window.location.href);
  home.searchParams.delete('download');
  home.hash = '';
  return <div className="download-page" dir={language === 'en' ? 'ltr' : 'rtl'}><header className="download-page-header"><a href={home.href} aria-label="ABAS SOFT"><Brand /></a><LanguageSwitch /><a href={home.href} className="offline-preview-link">{t('بازگشت به سایت', 'Back to the site')}<ArrowRight size={16} /></a></header><main className="download-page-main"><p className="section-eyebrow">{t('نسخه مستقل ABAS SOFT', 'ABAS SOFT OFFLINE')}</p><h1>{t('فایل سایت، آماده برای شما', 'Your workspace, ready to go')}<span>.</span></h1><p className="download-page-subtitle">{t('یک بار دریافت کنید؛ آفلاین اجرا کنید یا روی هاست قرار دهید.', 'Download once. Use offline or upload to your host.')}</p><OfflineDownload standalone /></main></div>;
}