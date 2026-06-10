import { apiRequest } from '../../shared/api/client';

export type CameraStatus = 'ACTIVE' | 'INACTIVE';

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
}

export interface RegisterCameraRequest {
  cameraName: string;
  cameraSerialNumber: string;
  cameraLoginId?: string;
  cameraPassword?: string;
  rtspUrl?: string;
  locationDescription?: string;
}

export interface UpdateCameraRequest {
  cameraName?: string;
  rtspUrl?: string;
  status?: CameraStatus;
  locationDescription?: string;
}

/**
 * [POST] 특정 사업장(Facility)에 새로운 카메라를 등록합니다.
 * URL: /api/facilities/{facilityId}/cameras
 */
export async function registerCamera(facilityId: number | string, data: RegisterCameraRequest): Promise<CameraResponse> {
  return apiRequest<CameraResponse>(`/api/facilities/${facilityId}/cameras`, {
    method: 'POST',
    body: data,
  });
}

/**
 * [GET] 특정 사업장에 등록된 모든 카메라 목록을 가져옵니다.
 * URL: /api/facilities/{facilityId}/cameras
 */
export async function fetchCamerasByFacility(facilityId: number | string): Promise<CameraResponse[]> {
  return apiRequest<CameraResponse[]>(`/api/facilities/${facilityId}/cameras`, {
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
