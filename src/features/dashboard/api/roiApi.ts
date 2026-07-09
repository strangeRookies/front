import { apiRequest } from '../../../shared/api/client';

export type ScenarioType = 'FALL_BED' | 'COLLAPSE' | 'SYNCOPE' | 'EXIT' | 'ASSAULT' | 'HAZARD_ZONE';

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  FALL_BED: '침대 낙상',
  COLLAPSE: '쓰러짐',
  SYNCOPE: '실신',
  EXIT: '이탈',
  ASSAULT: '폭행',
  HAZARD_ZONE: '위험구역 침범',
};

export interface ScenarioResponse {
  scenarioId: number;
  scenarioType: ScenarioType;
  description: string;
}

// AI 서버가 실제로 ROI를 적용하는 단위(ai/registered_cameras.py:27-28의
// FAINT_SCENARIO_TYPES/EXIT_SCENARIO_TYPES)와 대응. 낙상/쓰러짐/실신은
// AI 쪽에서 하나의 합집합 마스크로 합쳐져 적용되므로 편집 단위도 하나로 묶는다.
export const ROI_GROUPS = [
  { groupId: 'FAINT', label: '이상행동 감지 (낙상·쓰러짐·실신)', scenarioTypes: ['FALL_BED', 'COLLAPSE', 'SYNCOPE'] as ScenarioType[] },
  { groupId: 'EXIT', label: '이탈 감지', scenarioTypes: ['EXIT'] as ScenarioType[] },
  { groupId: 'HAZARD', label: '위험구역 침범', scenarioTypes: ['HAZARD_ZONE'] as ScenarioType[] },
] as const;

export type RoiGroupId = typeof ROI_GROUPS[number]['groupId'];

export interface RoiConfigResponse {
  roiConfigId: number;
  cameraId: number;
  scenarioId: number;
  scenarioType: string;
  polygonPoints: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoiConfigRequest {
  scenarioId: number;
  polygonPoints: string;
}

export interface UpdateRoiConfigRequest {
  polygonPoints?: string;
  isActive?: boolean;
}

export async function fetchScenarios(): Promise<ScenarioResponse[]> {
  return apiRequest<ScenarioResponse[]>('/api/scenarios');
}

export async function fetchRoiConfigs(cameraId: number): Promise<RoiConfigResponse[]> {
  return apiRequest<RoiConfigResponse[]>(`/api/cameras/${cameraId}/roi-configs`);
}

export async function createRoiConfig(
  cameraId: number,
  request: CreateRoiConfigRequest,
): Promise<RoiConfigResponse> {
  return apiRequest<RoiConfigResponse>(`/api/cameras/${cameraId}/roi-configs`, {
    method: 'POST',
    body: request,
  });
}

export async function updateRoiConfig(
  roiConfigId: number,
  request: UpdateRoiConfigRequest,
): Promise<RoiConfigResponse> {
  return apiRequest<RoiConfigResponse>(`/api/roi-configs/${roiConfigId}`, {
    method: 'PUT',
    body: request,
  });
}

export async function deleteRoiConfig(roiConfigId: number): Promise<void> {
  return apiRequest<void>(`/api/roi-configs/${roiConfigId}`, {
    method: 'DELETE',
  });
}

export type NormalizedPoint = { x: number; y: number };

export function serializePolygon(points: NormalizedPoint[]): string {
  return JSON.stringify(points.map(p => [p.x, p.y]));
}

export function deserializePolygon(polygonPoints: string): NormalizedPoint[] {
  try {
    const arr = JSON.parse(polygonPoints) as [number, number][];
    if (!Array.isArray(arr)) return [];
    return arr.map(([x, y]) => ({ x, y }));
  } catch {
    return [];
  }
}
