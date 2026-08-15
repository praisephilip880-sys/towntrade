/**
 * World currencies — dependency-free, safe for server + client + Edge.
 *
 * Listing prices are stored in USD cents (the platform's base currency) so
 * Stripe/escrow math stays exact. This module converts cents into any of the
 * ~180 ISO 4217 currencies for DISPLAY ONLY, using built-in approximate rates
 * (units per 1 USD). Override any rate with the EXCHANGE_RATES_JSON env var.
 */

/** Approximate units per 1 USD (display only). Fallback for unlisted codes is 1. */
const BASE_RATES = {
  AED: 3.67, AFN: 71.5, ALL: 92.5, AMD: 390, ANG: 1.79, AOA: 915, ARS: 1050,
  AUD: 1.53, AWG: 1.79, AZN: 1.7, BAM: 1.79, BBD: 2.0, BDT: 120, BGN: 1.79,
  BHD: 0.376, BIF: 2900, BMD: 1.0, BND: 1.31, BOB: 6.91, BRL: 5.7, BSD: 1.0,
  BTN: 84.5, BWP: 13.6, BYN: 3.25, BZD: 2.0, CAD: 1.37, CDF: 2850, CHF: 0.85,
  CLP: 950, CNY: 7.12, COP: 4200, CRC: 512, CUC: 1.0, CUP: 24.0, CVE: 100.9,
  CZK: 23.2, DJF: 178, DKK: 6.83, DOP: 60.5, DZD: 134, EGP: 48.5, ERN: 15.0,
  ETB: 128, EUR: 0.92, FJD: 2.24, FKP: 0.79, GBP: 0.79, GEL: 2.74, GHS: 15.4,
  GIP: 0.79, GMD: 70, GNF: 8650, GTQ: 7.7, GYD: 209, HKD: 7.79, HNL: 25.3,
  HRK: 6.83, HTG: 131, HUF: 358, IDR: 16000, ILS: 3.68, INR: 84.5, IQD: 1310,
  IRR: 42000, ISK: 138, JMD: 157, JOD: 0.709, JPY: 149, KES: 129, KGS: 85.5,
  KHR: 4060, KMF: 453, KPW: 900, KRW: 1350, KWD: 0.307, KYD: 0.833, KZT: 490,
  LAK: 21800, LBP: 89500, LKR: 290, LRD: 193, LSL: 17.9, LYD: 4.85, MAD: 9.98,
  MDL: 17.9, MGA: 4600, MKD: 56.3, MMK: 2100, MNT: 3400, MOP: 8.02, MRU: 39.7,
  MUR: 46.5, MVR: 15.4, MWK: 1735, MXN: 18.7, MYR: 4.42, MZN: 63.9, NAD: 17.9,
  NGN: 1600, NIO: 36.7, NOK: 10.8, NPR: 135.2, NZD: 1.64, OMR: 0.385, PAB: 1.0,
  PEN: 3.75, PGK: 4.0, PHP: 56.5, PKR: 278, PLN: 3.95, PYG: 7800, QAR: 3.64,
  RON: 4.57, RSD: 107.5, RUB: 96, RWF: 1410, SAR: 3.75, SBD: 8.35, SCR: 14.1,
  SDG: 601, SEK: 10.6, SGD: 1.31, SHP: 0.79, SLL: 21000, SOS: 571, SRD: 30.5,
  SSP: 130, STN: 22.4, SVC: 8.75, SYP: 13000, SZL: 17.9, THB: 33.9, TJS: 10.9,
  TMT: 3.5, TND: 3.1, TOP: 2.36, TRY: 34.5, TTD: 6.78, TWD: 32.0, TZS: 2650,
  UAH: 41.2, UGX: 3720, USD: 1.0, UYU: 43.5, UZS: 12800, VES: 40.0, VND: 25400,
  VUV: 120, WST: 2.78, XAF: 603, XCD: 2.7, XOF: 603, XPF: 110, YER: 250,
  ZAR: 17.9, ZMW: 26.5, ZWL: 322,
};

