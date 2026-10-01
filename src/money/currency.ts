const CURRENCY_EXPONENTS = { USD: 2n } as const;

export type CurrencyCode = keyof typeof CURRENCY_EXPONENTS;

export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.hasOwn(CURRENCY_EXPONENTS, code);
}

export function exponentFor(code: string): bigint {
  if (!isCurrencyCode(code)) throw new Error(`unknown currency code: ${code}`);
  return CURRENCY_EXPONENTS[code];
}
