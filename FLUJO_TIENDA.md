n# Flujo de El Club del Coleccionista

## Pantallas conectadas

| Área | Rutas y comportamiento |
| --- | --- |
| Inicio | `/`: categorías, expansiones derivadas de productos publicados, productos destacados o recientes y acceso a ofertas. |
| Catálogo | `/catalogo`: búsqueda inmediata, filtros por categoría/formato/expansión/precio/disponibilidad, ordenamiento y páginas de 12 productos. Estado compartible en la URL. |
| Categorías | `/categorias` y `/categorias/[slug]`: sellados, siete formatos de sellados, cartas individuales, calificadas y accesorios. |
| Expansiones | `/expansiones` y `/expansiones/[nombre]`: productos agrupados por el campo colección; no se inventan colecciones ni inventarios. |
| Selecciones | `/ofertas`: filtro base fijo aunque se limpie la búsqueda. |
| Producto | `/producto/[slug]`: galería, ampliación, especificaciones, cantidad, descuentos, compra directa y recomendaciones. |
| Compra | `/carrito` → `/checkout` → confirmación con transferencia y carga de comprobante. Compra como invitado o con sesión. |
| Volver al pedido | `/pedido/[numero]?token=…`: enlace privado para consultar total/estado/instrucciones y subir un comprobante pendiente. El enlace se muestra en confirmación y se incluye en el correo inicial. |
| Seguimiento | `/seguimiento`: número y correo para pedidos de invitados. La cuenta muestra las compras asociadas a su usuario. |
| Cuenta | `/cuenta`: inicio, registro, perfil, direcciones y pedidos; `/cuenta/recuperar` y `/cuenta/nueva-contrasena`: recuperación. |
| Atención | `/contacto`: guarda consultas en Supabase; `/preguntas-frecuentes`, `/envios`, `/cambios-y-devoluciones`, `/aviso-de-privacidad`, `/terminos-y-condiciones`. |
| Administración | `/admin`: resumen; `/admin/products`: catálogo, formatos, destacados, ofertas e imágenes; `/admin/orders`: filtros, comprobantes y estados; `/admin/contacto`: bandeja y estado de atención; `/admin/envios`: tarifas generales y por estado. |

## Activación de esta entrega

**Opción rápida:** ejecutar `supabase/ACTIVAR_FLUJO_TIENDA.sql` en Supabase SQL Editor. Reúne las migraciones 003 a 007 y al final desactiva las preventas. Requiere las anteriores hasta la 002.

Después, habilitar **Supabase Cron (`pg_cron`)** en Integrations > Cron y ejecutar `supabase/migrations/202610270002_auto_cancel_unpaid_orders.sql`. Esa migración crea la cancelación automática y programa la revisión cada minuto.

**Opción por migraciones:** ejecutar en orden, después de todas las migraciones anteriores:

1. `supabase/migrations/202610230003_catalog_filters.sql` si aún no se aplicó.
2. `supabase/migrations/202610230004_storefront_flow.sql`.
3. `supabase/migrations/202610230005_preorder_tracking.sql`.
4. `supabase/migrations/202610230006_guest_payment_resume.sql`.
5. `supabase/migrations/202610230007_shipping_settings.sql`.
6. `supabase/migrations/202610270001_remove_preorders.sql` para retirar las reservas de preventa y su bloqueo al preparar o enviar pedidos. Conserva los campos antiguos de pedidos solo para compatibilidad; no se usan en la tienda.
7. Habilitar **Supabase Cron (`pg_cron`)** en Integrations > Cron y ejecutar `supabase/migrations/202610270002_auto_cancel_unpaid_orders.sql`.

No se ejecutaron estas migraciones contra la base remota desde este trabajo. Los campos nuevos se activan al aplicarlas; antes, las consultas públicas siguen leyendo el catálogo existente, pero guardar los nuevos datos requiere el esquema actualizado.

Configurar `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` y las variables bancarias documentadas en `SUPABASE_SETUP.md`. Mantener `NEXT_PUBLIC_PAYMENT_MODE=demo` durante la maqueta. Supabase debe permitir los redirects del dominio para confirmación, Google y recuperación; el correo de recuperación lo envía Supabase, no Resend.

## Operación

- **Formatos:** editar cada producto sellado y asignar su formato; no se adivina el formato a partir del nombre.
- **Expansiones:** usar el mismo nombre de colección para agrupar productos. Las tarjetas utilizan una imagen de los productos de esa colección.
- **Galería:** subir imagen principal y hasta ocho adicionales, o pegar sus URLs. Se conservan las imágenes al editar sin subir otra.
- **Destacados:** marcar los productos para el inicio. Si no hay destacados, se muestran los ocho más recientes.
- **Ofertas:** el precio anterior debe superar al actual; el porcentaje se calcula automáticamente.
- **Consultas:** la bandeja permite marcar nuevas, en atención y resueltas. “Responder con mi correo” abre el cliente de correo del administrador; no envía automáticamente respuestas.
- **Invitados:** guardar el enlace privado o recuperarlo del correo inicial. El número y correo del seguimiento no otorgan acceso a cargar comprobantes. Los tokens no deben compartirse.

## Recorrido para revisar con datos de prueba

1. Publicar productos de varios formatos, uno destacado y uno en oferta con dos imágenes.
2. Abrir catálogo, escribir y limpiar una búsqueda, cambiar filtros/orden y volver con el navegador; comprobar estados vacíos y URL.
3. Entrar desde categoría y expansión; abrir producto, cambiar imagen, ampliar, ajustar cantidad y agregar al carrito.
4. Comprar como invitado y guardar el enlace privado. Abrirlo de nuevo y subir un comprobante de prueba.
5. En administración revisar comprobante, confirmar pago, preparar y registrar paquetería/guía. Consultar seguimiento con número/correo.
7. Crear una cuenta, guardar dirección, comprar, consultar pedidos y recuperar contraseña mediante el correo.
8. Enviar una consulta de prueba y gestionarla desde administración. Los clientes sin permisos no deben ver la bandeja.

## Alcance operativo pendiente de negocio

- El pago sigue siendo transferencia con revisión manual. No hay pasarela de tarjeta ni reembolsos bancarios automáticos.
- La guía se captura manualmente; no se contrata una etiqueta con la paquetería desde el sitio.
- `/admin/envios` permite configurar tarifa general, tarifas por estado y umbral de envío gratuito. Los valores iniciales conservan $220 MXN y envío gratis desde $1,500 MXN. Los pedidos ya creados mantienen su costo.
- Los textos de ayuda describen el flujo implementado. Privacidad y condiciones son contenido inicial de maqueta: completar identidad/domicilio del responsable, contacto oficial, plazos de conservación, cambios, devoluciones y cancelación antes de publicar.
- Los pedidos sin comprobante se cancelan automáticamente al cumplir 24 horas y las unidades regresan al inventario. Los pedidos con comprobante enviado permanecen en revisión; el sistema no puede confirmar por sí mismo que una transferencia llegó al banco. La cancelación automática no envía correo.
- La limitación de contacto es de tres consultas por correo por hora; para una tienda pública de alto tráfico conviene agregar protección antiabuso adicional en el proveedor de hosting.
- La compilación y el análisis estático no comprueban pagos, correos ni permisos en la base remota. Esos recorridos requieren las migraciones y las credenciales configuradas.
