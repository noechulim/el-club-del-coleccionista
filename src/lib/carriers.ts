export type CarrierDetails = {
  name: string;
  trackingNumber: string;
  trackingUrl: string;
  portalUrl?: string;
};

export function getCarrierTracking(
  rawCarrier?: string | null,
  rawTracking?: string | null
): CarrierDetails | null {
  const trackingNumber = (rawTracking || "").trim();
  if (!trackingNumber) return null;

  const carrier = (rawCarrier || "").trim().toLowerCase();

  // Estafeta
  if (carrier.includes("estafeta")) {
    return {
      name: "Estafeta",
      trackingNumber,
      trackingUrl: `https://rastreo.estafeta.com/?guia=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.estafeta.com/Herramientas/Rastreo",
    };
  }

  // FedEx
  if (carrier.includes("fedex")) {
    return {
      name: "FedEx",
      trackingNumber,
      trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.fedex.com/mx/track/",
    };
  }

  // DHL
  if (carrier.includes("dhl")) {
    return {
      name: "DHL Express",
      trackingNumber,
      trackingUrl: `https://www.dhl.com/mx-es/home/rastreo/rastreo-express.html?submit=1&tracking-id=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.dhl.com/mx-es/home/rastreo.html",
    };
  }

  // Paquetexpress
  if (carrier.includes("paquetexpress") || carrier.includes("paquete express")) {
    return {
      name: "Paquetexpress",
      trackingNumber,
      trackingUrl: `https://www.paquetexpress.com.mx/rastreo?tracking=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.paquetexpress.com.mx",
    };
  }

  // Redpack
  if (carrier.includes("redpack")) {
    return {
      name: "Redpack",
      trackingNumber,
      trackingUrl: `https://www.redpack.com.mx/es/rastreo/?guia=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.redpack.com.mx",
    };
  }

  // J&T Express
  if (carrier.includes("j&t") || carrier.includes("jyt") || carrier.includes("jt")) {
    return {
      name: "J&T Express",
      trackingNumber,
      trackingUrl: `https://www.jtexpress.mx/trajectoryQuery?bills=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.jtexpress.mx",
    };
  }

  // Sepomex / Correos de México
  if (carrier.includes("sepomex") || carrier.includes("correos")) {
    return {
      name: "Correos de México",
      trackingNumber,
      trackingUrl: "https://www.correosdemexico.gob.mx/SSLServicios/SeguimientoEnvio/Seguimiento.aspx",
      portalUrl: "https://www.correosdemexico.gob.mx",
    };
  }

  // 99 Minutos
  if (carrier.includes("99") || carrier.includes("minutos")) {
    return {
      name: "99 Minutos",
      trackingNumber,
      trackingUrl: `https://tracking.99minutos.com/search?trackingNumber=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://www.99minutos.com",
    };
  }

  // Sendex
  if (carrier.includes("sendex")) {
    return {
      name: "Sendex",
      trackingNumber,
      trackingUrl: `https://sendex.mx/rastreo/?guia=${encodeURIComponent(trackingNumber)}`,
      portalUrl: "https://sendex.mx",
    };
  }

  // Fallback con el nombre registrado
  const displayName = rawCarrier?.trim() || "Paquetería";
  return {
    name: displayName,
    trackingNumber,
    trackingUrl: `https://www.google.com/search?q=${encodeURIComponent(`${displayName} rastreo guia ${trackingNumber}`)}`,
  };
}
