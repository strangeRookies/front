import { Eye, EyeOff, KeyRound } from 'lucide-react';

interface AddCameraModalProps {
  newCamId: string;
  newCamLocation: string;
  newCamName: string;
  newCamSerialNumber: string;
  newCamPassword: string;
  newCamRtspUrl: string;
  showNewCamPw: boolean;
  onClose: () => void;
  onIdChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSerialNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRtspUrlChange: (value: string) => void;
  onSubmit: () => void;
  onTogglePassword: () => void;
}

export function AddCameraModal(props: AddCameraModalProps) {
  const {
    newCamId,
    newCamLocation,
    newCamName,
    newCamSerialNumber,
    newCamPassword,
    newCamRtspUrl,
    showNewCamPw,
    onClose,
    onIdChange,
    onLocationChange,
    onNameChange,
    onSerialNumberChange,
    onPasswordChange,
    onRtspUrlChange,
    onSubmit,
    onTogglePassword,
  } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#071329] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-[#061224] border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white">카메라 추가</h3>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white cursor-pointer">닫기</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">카메라 이름</label>
            <input value={newCamName} onChange={(event) => onNameChange(event.target.value)} placeholder="예: 정문 출입구 카메라" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">카메라 시리얼 넘버</label>
            <input value={newCamSerialNumber} onChange={(event) => onSerialNumberChange(event.target.value)} placeholder="예: SN-12345678" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">RTSP 스트리밍 주소</label>
            <input value={newCamRtspUrl} onChange={(event) => onRtspUrlChange(event.target.value)} placeholder="rtsp://192.168.0.x:554/stream" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">설치 위치</label>
            <input value={newCamLocation} onChange={(event) => onLocationChange(event.target.value)} placeholder="예: 본관 정문" className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">접속 아이디</label>
              <input value={newCamId} onChange={(event) => onIdChange(event.target.value)} className="w-full px-3 py-2.5 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" />
                비밀번호
              </label>
              <div className="relative">
                <input type={showNewCamPw ? 'text' : 'password'} value={newCamPassword} onChange={(event) => onPasswordChange(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-[#020817] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none" />
                <button onClick={onTogglePassword} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer">
                  {showNewCamPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <button onClick={onSubmit} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer">등록하기</button>
        </div>
      </div>
    </div>
  );
}
