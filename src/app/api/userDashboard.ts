import { apiRequest } from '../../shared/api/client';

export interface UserProfile {
  email: string;
  name: string;
  phoneNumber: string;
  createdAt?: string;
}

/**
 * [GET] 내 프로필 정보 조회
 * URL: /api/mypage/profile
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/mypage/profile', {
    method: 'GET',
  });
}

/**
 * [PUT] 프로필 수정
 * URL: /api/mypage/profile
 */
export async function updateUserProfile(profile: UserProfile): Promise<void> {
  return apiRequest<void>('/api/mypage/profile', {
    method: 'PUT',
    body: profile,
  });
}

/**
 * [PUT] 비밀번호 변경
 * URL: /api/mypage/password
 */
export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest<void>('/api/mypage/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
}

/**
 * [DELETE] 회원 탈퇴
 * URL: /api/mypage/account
 */
export async function withdrawAccount(): Promise<void> {
  return apiRequest<void>('/api/mypage/account', {
    method: 'DELETE',
  });
}
