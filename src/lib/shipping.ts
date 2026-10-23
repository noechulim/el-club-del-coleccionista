export const mexicanStates = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
export type ShippingConfig = { base_cost: number; free_from: number | null; state_rates: Record<string, number> };
export const defaultShipping: ShippingConfig = { base_cost: 220, free_from: 1500, state_rates: {} };
export function shippingCost(config: ShippingConfig, subtotal: number, state: string) {
  if (config.free_from !== null && subtotal >= Number(config.free_from)) return 0;
  return Number(config.state_rates[state] ?? config.base_cost);
}
