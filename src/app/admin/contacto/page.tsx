import { Suspense } from "react";
import { connection } from "next/server";
import { getAdminAccess } from "@/lib/admin-access";
import { StorePage } from "@/components/store-page";
import { AdminNav } from "@/components/admin-nav";
import { Inbox, type ContactMessage } from "./inbox";
export default function Page() { return <StorePage title="Consultas de clientes"><Suspense fallback={null}><Messages /></Suspense></StorePage>; }
async function Messages() { await connection(); const db = await getAdminAccess(); if (!db) return <p>Inicia sesión con una cuenta administradora para ver las consultas.</p>; const { data, error } = await db.from("contact_messages").select("id,name,email,subject,order_number,message,status,created_at").order("created_at", { ascending: false }); return <><AdminNav />{error ? <p>Aplica la migración 202610230004_storefront_flow.sql para activar la bandeja.</p> : <Inbox messages={(data ?? []) as ContactMessage[]} />}</>; }
