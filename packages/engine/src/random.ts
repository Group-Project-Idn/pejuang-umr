export interface RandomSource {
  integer(min: number, max: number): number;
  chance(percent: number): boolean;
  pick<T>(items: readonly T[]): T;
}

function assertRange(min: number, max: number): void {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError("Rentang random harus berupa integer dengan min <= max.");
  }
}

function valueToInteger(value: number, min: number, max: number): number {
  assertRange(min, max);
  const normalized = Math.min(Math.max(value, 0), 0.9999999999999999);
  return min + Math.floor(normalized * (max - min + 1));
}

export class MathRandomSource implements RandomSource {
  integer(min: number, max: number): number {
    return valueToInteger(Math.random(), min, max);
  }

  chance(percent: number): boolean {
    if (percent < 0 || percent > 100) {
      throw new RangeError("Persentase peluang harus berada di antara 0 dan 100.");
    }
    return Math.random() * 100 < percent;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError("Tidak dapat memilih dari array kosong.");
    return items[this.integer(0, items.length - 1)]!;
  }
}

export class SequenceRandomSource implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[]) {
    if (values.length === 0) {
      throw new RangeError("Sequence random membutuhkan minimal satu nilai.");
    }
  }

  private next(): number {
    const value = this.values[this.index % this.values.length]!;
    this.index += 1;
    return value;
  }

  integer(min: number, max: number): number {
    return valueToInteger(this.next(), min, max);
  }

  chance(percent: number): boolean {
    if (percent < 0 || percent > 100) {
      throw new RangeError("Persentase peluang harus berada di antara 0 dan 100.");
    }
    return this.next() * 100 < percent;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError("Tidak dapat memilih dari array kosong.");
    return items[this.integer(0, items.length - 1)]!;
  }
}