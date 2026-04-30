export interface Shipment {
  id: string;
  trackingNumber: string;
  name: string;
  postalCode: string;
  address: string;
  contact: string;
  packageVerified: string;
  beneficiary: string;
  concept: string;
  ibanLabel: string;
  ibanValue: string;
  shippingCost: string;
  packageCost: string;
  totalAmount: string;
  status: string;
  badge: string;
}

export interface Upload {
  id: string;
  image: string;
  trackingNumber: string;
  date: string;
}
