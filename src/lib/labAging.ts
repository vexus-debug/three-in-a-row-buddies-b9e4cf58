// Dental lab A/R aging, delinquency risk, auto credit-hold and lump-sum payment allocation.
import { agingBucket, daysOutstanding, type AgingBucket } from "@/lib/arAging";

export interface AgingInvoice { id: string; client: string; invoice_date: string; total: number; paid: number; status?: string }

const r2 = (n: number) => Math.round(n * 100) / 100;
export const openBalance = (i: AgingInvoice) => i.status === "void" ? 0 : r2(Math.max(0, Number(i.total || 0) - Number(i.paid || 0)));

export type Risk = "current" | "overdue" | "high";
/** 61+ days owed → high risk; 31–60 → overdue; else current. */
export function riskOf(buckets: Record<AgingBucket, number>): Risk {
  if (buckets["61_90"] > 0 || buckets["90_plus"] > 0) return "high";
  if (buckets["31_60"] > 0) return "overdue";
  return "current";
}

export interface ClientAging { client: string; total: number; buckets: Record<AgingBucket, number>; oldestDays: number; risk: Risk }

export function agingByClient(invoices: AgingInvoice[], key: (s: string) => string, today = new Date()): ClientAging[] {
  const m = new Map<string, ClientAging>();
  for (const inv of invoices) {
    const bal = openBalance(inv);
    if (bal <= 0) continue;
    const k = key(inv.client) || inv.client;
    const days = daysOutstanding(inv.invoice_date, today);
    let e = m.get(k);
    if (!e) { e = { client: inv.client, total: 0, buckets: { current: 0, "31_60": 0, "61_90": 0, "90_plus": 0 }, oldestDays: 0, risk: "current" }; m.set(k, e); }
    e.total = r2(e.total + bal);
    const b = agingBucket(days);
    e.buckets[b] = r2(e.buckets[b] + bal);
    e.oldestDays = Math.max(e.oldestDays, days);
  }
  return [...m.values()].map((e) => ({ ...e, risk: riskOf(e.buckets) })).sort((a, b) => b.total - a.total);
}

/** Hold when balance exceeds credit limit (limit > 0) or anything is 90+ days old. */
export function shouldAutoHold(a: Pick<ClientAging, "total" | "buckets">, creditLimit = 0): boolean {
  return a.buckets["90_plus"] > 0 || (creditLimit > 0 && a.total > creditLimit);
}

/** Share of receivables more than 30 days old, in percent. */
export function delinquencyRate(rows: ClientAging[]): number {
  const total = rows.reduce((s, r) => s + r.total, 0);
  if (!total) return 0;
  const late = rows.reduce((s, r) => s + r.buckets["31_60"] + r.buckets["61_90"] + r.buckets["90_plus"], 0);
  return Math.round((late / total) * 1000) / 10;
}

export interface Allocation { invoice_id: string; amount_applied: number }

/** Waterfall: pay oldest open invoices first; leftover becomes credit on account. */
export function allocateOldestFirst(amount: number, invoices: AgingInvoice[]): { allocations: Allocation[]; unallocated: number } {
  let left = r2(Math.max(0, amount));
  const allocations: Allocation[] = [];
  const open = invoices.filter((i) => openBalance(i) > 0).sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));
  for (const inv of open) {
    if (left <= 0) break;
    const apply = r2(Math.min(left, openBalance(inv)));
    allocations.push({ invoice_id: inv.id, amount_applied: apply });
    left = r2(left - apply);
  }
  return { allocations, unallocated: left };
}

/** Errors for a manual split: no over-allocation per invoice or beyond the payment. */
export function validateAllocations(amount: number, allocs: Allocation[], invoices: AgingInvoice[]): string[] {
  const errs: string[] = [];
  if (!(amount > 0)) errs.push("Enter the amount received.");
  const sum = r2(allocs.reduce((s, a) => s + Math.max(0, a.amount_applied), 0));
  if (sum > r2(amount)) errs.push("Allocated more than the amount received.");
  for (const a of allocs) {
    const inv = invoices.find((i) => i.id === a.invoice_id);
    if (inv && a.amount_applied > openBalance(inv)) errs.push(`Over-applied to an invoice (max ${openBalance(inv)}).`);
  }
  return errs;
}
