"use client";
import { StoreSelect } from "@/components/store-select";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AddressDraft, CustomerAddress } from "@/lib/addresses";
import { emptyAddressDraft } from "@/lib/addresses";
import { deleteCustomerAddress, saveCustomerAddress, type FormState } from "./actions";

const states = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];

export function AddressManager({ addresses, loadError }: { addresses: CustomerAddress[]; loadError?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AddressDraft>(emptyAddressDraft);
  const [state, saveAction, saving] = useActionState<FormState, FormData>(async (previous, formData) => { const result = await saveCustomerAddress(previous, formData); if (result.message) { setDraft(emptyAddressDraft); router.refresh(); } return result; }, {});
  const [deleteError, setDeleteError] = useState("");
  const [deleting, startDelete] = useTransition();


  function editAddress(address: CustomerAddress) {
    setDraft({ ...address });
    setDeleteError("");
  }

  function removeAddress(id: string, label: string) {
    if (!window.confirm(`¿Eliminar la dirección “${label}”?`)) return;
    const formData = new FormData();
    formData.set("id", id);
    setDeleteError("");
    startDelete(async () => {
      const result = await deleteCustomerAddress(formData);
      setDeleteError(result.error ?? "");
      if (!result.error) router.refresh();
    });
  }

  return <div className="address-manager">
    <header className="workspace-heading"><div><p className="workspace-eyebrow">ENVÍOS</p><h2>Direcciones</h2><p>Guarda tus destinos para terminar más rápido tus compras.</p></div><span className="workspace-count">{addresses.length} {addresses.length === 1 ? "dirección" : "direcciones"}</span></header>

    {loadError && <p className="form-error" role="alert">{loadError}</p>}
    {addresses.length > 0 && <div className="saved-address-list">{addresses.map((address) => <article className="saved-address-card" key={address.id}>
      <div className="saved-address-copy"><div className="saved-address-title"><h3>{address.label}</h3>{address.is_default && <span>Principal</span>}</div><p><strong>{address.recipient_name}</strong>{address.phone ? ` · ${address.phone}` : ""}</p><p>{address.street} {address.exterior_number}{address.interior_number ? ` int. ${address.interior_number}` : ""}, {address.neighborhood}, {address.city}, {address.state}, CP {address.postal_code}</p></div>
      <div className="saved-address-actions"><button className="address-action" type="button" onClick={() => editAddress(address)}>Editar</button><button className="address-action address-action-danger" type="button" disabled={deleting} onClick={() => removeAddress(address.id, address.label)}>Eliminar</button></div>
    </article>)}</div>}

    <form key={draft.id || "new-address"} action={saveAction} className="address-editor">
      <div className="address-editor-heading"><div><p className="workspace-eyebrow">{draft.id ? "ACTUALIZAR" : "NUEVA"}</p><h3>{draft.id ? "Editar dirección" : "Agregar dirección"}</h3></div>{draft.id && <button className="address-action" type="button" onClick={() => setDraft(emptyAddressDraft)}>Cancelar</button>}</div>
      <input type="hidden" name="id" value={draft.id} />
      <div className="address-form-grid">
        <label>Etiqueta<input name="label" defaultValue={draft.label} maxLength={40} placeholder="Casa, trabajo…" required /></label>
        <label>Nombre de quien recibe<input name="recipientName" defaultValue={draft.recipient_name} maxLength={120} autoComplete="name" required /></label>
        <label>Teléfono <span className="address-optional">opcional</span><input name="phone" type="tel" defaultValue={draft.phone} maxLength={30} autoComplete="tel" /></label>
        <label className="address-wide">Calle<input name="street" defaultValue={draft.street} maxLength={120} autoComplete="address-line1" required /></label>
        <label>Número exterior<input name="exteriorNumber" defaultValue={draft.exterior_number} maxLength={20} required /></label>
        <label>Número interior <span className="address-optional">opcional</span><input name="interiorNumber" defaultValue={draft.interior_number} maxLength={20} /></label>
        <label className="address-wide">Colonia<input name="neighborhood" defaultValue={draft.neighborhood} maxLength={100} autoComplete="address-level3" required /></label>
        <label>Ciudad o municipio<input name="city" defaultValue={draft.city} maxLength={100} autoComplete="address-level2" required /></label>
        <label>Estado<StoreSelect label="Estado" name="state" defaultValue={draft.state} autoComplete="address-level1" required><option value="" disabled>Selecciona tu estado</option>{states.map((item) => <option key={item} value={item}>{item}</option>)}</StoreSelect></label>
        <label>Código postal<input name="postalCode" defaultValue={draft.postal_code} inputMode="numeric" pattern="[0-9]{5}" minLength={5} maxLength={5} autoComplete="postal-code" required /></label>
      </div>
      <label className="address-default-check"><input name="isDefault" type="checkbox" defaultChecked={draft.is_default} /><span>Usar como dirección principal</span></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.message && <p className="form-notice" role="status">{state.message}</p>}{deleteError && <p className="form-error" role="alert">{deleteError}</p>}
      <button className="auth-submit profile-submit" disabled={saving}>{saving ? "Guardando…" : draft.id ? "Guardar dirección" : "Agregar dirección"}</button>
    </form>
  </div>;
}
