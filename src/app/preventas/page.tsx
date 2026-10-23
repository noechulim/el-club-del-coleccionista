import { CatalogPage } from "@/components/catalog-page";
export const metadata = { title: "Preventas | El Club del Coleccionista" };
export default function Page() { return <CatalogPage title="Preventas" intro="Reserva unidades de próximos lanzamientos. El pago es por el total del pedido; las fechas son estimadas. Los pedidos que incluyen preventas se enviarán juntos cuando todos sus productos estén disponibles." scope={{ preorder: true }} />; }
