export interface Inquiry {
  id: string;
  userId: string;
  username: string;
  userType: 'individual' | 'corporate';
  category: '카메라 및 영상' | '알림 및 경보' | '모바일' | '기타';
  title: string;
  content: string;
  createdAt: string;
  reply?: {
    content: string;
    repliedAt: string;
  };
}