/** Parse optional EXCHANGE_RATES_JSON override: {"NGN":1600,...} */
function envRates() {
  try {
    const raw = process?.env?.EXCHANGE_RATES_JSON;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}
const OVERRIDES = typeof process !== 'undefined' ? envRates() : {};

/** Full ISO 4217 currency list (code -> { name, symbol }). */
export const CURRENCIES = {
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  AFN: { name: 'Afghan Afghani', symbol: '؋' },
  ALL: { name: 'Albanian Lek', symbol: 'L' },
  AMD: { name: 'Armenian Dram', symbol: '֏' },
  ANG: { name: 'Netherlands Antillean Guilder', symbol: 'ƒ' },
  AOA: { name: 'Angolan Kwanza', symbol: 'Kz' },
  ARS: { name: 'Argentine Peso', symbol: '$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  AWG: { name: 'Aruban Florin', symbol: 'ƒ' },
  AZN: { name: 'Azerbaijani Manat', symbol: '₼' },
  BAM: { name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM' },
  BBD: { name: 'Barbadian Dollar', symbol: 'Bds$' },
  BDT: { name: 'Bangladeshi Taka', symbol: '৳' },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв' },
  BHD: { name: 'Bahraini Dinar', symbol: '.د.ب' },
  BIF: { name: 'Burundian Franc', symbol: 'FBu' },
  BMD: { name: 'Bermudian Dollar', symbol: 'BD$' },
  BND: { name: 'Brunei Dollar', symbol: 'B$' },
  BOB: { name: 'Bolivian Boliviano', symbol: 'Bs.' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
  BSD: { name: 'Bahamian Dollar', symbol: 'B$' },
  BTN: { name: 'Bhutanese Ngultrum', symbol: 'Nu.' },
  BWP: { name: 'Botswana Pula', symbol: 'P' },
  BYN: { name: 'Belarusian Ruble', symbol: 'Br' },
  BZD: { name: 'Belize Dollar', symbol: 'BZ$' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  CDF: { name: 'Congolese Franc', symbol: 'FC' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  CLP: { name: 'Chilean Peso', symbol: '$' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  COP: { name: 'Colombian Peso', symbol: '$' },
  CRC: { name: 'Costa Rican Colón', symbol: '₡' },
  CUC: { name: 'Cuban Convertible Peso', symbol: 'CUC$' },
  CUP: { name: 'Cuban Peso', symbol: '$MN' },
  CVE: { name: 'Cape Verdean Escudo', symbol: '$' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč' },
  DJF: { name: 'Djiboutian Franc', symbol: 'Fdj' },
  DKK: { name: 'Danish Krone', symbol: 'kr' },
  DOP: { name: 'Dominican Peso', symbol: 'RD$' },
  DZD: { name: 'Algerian Dinar', symbol: 'د.ج' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£' },
  ERN: { name: 'Eritrean Nakfa', symbol: 'Nfk' },
  ETB: { name: 'Ethiopian Birr', symbol: 'Br' },
  EUR: { name: 'Euro', symbol: '€' },
  FJD: { name: 'Fijian Dollar', symbol: 'FJ$' },
  FKP: { name: 'Falkland Islands Pound', symbol: '£' },
  GBP: { name: 'British Pound', symbol: '£' },
  GEL: { name: 'Georgian Lari', symbol: '₾' },
  GHS: { name: 'Ghanaian Cedi', symbol: 'GH₵' },
  GIP: { name: 'Gibraltar Pound', symbol: '£' },
  GMD: { name: 'Gambian Dalasi', symbol: 'D' },
  GNF: { name: 'Guinean Franc', symbol: 'FG' },
  GTQ: { name: 'Guatemalan Quetzal', symbol: 'Q' },
  GYD: { name: 'Guyanese Dollar', symbol: 'G$' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  HNL: { name: 'Honduran Lempira', symbol: 'L' },
  HRK: { name: 'Croatian Kuna', symbol: 'kn' },
  HTG: { name: 'Haitian Gourde', symbol: 'G' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' },
  ILS: { name: 'Israeli New Shekel', symbol: '₪' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  IQD: { name: 'Iraqi Dinar', symbol: 'ع.د' },
  IRR: { name: 'Iranian Rial', symbol: '﷼' },
  ISK: { name: 'Icelandic Króna', symbol: 'kr' },
  JMD: { name: 'Jamaican Dollar', symbol: 'J$' },
  JOD: { name: 'Jordanian Dinar', symbol: 'د.ا' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh' },
  KGS: { name: 'Kyrgyzstani Som', symbol: 'som' },
  KHR: { name: 'Cambodian Riel', symbol: '៛' },
  KMF: { name: 'Comorian Franc', symbol: 'CF' },
  KPW: { name: 'North Korean Won', symbol: '₩' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
  KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  KYD: { name: 'Cayman Islands Dollar', symbol: 'CI$' },
  KZT: { name: 'Kazakhstani Tenge', symbol: '₸' },
  LAK: { name: 'Lao Kip', symbol: '₭' },
  LBP: { name: 'Lebanese Pound', symbol: 'ل.ل' },
  LKR: { name: 'Sri Lankan Rupee', symbol: '₨' },
  LRD: { name: 'Liberian Dollar', symbol: 'L$' },
  LSL: { name: 'Lesotho Loti', symbol: 'L' },
  LYD: { name: 'Libyan Dinar', symbol: 'ل.د' },
  MAD: { name: 'Moroccan Dirham', symbol: 'د.م.' },
  MDL: { name: 'Moldovan Leu', symbol: 'L' },
  MGA: { name: 'Malagasy Ariary', symbol: 'Ar' },
  MKD: { name: 'Macedonian Denar', symbol: 'ден' },
  MMK: { name: 'Myanmar Kyat', symbol: 'K' },
  MNT: { name: 'Mongolian Tögrög', symbol: '₮' },
  MOP: { name: 'Macanese Pataca', symbol: 'MOP$' },
  MRU: { name: 'Mauritanian Ouguiya', symbol: 'UM' },
  MUR: { name: 'Mauritian Rupee', symbol: '₨' },
  MVR: { name: 'Maldivian Rufiyaa', symbol: 'Rf' },
  MWK: { name: 'Malawian Kwacha', symbol: 'MK' },
  MXN: { name: 'Mexican Peso', symbol: 'Mex$' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM' },
  MZN: { name: 'Mozambican Metical', symbol: 'MT' },
  NAD: { name: 'Namibian Dollar', symbol: 'N$' },
  NGN: { name: 'Nigerian Naira', symbol: '₦' },
  NIO: { name: 'Nicaraguan Córdoba', symbol: 'C$' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr' },
  NPR: { name: 'Nepalese Rupee', symbol: '₨' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  OMR: { name: 'Omani Rial', symbol: 'ر.ع.' },
  PAB: { name: 'Panamanian Balboa', symbol: 'B/.' },
  PEN: { name: 'Peruvian Sol', symbol: 'S/' },
  PGK: { name: 'Papua New Guinean Kina', symbol: 'K' },
  PHP: { name: 'Philippine Peso', symbol: '₱' },
  PKR: { name: 'Pakistani Rupee', symbol: '₨' },
  PLN: { name: 'Polish Złoty', symbol: 'zł' },
  PYG: { name: 'Paraguayan Guaraní', symbol: '₲' },
  QAR: { name: 'Qatari Riyal', symbol: 'ر.ق' },
  RON: { name: 'Romanian Leu', symbol: 'lei' },
  RSD: { name: 'Serbian Dinar', symbol: 'дин.' },
  RUB: { name: 'Russian Ruble', symbol: '₽' },
  RWF: { name: 'Rwandan Franc', symbol: 'FRw' },
  SAR: { name: 'Saudi Riyal', symbol: 'ر.س' },
  SBD: { name: 'Solomon Islands Dollar', symbol: 'SI$' },
  SCR: { name: 'Seychellois Rupee', symbol: '₨' },
  SDG: { name: 'Sudanese Pound', symbol: 'ج.س.' },
  SEK: { name: 'Swedish Krona', symbol: 'kr' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  SHP: { name: 'Saint Helena Pound', symbol: '£' },
  SLL: { name: 'Sierra Leonean Leone', symbol: 'Le' },
  SOS: { name: 'Somali Shilling', symbol: 'Sh' },
  SRD: { name: 'Surinamese Dollar', symbol: '$' },
  SSP: { name: 'South Sudanese Pound', symbol: '£' },
  STN: { name: 'São Tomé & Príncipe Dobra', symbol: 'Db' },
  SVC: { name: 'Salvadoran Colón', symbol: '₡' },
  SYP: { name: 'Syrian Pound', symbol: '£S' },
  SZL: { name: 'Swazi Lilangeni', symbol: 'L' },
  THB: { name: 'Thai Baht', symbol: '฿' },
  TJS: { name: 'Tajikistani Somoni', symbol: 'SM' },
  TMT: { name: 'Turkmenistani Manat', symbol: 'm' },
  TND: { name: 'Tunisian Dinar', symbol: 'د.ت' },
  TOP: { name: 'Tongan Paʻanga', symbol: 'T$' },
  TRY: { name: 'Turkish Lira', symbol: '₺' },
  TTD: { name: 'Trinidad & Tobago Dollar', symbol: 'TT$' },
  TWD: { name: 'New Taiwan Dollar', symbol: 'NT$' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh' },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh' },
  USD: { name: 'US Dollar', symbol: '$' },
  UYU: { name: 'Uruguayan Peso', symbol: '$U' },
  UZS: { name: 'Uzbekistani Som', symbol: 'soʻm' },
  VES: { name: 'Venezuelan Bolívar', symbol: 'Bs.' },
  VND: { name: 'Vietnamese Đồng', symbol: '₫' },
  VUV: { name: 'Vanuatu Vatu', symbol: 'VT' },
  WST: { name: 'Samoan Tālā', symbol: 'WS$' },
  XAF: { name: 'Central African CFA Franc', symbol: 'FCFA' },
  XCD: { name: 'East Caribbean Dollar', symbol: 'EC$' },
  XOF: { name: 'West African CFA Franc', symbol: 'CFA' },
  XPF: { name: 'CFP Franc', symbol: '₣' },
  YER: { name: 'Yemeni Rial', symbol: '﷼' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
  ZMW: { name: 'Zambian Kwacha', symbol: 'ZK' },
  ZWL: { name: 'Zimbabwean Dollar', symbol: 'Z$' },
};

/** All currency codes, sorted alphabetically. */
export const CURRENCY_CODES = Object.keys(CURRENCIES).sort();

/** Is this a supported currency code? */
export function isCurrency(code) {
  return typeof code === 'string' && CURRENCIES[code.toUpperCase()] != null;
}

/** Units per 1 USD for a currency (env override wins, fallback 1). */
export function rateToUsd(code) {
  const c = String(code || 'USD').toUpperCase();
  if (OVERRIDES[c] != null) return Number(OVERRIDES[c]);
  return BASE_RATES[c] ?? 1;
}

/** USD cents -> target-currency amount (rounded to whole units). */
export function convertFromUsdCents(cents, code) {
  return Math.round((cents / 100) * rateToUsd(code));
}

/** Symbol for the currency picker (falls back to the code). */
export function currencySymbol(code) {
  const c = String(code || 'USD').toUpperCase();
  return CURRENCIES[c]?.symbol ?? c;
}

/** "US Dollar" — used by the picker search. */
export function currencyName(code) {
  const c = String(code || 'USD').toUpperCase();
  return CURRENCIES[c]?.name ?? c;
}
