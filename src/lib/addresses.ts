export type CustomerAddress = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  street: string;
  exterior_number: string;
  interior_number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

export type AddressDraft = Omit<CustomerAddress, "id" | "is_default"> & {
  id: string;
  is_default: boolean;
};

export const emptyAddressDraft: AddressDraft = {
  id: "",
  label: "Casa",
  recipient_name: "",
  phone: "",
  street: "",
  exterior_number: "",
  interior_number: "",
  neighborhood: "",
  city: "",
  state: "",
  postal_code: "",
  is_default: false,
};
