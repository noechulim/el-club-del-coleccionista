import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./styles/storefront.css";
import "./styles/form-controls.css";
import { CartProvider } from "@/lib/cart-context";
import { CartToastProvider } from "@/components/cart-toast-provider";
import { AccountOrdersPrefetch } from "@/components/account-orders-prefetch";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "El Club del Coleccionista | Pokémon TCG",
  description: "Productos Pokémon TCG en inglés para coleccionistas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`h-full antialiased ${body.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col"><CartProvider><CartToastProvider><AccountOrdersPrefetch />{children}</CartToastProvider></CartProvider></body>
    </html>
  );
}
