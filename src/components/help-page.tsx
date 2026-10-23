import Link from "next/link";
import { StorePage } from "./store-page";
import { helpPages } from "@/data/help-content";
export function HelpPage({ page }: { page: keyof typeof helpPages }) {
  const content = helpPages[page];
  return <StorePage title={content.title} intro={content.intro}><article className="store-article">{content.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<div className="store-notice"><p>¿Necesitas ayuda con un caso concreto?</p><Link href="/contacto">Contactar a la tienda →</Link> · <Link href="/seguimiento">Consultar mi pedido</Link></div></article></StorePage>;
}
