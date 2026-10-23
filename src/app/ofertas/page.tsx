import { CatalogPage } from "@/components/catalog-page";
export const metadata = { title: "Ofertas | El Club del Coleccionista" };
export default function Page() { return <CatalogPage title="Ofertas" intro="Piezas de colección con precio especial. Consulta el ahorro en cada producto." scope={{ offer: true }} />; }
