import { apiRequest } from '../../../shared/api/client';

export type ScenarioType = 'FALL_BED' | 'COLLAPSE' | 'SYNCOPE' | 'EXIT' | 'ASSAULT';

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  FALL_BED: '침대 낙상',
  COLLAPSE: '쓰러짐',
  SYNCOPE: '실신',
  EXIT: '이탈',
  ASSAULT: '폭행',
};

export interface ScenarioResponse {
  scenarioId: number;
  scenarioType: ScenarioType;
  description: string;
}

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
