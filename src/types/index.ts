export interface HealthcareFacility {
  id: string;
  name: string;
  type: string;
  ownership: 'public' | 'private' | 'unknown';
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  isOpen?: boolean;
  openUntil?: string;
  verified?: boolean;
  services: string[];
  place_id?: string;
}

export interface UserProfile {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  medicalConditions: string[];
  allergies: string[];
  medications: string[];
  bloodGroup: string;
}

export const EMPTY_PROFILE: UserProfile = {
  name: '',
  age: '',
  gender: 'male',
  height: '',
  weight: '',
  medicalConditions: [],
  allergies: [],
  medications: [],
  bloodGroup: '',
};

export interface ReportFile {
  id: string;
  name: string;
  size: number;
  base64: string;
  mimeType: string;
  uploadedAt: string;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error';
  analysisResult?: string;
}
