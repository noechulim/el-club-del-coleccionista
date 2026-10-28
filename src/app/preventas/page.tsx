import { redirect } from "next/navigation";

export const metadata = { title: "Catálogo | El Club del Coleccionista" };

export default function Page() {
  redirect("/catalogo");
}
