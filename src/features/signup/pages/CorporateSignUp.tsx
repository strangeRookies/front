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
  FileText
} from 'lucide-react';
import {
  checkBusinessNumberAvailability,
  checkEmailAvailability,
  confirmSmsVerification,
  resolveEmergencyJurisdiction,
  type EmergencyJurisdictionResponse,
  normalizeBusinessNumber,
  normalizePhoneNumber,
  requestSmsVerification,
  signupCorporate,
} from '../../auth/api/authApi';
import { ApiError } from '../../../shared/api/client';
import { AgreementDetailDialog } from '../components/AgreementDetailDialog';
import { getAgreementById, type AgreementId } from '../data/agreements';
import {
  isValidBusinessNumber,
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  isValidRepresentativePhoneNumber,
  isValidVerificationCode,
  normalizeRepresentativePhoneNumber,
  PHONE_RULE_MESSAGE,
  SIGNUP_PASSWORD_RULE_MESSAGE,
} from '../utils/validation';

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
  const [verificationId, setVerificationId] = useState<number | string>('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [region3DepthName, setRegion3DepthName] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('강남구');
  const [jurisdiction, setJurisdiction] = useState('강남소방서');
  const [emergencyJurisdiction, setEmergencyJurisdiction] = useState<EmergencyJurisdictionResponse | null>(null);
  const [jurisdictionStatus, setJurisdictionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [jurisdictionError, setJurisdictionError] = useState('');

  const [managerName, setManagerName] = useState('');
  const [managerDept, setManagerDept] = useState('');
  const [managerRank, setManagerRank] = useState('');
  const [managerContact, setManagerContact] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [selectedAgreementId, setSelectedAgreementId] = useState<AgreementId | null>(null);

  const resolveJurisdiction = async (
    nextPostcode: string,
    nextAddress: string,
    nextAddressDetail = '',
    nextRegion3DepthName = '',
  ) => {
    setJurisdictionStatus('loading');
    setJurisdictionError('');
    setEmergencyJurisdiction(null);
    setSelectedDistrict('');
    setJurisdiction('');

    try {
      const result = await resolveEmergencyJurisdiction({
        postcode: nextPostcode,
        address: nextAddress,
        addressDetail: nextAddressDetail,
        region3DepthName: nextRegion3DepthName || undefined,
      });
      setEmergencyJurisdiction(result);
      setSelectedDistrict(result.district);
      setJurisdiction(result.jurisdiction);
      setJurisdictionStatus('success');
    } catch (error) {
      setJurisdictionStatus('error');
      if (error instanceof ApiError && error.code === 'EMERGENCY_JURISDICTION_NOT_FOUND') {
        setJurisdictionError('해당 주소에 매칭되는 관할 119센터를 찾을 수 없습니다. 정확한 주소를 입력해주세요.');
      } else {
        setJurisdictionError(error instanceof Error ? error.message : '관할 정보를 찾을 수 없습니다. 주소를 다시 선택해주세요.');
      }
    }
  };

  // Load Daum Postcode script dynamically
  const handleSearchPostcode = () => {
    const callback = () => {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setPostcode(data.zonecode);
          setAddress(data.address);
          setAddressDetail('');
          setRegion3DepthName(data.bname || '');
          void resolveJurisdiction(data.zonecode, data.address, '', data.bname || '');
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

  const handleManagerPhoneChange = (value: string) => {
    setManagerPhone(value);
    setVerificationCode('');
    setIsPhoneVerified(false);
    setIsCodeSent(false);
    setVerificationId('');
    setVerificationToken('');
  };

  const handleSendCode = async () => {
    if (!managerPhone) {
      alert('휴대폰 번호를 입력하세요.');
      return;
    }
    if (!isValidRepresentativePhoneNumber(managerPhone)) {
      alert(PHONE_RULE_MESSAGE);
      return;
    }
    const normalizedPhone = normalizeRepresentativePhoneNumber(managerPhone);
    try {
      setIsSubmitting(true);
      const response = await requestSmsVerification(normalizedPhone);
      setVerificationId(response.verificationId);
      setVerificationToken('');
      setIsPhoneVerified(false);
      setIsCodeSent(true);
      alert('인증번호를 발송했습니다. 개발 환경에서는 백엔드 서버 로그에서 인증번호를 확인해주세요.');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SMS_RATE_LIMITED') {
        alert('인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해주세요.');
      } else if (error instanceof ApiError && error.code === 'SMS_SEND_FAILED') {
        alert('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } else if (error instanceof ApiError && error.code === 'COMMON_INVALID_INPUT') {
        alert(PHONE_RULE_MESSAGE);
      } else if (error instanceof ApiError && error.status >= 500) {
        alert('인증번호 발송 처리 중 서버 오류가 발생했습니다. 백엔드 서버 로그에서 SMS 설정 또는 Mock 인증번호 생성 상태를 확인해주세요.');
      } else {
        alert(error instanceof Error ? error.message : '인증번호 발송에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationId) {
      alert('인증번호를 먼저 발송해주세요.');
      return;
    }
    if (!verificationCode.trim()) {
      alert('인증번호를 입력해주세요.');
      return;
    }
    if (!isValidVerificationCode(verificationCode)) {
      alert('인증번호는 숫자 6자리로 입력해주세요.');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await confirmSmsVerification(verificationId, verificationCode.trim());
      setVerificationToken(response.verificationToken);
      setIsPhoneVerified(true);
      alert('휴대폰 본인 인증이 완료되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '인증번호 확인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = async () => {
    if (isSubmitting) {
      return;
    }

    if (step === 1) {
      if (!email.trim() || !password || !passwordConfirm || !managerPhone.trim()) {
        alert('계정 정보 및 휴대폰 번호를 모두 입력해주세요.');
        return;
      }
      if (!isValidEmail(email)) {
        alert('이메일 형식이 올바르지 않습니다. 예: company@example.com');
        return;
      }
      if (!isValidPassword(password)) {
        alert(SIGNUP_PASSWORD_RULE_MESSAGE);
        return;
      }
      if (!isValidRepresentativePhoneNumber(managerPhone)) {
        alert(PHONE_RULE_MESSAGE);
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
      if (!verificationToken) {
        alert('휴대폰 본인 인증을 다시 진행해주세요.');
        return;
      }
      try {
        setIsSubmitting(true);
        const isAvailable = await checkEmailAvailability(email.trim());
        if (!isAvailable) {
          alert('이미 사용 중인 이메일입니다.');
          return;
        }
        setStep(2);
      } catch (error) {
        alert(error instanceof Error ? error.message : '이메일 중복 확인에 실패했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 2) {
      if (!companyName.trim() || !businessNumber.trim() || !industry || !companySize || !address || !addressDetail.trim()) {
        alert('기업 필수 정보와 주소, 상세 주소를 모두 입력해주세요.');
        return;
      }
      if (!isValidBusinessNumber(businessNumber)) {
        alert('사업자등록번호는 숫자 10자리로 입력해주세요.');
        return;
      }
      if (!emergencyJurisdiction || jurisdictionStatus !== 'success') {
        alert(jurisdictionError || '관할 119센터 조회가 완료된 주소를 선택해주세요.');
        return;
      }
      try {
        setIsSubmitting(true);
        const isAvailable = await checkBusinessNumberAvailability(normalizeBusinessNumber(businessNumber));
        if (!isAvailable) {
          alert('이미 등록된 사업자등록번호입니다.');
          return;
        }
        setStep(3);
      } catch (error) {
        alert(error instanceof Error ? error.message : '사업자등록번호 중복 확인에 실패했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 3) {
      if (!managerName.trim() || !managerDept.trim() || !managerRank.trim() || !managerEmail.trim()) {
        alert('담당자 필수 정보를 모두 입력해주세요.');
        return;
      }
      if (!isValidEmail(managerEmail)) {
        alert('담당자 이메일 형식이 올바르지 않습니다. 예: manager@company.com');
        return;
      }
      if (managerContact.trim() && !isValidPhoneNumber(managerContact)) {
        alert(`담당자 연락처 ${PHONE_RULE_MESSAGE}`);
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!agreeTerms || !agreePrivacy) {
        alert('필수 약관에 모두 동의해주셔야 가입이 진행됩니다.');
        return;
      }
      const resolvedJurisdiction = emergencyJurisdiction;
      if (!resolvedJurisdiction) {
        alert('관할 119센터 조회가 완료된 주소를 선택해주세요.');
        setStep(2);
        return;
      }
      try {
        setIsSubmitting(true);
        const normalizedPhone = normalizeRepresentativePhoneNumber(managerPhone);
        await signupCorporate({
          email: email.trim(),
          password,
          phone: normalizedPhone,
          verificationToken,
          company: {
            name: companyName.trim(),
            businessNumber: normalizeBusinessNumber(businessNumber),
            industry,
            size: companySize,
            postcode,
            address,
            addressDetail: addressDetail.trim(),
            region3DepthName: region3DepthName || undefined,
            district: resolvedJurisdiction.district,
            jurisdiction: resolvedJurisdiction.jurisdiction,
          },
          manager: {
            name: managerName.trim(),
            department: managerDept.trim(),
            rank: managerRank.trim(),
            email: managerEmail.trim(),
            contact: normalizePhoneNumber(managerContact || managerPhone),
          },
          agreements: {
            termsAgreed: agreeTerms,
            privacyAgreed: agreePrivacy,
            marketingAgreed: agreeMarketing,
          },
        });
        alert('기업용 안전 관제 가입 신청이 성공적으로 접수되었습니다!');
        setStep(5);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'EMERGENCY_JURISDICTION_NOT_FOUND') {
          alert('선택하신 주소의 관할 정보를 백엔드에서 다시 계산하는 중 오류가 발생했습니다(관할 미매칭). 다른 주소를 시도해주세요.');
          setStep(2);
        } else {
          alert(error instanceof Error ? error.message : '회원가입 요청에 실패했습니다.');
        }
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 5) {
      onSignUpComplete();
    }
  };

  const selectedAgreement = selectedAgreementId ? getAgreementById(selectedAgreementId) : undefined;

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
            { num: 4, label: '약관 동의' },
            { num: 5, label: '가입 완료' }
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
                      onChange={(e) => handleManagerPhoneChange(e.target.value)}
                      placeholder="연락처 (- 없이)"
                      className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSubmitting}
                      className="px-3 bg-emerald-600/15 border border-emerald-500/20 disabled:bg-slate-800 disabled:text-slate-500 text-emerald-400 font-bold rounded-xl text-xs disabled:cursor-not-allowed"
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
                        placeholder="인증번호 6자리"
                        className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={isSubmitting}
                        className="px-4 bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold rounded-xl text-xs disabled:cursor-not-allowed"
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

                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">관할 응급 등록(119)</label>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">주소 기반 자동 조회</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-[#070e1b] p-4">
                    {jurisdictionStatus === 'idle' && (
                      <p className="text-xs text-slate-500 font-semibold">주소를 먼저 입력해주세요.</p>
                    )}
                    {jurisdictionStatus === 'loading' && (
                      <p className="text-xs text-emerald-300 font-bold">관할 119센터 조회 중...</p>
                    )}
                    {jurisdictionStatus === 'error' && (
                      <div className="space-y-1">
                        <p className="text-xs text-rose-300 font-bold">{jurisdictionError}</p>
                        <p className="text-[10px] text-slate-500">주소를 다시 선택하면 관할 정보를 재조회합니다.</p>
                      </div>
                    )}
                    {jurisdictionStatus === 'success' && emergencyJurisdiction && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <p className="text-[10px] font-bold text-emerald-300">관할 소방서</p>
                          <p className="mt-1 text-sm font-extrabold text-white">{emergencyJurisdiction.stationName || emergencyJurisdiction.jurisdiction}</p>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#0a1224] p-3 space-y-1.5">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500 font-semibold">119안전센터</span>
                            <span className="text-slate-200 font-bold text-right">{emergencyJurisdiction.centerName || '-'}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500 font-semibold">지역</span>
                            <span className="text-emerald-300 font-bold">{emergencyJurisdiction.district}</span>
                          </div>
                        </div>
                        <div className="sm:col-span-2 rounded-lg border border-slate-800 bg-[#0a1224] p-3">
                          <p className="text-[10px] font-bold text-slate-500">소방서 주소</p>
                          <p className="mt-1 text-xs text-slate-300">{emergencyJurisdiction.stationAddress || '-'}</p>
                        </div>
                      </div>
                    )}
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
                <FileText className="w-5 h-5 text-emerald-400" />
                4. 약관 동의
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
                    onClick={() => setSelectedAgreementId('terms')}
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
                    onClick={() => setSelectedAgreementId('privacy')}
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
                    onClick={() => setSelectedAgreementId('marketing')}
                    className="text-[10px] text-slate-400 hover:text-white font-medium bg-[#0c1626] border border-slate-800 px-2.5 py-1 rounded-md"
                  >
                    내용 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-12 space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10 animate-bounce">
                <Shield className="w-8 h-8 text-emerald-500 fill-emerald-500/10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">가입 신청 완료</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  기업용 관제 계정 가입 신청이 정상 완료되었습니다. 담당자가 입력하신 정보 기준으로 후속 안내를 드립니다.
                </p>
              </div>
              <div className="bg-[#102033] border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 text-left space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">신청 기업명:</span>
                  <span className="font-bold text-white">{companyName}</span>
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
                if (step === 5) setStep(1);
                else if (step > 1) setStep(step - 1);
                else onBackToLogin();
              }}
              className="px-5 py-3 bg-[#070e1b] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {step === 5 ? '처음으로' : '이전 단계'}
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? '처리 중...' : step === 4 ? '가입 완료' : step === 5 ? '로그인으로 이동' : '다음 단계'}
            </button>
          </div>

        </div>
      </main>
      <AgreementDetailDialog
        agreement={selectedAgreement}
        open={selectedAgreementId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAgreementId(null);
          }
        }}
      />
    </div>
  );
}
