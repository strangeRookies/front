import { apiRequest } from './client';

export type InquiryCategory = 'CAMERA_VIDEO' | 'NOTIFICATION_ALARM' | 'MOBILE' | 'OTHER';
export type InquiryStatus = 'WAITING' | 'ANSWERED';

export interface Inquiry {
  id: number;
  userEmail: string;
  userName: string;
  category: InquiryCategory;
  categoryDescription: string;
  title: string;
  content: string;
  status: InquiryStatus;
  statusDescription: string;
  replyContent: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface SubmitInquiryPayload {
  category: InquiryCategory;
  title: string;
  content: string;
}

export interface SubmitAnswerPayload {
  answer: string;
}

/**
 * [POST] 문의 등록
 */
export async function submitInquiry(payload: SubmitInquiryPayload): Promise<number> {
  return apiRequest<number>('/api/inquiries', {
    method: 'POST',
    body: payload,
  });
}

/**
 * [GET] 내 문의 목록 조회
 */
export async function fetchMyInquiries(): Promise<Inquiry[]> {
  return apiRequest<Inquiry[]>('/api/inquiries/my', {
    method: 'GET',
  });
}

/**
 * [GET] 문의 상세 조회
 */
export async function fetchInquiryDetail(inquiryId: number): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/inquiries/${inquiryId}`, {
    method: 'GET',
  });
}

/**
 * [GET] 관리자용 전체 문의 내역 조회
 */
export async function fetchAllInquiries(): Promise<Inquiry[]> {
  return apiRequest<Inquiry[]>('/api/inquiries', {
    method: 'GET',
  });
}

/**
 * [POST] 문의 답변 등록 (관리자 전용)
 */
export async function submitInquiryAnswer(inquiryId: number, answer: string): Promise<void> {
  return apiRequest<void>(`/api/inquiries/${inquiryId}/answer`, {
    method: 'POST',
    body: { answer },
  });
}

/**
 * UI 레이블을 백엔드 카테고리 코드로 변환
 */
export function mapLabelToCategory(label: string): InquiryCategory {
  switch (label) {
    case '카메라 및 영상': return 'CAMERA_VIDEO';
    case '알림 및 경보': return 'NOTIFICATION_ALARM';
    case '모바일': return 'MOBILE';
    default: return 'OTHER';
  }
}
