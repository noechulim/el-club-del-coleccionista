export const faqs = [
  ["¿Necesito una cuenta para comprar?", "Puedes comprar como invitado. Conserva tu número de pedido y utiliza el mismo correo para consultar el seguimiento. Con una cuenta puedes ver tu historial y guardar direcciones."],
  ["¿Cómo realizo el pago?", "Después de confirmar el pedido verás las instrucciones de transferencia. Sube tu comprobante desde la confirmación o, si compraste con una cuenta, desde Mis pedidos. La tienda revisa el comprobante antes de confirmar el pago."],
  ["¿Cuánto cuesta el envío?", "Consulta las tarifas actuales en la sección Envíos. El costo se calcula según el estado de entrega y el importe de la compra; verás el total antes de confirmar."],
  ["¿Cómo sé que mi pedido ya fue enviado?", "Consulta Rastrea tu pedido o Mis pedidos. Cuando la tienda registre el envío aparecerán la paquetería y el número de guía. Los avisos por correo complementan este seguimiento."],
  ["¿Cómo funcionan las preventas?", "Reservas una unidad de los cupos publicados y pagas el total del pedido. La fecha de lanzamiento es estimada. Si tu pedido incluye productos disponibles y preventas, se envía junto cuando todos estén disponibles. Puedes hacer pedidos separados si necesitas envíos independientes."],
  ["¿Qué significa Comprobante enviado?", "Recibimos tu archivo, pero el pago todavía está en revisión. El estado cambia a Pago confirmado cuando la tienda lo valida."],
  ["¿Puedo cambiar mi dirección después de comprar?", "Escríbenos desde Contacto con tu número de pedido lo antes posible. Editar una dirección guardada no cambia la dirección de un pedido ya registrado."],
  ["¿Qué hago si recibí un producto incorrecto o dañado?", "Conserva el empaque y las evidencias del producto recibido. Abre una consulta de Cambio o devolución con tu número de pedido para revisar el caso."],
  ["¿En qué idioma están los productos?", "El catálogo actual trabaja con productos en inglés. Revisa siempre el idioma y las especificaciones en la ficha del producto."],
];
// Operational copy for the prototype. Complete merchant identity and approve policies before launch.
export const helpPages = {
  envios: { title: "Envíos", intro: "Consulta cómo pasa tu pedido de nuestra tienda a tu colección.", sections: [
    ["Costo de envío", "Las tarifas vigentes se muestran arriba. El envío se calcula según el estado de entrega; los descuentos por importe de compra se aplican automáticamente. El costo definitivo aparece antes de confirmar el pedido."],
    ["Preparación y seguimiento", "El pedido se prepara después de confirmar el pago. Cuando se registra el envío, podrás consultar la paquetería y la guía en Rastrea tu pedido o en tu cuenta. La fecha de entrega depende de la paquetería y del destino; no se muestra una fecha garantizada antes del despacho."],
    ["Pedidos con preventa", "Se despachan cuando todos sus productos estén disponibles. Las fechas de lanzamiento son estimadas y pueden cambiar. Si necesitas recibir antes los productos disponibles, realiza pedidos separados."],
    ["Datos de entrega", "Revisa calle, número exterior, colonia, municipio, estado y código postal antes de confirmar. Para solicitar cambios en un pedido existente, contacta a la tienda con su número de pedido."],
  ] },
  "cambios-y-devoluciones": { title: "Cambios y devoluciones", intro: "Te ayudamos a revisar cualquier incidencia con tu compra.", sections: [
    ["Cómo solicitar una revisión", "Abre una consulta en Contacto y selecciona Cambio o devolución. Incluye tu número de pedido, el artículo y una descripción de lo ocurrido. Conserva el empaque y las evidencias disponibles."],
    ["Seguimiento de la solicitud", "La tienda revisará el caso y te indicará los pasos para una solución y, cuando corresponda, cómo realizar la devolución. Evita enviar paquetes sin coordinar previamente la recepción."],
    ["Antes del envío", "Si necesitas cancelar o corregir un pedido, contacta a la tienda. La actualización de estado se refleja en tu cuenta o en el seguimiento de invitados. Una cancelación en el sistema no ejecuta automáticamente una devolución bancaria."],
  ] },
  "aviso-de-privacidad": { title: "Privacidad", intro: "Información sobre los datos que utiliza esta tienda.", sections: [
    ["Datos para tu compra", "El Club del Coleccionista solicita nombre, correo, dirección de entrega y, opcionalmente, teléfono para registrar y atender pedidos. Los comprobantes de transferencia se almacenan de forma privada para revisar el pago."],
    ["Cuenta y consultas", "Si creas una cuenta, puedes guardar direcciones y consultar tus pedidos. El formulario de contacto guarda tu nombre, correo, asunto y mensaje para que la tienda atienda la consulta. No incluyas contraseñas ni datos completos de tarjetas."],
    ["Almacenamiento y proveedores", "El carrito se conserva en el almacenamiento local de tu navegador y se usan cookies para mantener la sesión. La tienda utiliza Supabase para autenticación, datos y archivos, y un proveedor de correo para las notificaciones cuando está configurado. Los datos de entrega se utilizan para coordinar el envío."],
    ["Consultas sobre tus datos", "Puedes solicitar información o una revisión de tus datos mediante Contacto, seleccionando Privacidad y datos personales. Indica el correo asociado a tu compra o cuenta; no publiques credenciales."],
  ] },
  "terminos-y-condiciones": { title: "Condiciones de compra", intro: "Cómo se registra y se atiende tu pedido en El Club del Coleccionista.", sections: [
    ["Productos y precios", "Los precios se muestran en pesos mexicanos (MXN). Revisa descripción, idioma, condición y contenido antes de comprar. Los precios y existencias se vuelven a validar al confirmar el pedido. Un artículo en el carrito no constituye una reserva."],
    ["Pedido y pago", "La confirmación registra el pedido como pendiente de pago y reserva las unidades. El pago se realiza por transferencia y la tienda revisa el comprobante. Subir un comprobante no confirma por sí solo la recepción del dinero."],
    ["Preventas", "Los productos marcados como preventa corresponden a unidades reservables de un próximo lanzamiento. El pago cubre el total. Las fechas son estimadas y el pedido se despacha cuando todos sus artículos están disponibles."],
    ["Comunicación y atención", "Conserva tu número de pedido para consultar el estado. Para incidencias de pago, envío, cambios o cancelación, utiliza Contacto. La tienda revisa las solicitudes y comunica los pasos correspondientes."],
  ] },
} as const;
