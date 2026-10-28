# Conectar Supabase

## 1. Agregar las claves al entorno local

En la raíz del proyecto, crea `.env.local` a partir de `.env.example` y reemplaza:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL, en Supabase > Project Settings > API.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la clave pública `sb_publishable_...` del mismo proyecto.
- `NEXT_PUBLIC_SITE_URL`: conserva `http://localhost:3000` para desarrollo local.

No uses ni compartas una `service_role` o `secret` key en el navegador, en el repositorio o en el chat. Después de cambiar `.env.local`, reinicia `npm run dev`.

## 2. Crear la tabla privada de perfiles

En Supabase abre **SQL Editor > New query**, copia el contenido de `supabase/migrations/202610130001_create_profiles.sql` y ejecútalo. La tabla permite que cada usuario lea y actualice únicamente el perfil asociado a su sesión.

## 3. Crear el catálogo y el almacenamiento de imágenes

En **SQL Editor > New query**, copia y ejecuta `supabase/migrations/202610130002_products_admin.sql`. Esto crea los productos, permisos por rol y el bucket público para imágenes. Incluye tres productos de prueba como borradores; no se publican en la tienda hasta marcar **Visible en la tienda**.

### Dar permisos de administrador a tu cuenta de prueba

En el mismo SQL Editor, reemplaza el correo de ejemplo por el correo con el que creaste tu cuenta y ejecuta:

```sql
update public.profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'tu-correo-de-prueba@ejemplo.com'
);
```

Esto habilita **Administrar productos** en tu cuenta y protege el panel para que otros usuarios no puedan modificar el catálogo. Si se actualizaron cero filas, inicia sesión en `/cuenta`, guarda tu perfil y vuelve a ejecutar la consulta.

Después abre `http://localhost:3000/admin/products`. Desde ahí puedes agregar productos, cambiar precios y existencias, subir imágenes y decidir si se muestran en el catálogo.

## 4. Revisar la autenticación por correo

En **Authentication > URL Configuration**, mantén `http://localhost:3000` como Site URL y agrega `http://localhost:3000/**` en Redirect URLs. Para producción, actualiza ambos valores al dominio real.

La confirmación de correo puede permanecer activa: después de registrarse, el usuario verá un aviso para revisar su correo. Para enviar correos a clientes reales, configura un proveedor SMTP propio en Supabase.

## 5. Google

El botón ya dirige al flujo OAuth de Supabase, pero el proveedor aún necesita habilitarse en **Authentication > Sign In / Providers > Google** y registrar las credenciales OAuth y el callback de Supabase en Google Cloud. Hasta completar eso, el botón mostrará que Google necesita configuración.

## 6. Guardar pedidos del checkout

En **SQL Editor > New query**, copia y ejecuta `supabase/migrations/202610200001_checkout_orders.sql`. Crea las tablas privadas de pedidos y artículos, políticas para que cada cliente autenticado consulte solo sus pedidos y una función segura para registrar compras de invitados o usuarios.

La función vuelve a validar precio y existencias en Supabase, calcula el envío (gratis desde $1,500 MXN) y reserva las unidades al crear el pedido. Los pedidos quedan inicialmente como `pending_payment` (**Pendiente de pago**).

## 7. Mostrar y actualizar el estado de los pedidos

En **SQL Editor > New query**, copia y ejecuta `supabase/migrations/202610200002_order_management.sql`, después de la migración anterior. Añade los datos de paquetería y guía, además de una función segura para que solo las cuentas administradoras actualicen el estado. La cancelación devuelve al inventario las unidades reservadas.

El cliente autenticado verá sus propios pedidos en **Mi cuenta > Mis pedidos**, con los artículos, total, estado y guía de envío cuando se marque como enviado. Para actualizar un pedido, inicia sesión con una cuenta administradora y entra a **Administrar pedidos** desde la cuenta o abre `/admin/orders`. Los estados disponibles son **Pendiente de pago**, **Comprobante enviado**, **Pago confirmado**, **En preparación**, **Enviado** y **Cancelado**. Para marcarlo como enviado se requiere número de guía.

Los pedidos hechos como invitado se guardan con sus datos para administración, pero no aparecen en la cuenta de un usuario; para consultarlos, usa el panel de administración. Los invitados pueden consultar su pedido en `/seguimiento` con el número de orden y el mismo correo usado en el checkout.

## 8. Comprobantes y datos de transferencia

En SQL Editor, ejecuta `supabase/migrations/202610200003_payment_proofs.sql` después de las dos migraciones de pedidos. Crea un bucket privado para comprobantes; cada compra recibe una clave aleatoria de carga y el cliente puede adjuntar un PDF, JPG, PNG o WebP de hasta 5 MB. Solo administración puede abrir el archivo desde **Administrar pedidos**. Enviar el archivo cambia el estado a **Comprobante enviado**; el pago aún debe revisarse y confirmarse manualmente.

En desarrollo se muestra por defecto **Modo de prueba**, con datos claramente ficticios y una CLABE inválida para evitar transferencias reales. Para mantenerlo explícito, puedes usar `NEXT_PUBLIC_PAYMENT_MODE=demo` en `.env.local`. Cuando tengas datos bancarios reales, usa `NEXT_PUBLIC_PAYMENT_MODE=real` junto con `NEXT_PUBLIC_PAYMENT_BANK`, `NEXT_PUBLIC_PAYMENT_HOLDER`, `NEXT_PUBLIC_PAYMENT_CLABE` y, opcionalmente, `NEXT_PUBLIC_PAYMENT_ACCOUNT`. Sin modo `real` configurado, producción no mostrará la cuenta simulada. Reinicia el servidor después de modificar `.env.local`. No guardes claves secretas aquí.

## 9. Cargar comprobantes desde Mis pedidos

