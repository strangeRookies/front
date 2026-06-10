export const SIGNUP_PASSWORD_RULE_MESSAGE = '비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.';
export const PHONE_RULE_MESSAGE = '휴대폰 번호는 숫자만 입력 기준 010으로 시작하는 11자리여야 합니다.';
export const PERSONAL_PHONE_SUFFIX_RULE_MESSAGE = '휴대폰 번호는 010 뒤 8자리 숫자로 입력해주세요.';

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPassword(value: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
}

export function isValidPhoneNumber(value: string) {
  const digits = onlyDigits(value);
  const normalized = digits.length === 8 ? `010${digits}` : digits;
  return /^010\d{8}$/.test(normalized);
}

export function isValidRepresentativePhoneNumber(value: string) {
  return /^010\d{8}$/.test(onlyDigits(value));
}

export function isValidPersonalPhoneSuffix(value: string) {
  return /^\d{8}$/.test(value.trim());
}

export function normalizeRepresentativePhoneNumber(value: string) {
  return onlyDigits(value);
}

export function normalizePersonalPhoneSuffix(value: string) {
  return `010${value.trim()}`;
}

export function isValidVerificationCode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function isValidBusinessNumber(value: string) {
  return /^\d{10}$/.test(onlyDigits(value));
}
