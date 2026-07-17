import type { LucideIcon } from 'lucide-react';
import type { Inquiry } from '../../../shared/types/inquiry';
export const ALL_CAMERAS_VALUE = '전체';

export interface IncidentAlert {
  id: string;
  time: string;
  timestamp: number;
  camera: string;
  type: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'resolved';
  snapshotUrl?: string; // S3 Presigned URL (compat)
  primarySnapshotUrl?: string; // representative JPEG snapshot for primary UI display
  clipUrl?: string; // Recorded video clip URL
  clipPath?: string;
  cameraLoginId?: string;
  sourceEventId?: string;
  vlmDescription?: string;
}

export interface RegisteredCamera {
  id: string;
  name: string;
  location: string;
  password?: string;
  status?: string;
  rtspUrl?: string;
  assignedVideoPath?: string;
}

export interface MenuItemDefinition {
  id: MenuId;
  label: string;
  icon: LucideIcon;
  individualOnly: boolean;
}

export type MenuId =
  | 'home'
  | 'alerts'
  | 'history'
  | 'cameras'
  | 'mypage'
  | 'qna';

export type MypageTab = 'profile' | 'password' | 'notifications' | 'account';

export type InquiryCategory = Inquiry['category'];
