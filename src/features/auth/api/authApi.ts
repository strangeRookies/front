import { apiRequest } from '../../../shared/api/client';

export type FrontendAccountType = 'individual' | 'corporate' | 'admin';
export type BackendAccountType = 'INDIVIDUAL' | 'CORPORATE' | 'ADMIN';

export const AUTH_STORAGE_KEYS = {
  accessToken: 'smartSafety.accessToken',
  refreshToken: 'smartSafety.refreshToken',
  user: 'smartSafety.user',
  rememberedEmail: 'smartSafety.rememberedEmail',
} as const;

export interface SmsVerificationRequestResponse {
  verificationId: string;
}

export interface SmsVerificationConfirmResponse {
  verificationToken: string;
}

export interface LoginUser {
  id?: string | number;
  email?: string;
  name?: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
}

export interface AgreementPayload {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
}

export interface EmergencyJurisdictionRequest {
  postcode: string;
  address: string;
  addressDetail: string;
  region3DepthName?: string;
}

export interface EmergencyJurisdictionResponse {
  district: string;
  jurisdiction: string;
  stationName: string;
  centerName: string;
  stationAddress: string;
  latitude: number | null;
  longitude: number | null;
}

export interface IndividualSignupPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
  verificationToken: string;
  careTarget: {
    name: string;
    relation: string;
    ageGroup: string;
    postcode: string;
    address: string;
    addressDetail: string;
    region3DepthName?: string;
    district: string;
    jurisdiction: string;
  };
  emergencyContacts: Array<{
    name: string;
    relation: string;
    phone: string;
  }>;
  agreements: AgreementPayload;
}

export interface CorporateSignupPayload {
  email: string;
  password: string;
  phone: string;
  verificationToken: string;
  company: {
    name: string;
    businessNumber: string;
    industry: string;
    size: string;
    postcode: string;
    address: string;
    addressDetail: string;
    region3DepthName?: string;
    district: string;
    jurisdiction: string;
  };
  manager: {
    name: string;
    department: string;
    rank: string;
    email: string;
    contact: string;
  };
  installation: {
    count: string;
    preferredDate: string;
    specialRequest: string;
  };
  agreements: AgreementPayload;
}

export function toBackendAccountType(type: FrontendAccountType): BackendAccountType {
  return type === 'individual' ? 'INDIVIDUAL' : type === 'corporate' ? 'CORPORATE' : 'ADMIN';
}

export function roleToFrontendAccountType(role: string, fallback: FrontendAccountType): FrontendAccountType {
  const normalizedRole = role.toUpperCase();
  if (normalizedRole.includes('ADMIN')) {
    return 'admin';
  }
  if (normalizedRole.includes('CORPORATE') || normalizedRole.includes('COMPANY')) {
    return 'corporate';
  }
  if (normalizedRole.includes('INDIVIDUAL') || normalizedRole.includes('USER')) {
    return 'individual';
  }
  return fallback;
}

export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('010') ? digits : `010${digits}`;
}

export function normalizeBusinessNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function saveAuthSession(loginResponse: LoginResponse) {
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, loginResponse.accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, loginResponse.refreshToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(loginResponse.user));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

export async function requestSmsVerification(phone: string) {
  return apiRequest<SmsVerificationRequestResponse>('/api/auth/verifications/sms', {
    method: 'POST',
    body: {
      phone,
      purpose: 'SIGN_UP',
    },
  });
}

export async function confirmSmsVerification(verificationId: string, code: string) {
  return apiRequest<SmsVerificationConfirmResponse>('/api/auth/verifications/sms/confirm', {
    method: 'POST',
    body: {
      verificationId,
      code,
    },
  });
}

export async function checkEmailAvailability(email: string) {
  const data = await apiRequest<unknown>(`/api/auth/email-availability?email=${encodeURIComponent(email)}`);
  return readAvailability(data);
}

export async function checkBusinessNumberAvailability(businessNumber: string) {
  const data = await apiRequest<unknown>(
    `/api/companies/business-number-availability?businessNumber=${encodeURIComponent(businessNumber)}`,
  );
  return readAvailability(data);
}

export async function signupIndividual(payload: IndividualSignupPayload) {
  return apiRequest<unknown>('/api/auth/signup/individual', {
    method: 'POST',
    body: payload,
  });
}

export async function signupCorporate(payload: CorporateSignupPayload) {
  return apiRequest<unknown>('/api/auth/signup/corporate', {
    method: 'POST',
    body: payload,
  });
}

export async function resolveEmergencyJurisdiction(payload: EmergencyJurisdictionRequest) {
  return apiRequest<EmergencyJurisdictionResponse>('/api/emergency-jurisdictions/resolve', {
    method: 'POST',
    body: payload,
  });
}

export async function login(email: string, password: string, accountType: FrontendAccountType) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
      accountType: toBackendAccountType(accountType),
    },
  });
}

export async function reissueToken(refreshToken: string) {
  return apiRequest<Pick<LoginResponse, 'accessToken' | 'refreshToken'>>('/api/auth/reissue', {
    method: 'POST',
    body: { refreshToken },
  });
}

export async function logout(accessToken: string, refreshToken: string) {
  return apiRequest<unknown>('/api/auth/logout', {
    method: 'POST',
    accessToken,
    body: { refreshToken },
  });
}

function readAvailability(data: unknown): boolean {
  if (typeof data === 'boolean') {
    return data;
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.available === 'boolean') {
      return record.available;
    }
    if (typeof record.isAvailable === 'boolean') {
      return record.isAvailable;
    }
    if (typeof record.exists === 'boolean') {
      return !record.exists;
    }
  }
  return true;
}
