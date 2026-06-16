import { apiRequest } from '../../shared/api/client';

export type CameraStatus = 'ACTIVE' | 'INACTIVE';
export type CameraSourceType = 'REAL_RTSP' | 'SIMULATED_RTSP';
export type CameraConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR' | 'DISABLED' | 'UNKNOWN';

export interface CameraResponse {
  cameraId: number;
  facilityId: number;
  cameraName: string;
  cameraSerialNumber: string;
  cameraLoginId: string;
  rtspUrl: string;
  status: CameraStatus;
  locationDescription: string;
  createdAt: string;
  updatedAt: string;
  sourceType?: CameraSourceType;
  assignedVideoPath?: string;
  connectionStatus?: CameraConnectionStatus;
  lastConnectionReportAt?: string;
  displayStreamUrl?: string;
}

export interface RegisterCameraRequest {
  cameraName: string;
  cameraSerialNumber: string;
  cameraLoginId?: string;
  cameraPassword?: string;
  rtspUrl?: string;
  locationDescription?: string;
  sourceType?: CameraSourceType;
}

export interface UpdateCameraRequest {
  cameraName?: string;
  rtspUrl?: string;
  status?: CameraStatus;
  locationDescription?: string;
  sourceType?: CameraSourceType;
}

/**
 * [POST] 특정 사업장(Facility)에 새로운 카메라를 등록합니다.
 * URL: /api/facilities/{facilityId}/cameras
 */
export async function registerCamera(facilityId?: number | string | null, data?: RegisterCameraRequest): Promise<CameraResponse> {
  const url = facilityId ? `/api/facilities/${facilityId}/cameras` : '/api/cameras';
  return apiRequest<CameraResponse>(url, {
    method: 'POST',
    body: data,
  });
}

/**
 * [GET] 특정 사업장에 등록된 모든 카메라 목록을 가져옵니다.
 * URL: /api/facilities/{facilityId}/cameras
 */
export async function fetchCamerasByFacility(facilityId?: number | string | null): Promise<CameraResponse[]> {
  const url = facilityId ? `/api/facilities/${facilityId}/cameras` : '/api/cameras';
  return apiRequest<CameraResponse[]>(url, {
    method: 'GET',
  });
}

export async function fetchActiveCameras(): Promise<CameraResponse[]> {
  return apiRequest<CameraResponse[]>('/api/cameras/active', {
    method: 'GET',
  });
}

/**
 * [PUT] 카메라 정보 수정
 * URL: /api/cameras/{cameraId}
 */
export async function updateCamera(cameraId: number | string, data: UpdateCameraRequest): Promise<CameraResponse> {
  return apiRequest<CameraResponse>(`/api/cameras/${cameraId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * [DELETE] 카메라 삭제
 * URL: /api/cameras/{cameraId}
 */
export async function deleteCamera(cameraId: number | string): Promise<void> {
  return apiRequest<void>(`/api/cameras/${cameraId}`, {
    method: 'DELETE',
  });
}
