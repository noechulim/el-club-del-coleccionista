import { RecoveryForm } from "./recovery-form";
export const metadata = { title: "Recuperar acceso | El Club del Coleccionista" };
export default function Page() { return <main className="store-page section-wrap"><header className="store-heading"><h1>Recupera tu cuenta</h1><p>Te enviaremos un enlace para elegir una nueva contraseña.</p></header><div className="store-article"><RecoveryForm /></div></main>; }
