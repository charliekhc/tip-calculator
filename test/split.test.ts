import { describe, expect, it } from 'vitest';
import { split } from '../src/money/split.js';

const repeat = (count: number, value: bigint): bigint[] => new Array<bigint>(count).fill(value);

describe('split (spec D7, D8)', () => {
  it.each([
    [10000n, 0n, 1n, 0n, 10000n, [10000n]],
    [10000n, 10n, 3n, 1000n, 11000n, [3667n, 3667n, 3666n]],
    [12050n, 15n, 3n, 1808n, 13858n, [4620n, 4619n, 4619n]],
    [1n, 20n, 2n, 0n, 1n, [1n, 0n]],
    [5n, 10n, 1n, 1n, 6n, [6n]],
    [100000000n, 20n, 100n, 20000000n, 120000000n, repeat(100, 1200000n)],
    [1000000000000n, 100n, 1000n, 1000000000000n, 2000000000000n, repeat(1000, 2000000000n)],
  ])('worked example: bill %s at %s%% for %s people', (billCents, tipPercent, people, tipCents, totalCents, sharesCents) => {
    expect(split({ billCents, tipPercent, people })).toEqual({ tipCents, totalCents, sharesCents });
  });

  it('splits 1 cent between many people with one person paying it', () => {
    expect(split({ billCents: 1n, tipPercent: 0n, people: 4n }).sharesCents).toEqual([1n, 0n, 0n, 0n]);
  });

  it('rounds the tip half up at exactly half a cent', () => {
    expect(split({ billCents: 5n, tipPercent: 10n, people: 1n }).tipCents).toBe(1n);
    expect(split({ billCents: 15n, tipPercent: 10n, people: 1n }).tipCents).toBe(2n);
    expect(split({ billCents: 4n, tipPercent: 10n, people: 1n }).tipCents).toBe(0n);
  });

  it('gives the remainder cents to the first people', () => {
    expect(split({ billCents: 10n, tipPercent: 0n, people: 4n }).sharesCents).toEqual([3n, 3n, 2n, 2n]);
    expect(split({ billCents: 10000n, tipPercent: 0n, people: 3n }).sharesCents).toEqual([3334n, 3333n, 3333n]);
  });

  it.each([
    { billCents: 100n, tipPercent: 10n, people: 0n },
    { billCents: -1n, tipPercent: 10n, people: 1n },
    { billCents: 100n, tipPercent: -10n, people: 1n },
  ])('refuses inputs the rounding rule is not defined for: %o', (input) => {
    expect(() => split(input)).toThrow(RangeError);
  });
});

const MASK_64 = (1n << 64n) - 1n;

function seededRandom(seed: bigint): (min: bigint, max: bigint) => bigint {
  let state = seed;
  return (min, max) => {
    state = (state * 6364136223846793005n + 1442695040888963407n) & MASK_64;
    return min + ((state >> 11n) % (max - min + 1n));
  };
}

describe('split property test', () => {
  it('keeps every invariant over many seeded random inputs', () => {
    const random = seededRandom(20261001n);
    for (let run = 0; run < 2000; run++) {
      const billCents = random(1n, 1000000000000n);
      const tipPercent = random(0n, 100n);
      const people = random(1n, 1000n);
      const { tipCents, totalCents, sharesCents } = split({ billCents, tipPercent, people });
      const context = `bill ${billCents}, tip ${tipPercent}%, people ${people}`;

      const roundingError = tipCents * 100n - billCents * tipPercent;
      expect(roundingError > -50n && roundingError <= 50n, context).toBe(true);
      expect(totalCents, context).toBe(billCents + tipCents);
      expect(BigInt(sharesCents.length), context).toBe(people);
      expect(sharesCents.reduce((sum, share) => sum + share, 0n), context).toBe(totalCents);
      const first = sharesCents[0] ?? 0n;
      const last = sharesCents.at(-1) ?? 0n;
      expect(first - last <= 1n, context).toBe(true);
      expect([...sharesCents].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0)), context).toEqual(sharesCents);
    }
  });
});
