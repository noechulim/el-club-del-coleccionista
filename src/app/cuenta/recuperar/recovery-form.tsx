"use client";
import { useActionState } from "react";
import Link from "next/link";
import { changePassword, requestRecovery } from "./actions";
export function RecoveryForm({ update = false }: { update?: boolean }) {
  const [state, action, pending] = useActionState(update ? changePassword : requestRecovery, {});
  return <form className="store-form" action={action}>{!state.message && <>{update ? <><label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><label>Repetir contraseña<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label></> : <label>Correo de tu cuenta<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>}<button className="button button-primary" disabled={pending}>{pending ? "Un momento…" : update ? "Guardar contraseña" : "Enviar enlace"}</button></>}{state.error && <p className="store-error" role="alert">{state.error}</p>}{state.message && <p className="store-success" role="status">{state.message}</p>}<Link href="/cuenta">Volver a mi cuenta</Link>{update && <Link href="/cuenta/recuperar">Solicitar un nuevo enlace</Link>}</form>;
}
