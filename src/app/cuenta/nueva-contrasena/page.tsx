import { RecoveryForm } from "../recuperar/recovery-form";
export const metadata = { title: "Nueva contraseña | El Club del Coleccionista" };
export default function Page() { return <main className="store-page section-wrap"><header className="store-heading"><h1>Elige tu nueva contraseña</h1><p>Abre el enlace de recuperación desde el mismo navegador donde lo solicitaste.</p></header><div className="store-article"><RecoveryForm update /></div></main>; }
