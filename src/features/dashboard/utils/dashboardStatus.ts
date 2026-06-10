import {
  Bell,
  Calendar,
  Camera,
  HelpCircle,
  Tv,
  User,
} from 'lucide-react';
import type {
  InquiryCategory,
  IncidentAlert,
  MenuItemDefinition,
  RegisteredCamera,
} from '../types/dashboard';

export const INITIAL_ALERTS: IncidentAlert[] = [];

export const MOCK_LOGIN_HISTORY = [
  { date: '2026-05-29 09:42', device: 'Chrome / Windows 11', ip: '192.168.1.xxx', status: '성공' },
  { date: '2026-05-28 17:15', device: 'Chrome / Windows 11', ip: '192.168.1.xxx', status: '성공' },
  { date: '2026-05-27 08:30', device: 'Safari / macOS', ip: '192.168.2.xxx', status: '성공' },
  { date: '2026-05-26 13:22', device: 'Chrome / Android', ip: '10.0.0.xxx', status: '실패' },
] as const;

export const ALL_MENU_ITEMS: readonly MenuItemDefinition[] = [
  { id: 'home', label: '대시보드', icon: Tv, individualOnly: false },
  { id: 'alerts', label: '이벤트 알림', icon: Bell, individualOnly: false },
  { id: 'history', label: '이벤트 기록', icon: Calendar, individualOnly: false },
  { id: 'cameras', label: '카메라 등록', icon: Camera, individualOnly: true },
  { id: 'mypage', label: '마이페이지', icon: User, individualOnly: false },
  { id: 'qna', label: '문의', icon: HelpCircle, individualOnly: false },
];

export const CATEGORY_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  '알림 및 경보': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  '모바일': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  '기타': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const CATEGORY_ACTIVE_STYLES: Record<InquiryCategory, string> = {
  '카메라 및 영상': 'bg-blue-600/20 text-blue-300 border-blue-400/50',
  '알림 및 경보': 'bg-rose-600/20 text-rose-300 border-rose-400/50',
  '모바일': 'bg-violet-600/20 text-violet-300 border-violet-400/50',
  '기타': 'bg-slate-600/20 text-slate-300 border-slate-400/50',
};

export const CATEGORIES: InquiryCategory[] = ['카메라 및 영상', '알림 및 경보', '모바일', '기타'];

export const CCTV_FEEDS = [
  { id: 'CCTV-01', name: '병실 1', style: 'brightness-90 contrast-100 hue-rotate-15' },
  { id: 'CCTV-02', name: '복도 A', style: 'border-2 border-rose-500 animate-pulse', alert: true },
  { id: 'CCTV-03', name: '병실 2', style: 'brightness-105 contrast-95' },
  { id: 'CCTV-04', name: '대기실 1', style: 'saturate-50 contrast-110' },
  { id: 'CCTV-05', name: '대기실 2', style: 'hue-rotate-60' },
  { id: 'CCTV-06', name: '출입구', style: 'brightness-75' },
  { id: 'CCTV-07', name: '후문', style: 'brightness-110 contrast-105' },
] as const;

export function eventButtonStyle(severity: 'critical' | 'warning' | 'info') {
  if (severity === 'critical') return 'bg-[#ef4444] hover:bg-red-400';
  if (severity === 'warning') return 'bg-[#f59e0b] hover:bg-amber-400';
  return 'bg-[#334155] hover:bg-slate-500';
}

export function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpec = /[^a-zA-Z0-9]/.test(pw);
  const score = [pw.length >= 8, hasLower, hasUpper, hasNum, hasSpec].filter(Boolean).length;
  if (score <= 2) return { level: 1, label: '약함', color: 'bg-red-500' };
  if (score <= 3) return { level: 2, label: '보통', color: 'bg-amber-500' };
  return { level: 3, label: '강함', color: 'bg-emerald-500' };
}
