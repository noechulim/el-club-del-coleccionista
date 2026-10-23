import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { faqs } from "@/data/help-content";
export const metadata = { title: "Preguntas frecuentes | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Preguntas frecuentes" intro="Resuelve tus dudas antes y después de comprar."><div className="store-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><p className="store-notice">¿No encontraste lo que buscabas? <Link className="text-link" href="/contacto">Escríbenos →</Link></p></StorePage>; }
