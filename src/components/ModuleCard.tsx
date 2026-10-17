import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpLeft } from 'lucide-react';
import { Circuit } from './Circuit';
import type { CalculationModule } from '../types';
import { useLanguage } from '../lib/language';

export function ModuleCard({ module, index }: { module: CalculationModule; index: number }) {
  const reducedMotion = useReducedMotion();
  const { t, link } = useLanguage();

  return (
    <motion.a
      className={`calculation-card card-${module.id}`}
      href={link(module.path)}
      aria-labelledby={`module-title-${module.id}`}
      aria-describedby={`module-description-${module.id}`}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: .1 }}
      transition={{ duration: .6, delay: reducedMotion ? 0 : index * .075, ease: [.22, 1, .36, 1] }}
    >
      <div className="card-topline"><span className="card-english" dir="ltr">{module.english}</span><span className="card-number" dir="ltr">0{index + 1}</span></div>
      <div className="card-circuit"><Circuit id={module.id} /></div>
      <h3 id={`module-title-${module.id}`}>{t(module.title, module.titleEn)}</h3>
      <p id={`module-description-${module.id}`}>{t(module.description, module.descriptionEn)}</p>
      <div className="card-bottom"><span>{t('ورود به محاسبات', 'Open calculator')}</span><span className="card-arrow"><ArrowUpLeft size={19} strokeWidth={1.6} /></span></div>
    </motion.a>
  );
}