import { parseEther } from "viem";

export function ethValueToUsdCents(ethValue: string, price: bigint, decimals: number): bigint | null {
  try {
    const amountWei = parseEther(ethValue);
    if (amountWei <= 0n || price <= 0n) return null;
    const scale = 10n ** BigInt(18 + decimals);
    return (amountWei * price * 100n + scale / 2n) / scale;
  } catch {
    return null;
  }
}

export function formatUsdCents(cents: bigint): string {
  return `$${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}