import { apiRequest } from '../../../shared/api/client';
import { authStore } from '../../../shared/api/authStore';

export type FrontendAccountType = 'individual' | 'corporate' | 'admin';
export type BackendAccountType = 'INDIVIDUAL' | 'CORPORATE' | 'ADMIN';

export const AUTH_STORAGE_KEYS = {
  accessToken: 'smartSafety.accessToken',
  refreshToken: 'smartSafety.refreshToken',
  user: 'smartSafety.user',
  rememberedEmail: 'smartSafety.rememberedEmail',
} as const;

export interface SmsVerificationRequestResponse {
  verificationId: number | string;
  expiresIn?: number;
}

export interface SmsVerificationConfirmResponse {
  verificationToken: string;
}

export interface PasswordResetVerificationResponse {
  expiresIn?: number;
}

export interface PasswordResetVerificationConfirmResponse {
  verified: boolean;
  verificationToken: string;
}

export interface PasswordResetVerificationConfirmPayload {
  email: string;
  phone: string;
  code: string;
}

export interface PasswordResetRequestPayload {
  email: string;
  phone: string;
  verificationToken: string;
  newPassword: string;
}

export interface LoginUser {
  id?: string | number;
  email?: string;
  name?: string;
  role: string;
  facilityId?: number;
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
  installation?: {
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
  authStore.setSession(loginResponse.accessToken, loginResponse.refreshToken, loginResponse.user);
}

export function clearAuthSession() {
  authStore.clearSession();
  // 브라우저에 남아있을 수 있는 기존 토큰 정보들을 강제로 삭제하여 청소합니다.
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

export async function confirmSmsVerification(verificationId: number | string, code: string) {
  return apiRequest<SmsVerificationConfirmResponse>('/api/auth/verifications/sms/confirm', {
    method: 'POST',
    body: {
      verificationId,
      code,
    },
  });
}

export async function requestPasswordResetSms(email: string, phone: string) {
  return apiRequest<PasswordResetVerificationResponse>('/api/auth/password-reset/verifications/sms', {
    method: 'POST',
    body: {
      email,
      phone,
    },
  });
}

export async function confirmPasswordResetSms(payload: PasswordResetVerificationConfirmPayload) {
  return apiRequest<PasswordResetVerificationConfirmResponse>('/api/auth/password-reset/verifications/sms/confirm', {
    method: 'POST',
    body: payload,
  });
}

export async function resetPassword(payload: PasswordResetRequestPayload) {
  return apiRequest<null>('/api/auth/password-reset', {
    method: 'POST',
    body: payload,
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
