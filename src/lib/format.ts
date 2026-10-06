export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

export function formatProfitLoss(amount: number): { text: string; color: string } {
  const prefix = amount >= 0 ? '+' : '-'
  const formatted = formatIndianNumber(Math.abs(amount))
  const color = amount >= 0 ? 'text-green-500' : 'text-red-500'
  return {
    text: `${prefix}₹${formatted}`,
    color
  }
}

export function formatScore(score: number): string {
  return score.toFixed(2)
}

export function clampGambitAmount(amount: number): number {
  return Math.max(0, Math.min(250000, amount))
}

export function formatCurrency(amount: number): string {
  return `₹${formatIndianNumber(amount)}`
}
