// Calculates R&D hours from total hours and percentage
export function calcRDHours(totalHours: number, rdPercentage: number): number {
  return Math.round(totalHours * (rdPercentage / 100) * 100) / 100
}

// Calculates qualified amount from wages and percentage
export function calcQualifiedAmount(totalWages: number, rdPercentage: number): number {
  return Math.round(totalWages * (rdPercentage / 100) * 100) / 100
}

// Conservative credit: 6% of current year QRE
export function calcConservativeFederal(currentQRE: number): number {
  return Math.round(currentQRE * 0.06 * 100) / 100
}

// Full ASC credit: 14% × (current QRE - 50% of 3yr avg)
export function calcASCFederal(currentQRE: number, prior3YrAvg: number): number {
  const base = currentQRE - (prior3YrAvg * 0.5)
  return Math.round(Math.max(currentQRE * 0.06, base * 0.14) * 100) / 100
}

// Georgia state credit: 10% of federal
export function calcGeorgiaCredit(federalCredit: number): number {
  return Math.round(federalCredit * 0.10 * 100) / 100
}

// Calculate 3-year average QRE for ASC method
export function calcPrior3YrAvg(qreByYear: Record<number, number>, currentYear: number): number {
  const priorYears = [currentYear - 1, currentYear - 2, currentYear - 3]
  const priorQREs = priorYears.map(y => qreByYear[y] || 0)
  return priorQREs.reduce((a, b) => a + b, 0) / 3
}
