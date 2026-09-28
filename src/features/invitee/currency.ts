import { create } from "zustand";
import { getFarmCurrency } from "./api";

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

interface CurrencyState {
  currency: string;
  refresh: () => Promise<void>;
}

// The invited farm's own currency, so an invitee sees money the way that
// farm's Owner set it up.
export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: "INR",
  refresh: async () => {
    try {
      const { currency } = await getFarmCurrency();
      if (currency) set({ currency });
    } catch {
      // Keep whatever currency is already cached - a fetch failure shouldn't
      // blank out money formatting elsewhere.
    }
  },
}));

export function curSymbol(): string {
  const code = useCurrencyStore.getState().currency;
  return SYMBOLS[code] ?? `${code} `;
}

export function fmtMoney(amount: number): string {
  return `${curSymbol()}${Math.round(amount).toLocaleString("en-IN")}`;
}
