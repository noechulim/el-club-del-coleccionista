import type { Metadata } from "next";
import "./globals.css";
import "./styles/storefront.css";
import "./styles/form-controls.css";
import { CartProvider } from "@/lib/cart-context";
import { CartToastProvider } from "@/components/cart-toast-provider";

export const metadata: Metadata = {
  title: "El Club del Coleccionista | Pokémon TCG",
  description: "Productos Pokémon TCG en inglés para coleccionistas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><CartProvider><CartToastProvider>{children}</CartToastProvider></CartProvider></body>
    </html>
  );
}
