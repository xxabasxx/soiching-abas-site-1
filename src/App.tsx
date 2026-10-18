import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDownLeft, ArrowLeft, ArrowUp, ArrowUpLeft, BookOpen, Menu, X } from 'lucide-react';
import { Brand } from './components/Brand';
import { ModuleCard } from './components/ModuleCard';
import { GuideDialog } from './components/GuideDialog';
import { loadModules } from './lib/modules';
import { cacheCalculatorFonts } from './lib/calculationRuntime';
import {
  DEFAULT_MODULES, HERO_URL,
  IRON_MODULE, IRON_IND_MODULE,
  MOTOR_MODULE, MOTOR_IND_MODULE,
  BLDC_MODULE, BLDC_IND_MODULE,
} from './types';
import { LanguageProvider, LanguageSwitch, useLanguage } from './lib/language';

type Section = 'home' | 'calculations' | 'about';

export default function App() {
  return (
    <LanguageProvider>
      <AbasSite />
    </LanguageProvider>
  );
}

/* ─── خط جداکننده ─── */
function Separator() {
  return (
    <div className="beautiful-separator" aria-hidden="true"><span /></div>
  );
}

/* ─── عنوان بخش ─── */
function SectionTitle({ fa, en, id }: { fa: string; en: string; id?: string }) {
  const { t } = useLanguage();
  return (
    <div className="section-heading extra-section-heading">
      <div><h2 id={id}>{t(fa, en)}<span>.</span></h2></div>
    </div>
  );
}

/* ─── گرید دو‌کارتی با انیمیشن ─── */
function TwoCardGrid({ m1, i1, m2, i2 }: { m1: typeof IRON_MODULE; i1: number; m2: typeof IRON_MODULE; i2: number }) {
  return (
    <div className="calculations-grid two-card-grid">
      <ModuleCard module={m1} index={i1} />
      <ModuleCard module={m2} index={i2} />
    </div>
  );
}

