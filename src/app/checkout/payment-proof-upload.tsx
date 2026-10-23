"use client";

import { useActionState } from "react";
import { uploadPaymentProof, type ProofUploadState } from "./actions";

export function PaymentProofUpload({ orderNumber, proofToken, variant = "checkout" }: { orderNumber: string; proofToken: string; variant?: "checkout" | "account" }) {
  const [state, action, pending] = useActionState<ProofUploadState, FormData>(uploadPaymentProof, {});
  return <form className={variant === "account" ? "account-order-proof" : "checkout-proof-form"} action={action}>
    <p className="cart-eyebrow">COMPROBANTE</p><h3>Envía tu comprobante</h3>
    <p>Adjunta el comprobante para que podamos revisar tu pago. Archivos PDF, JPG, PNG o WebP de hasta 5 MB.</p>
    <input type="hidden" name="orderNumber" value={orderNumber} /><input type="hidden" name="proofToken" value={proofToken} />
    <label>Seleccionar archivo<input name="proof" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required /></label>
    {state.error && <p className="checkout-error" role="alert">{state.error}</p>}{state.message && <p className="checkout-proof-success" role="status">{state.message}</p>}
    {!state.message && <button className={variant === "account" ? "account-proof-submit" : "cart-primary checkout-submit"} type="submit" disabled={pending}>{pending ? "Enviando comprobante…" : "Enviar comprobante"}</button>}
  </form>;
}
