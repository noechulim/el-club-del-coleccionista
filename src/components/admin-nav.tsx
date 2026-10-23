import Link from "next/link";
export function AdminNav() { return <nav className="store-admin-nav" aria-label="Administración"><Link href="/admin">Resumen</Link><Link href="/admin/products">Productos</Link><Link href="/admin/orders">Pedidos</Link><Link href="/admin/contacto">Consultas</Link><Link href="/admin/envios">Envíos</Link><Link href="/cuenta">Mi cuenta</Link></nav>; }
