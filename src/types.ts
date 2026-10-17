export type ModuleId = 'input' | 'transformer' | 'switching' | 'output' | 'ironcore' | 'motor';

export interface CalculationModule {
  id: ModuleId;
  title: string;
  titleEn?: string;
  english: string;
  description: string;
  descriptionEn?: string;
  path: string;
}

export const DEFAULT_MODULES: CalculationModule[] = [
  {
    id: 'input',
    title: 'ورودی و یکسوساز',
    english: 'INPUT & RECTIFIER',
    description: 'محاسبات ولتاژ ورودی، پل دیود و انتخاب خازن بالک.',
    path: './calculations/input.html',
  },
  {
    id: 'transformer',
    title: 'طراحی ترانسفورماتور',
    english: 'TRANSFORMER DESIGN',
    description: 'طراحی هسته، تعداد دور و سیم‌پیچ ترانس سوئیچینگ.',
    path: './calculations/transformer.html',
  },
  {
    id: 'switching',
    title: 'سوئیچینگ و کنترل',
    english: 'SWITCHING & CONTROL',
    description: 'انتخاب کلید قدرت، فرکانس سوئیچینگ و مدار کنترل.',
    path: './calculations/switching.html',
  },
  {
    id: 'output',
    title: 'فیلتر و خروجی',
    english: 'OUTPUT & FILTER',
    description: 'محاسبات سلف، خازن و ریپل؛ برای یک خروجی پایدار.',
    path: './calculations/output.html',
  },
];

export const IRON_MODULE: CalculationModule = {
  id: 'ironcore',
  title: 'محاسبات هسته آهن',
  titleEn: 'Iron Core Calculations',
  english: 'IRON CORE DESIGN',
  description: 'طراحی ترانسفورماتور فرکانس شبکه (۵۰/۶۰Hz) با هسته آهن.',
  descriptionEn: 'Mains frequency iron core transformer design.',
  path: './calculations/ironcore.html',
};

export const MOTOR_MODULE: CalculationModule = {
  id: 'motor',
  title: 'محاسبات الکتروموتور',
  titleEn: 'Electric Motor Calculations',
  english: 'MOTOR DESIGN',
  description: 'محاسبات تخصصی استاتور، روتور و گشتاور موتورهای الکتریکی.',
  descriptionEn: 'Stator, rotor and torque calculations for electric motors.',
  path: './calculations/motor.html',
};

export const HERO_URL = './images/volta-copper-hero.jpg';