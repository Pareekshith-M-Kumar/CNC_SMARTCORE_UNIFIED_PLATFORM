export type AssetStatus =
  | 'MANUFACTURED'
  | 'IN_SHIPMENT'
  | 'DELIVERED'
  | 'REGISTERED'
  | 'VERIFIED'
  | 'RETIRED';

export interface PhysicalAsset {
  id: string;
  assetTag: string;
  orderId: string;
  orderNo: string;
  assetKind: string;
  status: AssetStatus;
  ownerId?: string;
  ownerName?: string;
  serialNo?: string;
  registered: boolean;
  registeredAt?: string | null;
  integrityOk: boolean;
  planHash?: string;
  machineCode?: string | null;
  machineLinked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAssetRequest {
  note?: string;
}

export interface LinkMachineRequest {
  machineCode: string;
  machineKind?: string;
  location?: string;
}
