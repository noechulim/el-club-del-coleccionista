export const mexicanStates = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
export const GENERAL_SHIPPING_MXN = 220;
export const FREE_SHIPPING_FROM_MXN = 1500;
export function shippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_FROM_MXN ? 0 : GENERAL_SHIPPING_MXN;
}
