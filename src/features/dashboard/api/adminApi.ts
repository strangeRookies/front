import { apiRequest } from '../../../shared/api/client';

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