Ejecuta `supabase/migrations/202610200004_account_payment_proofs.sql` después de la migración de comprobantes. Esto habilita una clave de carga únicamente para pedidos pendientes del usuario autenticado, para que pueda adjuntar el comprobante desde **Mi cuenta > Mis pedidos** aunque haya cerrado la pantalla de compra. La pantalla final del checkout también conserva su opción de carga.

## 10. Guardar direcciones de envío

En **SQL Editor > New query**, ejecuta `supabase/migrations/202610230001_customer_addresses.sql`. Crea una tabla privada para las direcciones de cada cuenta, con permisos para que cada cliente consulte únicamente las suyas. Desde **Mi cuenta > Direcciones** se pueden agregar, editar, eliminar y marcar una dirección principal. Al finalizar una compra con sesión iniciada, el checkout permite elegir una dirección guardada o capturar otra. Las compras como invitado siguen usando el formulario manual.

## 11. Consultar pedidos de invitados

En **SQL Editor > New query**, ejecuta `supabase/migrations/202610230002_guest_order_lookup.sql` después de las migraciones de pedidos y administración. Los clientes invitados pueden abrir `/seguimiento` e ingresar el número del pedido y el correo usado al comprar. La consulta muestra el estado, los artículos y la guía de envío, pero no devuelve la dirección ni el teléfono del pedido.

## 12. Avisos de pedido por correo

La tienda usa Resend para enviar una confirmación cuando se registra el pedido y un aviso cada vez que administración cambia su estado. El correo de enviado incluye paquetería y guía. Crea una API key en Resend, verifica el dominio remitente y agrega estas variables a `.env.local` y al entorno de producción:

```env
RESEND_API_KEY=re_...
ORDER_EMAIL_FROM=El Club del Coleccionista <pedidos@tu-dominio.com>
```

El remitente debe usar un dominio verificado por Resend. Reinicia el servidor después de cambiar las variables. Si el correo falla, el pedido se conserva y la pantalla de administración informa que no se pudo enviar el aviso.

## 13. Ficha de producto

Las tarjetas del catálogo abren `/producto/[slug]`, con descripción, colección, idioma, existencias, selector de cantidad, carrito y compra directa. Los productos relacionados se eligen de la misma categoría. La ruta usa los productos activos guardados en Supabase.

## 14. Filtros, ofertas y preventas del catálogo

En **SQL Editor > New query**, ejecuta `supabase/migrations/202610230003_catalog_filters.sql`. Añade precio anterior, marca de preventa y fecha estimada de lanzamiento. El panel `/admin/products` permite mantener esos datos; el catálogo habilita filtros de categoría, colección, rango de precio, existencia, ofertas y preventas. Los filtros quedan en la URL para compartir o recargar la selección.

Con las migraciones 004 y 005 descritas abajo, las preventas reservan cupos usando el campo de existencias y guardan esa condición en cada artículo del pedido. Introduce únicamente la cantidad que puedes comprometer. El pago es por el total y el pedido se envía junto al estar completo.

## 15. Pantallas, galería, contacto y preventas

Ejecuta en orden las migraciones 202610230004_storefront_flow.sql, 202610230005_preorder_tracking.sql y 202610230006_guest_payment_resume.sql después de la 003. Añaden formatos, galería y destacados de productos; consultas privadas para administración; estado de preventa en el pedido; bloqueo de despacho hasta confirmar recepción; y acceso privado al pago para invitados.

El formulario de contacto guarda solicitudes en /admin/contacto. La función limita a tres solicitudes por correo por hora y solo los administradores pueden leerlas. La galería permite subir hasta ocho imágenes adicionales al bucket existente product-images.

En /admin/orders, los pedidos nuevos con preventas requieren confirmar que llegaron todas las unidades antes de pasar a preparación o enviado. Los cupos se descuentan usando el inventario existente y se restituyen al cancelar. El estado y la fecha prometida quedan guardados en order_items.

El correo inicial incluye un enlace privado /pedido/[numero]?token=… para regresar al pago y cargar un comprobante. Usa NEXT_PUBLIC_SITE_URL con el dominio correcto; no compartas enlaces privados. La recuperación de contraseña utiliza los correos de Supabase y vuelve a /auth/callback?next=/cuenta/nueva-contrasena.

Consulta FLUJO_TIENDA.md para el mapa de pantallas, la operación del catálogo, el recorrido de revisión y los puntos de negocio que faltan definir antes de publicar.

## 16. Tarifas de envío por estado

Ejecuta 202610230007_shipping_settings.sql después de la 006. En /admin/envios configura la tarifa general, excepciones por estado y el importe para envío gratuito (vacío lo desactiva). La función del checkout calcula el costo con estas tarifas en la base de datos y conserva los precios de pedidos anteriores. La página /envios y el checkout consultan la misma configuración.

Para activar esta entrega de una sola vez, puedes usar supabase/ACTIVAR_FLUJO_TIENDA.sql: reúne las migraciones 003 a 007 y requiere que las anteriores ya estén aplicadas.

## 17. Cancelar pedidos sin comprobante después de 24 horas

En Supabase, abre **Integrations > Cron** y habilita la extensión `pg_cron`. Después ejecuta `supabase/migrations/202610270002_auto_cancel_unpaid_orders.sql` en SQL Editor. La migración programa una revisión cada minuto: cancela pedidos que continúan en `pending_payment` 24 horas después de su creación y devuelve sus unidades al inventario. También impide subir el comprobante después del límite. Los pedidos cuyo comprobante ya se recibió pasan a revisión manual y no se cancelan automáticamente. Confirma en **Integrations > Cron > Jobs** que aparezca `cancel-expired-unpaid-orders` y revisa su historial para comprobar las ejecuciones.
