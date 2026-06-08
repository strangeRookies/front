const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export interface UserProfile {
  email: string;
  name: string;
  phoneNumber: string;
}

/**
 * [GET] 내 프로필 정보 조회
 * URL: /api/mypage/profile
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/mypage/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // TODO: 인증 연동 시 실제 토큰으로 교체 필요
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  });

  if (!response.ok) {
    throw new UserDashboardApiError(response.status, '프로필 정보를 불러오는데 실패했습니다.');
  }

  return response.json();
}

/**
 * [PUT] 프로필 수정
 * URL: /api/mypage/profile
 */
export async function updateUserProfile(profile: UserProfile): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/mypage/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // TODO: 인증 연동 시 실제 토큰으로 교체 필요
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new UserDashboardApiError(response.status, '프로필 수정에 실패했습니다.');
  }
}

export class UserDashboardApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'UserDashboardApiError';
    this.status = status;
  }
}
