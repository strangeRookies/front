import React, { useState } from 'react';
import { 
  Shield, 
  ArrowLeft,
  Mail,
  Lock,
  Building,
  User,
  Phone,
  Check,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';

interface CorporateSignUpProps {
  onBackToLogin: () => void;
  onSignUpComplete: () => void;
}

export function CorporateSignUp({ onBackToLogin, onSignUpComplete }: CorporateSignUpProps) {
  const [step, setStep] = useState(1);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('강남구');
  const [jurisdiction, setJurisdiction] = useState('강남소방서');

  const [managerName, setManagerName] = useState('');
  const [managerDept, setManagerDept] = useState('');
  const [managerRank, setManagerRank] = useState('');
  const [managerContact, setManagerContact] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  const [installationCount, setInstallationCount] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // Load Daum Postcode script dynamically
  const handleSearchPostcode = () => {
    const callback = () => {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setPostcode(data.zonecode);
          setAddress(data.address);
          
          // Try to auto-match district
          const districts = ['강남구', '서초구', '송파구', '마포구', '영등포구', '용산구', '종로구', '성동구', '강서구', '동대문구'];
          const matched = districts.find(dist => data.address.includes(dist));
          if (matched) {
            setSelectedDistrict(matched);
            setJurisdiction(`${matched.replace('구', '')}소방서`);
          }
        }
      }).open();
    };

    if ((window as any).daum && (window as any).daum.Postcode) {
      callback();
    } else {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = callback;
      document.head.appendChild(script);
    }
  };

  const handleSendCode = () => {
    if (!managerPhone) {
      alert('휴대폰 번호를 입력하세요.');
      return;
    }
    setIsCodeSent(true);
    alert('인증번호 "999999"가 발송되었습니다.');
  };

  const handleVerifyCode = () => {
    if (verificationCode === '999999') {
      setIsPhoneVerified(true);
      alert('휴대폰 본인 인증이 성공적으로 완료되었습니다.');
    } else {
      alert('인증번호가 일치하지 않습니다. "999999"를 입력해주세요.');
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!email || !password || !passwordConfirm || !managerPhone) {
        alert('계정 정보 및 휴대폰 번호를 모두 입력해주세요.');
        return;
      }
      if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!isPhoneVerified) {
        alert('인증번호 확인을 완료해주세요.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!companyName || !businessNumber || !industry || !companySize || !address) {
        alert('기업 필수 정보를 모두 입력해주세요.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!managerName || !managerDept || !managerRank || !managerEmail) {
        alert('담당자 필수 정보를 모두 입력해주세요.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!installationCount || !installationDate) {
        alert('설치 구역 수와 설치 예정일을 선택해주세요.');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      if (!agreeTerms || !agreePrivacy) {
        alert('필수 약관에 모두 동의해주셔야 가입이 진행됩니다.');
        return;
      }
      setStep(6);
    } else if (step === 6) {
      alert('기업용 안전 관제 가입 신청이 성공적으로 접수되었습니다!');
      onSignUpComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 font-sans flex flex-col pb-12">
      {/* Header */}
      <header className="h-16 bg-[#0c1626] border-b border-slate-800 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-500 fill-blue-500/20" />
          <h1 className="text-sm font-bold text-white tracking-wider">스마트 안전 관제 시스템 | 기업용 회원가입</h1>
        </div>
        <button 
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/40 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          로그인으로 돌아가기
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 mt-8 flex-1 flex flex-col">
        
        {/* Step Indicator Tracker Bar */}
        <div className="mb-8 bg-[#0a1224] border border-slate-800/60 rounded-xl p-4 sm:p-5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          
          {[
            { num: 1, label: '계정 및 인증' },
            { num: 2, label: '기업 정보' },
            { num: 3, label: '담당자 정보' },
            { num: 4, label: '설치 정보' },
            { num: 5, label: '약관 동의' },
            { num: 6, label: '가입 완료' }
          ].map((item) => {
            const isCompleted = step > item.num;
            const isActive = step === item.num;

            return (
              <div key={item.num} className="relative z-10 flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted 
                    ? 'bg-emerald-600 text-white' 
                    : isActive 
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' 
                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : item.num}
                </div>
                <span className={`text-[10px] sm:text-xs font-bold ${isActive ? 'text-emerald-400' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Cards */}
        <div className="flex-1 bg-[#0a1224] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                1. 계정 및 인증
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">이메일 (아이디)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">기업 대표 이메일이 로그인 아이디가 됩니다.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">담당자 휴대폰 번호</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="연락처 (- 없이)"
                      className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="px-3 bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs"
                    >
                      인증 발송
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {isCodeSent && (
                  <div className="space-y-2 animate-fadeIn">
                    <label className="text-xs font-semibold text-slate-300">인증번호 입력</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="인증번호 6자리 (999999)"
                        className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        className="px-4 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                      >
                        인증 확인
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">비밀번호 확인</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 다시 입력해주세요"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                2. 기업 정보 등록
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">기업명</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="회사명을 입력하세요"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">사업자등록번호</label>
                  <input
                    type="text"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    placeholder="숫자 10자리 (- 없이)"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">업종</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">업종을 선택하세요</option>
                    <option value="의료/보건">의료 / 보건 복지</option>
                    <option value="제조/공업">제조 / 화학 / 안전 빌딩</option>
                    <option value="IT/서비스">IT / 정보통신</option>
                    <option value="교육/연구">교육 / 공공 연구</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">기업 규모</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">선택하세요</option>
                    <option value="10인 미만">10인 미만</option>
                    <option value="10~50인">10인 ~ 50인</option>
                    <option value="50~200인">50인 ~ 200인</option>
                    <option value="200인 이상">200인 이상</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-slate-300">주소</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={postcode}
                      readOnly
                      placeholder="우편번호"
                      className="w-24 px-3 py-3 bg-[#070e1b]/40 border border-slate-800 rounded-xl text-xs text-slate-400 text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSearchPostcode}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      우편번호 찾기
                    </button>
                  </div>
                  <input
                    type="text"
                    value={address}
                    readOnly
                    placeholder="주소 조회 결과"
                    className="w-full px-4 py-3 bg-[#070e1b]/40 border border-slate-800 rounded-xl text-xs text-slate-400 focus:outline-none mb-2"
                  />
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세 주소를 입력해주세요"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">관할 응급 등록(119)</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setJurisdiction(`${e.target.value.replace('구', '')}소방서`);
                    }}
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300"
                  >
                    <option value="강남구">강남구 (강남소방서)</option>
                    <option value="서초구">서초구 (서초소방서)</option>
                    <option value="송파구">송파구 (송파소방서)</option>
                    <option value="마포구">마포구 (마포소방서)</option>
                    <option value="영등포구">영등포구 (영등포소방서)</option>
                  </select>
                </div>

                <div className="space-y-2 flex flex-col justify-end">
                  <div className="bg-[#102232] border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-400 font-extrabold flex justify-between items-center">
                    <span>관할 소방 구역:</span>
                    <span>{jurisdiction}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                3. 담당자 정보
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">담당자 이름</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="이름을 입력해주세요"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">소속 부서</label>
                  <input
                    type="text"
                    value={managerDept}
                    onChange={(e) => setManagerDept(e.target.value)}
                    placeholder="부서 입력"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">직급</label>
                  <input
                    type="text"
                    value={managerRank}
                    onChange={(e) => setManagerRank(e.target.value)}
                    placeholder="예: 과장"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">이메일</label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="예: manager@company.com"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">연락처</label>
                  <input
                    type="text"
                    value={managerContact}
                    onChange={(e) => setManagerContact(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                4. 설치 정보 (예정)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">설치 예정 장소 수</label>
                  <select
                    value={installationCount}
                    onChange={(e) => setInstallationCount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300"
                  >
                    <option value="">선택하세요</option>
                    <option value="1~5개소">1 ~ 5개소 (기본)</option>
                    <option value="6~15개소">6 ~ 15개소 (중대형)</option>
                    <option value="16~50개소">16 ~ 50개소 (대형)</option>
                    <option value="50개소 초과">50개소 초과 (엔터프라이즈)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">설치 예정일</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      value={installationDate}
                      onChange={(e) => setInstallationDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-slate-300">특이 사항 / 요청 사항</label>
                  <textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    rows={4}
                    placeholder="공간 내 특수 요건(천장 높이, 실외 카메라 여부 등)을 남겨주시면 정밀 컨설팅을 진행해드립니다."
                    className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                5. 약관 동의
              </h2>

              <div className="space-y-4 max-w-xl">
                <div className="bg-[#070e1b] border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4.5 h-4.5 rounded bg-[#0a1224] border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">[필수] 기업용 서비스 이용약관 동의</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('기업 약관 전문')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>

                <div className="bg-[#070e1b] border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="w-4.5 h-4.5 rounded bg-[#0a1224] border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">[필수] 기업 정보 수집 및 이용 동의</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('개인 및 기업 정보 위탁 전문')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>

                <div className="bg-[#070e1b] border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeMarketing}
                      onChange={(e) => setAgreeMarketing(e.target.checked)}
                      className="w-4.5 h-4.5 rounded bg-[#0a1224] border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">[선택] 신제품 도입 안내 프로모션 정보 동의</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('마케팅 전문')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="text-center py-12 space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10 animate-bounce">
                <Shield className="w-8 h-8 text-emerald-500 fill-emerald-500/10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">가입 신청 완료</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  기업용 관제 계정 및 안심 센서 설치 스케줄 접수가 정상 완료되었습니다. 전문 엔지니어가 신속히 컨설팅 전화를 드립니다.
                </p>
              </div>
              <div className="bg-[#102033] border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 text-left space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">신청 기업명:</span>
                  <span className="font-bold text-white">{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">설치 예정 규모:</span>
                  <span className="font-bold text-white">{installationCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">상담 배정 관할서:</span>
                  <span className="font-bold text-emerald-400">{jurisdiction}</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else onBackToLogin();
              }}
              className="px-5 py-3 bg-[#070e1b] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {step === 6 ? '처음으로' : '이전 단계'}
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
            >
              {step === 5 ? '가입 완료' : step === 6 ? '로그인으로 이동' : '다음 단계'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
