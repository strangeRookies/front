import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download, Upload, Check,
  Plus, FileSpreadsheet, ChevronDown, Loader2, AlertCircle, RefreshCw, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminCompanies,
  registerAdminCamera,
  bulkUploadCamerasForCompany,
  fetchAdminCamerasByCompany,
  deleteAdminCamera,
  type AdminCompanyResponse,
  type CorporateCameraResponse,
} from '../api/adminApi';

interface CCTVRegistrationProps {
  onRegisterComplete?: (registeredCount: number) => void;
}

export function CCTVRegistration({ onRegisterComplete }: CCTVRegistrationProps) {
  const [companies, setCompanies] = useState<AdminCompanyResponse[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);

  const [registeredCameras, setRegisteredCameras] = useState<CorporateCameraResponse[]>([]);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수동 등록 폼 상태
  const [newCameraName, setNewCameraName] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newRtspUrl, setNewRtspUrl] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchAdminCompanies()
      .then((data) => {
        setCompanies(data);
        if (data.length > 0) setSelectedCompanyId(data[0].companyProfileId);
      })
      .catch(() => toast.error('기업 목록을 불러오는데 실패했습니다.'))
      .finally(() => setIsLoadingCompanies(false));
  }, []);

  const loadCameras = useCallback((companyProfileId: number) => {
    setIsLoadingCameras(true);
    setSelectedIds(new Set());
    fetchAdminCamerasByCompany(companyProfileId)
      .then(setRegisteredCameras)
      .catch(() => toast.error('카메라 목록을 불러오는데 실패했습니다.'))
      .finally(() => setIsLoadingCameras(false));
  }, []);

  useEffect(() => {
    if (selectedCompanyId !== null) {
      setRegisteredCameras([]);
      loadCameras(selectedCompanyId);
    }
  }, [selectedCompanyId, loadCameras]);

  const selectedCompanyName =
    companies.find((c) => c.companyProfileId === selectedCompanyId)?.companyName ?? '기업 선택';

  const handleDownloadTemplate = () => {
    // 백엔드 엑셀 파싱 컬럼 순서와 일치: 카메라이름(0), 시리얼넘버(1), RTSP(2), 설치위치(3), 아이디(4), 비밀번호(5)
    const headers = '카메라 이름,카메라 시리얼넘버,RTSP 주소,설치 위치,접속 아이디,비밀번호\n';
    const sample =
      '응급실 복도 카메라 1,CAM-001,rtsp://192.168.0.10/live,응급실 1층 복도 A,camera01,password01\n' +
      '대기실 카메라 1,CAM-002,rtsp://192.168.0.11/live,응급실 1층 대기실,camera02,password02\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cctv_registration_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('엑셀 등록 템플릿(CSV)이 다운로드되었습니다.');
  };

  const handleExcelUploadClick = () => {
    if (!selectedCompanyId) {
      toast.warning('먼저 기업을 선택해주세요.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompanyId) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploading(true);
    toast.loading('엑셀 파일을 업로드 중입니다...', { id: 'bulk-upload' });

    try {
      const result = await bulkUploadCamerasForCompany(selectedCompanyId, file);
      if (result.failCount === 0) {
        toast.success(`업로드 완료! ${result.successCount}개 카메라가 등록되었습니다.`, { id: 'bulk-upload' });
      } else {
        toast.warning(
          `성공 ${result.successCount}개 / 실패 ${result.failCount}개. 실패 행을 확인해주세요.`,
          { id: 'bulk-upload' },
        );
      }
      loadCameras(selectedCompanyId);
      onRegisterComplete?.(result.successCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.';
      toast.error(message, { id: 'bulk-upload' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterOne = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      toast.warning('먼저 기업을 선택해주세요.');
      return;
    }

    setIsRegistering(true);
    try {
      await registerAdminCamera(selectedCompanyId, {
        cameraName: newCameraName.trim(),
        cameraSerialNumber: newSerialNumber.trim(),
        rtspUrl: newRtspUrl.trim(),
        locationDescription: newLocation.trim(),
        cameraLoginId: newUsername.trim(),
        password: newPassword.trim(),
        sourceType: 'REAL_RTSP',
      });
      toast.success(`카메라 [${newCameraName}]가 등록되었습니다.`);
      setNewCameraName('');
      setNewSerialNumber('');
      setNewRtspUrl('');
      setNewLocation('');
      setNewUsername('');
      setNewPassword('');
      loadCameras(selectedCompanyId);
      onRegisterComplete?.(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(registeredCameras.map((c) => c.cameraId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (cameraId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(cameraId);
      else next.delete(cameraId);
      return next;
    });
  };

  const handleDeleteOne = async (cameraId: number, cameraName: string) => {
    if (!window.confirm(`카메라 [${cameraName}]를 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      await deleteAdminCamera(cameraId);
      toast.success(`카메라 [${cameraName}]가 삭제되었습니다.`);
      if (selectedCompanyId) loadCameras(selectedCompanyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 카메라 ${selectedIds.size}대를 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteAdminCamera(id)));
      toast.success(`${selectedIds.size}대의 카메라가 삭제되었습니다.`);
      if (selectedCompanyId) loadCameras(selectedCompanyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : '일부 카메라 삭제 중 오류가 발생했습니다.';
      toast.error(message);
      if (selectedCompanyId) loadCameras(selectedCompanyId);
    } finally {
      setIsDeleting(false);
    }
  };

  const allSelected = registeredCameras.length > 0 && selectedIds.size === registeredCameras.length;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-6xl">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            CCTV 카메라 등록 및 관리 (기업용)
          </h2>
          <p className="text-xs text-slate-400 mt-1">엑셀(xlsx) 업로드 또는 직접 입력으로 카메라를 등록합니다.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
            엑셀 일괄 연동 지원
          </span>
        </div>
      </div>

      {/* Company + Action Row */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#071329]/50 border border-slate-800/80 p-4 rounded-2xl">
        <div className="relative">
          <button
            type="button"
            disabled={isLoadingCompanies}
            onClick={() => setShowPlaceDropdown(!showPlaceDropdown)}
            className="px-4 py-2.5 bg-[#0758D6] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-2.5 shadow-md shadow-blue-500/10 transition-all cursor-pointer"
          >
            {isLoadingCompanies ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>기업 선택 : {selectedCompanyName}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {showPlaceDropdown && companies.length > 0 && (
            <div className="absolute left-0 mt-2 w-56 bg-[#071329] border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden">
              {companies.map((company) => (
                <button
                  key={company.companyProfileId}
                  onClick={() => {
                    setSelectedCompanyId(company.companyProfileId);
                    setShowPlaceDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  {company.companyName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            템플릿 다운로드
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={handleExcelUploadClick}
            disabled={isUploading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            엑셀 업로드
          </button>
        </div>
      </div>

      {/* Registered Cameras Table */}
      <div className="bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 bg-[#061224] border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-300 font-extrabold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            등록된 카메라 목록
            {!isLoadingCameras && (
              <span className="text-slate-500 font-normal">({registeredCameras.length}대)</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 hover:text-red-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                선택 삭제 ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => selectedCompanyId && loadCameras(selectedCompanyId)}
              disabled={isLoadingCameras || !selectedCompanyId}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-40 cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCameras ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/30 text-slate-400 font-bold border-b border-slate-800">
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    disabled={registeredCameras.length === 0 || isLoadingCameras}
                    className="w-3.5 h-3.5 accent-blue-500 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="px-4 py-4 whitespace-nowrap">카메라 이름</th>
                <th className="px-4 py-4 whitespace-nowrap">카메라 시리얼넘버</th>
                <th className="px-4 py-4 whitespace-nowrap">RTSP 주소</th>
                <th className="px-4 py-4 whitespace-nowrap">설치 위치</th>
                <th className="px-4 py-4 whitespace-nowrap">접속 아이디</th>
                <th className="px-4 py-4 whitespace-nowrap">비밀번호</th>
                <th className="px-4 py-4 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoadingCameras ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : registeredCameras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <AlertCircle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-xs text-slate-500 font-semibold">등록된 카메라가 없습니다.</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      엑셀 업로드 또는 하단 폼에서 직접 등록해주세요.
                    </p>
                  </td>
                </tr>
              ) : (
                registeredCameras.map((camera) => (
                  <tr key={camera.cameraId} className="hover:bg-slate-800/10 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(camera.cameraId)}
                        onChange={(e) => handleSelectOne(camera.cameraId, e.target.checked)}
                        className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 text-white font-semibold whitespace-nowrap">
                      {camera.cameraName ?? '-'}
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                      {camera.cameraSerialNumber ?? '-'}
                    </td>
                    <td
                      className="px-4 py-4 text-slate-400 font-mono max-w-[180px] truncate"
                      title={camera.rtspUrl}
                    >
                      {camera.rtspUrl}
                    </td>
                    <td className="px-4 py-4 text-slate-300 whitespace-nowrap">
                      {camera.locationDescription ?? '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-300 whitespace-nowrap">
                      {camera.cameraLoginId ?? '-'}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-400 whitespace-nowrap">
                      {camera.passwordSet ? '••••••••' : <span className="text-slate-600">미설정</span>}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDeleteOne(camera.cameraId, camera.cameraName ?? String(camera.cameraId))}
                        disabled={isDeleting}
                        className="text-slate-600 hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Registration Form */}
      <form
        onSubmit={handleRegisterOne}
        className="bg-[#071329] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg"
      >
        <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-400" />
          카메라 직접 등록
        </h3>

        {/* Row 1: 카메라 이름, 시리얼넘버, RTSP 주소 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">카메라 이름</label>
            <input
              type="text"
              required
              value={newCameraName}
              onChange={(e) => setNewCameraName(e.target.value)}
              placeholder="예: 응급실 복도 카메라 1"
              className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">카메라 시리얼넘버</label>
            <input
              type="text"
              required
              value={newSerialNumber}
              onChange={(e) => setNewSerialNumber(e.target.value)}
              placeholder="예: CAM-001"
              className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RTSP 주소</label>
            <input
              type="text"
              required
              value={newRtspUrl}
              onChange={(e) => setNewRtspUrl(e.target.value)}
              placeholder="rtsp://192.168.0.x/live"
              className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Row 2: 설치 위치, 접속 아이디, 비밀번호 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">설치 위치</label>
            <input
              type="text"
              required
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="예: 응급실 1층 복도 A"
              className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">접속 아이디</label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="접속 계정 아이디"
              className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">비밀번호</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="접속 계정 비밀번호"
              className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isRegistering}
          className="px-5 py-2.5 bg-[#0758D6] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ml-auto"
        >
          {isRegistering ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {isRegistering ? '등록 중...' : '등록'}
        </button>
      </form>
    </div>
  );
}
