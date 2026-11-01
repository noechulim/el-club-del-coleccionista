import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartItemCount, CartView } from "./view";
import { ArrowIcon } from "@/components/arrow-icon";
import "../styles/cart.css";

export default function CartPage() {
  return <><SiteHeader /><main className="cart-page"><header className="cart-heading"><div><p className="cart-eyebrow">TU CARRITO</p><h1>Carrito</h1><CartItemCount /></div><Link href="/catalogo">Seguir comprando <ArrowIcon /></Link></header><CartView /></main><SiteFooter /></>;
}
