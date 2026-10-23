"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { authenticate, startGoogleSignIn, type FormState } from "./actions";

type Mode = "login" | "signup";

export function AuthForm({ notice }: { notice?: string }) {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <main className="account-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <h1 id="auth-heading">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p className="auth-intro">
          {mode === "login" ? "Entra para consultar y administrar tus datos." : "Únete al Club y guarda tus datos para futuras compras."}
        </p>

        <div className="auth-tabs" role="group" aria-label="Acceso a tu cuenta">
          <button type="button" aria-pressed={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")}>Entrar</button>
          <button type="button" aria-pressed={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>Crear cuenta</button>
        </div>

        {notice && <p className="form-notice" role="status">{notice}</p>}
        <AuthFields key={mode} mode={mode} />
        {mode === "login" && <Link className="return-home" href="/cuenta/recuperar">Olvidé mi contraseña</Link>}

        <div className="auth-divider"><span>o</span></div>
        <form action={startGoogleSignIn}>
          <button className="google-button" type="submit">
            <GoogleMark />
            Continuar con Google
          </button>
        </form>
        <Link className="return-home" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}

function AuthFields({ mode }: { mode: Mode }) {
  const [state, action, pending] = useActionState<FormState, FormData>(authenticate, {});
  const signingUp = mode === "signup";

  return (
    <form action={action} className="auth-fields">
      <input type="hidden" name="mode" value={mode} />
      {signingUp && (
        <div className="auth-name-row">
          <label>Nombre<input name="firstName" autoComplete="given-name" required /></label>
          <label>Apellido<input name="lastName" autoComplete="family-name" required /></label>
        </div>
      )}
      <label>Correo<input type="email" name="email" autoComplete="email" required /></label>
      <label>Contraseña<input type="password" name="password" autoComplete={signingUp ? "new-password" : "current-password"} minLength={8} required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.message && <p className="form-notice" role="status">{state.message}</p>}
      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "Un momento…" : signingUp ? "Crear cuenta" : "Iniciar sesión"}
      </button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="google-mark">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9V33c3.4 6.7 10.3 11 18.1 11Z" />
      <path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4v-5.3H5.9a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4 16.2 4 9.3 8.3 5.9 15l6.9 5.3C14.4 15.5 18.8 12 24 12Z" />
    </svg>
  );
}
