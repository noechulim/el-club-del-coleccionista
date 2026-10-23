import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { ContactForm } from "./contact-form";
export const metadata = { title: "Contacto | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Hablemos de tu colección" intro="Escríbenos sobre un producto, una compra o un envío."><div className="store-contact-layout"><ContactForm /><aside className="store-tile"><h2>¿Ya tienes un pedido?</h2><p>Consulta su estado con tu número de pedido y el correo que usaste al comprar como invitado.</p><Link className="text-link" href="/seguimiento">Rastrear pedido →</Link><Link className="text-link" href="/cuenta">Ver mis compras en mi cuenta →</Link><h2>Antes de escribirnos</h2><p>No compartas contraseñas, datos completos de tarjetas ni códigos de acceso. Sube los comprobantes desde tu pedido.</p><Link className="text-link" href="/preguntas-frecuentes">Preguntas frecuentes →</Link></aside></div></StorePage>; }
