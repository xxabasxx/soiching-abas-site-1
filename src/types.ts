export type ModuleId =
  | 'input' | 'transformer' | 'switching' | 'output'
  | 'ironcore' | 'ironcore-ind'
  | 'motor' | 'motor-ind'
  | 'bldc' | 'bldc-ind';

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
  { id: 'input', title: 'ورودی و یکسوساز', english: 'INPUT & RECTIFIER', description: 'محاسبات ولتاژ ورودی، پل دیود و انتخاب خازن بالک.', path: './calculations/input.html' },
  { id: 'transformer', title: 'طراحی ترانسفورماتور', english: 'TRANSFORMER DESIGN', description: 'طراحی هسته، تعداد دور و سیم‌پیچ ترانس سوئیچینگ.', path: './calculations/transformer.html' },
  { id: 'switching', title: 'سوئیچینگ و کنترل', english: 'SWITCHING & CONTROL', description: 'انتخاب کلید قدرت، فرکانس سوئیچینگ و مدار کنترل.', path: './calculations/switching.html' },
  { id: 'output', title: 'فیلتر و خروجی', english: 'OUTPUT & FILTER', description: 'محاسبات سلف، خازن و ریپل؛ برای یک خروجی پایدار.', path: './calculations/output.html' },
];

/* ترانس هسته آهن */
export const IRON_MODULE: CalculationModule = {
  id: 'ironcore',
  title: 'ترانس هسته آهن — عمومی',
  titleEn: 'Iron Core — General',
  english: 'IRON CORE / GENERAL',
  description: 'طراحی ترانسفورماتور فرکانس شبکه با هسته آهن EI برای استفاده عمومی.',
  descriptionEn: 'Mains frequency EI iron core transformer for general-purpose use.',
  path: './calculations/ironcore.html',
};

export const IRON_IND_MODULE: CalculationModule = {
  id: 'ironcore-ind',
  title: 'ترانس هسته آهن — صنعتی',
  titleEn: 'Iron Core — Industrial',
  english: 'IRON CORE / INDUSTRIAL',
  description: 'طراحی ترانسفورماتور صنعتی با ورق سیلیکون Hi-B و ضریب ایمنی بالا.',
  descriptionEn: 'Industrial-grade iron core transformer with Hi-B silicon steel.',
  path: './calculations/ironcore-ind.html',
};

/* الکتروموتور */
export const MOTOR_MODULE: CalculationModule = {
  id: 'motor',
  title: 'الکتروموتور — عمومی',
  titleEn: 'Motor — General',
  english: 'MOTOR / GENERAL',
  description: 'محاسبات موتور القایی عمومی؛ سرعت، گشتاور، جریان و پیشنهاد فریم.',
  descriptionEn: 'General-purpose induction motor: speed, torque, current and frame suggestion.',
  path: './calculations/motor.html',
};

export const MOTOR_IND_MODULE: CalculationModule = {
  id: 'motor-ind',
  title: 'الکتروموتور — صنعتی',
  titleEn: 'Motor — Industrial',
  english: 'MOTOR / INDUSTRIAL',
  description: 'موتور القایی صنعتی IE3/IE4 با ضریب ایمنی و استاندارد IEC 60034.',
  descriptionEn: 'Industrial IE3/IE4 motor with IEC 60034 safety factors.',
  path: './calculations/motor-ind.html',
};

/* موتور براشلس */
export const BLDC_MODULE: CalculationModule = {
  id: 'bldc',
  title: 'موتور براشلس — عمومی',
  titleEn: 'BLDC Motor — General',
  english: 'BLDC / GENERAL · BETA',
  description: 'محاسبات موتور براشلس (BLDC/PMSM) برای پهپاد، ابزار و کاربردهای عمومی.',
  descriptionEn: 'BLDC/PMSM motor calculations for drones, tools and general use.',
  path: './calculations/bldc.html',
};

export const BLDC_IND_MODULE: CalculationModule = {
  id: 'bldc-ind',
  title: 'موتور براشلس — صنعتی',
  titleEn: 'BLDC Motor — Industrial',
  english: 'BLDC / INDUSTRIAL · BETA',
  description: 'موتور براشلس صنعتی (سروو/CNC) با محاسبات دقیق Kv، Kt، تلفات و ESC.',
  descriptionEn: 'Industrial BLDC/servo motor with Kv, Kt, losses and ESC calculations.',
  path: './calculations/bldc-ind.html',
};

export const HERO_URL = './images/volta-copper-hero.jpg';
