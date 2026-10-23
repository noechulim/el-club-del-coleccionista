import "server-only";
import type { PaymentDetails } from "@/components/payment-instructions";

export function getPaymentDetails(): PaymentDetails {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const isDemo = process.env.NEXT_PUBLIC_PAYMENT_MODE === "demo" || (!process.env.NEXT_PUBLIC_PAYMENT_MODE && process.env.NODE_ENV !== "production");
  if (isDemo) return { mode: "demo", bank: "Banco de prueba", holder: "El Club del Coleccionista (prueba)", clabe: "000000000000000000", account: "", whatsappNumber };
  if (process.env.NEXT_PUBLIC_PAYMENT_MODE !== "real") return { mode: "unconfigured", bank: "", holder: "", clabe: "", account: "", whatsappNumber };
  return {
    mode: "real",
    bank: process.env.NEXT_PUBLIC_PAYMENT_BANK || "",
    holder: process.env.NEXT_PUBLIC_PAYMENT_HOLDER || "",
    clabe: process.env.NEXT_PUBLIC_PAYMENT_CLABE || "",
    account: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT || "",
    whatsappNumber,
  };
}
