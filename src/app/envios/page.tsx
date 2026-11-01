import { Suspense } from "react";
import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { ShippingRates } from "@/components/shipping-rates";
import { helpPages } from "@/data/help-content";
import { ArrowIcon } from "@/components/arrow-icon";
export const metadata = { title: "Envíos | El Club del Coleccionista" };
export default function Page() { return <StorePage title="Envíos" intro={helpPages.envios.intro}><div className="store-article"><Suspense fallback={null}><ShippingRates /></Suspense>{helpPages.envios.sections.map(([heading, content]) => <section key={heading}><h2>{heading}</h2><p>{content}</p></section>)}<Link href="/contacto">Consultar sobre mi envío <ArrowIcon /></Link></div></StorePage>; }
