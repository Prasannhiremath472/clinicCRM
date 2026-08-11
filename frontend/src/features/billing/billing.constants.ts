import type { BadgeProps } from "@/components/ui/badge";
import type { PaymentMethod, PaymentStatus } from "@/features/billing/billing.types";

export const INVOICE_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Partially Paid",
  PENDING: "Pending",
};

export const INVOICE_STATUS_BADGE_VARIANT: Record<PaymentStatus, NonNullable<BadgeProps["variant"]>> = {
  PAID: "success",
  PARTIAL: "outline",
  PENDING: "destructive",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
};

export function formatCurrency(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
