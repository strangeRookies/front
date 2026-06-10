export type InquiryCategory = '카메라 및 영상' | '알림 및 경보' | '모바일' | '기타';
export type InquiryCategoryRaw = 'CAMERA_VIDEO' | 'ALERT_ALARM' | 'MOBILE' | 'OTHER';

export interface Inquiry {
  id: number;
  userEmail: string;
  userName: string;
  userRole: 'INDIVIDUAL' | 'CORPORATE';
  category: InquiryCategory;
  title: string;
  content: string;
  status: 'WAITING' | 'COMPLETED';
  replyContent: string | null;
  repliedByName: string | null;
  repliedAt: string | null;
  createdAt: string;
}
