/**
 * Currency display. All monetary data in the demo is STORED in ₹ Cr (crore rupees);
 * some payroll fields are stored in ₹ Lakh. The UI converts at render time to the
 * currency selected in the top bar (INR or EUR) using the rate kept in the store.
 *
 *   const m = useMoney()
 *   m.fmt(4.0)            -> "₹ 4.0 Cr"   | "€ 0.43 M"
 *   m.num(4.0)            -> "4.0"        | "0.43"        (table cells, bar labels)
 *   m.unitLabel           -> "₹ Cr"       | "€ M"         (card titles: `Budget (${m.unitLabel})`)
 *   m.symbol              -> "₹"          | "€"
 *   m.toDisplay(4.0)      -> 4            | 0.4348        (numbers for charts / inputs)
 *   m.toBase(0.4348)      -> 4.0                          (inputs back to ₹ Cr)
 *   m.fmtLakh(12)         -> "₹ 12.0 L"   | "€ 13.0 K"
 */
import { useStore } from '../store/useStore'

export type Currency = 'INR' | 'EUR'
export const CURRENCIES: Currency[] = ['INR', 'EUR']
export const DEFAULT_EUR_RATE = 92 // ₹ per € (editable in Settings → Program)

const CR = 1e7
const LAKH = 1e5

export function crToEurMillions(cr: number, rate: number) { return (cr * CR) / rate / 1e6 }
export function eurMillionsToCr(m: number, rate: number) { return (m * 1e6 * rate) / CR }

export function toDisplay(cr: number, currency: Currency, rate: number) { return currency === 'INR' ? cr : crToEurMillions(cr, rate) }
/** Display number -> ₹ Cr, rounded to 3 decimals of Cr so EUR round-trips do not drift (12 Cr stays 12 Cr). */
export function toBase(display: number, currency: Currency, rate: number) { return currency === 'INR' ? display : +eurMillionsToCr(display, rate).toFixed(3) }

export function unitLabel(currency: Currency) { return currency === 'INR' ? '₹ Cr' : '€ M' }
export function unitShort(currency: Currency) { return currency === 'INR' ? 'Cr' : 'M' }
export function symbol(currency: Currency) { return currency === 'INR' ? '₹' : '€' }

const trim = (s: string) => s

/** Number only, in the display unit (1 decimal for ₹ Cr, 2 for € M). */
export function numMoney(cr: number, currency: Currency, rate: number, digits?: number) {
  const v = toDisplay(cr, currency, rate)
  const d = digits ?? (currency === 'INR' ? 1 : 2)
  return trim(v.toFixed(d))
}
/** Full label: "₹ 4.0 Cr" | "€ 0.43 M". */
export function formatMoney(cr: number, currency: Currency, rate: number, digits?: number) {
  return `${symbol(currency)} ${numMoney(cr, currency, rate, digits)} ${unitShort(currency)}`
}
/** Signed variant for variances: "+0.1" / "-0.2". */
export function numMoneySigned(cr: number, currency: Currency, rate: number, digits?: number) {
  const s = numMoney(Math.abs(cr), currency, rate, digits)
  return cr > 0 ? `+${s}` : cr < 0 ? `-${s}` : s
}
/** Lakh-based fields (payroll, per-FTE cost): "₹ 12.0 L" | "€ 13.0 K". */
export function formatLakh(lakh: number, currency: Currency, rate: number) {
  if (currency === 'INR') return `₹ ${lakh.toFixed(1)} L`
  return `€ ${((lakh * LAKH) / rate / 1e3).toFixed(1)} K`
}
export function lakhUnitLabel(currency: Currency) { return currency === 'INR' ? '₹ L' : '€ K' }

export function useMoney() {
  const currency = useStore((s) => s.currency)
  const rate = useStore((s) => s.eurRate)
  return {
    currency,
    rate,
    symbol: symbol(currency),
    unit: unitShort(currency),
    unitLabel: unitLabel(currency),
    lakhUnitLabel: lakhUnitLabel(currency),
    digits: currency === 'INR' ? 1 : 2,
    fmt: (cr: number, digits?: number) => formatMoney(cr, currency, rate, digits),
    num: (cr: number, digits?: number) => numMoney(cr, currency, rate, digits),
    signed: (cr: number, digits?: number) => numMoneySigned(cr, currency, rate, digits),
    toDisplay: (cr: number) => toDisplay(cr, currency, rate),
    toBase: (display: number) => toBase(display, currency, rate),
    fmtLakh: (lakh: number) => formatLakh(lakh, currency, rate),
    /** Round a display number sensibly for input fields. */
    inputValue: (cr: number) => +toDisplay(cr, currency, rate).toFixed(currency === 'INR' ? 2 : 4),
  }
}
export type Money = ReturnType<typeof useMoney>
