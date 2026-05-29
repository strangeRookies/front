import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  Check,
  MapPin,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface PersonalSignUpProps {
  onBackToLogin: () => void;
  onSignUpComplete: () => void;
}

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

// Map of Seoul districts to fire departments
const JURISDICTION_DATA: Record<string, { station: string; color: string; path: string }> = {
  '강남구': { station: '강남소방서', color: '#3b82f6', path: 'M 250 170 L 270 175 L 285 200 L 265 210 Z' },
  '서초구': { station: '서초소방서', color: '#10b981', path: 'M 220 180 L 250 170 L 265 210 L 210 215 Z' },
  '송파구': { station: '송파소방서', color: '#f59e0b', path: 'M 285 170 L 320 170 L 320 205 L 285 200 Z' },
  '마포구': { station: '마포소방서', color: '#ef4444', path: 'M 100 110 L 130 110 L 120 145 L 85 140 Z' },
  '영등포구': { station: '영등포소방서', color: '#8b5cf6', path: 'M 110 150 L 140 145 L 145 180 L 105 180 Z' },
  '용산구': { station: '용산소방서', color: '#ec4899', path: 'M 160 135 L 200 135 L 200 165 L 160 165 Z' },
  '종로구': { station: '종로소방서', color: '#06b6d4', path: 'M 160 85 L 195 85 L 190 120 L 155 120 Z' },
  '성동구': { station: '성동소방서', color: '#14b8a6', path: 'M 210 110 L 245 110 L 245 140 L 210 140 Z' },
  '강서구': { station: '강서소방서', color: '#f97316', path: 'M 30 110 L 75 110 L 80 145 L 35 155 Z' },
  '동대문구': { station: '동대문소방서', color: '#a855f7', path: 'M 235 85 L 265 85 L 260 120 L 225 120 Z' },
};

