export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationInfo {
  name: string;
  subLocation?: string;
  coords: Coordinates;
  address?: string;
}

export interface Sampler {
  id: string;
  name: string;
  phone: string;
  homeBase: {
    name: string;
    coords: Coordinates;
  };
  currentLocation: {
    name: string;
    coords: Coordinates;
    subLocation?: string;
    lastUpdated?: string;
  };
  color: string;
  status: 'available' | 'busy' | 'off-duty';
  activeAssignments: string[]; // sample request IDs
}

export interface Company {
  id: string;
  name: string;
  whatsappGroup?: string;
}

export interface SampleRequest {
  id: string;
  harvestDate: string;
  farmerCode: string; // e.g. "Gnr"
  countTons: string;  // e.g. "90c-2tons"
  rateSpecs: string;  // e.g. "255+"
  locationName: string; // e.g. "Kuppanapudi"
  subLocation?: string; // e.g. "konalapalli"
  coords: Coordinates;
  googleMapsUrl?: string;
  ownerPhone: string; // e.g. "+919014747367"
  altContactName?: string; // e.g. "Madhu"
  altContactPhone?: string; // e.g. "9032259499"
  company: string; // e.g. "Sigma sea foods"
  assignedSamplerId?: string;
  status: 'pending' | 'assigned' | 'collected' | 'cancelled';
  distanceKm?: number;
  estimatedDuration?: string;
  rawMessage?: string;
  createdAt: string;
}

export interface AppSettings {
  googleMapsApiKey: string;
  mapCenter: Coordinates;
  mapZoom: number;
}
