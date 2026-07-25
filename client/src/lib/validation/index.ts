export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address) || /^C[A-Z0-9]{55}$/.test(address);
}

export function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 10_000_000_000;
}

export function isValidCampaignTitle(title: string): boolean {
  return title.trim().length >= 3 && title.trim().length <= 100;
}

export function isValidReferralHash(hash: string): boolean {
  return hash.trim().length >= 1 && hash.trim().length <= 256;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

export function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