function AbasSite() {
  const { language, t } = useLanguage();
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<'help' | 'setup' | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cacheCalculatorFonts();
    const controller = new AbortController();
    loadModules(controller.signal).then((items) => {
      if (!controller.signal.aborted) setModules(items);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id as Section);
      });
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
    document.querySelectorAll('[data-page-section]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const openGuide = (mode: 'help' | 'setup') => { setMenuOpen(false); setDialog(mode); };
  const startCalculations = () => {
    setDialog(null);
    window.setTimeout(() => document.getElementById('calculations')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }), 250);
  };

  return (
    <>
      <div className="site-shell" dir={language === 'en' ? 'ltr' : 'rtl'} inert={dialog ? true : undefined}>
        <a href="#calculations" className="skip-link">{t('رفتن به محاسبات', 'Skip to calculators')}</a>
        <header ref={headerRef} className="site-header">
          <div className="site-container header-inner">
            <a href="#home" className="brand-home" aria-label={t('صفحه اصلی ABAS SOFT', 'ABAS SOFT home')} onClick={() => setMenuOpen(false)}><Brand /></a>
            <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} id="main-navigation" aria-label={t('فهرست اصلی', 'Main navigation')}>
              {([{ id: 'home', label: t('خانه', 'Home') }, { id: 'calculations', label: t('محاسبات تخصصی', 'Calculators') }, { id: 'about', label: t('درباره ABAS SOFT', 'About') }] as const).map((item) =>
                <a key={item.id} href={`#${item.id}`} className={activeSection === item.id ? 'is-active' : ''} aria-current={activeSection === item.id ? 'location' : undefined} onClick={() => { setActiveSection(item.id); setMenuOpen(false); }}>{item.label}</a>
              )}
              <button className="mobile-guide-link" onClick={() => openGuide('help')}>{t('راهنمای استفاده', 'User guide')}<BookOpen size={16} /></button>
            </nav>
            <div className="header-actions">
              <LanguageSwitch />
              <button className="header-guide" onClick={() => openGuide('help')}><BookOpen size={16} strokeWidth={1.5} /><span>{t('راهنمای استفاده', 'User guide')}</span><ArrowUpLeft size={15} /></button>
              <button ref={menuButtonRef} className="icon-button menu-toggle" aria-label={menuOpen ? t('بستن فهرست', 'Close menu') : t('باز کردن فهرست', 'Open menu')} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </header>

        <main>
          {/* ─── هیرو ─── */}
          <section className="hero" id="home" data-page-section aria-labelledby="hero-title">
            <motion.div className="hero-image" initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.035 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: [.2, 1, .3, 1] }}>
              <img src={HERO_URL} alt={t('ترانسفورماتور قدرت با سیم‌پیچ مسی', 'Copper-wound power transformer')} fetchPriority="high" />
            </motion.div>
            <div className="hero-shading" aria-hidden="true" />
            <div className="site-container hero-inner">
              <motion.div className="hero-copy" initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, delay: .15, ease: [.22, 1, .36, 1] }}>
                <p className="hero-eyebrow"><span />{t('آزمایشگاه طراحی منابع تغذیه', 'POWER SUPPLY DESIGN LAB')}</p>
                <h1 id="hero-title">
                  <span className="hero-wordmark" dir="ltr">ABAS SOFT<span>.</span></span>
                  <span className="hero-headline">{t('قدرت، از ', 'Power starts with ')}<em>{t('دقت', 'precision')}</em>{t(' شروع می‌شود.', '.')}</span>
                </h1>
                <p className="hero-description">{t('مسیر حرفه‌ای طراحی منابع تغذیه سوئیچینگ؛', 'A focused workspace for switching power supply design.')}<br />{t('از اولین محاسبه تا آخرین جزئیات مدار.', 'From your first calculation to the final circuit detail.')}</p>
                <div className="hero-actions">
                  <a className="primary-button" href="#calculations">{t('شروع محاسبات', 'Start calculating')}<ArrowLeft size={19} strokeWidth={1.6} /></a>
                  <a className="hero-secondary" href="#about">{t('آشنایی با ABAS SOFT', 'Discover ABAS SOFT')}<ArrowDownLeft size={17} /></a>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ─── بخش محاسبات ─── */}
          <section className="calculations-section" id="calculations" data-page-section aria-labelledby="calculations-title">
            <div className="site-container">

              {/* ۱. چهار کارت سوئیچینگ */}
              <div className="section-heading">
                <div>
                  <div className="section-eyebrow"><span />{t('از ورودی تا خروجی', 'FROM INPUT TO OUTPUT')}</div>
                  <h2 id="calculations-title">{t('منابع تغذیه سوئیچینگ', 'Switching Power Supplies')}<span>.</span></h2>
                </div>
                <p>{t('بخش موردنظر را انتخاب کنید؛', 'Choose a design stage.')}<br />{t('مستقیم وارد صفحه محاسبات شوید.', 'Go straight to its worksheet.')}</p>
              </div>
              <div className="calculations-grid">
                {modules.map((module, index) => <ModuleCard key={module.id} module={module} index={index} />)}
              </div>

              {/* ۲. ترانس هسته آهن */}
              <Separator />
              <SectionTitle fa="محاسبات ترانس هسته آهن" en="Iron Core Transformer" id="ironcore-title" />
              <TwoCardGrid m1={IRON_MODULE} i1={4} m2={IRON_IND_MODULE} i2={5} />

              {/* ۳. الکتروموتور */}
              <Separator />
              <SectionTitle fa="محاسبات الکتروموتور" en="Electric Motor" id="motor-title" />
              <TwoCardGrid m1={MOTOR_MODULE} i1={6} m2={MOTOR_IND_MODULE} i2={7} />

              {/* ۴. موتور براشلس */}
              <Separator />
              <SectionTitle fa="محاسبات موتور براشلس" en="Brushless Motor (BLDC)" id="bldc-title" />
              <TwoCardGrid m1={BLDC_MODULE} i1={8} m2={BLDC_IND_MODULE} i2={9} />

            </div>
          </section>

          {/* ─── درباره ─── */}
          <section className="about-section" id="about" data-page-section aria-labelledby="about-title">
            <motion.div className="site-container about-inner" initial={{ opacity: 0, y: reducedMotion ? 0 : 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .65 }}>
              <div className="about-heading">
                <span className="section-eyebrow" dir="ltr">BUILT FOR PRECISE MINDS</span>
                <h2 id="about-title">{t('تمرکز روی طراحی.', 'Focus on the design.')}<br /><span>{t('بقیه‌اش ساده است.', 'Keep everything else simple.')}</span></h2>
              </div>
              <div className="about-copy">
                <p>{t('ABAS SOFT، نقطه شروع طراحی منبع تغذیه شماست. چهار مسیر مستقل برای دسترسی به محاسبات تخصصی، تا بین شما و ایده بعدی‌تان، چیزی جز یک کلیک نباشد.', 'ABAS SOFT is your starting point for power supply design. Four focused worksheets put the next step of your design just one click away.')}</p>
                <div style={{ margin: '25px 0', fontSize: '14px', lineHeight: '1.8' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ color: '#eeeaf3', fontWeight: 'bold' }}>{t('✉️ تماس و پشتیبانی رسمی: ', '✉️ Official Contact & Support: ')}</span>
                    <button onClick={(e) => { navigator.clipboard.writeText('xxabasxxsoft@gmail.com'); const target = e.currentTarget; const originalText = target.innerText; target.innerText = t(' (کپی شد!) ', ' (Copied!) '); setTimeout(() => target.innerText = originalText, 2000); }} style={{ color: 'var(--copper, #d8a77f)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }} dir="ltr" title={t('برای کپی کلیک کنید', 'Click to copy')}>xxabasxxsoft@gmail.com</button>
                  </div>
                  <div>
                    <span style={{ color: '#eeeaf3', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>{t('☕ حمایت از پروژه (USDT - TRC20):', '☕ Support Project (USDT - TRC20):')}</span>
                    <button onClick={(e) => { navigator.clipboard.writeText('TABCDEF123456789YourWalletAddress'); const target = e.currentTarget; const originalText = target.innerText; target.innerText = t('آدرس تتر کپی شد!', 'Address Copied!'); target.style.color = '#34d399'; setTimeout(() => { target.innerText = originalText; target.style.color = 'var(--copper, #d8a77f)'; }, 2000); }} style={{ color: 'var(--copper, #d8a77f)', fontWeight: 'bold', background: 'rgba(0,0,0,0.2)', border: '1px dashed #d8a77f', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }} dir="ltr" title={t('برای کپی کردن آدرس کلیک کنید', 'Click to copy address')}>TABCDEF123456789YourWalletAddress</button>
                  </div>
                </div>
                <a href="#calculations">{t('مسیر طراحی‌تان را انتخاب کنید', 'Choose your design stage')}<ArrowUpLeft size={18} /></a>
              </div>
              <svg className="about-wave" viewBox="0 0 220 64" fill="none" aria-hidden="true"><path d="M0 32h35l14-19 19 41L90 4l25 55 19-43 18 32 12-16h56" stroke="currentColor" strokeWidth="1.4" /></svg>
            </motion.div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="site-container footer-inner">
            <a href="#home" aria-label={t('بازگشت به ابتدای سایت', 'Back to top')}><Brand compact /></a>
            <p>{t('برای مهندسانی که به جزئیات اهمیت می‌دهند.', 'For engineers who care about the details.')}<span dir="ltr">ABAS SOFT / ENGINEERED FOR PRECISION</span></p>
            <div className="footer-actions">
              <button onClick={() => openGuide('setup')}>{t('راهنمای پروژه و گزارش', 'Projects & reports')}<ArrowUpLeft size={14} /></button>
              <a className="back-to-top" href="#home" aria-label={t('بازگشت به بالای صفحه', 'Back to top')}><ArrowUp size={17} /></a>
            </div>
          </div>
        </footer>
      </div>
      <AnimatePresence>{dialog && <GuideDialog key={dialog} mode={dialog} onClose={() => setDialog(null)} onStart={startCalculations} />}</AnimatePresence>
    </>
  );
}
