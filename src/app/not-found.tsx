import Link from "next/link";
import { StorePage } from "@/components/store-page";
import { ArrowIcon } from "@/components/arrow-icon";
export default function NotFound() { return <StorePage title="No encontramos esta página" intro="El producto o la colección puede haber cambiado o ya no estar disponible."><Link className="button button-primary" href="/catalogo">Explorar catálogo <ArrowIcon /></Link></StorePage>; }
