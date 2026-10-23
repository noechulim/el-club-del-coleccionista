"use client";
import { useActionState } from "react";
import { mexicanStates, type ShippingConfig } from "@/lib/shipping";
import { saveShipping } from "./actions";
export function ShippingForm({ config }: { config: ShippingConfig }) {
  const [state, action, pending] = useActionState(saveShipping, {});
  return <form className="store-form" action={action}><div className="catalog-filter-row"><label>Tarifa general (MXN)<input name="base" type="number" min="0" max="999999" step="0.01" defaultValue={config.base_cost} required /></label><label>Envío gratis desde (MXN)<input name="free" type="number" min="0" max="999999" step="0.01" defaultValue={config.free_from ?? ""} placeholder="Vacío = sin envío gratis" /></label></div><p>Deja la tarifa de un estado vacía para usar la general. El envío gratis, cuando corresponde, tiene prioridad. Estos cambios no modifican pedidos ya creados.</p><div className="catalog-filter-row">{mexicanStates.map((state) => <label key={state}>{state}<input name={state} type="number" min="0" max="999999" step="0.01" defaultValue={config.state_rates[state] ?? ""} placeholder="Usar tarifa general" /></label>)}</div>{state.error && <p className="store-error" role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}<button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar tarifas"}</button></form>;
}
