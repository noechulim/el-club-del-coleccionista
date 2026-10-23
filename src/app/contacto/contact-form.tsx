"use client";
import { StoreSelect } from "@/components/store-select";
import { useActionState } from "react";
import Link from "next/link";
import { sendContact } from "./actions";
export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, {});
  if (state.reference) return <section className="store-success" role="status"><h2>Recibimos tu consulta</h2><p>La tienda la revisará y podrá responder al correo que proporcionaste.</p><p>Referencia: <strong>{state.reference}</strong></p><Link href="/catalogo">Seguir explorando →</Link></section>;
  return <form action={action} className="store-form"><label>Nombre<input name="name" autoComplete="name" maxLength={100} required /></label><label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required /></label><label>Asunto<StoreSelect label="Asunto" name="subject" required><option value="">Selecciona un tema</option><option>Consulta sobre un producto</option><option>Pago o comprobante</option><option>Envío y seguimiento</option><option>Preventa</option><option>Cambio o devolución</option><option>Privacidad y datos personales</option><option>Otra consulta</option></StoreSelect></label><label>Número de pedido (opcional)<input name="orderNumber" maxLength={40} placeholder="ECC-…" /></label><label>Mensaje<textarea name="message" rows={6} minLength={10} maxLength={4000} required /></label><label className="store-honeypot" aria-hidden="true">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="store-checkbox"><input name="consent" type="checkbox" required /><span>Autorizo usar estos datos para atender mi consulta. <Link href="/aviso-de-privacidad">Ver privacidad</Link>.</span></label>{state.error && <p className="store-error" role="alert">{state.error}</p>}<button className="button button-primary" disabled={pending}>{pending ? "Enviando…" : "Enviar consulta"}</button></form>;
}
