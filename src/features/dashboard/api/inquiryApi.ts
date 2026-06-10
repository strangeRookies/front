import { apiRequest } from '../../../shared/api/client';
import type { Inquiry, InquiryCategory, InquiryCategoryRaw } from '../../../shared/types/inquiry';

const CATEGORY_TO_RAW: Record<InquiryCategory, InquiryCategoryRaw> = {
  '카메라 및 영상': 'CAMERA_VIDEO',
  '알림 및 경보': 'ALERT_ALARM',
  '모바일': 'MOBILE',
  '기타': 'OTHER',
};

interface InquiryApiResponse {
  id: number;
  userEmail: string;
  userName: string;
  userRole: 'INDIVIDUAL' | 'CORPORATE';
  categoryDescription: string;
  title: string;
  content: string;
  status: 'WAITING' | 'COMPLETED';
  replyContent: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
  createdAt: string;
}

function mapResponse(r: InquiryApiResponse): Inquiry {
  return {
    id: r.id,
    userEmail: r.userEmail,
    userName: r.userName,
    userRole: r.userRole,
    category: r.categoryDescription as InquiryCategory,
    title: r.title,
    content: r.content,
    status: r.status,
    replyContent: r.replyContent,
    repliedByName: r.repliedByName,
    repliedAt: r.repliedAt,
    createdAt: r.createdAt,
  };
}

export async function fetchMyInquiries(): Promise<Inquiry[]> {
  const data = await apiRequest<InquiryApiResponse[]>('/api/inquiries/my');
  return data.map(mapResponse);
}

export async function createInquiry(
  category: InquiryCategory,
  title: string,
  content: string,
): Promise<void> {
  await apiRequest('/api/inquiries', {
    method: 'POST',
    body: { category: CATEGORY_TO_RAW[category], title, content },
  });
}

export async function fetchAllInquiries(): Promise<Inquiry[]> {
  const data = await apiRequest<InquiryApiResponse[]>('/api/inquiries');
  return data.map(mapResponse);
}

export async function answerInquiry(inquiryId: number, answer: string): Promise<void> {
  await apiRequest(`/api/inquiries/${inquiryId}/answer`, {
    method: 'POST',
    body: { answer },
  });
}
