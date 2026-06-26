import { apiRequest } from '../../shared/api/client';

export interface AdminCompanyResponse {
  companyProfileId: number;
  companyName: string;
}

/**
 * [GET] 내 회사 프로필 조회
 * 현재 로그인한 기업 사용자(userType: 'corporate')의 회사 정보를 가져옵니다.
 * URL: /api/companies/me
 */
export async function fetchMyCompany(): Promise<AdminCompanyResponse> {
  return apiRequest<AdminCompanyResponse>('/api/companies/me', {
    method: 'GET',
  });
}
