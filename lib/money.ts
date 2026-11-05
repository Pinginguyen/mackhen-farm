export function calculatePercentageAmount(amount: number, percentage: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(percentage) || percentage < 0) {
    throw new RangeError('Percentage amount inputs must be non-negative safe integers.');
  }
  return Number((BigInt(amount) * BigInt(percentage)) / 100n);
}

export function convertVndToSgdCents(amountVnd: number, rateVndPerSgd: number): number {
  if (!Number.isSafeInteger(amountVnd) || !Number.isSafeInteger(rateVndPerSgd) || rateVndPerSgd <= 0) {
    throw new RangeError('Currency conversion inputs must be safe integer amounts and rates.');
  }
  const amount = BigInt(Math.abs(amountVnd));
  const rate = BigInt(rateVndPerSgd);
  const cents = (amount * 100n + rate / 2n) / rate;
  const roundedCents = Number(cents);
  return amountVnd < 0 ? -roundedCents : roundedCents;
}

export function formatSgdCents(cents: number): string {
  const wholeDollars = Math.floor(Math.abs(cents) / 100);
  const remainingCents = Math.abs(cents) % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${wholeDollars}.${String(remainingCents).padStart(2, '0')}`;
}
