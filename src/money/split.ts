export interface SplitInput {
  readonly billCents: bigint;
  readonly tipPercent: bigint;
  readonly people: bigint;
}

export interface SplitResult {
  readonly tipCents: bigint;
  readonly totalCents: bigint;
  readonly sharesCents: bigint[];
}

const PERCENT = 100n;
const HALF_UP = 50n;

// Half-up via +50n then floor division is only correct for non-negative values (spec D7).
export function split({ billCents, tipPercent, people }: SplitInput): SplitResult {
  if (billCents < 0n || tipPercent < 0n || people < 1n) {
    throw new RangeError('split needs billCents >= 0, tipPercent >= 0 and people >= 1');
  }
  const tipCents = (billCents * tipPercent + HALF_UP) / PERCENT;
  const totalCents = billCents + tipCents;
  const base = totalCents / people;
  const remainder = totalCents % people;
  const sharesCents: bigint[] = [];
  for (let person = 0n; person < people; person++) {
    sharesCents.push(person < remainder ? base + 1n : base);
  }
  return { tipCents, totalCents, sharesCents };
}