export function PersonalSignUp({ onBackToLogin, onSignUpComplete }: PersonalSignUpProps) {
  const [step, setStep] = useState(1);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  
  const [targetName, setTargetName] = useState('');
  const [relation, setRelation] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  
  const [selectedDistrict, setSelectedDistrict] = useState('마포구');
  const [jurisdiction, setJurisdiction] = useState('마포소방서');

  // Emergency contact fields
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  // Agreements
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // Sync selected district to jurisdiction
  useEffect(() => {
    if (JURISDICTION_DATA[selectedDistrict]) {
      setJurisdiction(JURISDICTION_DATA[selectedDistrict].station);
    }
  }, [selectedDistrict]);

  // Load Daum Postcode script dynamically
  const handleSearchPostcode = () => {
    const callback = () => {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setPostcode(data.zonecode);
          setAddress(data.address);
          
          // Try to auto-match district from address
          const matchedDistrict = Object.keys(JURISDICTION_DATA).find(dist => data.address.includes(dist));
          if (matchedDistrict) {
            setSelectedDistrict(matchedDistrict);
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
    if (!phone) {
      alert('휴대폰 번호를 입력하세요.');
      return;
    }
    setIsCodeSent(true);
    alert('인증번호 "123456"이 발송되었습니다.');
  };

  const handleVerifyCode = () => {
    if (verificationCode === '123456') {
      setIsPhoneVerified(true);
      alert('본인 인증이 성공적으로 확인되었습니다.');
    } else {
      alert('인증번호가 일치하지 않습니다. "123456"을 입력해주세요.');
    }
  };

  const handleAddEmergencyContact = () => {
    if (!contactName || !contactRelation || !contactPhone) {
      alert('비상 연락처 정보를 모두 입력해주세요.');
      return;
    }
    setEmergencyContacts(prev => [...prev, {
      name: contactName,
      relation: contactRelation,
      phone: contactPhone
    }]);
    setContactName('');
    setContactRelation('');
    setContactPhone('');
  };

  const handleRemoveContact = (index: number) => {
    setEmergencyContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!email || !password || !passwordConfirm || !name) {
        alert('필수 계정 정보를 모두 입력하세요.');
        return;
      }
      if (password !== passwordConfirm) {
        alert('비밀번호가 서로 일치하지 않습니다.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!isPhoneVerified) {
        alert('휴대폰 본인 인증을 진행해주세요.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!targetName || !relation || !ageGroup || !address) {
        alert('보호 대상자 정보 및 주소를 모두 입력해주세요.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      if (!agreeTerms || !agreePrivacy) {
        alert('필수 약관에 모두 동의하셔야 회원가입이 완료됩니다.');
        return;
      }
      alert('개인용 회원가입이 성공적으로 완료되었습니다!');
      onSignUpComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 font-sans flex flex-col pb-12">
      {/* Header */}
      <header className="h-16 bg-[#0c1626] border-b border-slate-800 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-500 fill-blue-500/20" />
          <h1 className="text-sm font-bold text-white tracking-wider">스마트 안전 관제 시스템 | 개인용 회원가입</h1>
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
            { num: 2, label: '인증 완료' },
            { num: 3, label: '보호 대상 및 주소' },
            { num: 4, label: '비상 연락처' },
            { num: 5, label: '약관 동의' }
          ].map((item) => {
            const isCompleted = step > item.num;
            const isActive = step === item.num;

            return (
              <div key={item.num} className="relative z-10 flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted 
                    ? 'bg-blue-600 text-white' 
                    : isActive 
                    ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' 
                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : item.num}
                </div>
                <span className={`text-[10px] sm:text-xs font-bold ${isActive ? 'text-blue-400' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Contents */}
        <div className="flex-1 bg-[#0a1224] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

          {/* Form blocks based on steps */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                1. 계정 및 기본 정보 (필수 항목)
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">이메일 (아이디)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">이메일이 시스템 접속 아이디로 사용됩니다.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">이름</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="이름을 입력해주세요"
                      className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                      className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호를 다시 입력해주세요"
                      className="w-full pl-10 pr-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-400" />
                2. 본인 인증 및 연락처
              </h2>

              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">휴대폰 번호</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="010"
                      disabled
                      className="w-16 px-3 py-3 bg-[#070e1b]/40 border border-slate-800 rounded-xl text-xs text-slate-500 text-center font-bold"
                    />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="휴대폰 번호를 입력해주세요 (- 없이)"
                      className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="px-4 py-3 bg-blue-600/15 border border-blue-500/20 hover:bg-blue-600/30 text-blue-400 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      인증번호 발송
                    </button>
                  </div>
                </div>

                {isCodeSent && (
                  <div className="space-y-2 animate-fadeIn">
                    <label className="text-xs font-semibold text-slate-300">인증번호 입력</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="인증번호 6자리를 입력해주세요 (123456)"
                        className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        인증 확인
                      </button>
                    </div>
                    {isPhoneVerified && (
                      <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-1">
                        <Check className="w-3.5 h-3.5" /> 휴대폰 본인인증이 완료되었습니다.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3 pt-3">
                  <label className="text-xs font-semibold text-slate-400">간편 본인 인증</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Google 이메일 인증', 'SMS 인증'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setIsPhoneVerified(true);
                          alert(`${method} 본인 인증 완료 모의 성공!`);
                        }}
                        className="py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                3. 보호 대상 정보 및 설치 주소지
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Forms */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">보호 대상자 이름</label>
                      <input
                        type="text"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                        placeholder="이름 입력"
                        className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">보호 관계</label>
                      <select
                        value={relation}
                        onChange={(e) => setRelation(e.target.value)}
                        className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">선택하세요</option>
                        <option value="부모">부모</option>
                        <option value="배우자">배우자</option>
                        <option value="조부모">조부모</option>
                        <option value="자녀">자녀</option>
                        <option value="본인">본인 (1인 가구)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">보호 대상 연령대</label>
                    <select
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value)}
                      className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">선택하세요</option>
                      <option value="60대 이하">60대 이하</option>
                      <option value="70대">70대</option>
                      <option value="80대">80대</option>
                      <option value="90대 이상">90대 이상</option>
                    </select>
                  </div>

                  {/* Postal Zip Code finder */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">설치 주소지</label>
                    <div className="flex gap-2">
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
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        우편번호 찾기
                      </button>
                    </div>
                    <input
                      type="text"
                      value={address}
                      readOnly
                      placeholder="주소가 여기에 입력됩니다"
                      className="w-full px-4 py-3 bg-[#070e1b]/40 border border-slate-800 rounded-xl text-xs text-slate-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="상세 주소를 입력해주세요"
                      className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      위험 발생 시 소방 및 경찰 출동 주소로 활용되므로 정확히 입력해야 합니다.
                    </p>
                  </div>
                </div>

                {/* Right Interactive SVG Map Picker for Jurisdictions */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">관할 응급 등록 (119)</label>
                      <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">지도로 탐색 가능</span>
                    </div>

                    {/* District Dropdown Selector */}
                    <div className="relative">
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {Object.keys(JURISDICTION_DATA).map((dist) => (
                          <option key={dist} value={dist}>{dist} ({JURISDICTION_DATA[dist].station})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Interactive SVG district Map picker */}
                  <div className="relative aspect-square max-h-[220px] bg-[#070e1b] border border-slate-800/80 rounded-2xl flex items-center justify-center p-3 overflow-hidden shadow-inner self-center w-full">
                    {/* Background Grid inside Map */}
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-15" />
                    
                    <svg className="w-full h-full" viewBox="0 0 350 250">
                      {/* Simple outline of Seoul districts */}
                      <g className="transition-all duration-300">
                        {Object.entries(JURISDICTION_DATA).map(([dist, info]) => {
                          const isSelected = selectedDistrict === dist;
                          return (
                            <path
                              key={dist}
                              d={info.path}
                              fill={isSelected ? info.color : '#0f172a'}
                              stroke={isSelected ? '#ffffff' : '#334155'}
                              strokeWidth={isSelected ? '2' : '1'}
                              className="cursor-pointer transition-all duration-200 hover:fill-blue-500/35"
                              onClick={() => setSelectedDistrict(dist)}
                              opacity={isSelected ? '0.75' : '0.55'}
                            >
                              <title>{dist} - {info.station}</title>
                            </path>
                          );
                        })}
                      </g>
                    </svg>

                    <div className="absolute bottom-2 left-2 bg-[#0c1626]/90 border border-slate-800 rounded px-2 py-1 text-[9px] text-slate-400 flex flex-col font-medium">
                      <span>* 지도 구역을 클릭하면</span>
                      <span>관할 소방서가 연동됩니다.</span>
                    </div>
                  </div>

                  <div className="bg-[#102038]/70 border border-blue-500/20 rounded-xl p-3 text-xs flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">선택한 지역 관할 소방소:</span>
                    <span className="text-blue-400 font-extrabold tracking-wide">{jurisdiction}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                4. 비상 연락처 등록 (선택)
              </h2>
              <p className="text-xs text-slate-400">낙상, 의식불명 등 위험 감지 시 SMS 경보 및 알림이 전달되는 비상 연락처 목록입니다.</p>

              {/* Add Emergency Form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#070e1b] border border-slate-850 p-4 rounded-xl items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">비상인 이름</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="이름 입력"
                    className="w-full px-3 py-2.5 bg-[#0a1224] border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">관계</label>
                  <input
                    type="text"
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    placeholder="예: 첫째 아들"
                    className="w-full px-3 py-2.5 bg-[#0a1224] border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">휴대폰 번호</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2.5 bg-[#0a1224] border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddEmergencyContact}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  연락처 추가
                </button>
              </div>

              {/* Added Contacts Grid */}
              <div className="space-y-2 mt-4">
                <h3 className="text-xs font-semibold text-slate-300">비상 연락처 관리 ({emergencyContacts.length}건)</h3>
                
                {emergencyContacts.length === 0 ? (
                  <div className="py-8 text-center bg-[#070e1b]/40 border border-dashed border-slate-800/80 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium">등록된 비상 연락처가 없습니다. (추가를 권장합니다)</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {emergencyContacts.map((contact, idx) => (
                      <div key={idx} className="bg-[#070e1b] border border-slate-850 p-3.5 rounded-xl flex items-center justify-between shadow-inner">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white">{contact.name}</span>
                            <span className="text-[9px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">{contact.relation}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">{contact.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(idx)}
                          className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-blue-400" />
                5. 약관 동의
              </h2>

              <div className="space-y-4 max-w-xl">
                {/* Accordion Item 1 */}
                <div className="bg-[#070e1b] border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4.5 h-4.5 rounded bg-[#0a1224] border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">[필수] 서비스 이용약관 동의</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('서비스 이용약관 상세 내용 팝업')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium hover:underline bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>

                {/* Accordion Item 2 */}
                <div className="bg-[#070e1b] border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="w-4.5 h-4.5 rounded bg-[#0a1224] border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">[필수] 개인정보 수집 및 이용 동의</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('개인정보 동의 상세 내용 팝업')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium hover:underline bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>

                {/* Accordion Item 3 */}
                <div className="bg-[#070e1b] border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeMarketing}
                      onChange={(e) => setAgreeMarketing(e.target.checked)}
                      className="w-4.5 h-4.5 rounded bg-[#0a1224] border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-300">[선택] 마케팅 및 프로모션 안내 정보 수신 동의</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('마케팅 수신 상세 내용 팝업')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium hover:underline bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls inside card footer */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else onBackToLogin();
              }}
              className="px-5 py-3 bg-[#070e1b] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              이전 단계
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {step === 5 ? '가입 완료' : '다음 단계'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
