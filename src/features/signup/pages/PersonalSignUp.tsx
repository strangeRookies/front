import React, { useState } from 'react';
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
import {
  checkEmailAvailability,
  confirmSmsVerification,
  resolveEmergencyJurisdiction,
  type EmergencyJurisdictionResponse,
  normalizePhoneNumber,
  requestSmsVerification,
  signupIndividual,
} from '../../auth/api/authApi';
import { ApiError } from '../../../shared/api/client';
import { AgreementDetailDialog } from '../components/AgreementDetailDialog';
import { getAgreementById, type AgreementId } from '../data/agreements';
import {
  isValidEmail,
  isValidPassword,
  isValidPersonalPhoneSuffix,
  isValidPhoneNumber,
  isValidVerificationCode,
  normalizePersonalPhoneSuffix,
  PERSONAL_PHONE_SUFFIX_RULE_MESSAGE,
  PHONE_RULE_MESSAGE,
  SIGNUP_PASSWORD_RULE_MESSAGE,
} from '../utils/validation';

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
  const [verificationId, setVerificationId] = useState<number | string>('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [targetName, setTargetName] = useState('');
  const [relation, setRelation] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [region3DepthName, setRegion3DepthName] = useState('');
  
  const [selectedDistrict, setSelectedDistrict] = useState('마포구');
  const [jurisdiction, setJurisdiction] = useState('마포소방서');
  const [emergencyJurisdiction, setEmergencyJurisdiction] = useState<EmergencyJurisdictionResponse | null>(null);
  const [jurisdictionStatus, setJurisdictionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [jurisdictionError, setJurisdictionError] = useState('');

  // Emergency contact fields
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  // Agreements
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

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setVerificationCode('');
    setIsPhoneVerified(false);
    setIsCodeSent(false);
    setVerificationId('');
    setVerificationToken('');
  };

  const handleSendCode = async () => {
    if (!phone) {
      alert('휴대폰 번호를 입력하세요.');
      return;
    }
    if (!isValidPersonalPhoneSuffix(phone)) {
      alert(PERSONAL_PHONE_SUFFIX_RULE_MESSAGE);
      return;
    }
    const normalizedPhone = normalizePersonalPhoneSuffix(phone);
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
        alert(PERSONAL_PHONE_SUFFIX_RULE_MESSAGE);
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
      alert('본인 인증이 완료되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '인증번호 확인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEmergencyContact = () => {
    if (!contactName || !contactRelation || !contactPhone) {
      alert('비상 연락처 정보를 모두 입력해주세요.');
      return;
    }
    if (!isValidPhoneNumber(contactPhone)) {
      alert(`비상 연락처 ${PHONE_RULE_MESSAGE}`);
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

  const handleNextStep = async () => {
    if (isSubmitting) {
      return;
    }

    if (step === 1) {
      if (!email.trim() || !password || !passwordConfirm || !name.trim()) {
        alert('필수 계정 정보를 모두 입력하세요.');
        return;
      }
      if (!isValidEmail(email)) {
        alert('이메일 형식이 올바르지 않습니다. 예: user@example.com');
        return;
      }
      if (!isValidPassword(password)) {
        alert(SIGNUP_PASSWORD_RULE_MESSAGE);
        return;
      }
      if (password !== passwordConfirm) {
        alert('비밀번호가 서로 일치하지 않습니다.');
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
      if (!isPhoneVerified) {
        alert('휴대폰 본인 인증을 진행해주세요.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!targetName.trim() || !relation || !ageGroup || !address || !addressDetail.trim()) {
        alert('보호 대상자 정보와 설치 주소지, 상세 주소를 모두 입력해주세요.');
        return;
      }
      if (!emergencyJurisdiction || jurisdictionStatus !== 'success') {
        alert(jurisdictionError || '관할 119센터 조회가 완료된 주소를 선택해주세요.');
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
      if (!verificationToken) {
        alert('휴대폰 본인 인증을 다시 진행해주세요.');
        setStep(2);
        return;
      }
      const resolvedJurisdiction = emergencyJurisdiction;
      if (!resolvedJurisdiction) {
        alert('관할 119센터 조회가 완료된 주소를 선택해주세요.');
        setStep(3);
        return;
      }
      try {
        setIsSubmitting(true);
        const normalizedPhone = normalizePersonalPhoneSuffix(phone);
        await signupIndividual({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: normalizedPhone,
          verificationToken,
          careTarget: {
            name: targetName.trim(),
            relation,
            ageGroup,
            postcode,
            address,
            addressDetail: addressDetail.trim(),
            region3DepthName: region3DepthName || undefined,
            district: resolvedJurisdiction.district,
            jurisdiction: resolvedJurisdiction.jurisdiction,
          },
          emergencyContacts: emergencyContacts.map((contact) => ({
            name: contact.name.trim(),
            relation: contact.relation.trim(),
            phone: normalizePhoneNumber(contact.phone),
          })),
          agreements: {
            termsAgreed: agreeTerms,
            privacyAgreed: agreePrivacy,
            marketingAgreed: agreeMarketing,
          },
        });
        alert('개인용 회원가입이 성공적으로 완료되었습니다!');
        onSignUpComplete();
      } catch (error) {
        if (error instanceof ApiError && error.code === 'EMERGENCY_JURISDICTION_NOT_FOUND') {
          alert('선택하신 주소의 관할 정보를 백엔드에서 다시 계산하는 중 오류가 발생했습니다(관할 미매칭). 다른 주소를 시도해주세요.');
          setStep(3);
        } else {
          alert(error instanceof Error ? error.message : '회원가입 요청에 실패했습니다.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const selectedAgreement = selectedAgreementId ? getAgreementById(selectedAgreementId) : undefined;

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
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="휴대폰 번호를 입력해주세요 (- 없이)"
                      className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSubmitting}
                      className="px-4 py-3 bg-blue-600/15 border border-blue-500/20 hover:bg-blue-600/30 disabled:bg-slate-800 disabled:text-slate-500 text-blue-400 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                        placeholder="인증번호 6자리를 입력해주세요"
                        className="flex-1 px-4 py-3 bg-[#070e1b] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={isSubmitting}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
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

                <div className="space-y-4 flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">관할 응급 등록 (119)</label>
                    <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">주소 기반 자동 조회</span>
                  </div>

                  <div className="min-h-[220px] bg-[#070e1b] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-center">
                    {jurisdictionStatus === 'idle' && (
                      <p className="text-xs text-slate-500 font-semibold text-center">주소를 먼저 입력해주세요.</p>
                    )}
                    {jurisdictionStatus === 'loading' && (
                      <p className="text-xs text-blue-300 font-bold text-center">관할 119센터 조회 중...</p>
                    )}
                    {jurisdictionStatus === 'error' && (
                      <div className="space-y-2 text-center">
                        <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" />
                        <p className="text-xs text-rose-300 font-bold">{jurisdictionError}</p>
                        <p className="text-[10px] text-slate-500">주소를 다시 선택하면 관할 정보를 재조회합니다.</p>
                      </div>
                    )}
                    {jurisdictionStatus === 'success' && emergencyJurisdiction && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                          <p className="text-[10px] font-bold text-blue-300">관할 소방서</p>
                          <p className="mt-1 text-sm font-extrabold text-white">{emergencyJurisdiction.stationName || emergencyJurisdiction.jurisdiction}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-[#0a1224] p-3 space-y-2 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500 font-semibold">119안전센터</span>
                            <span className="text-slate-200 font-bold text-right">{emergencyJurisdiction.centerName || '-'}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500 font-semibold">소방서 주소</span>
                            <span className="text-slate-300 text-right">{emergencyJurisdiction.stationAddress || '-'}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500 font-semibold">지역</span>
                            <span className="text-blue-300 font-bold">{emergencyJurisdiction.district}</span>
                          </div>
                        </div>
                      </div>
                    )}
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
                    onClick={() => setSelectedAgreementId('terms')}
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
                    onClick={() => setSelectedAgreementId('privacy')}
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
                    onClick={() => setSelectedAgreementId('marketing')}
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
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? '처리 중...' : step === 5 ? '가입 완료' : '다음 단계'}
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
