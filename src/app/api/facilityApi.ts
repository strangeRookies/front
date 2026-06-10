import { apiRequest } from '../../shared/api/client';

export interface FacilityResponse {
  facilityId: number;
  facilityName: string;
  address: string;
  contactNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * [GET] 내 사업장 목록 조회
 * 현재 로그인한 사용자와 연결된(user_facility 테이블에 등록된) 사업장 목록을 가져옵니다.
 * URL: /api/facilities
 */
export async function fetchMyFacilities(): Promise<FacilityResponse[]> {
  const response = await apiRequest<any>('/api/facilities', {
    method: 'GET',
  });

  // 백엔드 확인 결과: 전체 구조는 { success: true, data: { content: [...] } }
  // apiRequest가 이미 payload.data를 반환하므로, 여기서 response는 Page 객체입니다.
  if (response && Array.isArray(response.content)) {
    return response.content;
  }
  
  // 예외 케이스 처리 (배열로 바로 오는 경우 등)
  return Array.isArray(response) ? response : [];
}

/**
 * [POST] 새 사업장 등록
 * URL: /api/facilities
 */
export async function registerFacility(data: {
  facilityName: string;
  address: string;
  contactNumber: string;
}): Promise<FacilityResponse> {
  return apiRequest<FacilityResponse>('/api/facilities', {
    method: 'POST',
    body: data,
  });
}
