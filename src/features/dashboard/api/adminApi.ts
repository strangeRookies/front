import { apiRequest, buildApiUrl, ApiError } from '../../../shared/api/client';
import { authStore } from '../../../shared/api/authStore';

export interface AdminUserResponse {
  userId: number;
  role: 'INDIVIDUAL' | 'CORPORATE';
  name: string;
  representative: string | null;
  contact: string | null;
  email: string;
  region: string | null;
  registeredAt: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';
  cameraCount: number;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

export async function fetchAdminUsers(page = 0, size = 100): Promise<PageResponse<AdminUserResponse>> {
  return apiRequest<PageResponse<AdminUserResponse>>(
    `/api/users/admin?page=${page}&size=${size}`,
  );
}

// ── 기업 관리 ──────────────────────────────────────────────

export interface AdminCompanyResponse {
  companyProfileId: number;
  companyName: string;
}

export async function fetchAdminCompanies(): Promise<AdminCompanyResponse[]> {
  return apiRequest<AdminCompanyResponse[]>('/api/admin/company-profiles');
}

// ── 기업용 카메라 관리 ─────────────────────────────────────

export interface CorporateCameraRequest {
  cameraName: string;
  cameraSerialNumber: string;
  cameraLoginId: string;
  password?: string;
  rtspUrl: string;
  locationDescription?: string;
  sourceType?: 'REAL_RTSP' | 'SIMULATED_RTSP';
  assignedVideoPath?: string;
}

export interface CorporateCameraResponse {
  cameraId: number;
  companyProfileId: number;
  cameraName: string;
  cameraSerialNumber: string;
  rtspUrl: string;
  locationDescription: string | null;
  cameraLoginId: string;
  passwordSet: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  sourceType: 'REAL_RTSP' | 'SIMULATED_RTSP';
  assignedVideoPath: string | null;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR' | 'DISABLED' | 'UNKNOWN';
  lastConnectionReportAt: string | null;
}

export interface BulkCorporateCameraUploadResult {
  successCount: number;
  failCount: number;
  registeredCameras: CorporateCameraResponse[];
  failedRows: { rowNumber: number; reason: string }[];
}

export async function registerAdminCamera(
  companyProfileId: number,
  data: CorporateCameraRequest,
): Promise<CorporateCameraResponse> {
  return apiRequest<CorporateCameraResponse>(
    `/api/admin/corporate-cameras/company/${companyProfileId}`,
    { method: 'POST', body: data },
  );
}

export async function bulkUploadCamerasForCompany(
  companyProfileId: number,
  file: File,
): Promise<BulkCorporateCameraUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const token = authStore.getAccessToken();
  const response = await fetch(
    buildApiUrl(`/api/admin/corporate-cameras/company/${companyProfileId}/bulk`),
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    },
  );

  const payload = await response.json();

  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || payload?.message || `업로드 실패 (${response.status})`;
    throw new ApiError(message, response.status, payload?.error?.code);
  }

  return payload.data;
}

export async function fetchAdminCamerasByCompany(
  companyProfileId: number,
): Promise<CorporateCameraResponse[]> {
  return apiRequest<CorporateCameraResponse[]>(
    `/api/admin/corporate-cameras/company/${companyProfileId}`,
  );
}

export async function deleteAdminCamera(cameraId: number): Promise<void> {
  return apiRequest<void>(
    `/api/admin/corporate-cameras/${cameraId}`,
    { method: 'DELETE' },
  );
}
