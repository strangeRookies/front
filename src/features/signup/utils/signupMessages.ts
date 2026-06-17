import { ApiError } from '../../../shared/api/client';

export const SMS_VERIFICATION_SENT_MESSAGE = '인증번호를 발송했습니다. 휴대폰으로 수신한 인증번호를 입력해주세요.';
export const GENERIC_REQUEST_ERROR_MESSAGE = '요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.';
export const JURISDICTION_LOOKUP_ERROR_MESSAGE = '관할 정보를 조회하지 못했습니다. 주소를 다시 선택해주세요.';
export const JURISDICTION_NOT_FOUND_MESSAGE = '해당 주소에 매칭되는 관할 119센터를 찾을 수 없습니다. 정확한 주소를 입력해주세요.';

export function getJurisdictionErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === 'EMERGENCY_JURISDICTION_NOT_FOUND') {
    return JURISDICTION_NOT_FOUND_MESSAGE;
  }
  return JURISDICTION_LOOKUP_ERROR_MESSAGE;
}

export function getSmsRequestErrorMessage(error: unknown, invalidInputMessage: string) {
  if (error instanceof ApiError && error.code === 'SMS_RATE_LIMITED') {
    return '인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (error instanceof ApiError && error.code === 'SMS_SEND_FAILED') {
    return '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (error instanceof ApiError && error.code === 'COMMON_INVALID_INPUT') {
    return invalidInputMessage;
  }
  if (error instanceof ApiError && error.status >= 500) {
    return '인증번호 발송 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  return '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export function getSmsConfirmErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.code === 'AUTH_INVALID_VERIFICATION' || error.code === 'COMMON_INVALID_INPUT')) {
    return '인증번호가 올바르지 않거나 만료되었습니다. 인증번호를 다시 확인해주세요.';
  }
  return '인증번호 확인에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export function getAvailabilityCheckErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError && error.code === 'USER_EMAIL_ALREADY_EXISTS') {
    return '이미 사용 중인 이메일입니다.';
  }
  if (error instanceof ApiError && error.code === 'COMPANY_BUSINESS_NUMBER_ALREADY_EXISTS') {
    return '이미 등록된 사업자등록번호입니다.';
  }
  if (error instanceof ApiError && error.code === 'COMMON_INVALID_INPUT') {
    return '입력값을 다시 확인해주세요.';
  }
  return fallbackMessage;
}

export function getSignupSubmitErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === 'AGREEMENT_REQUIRED') {
    return '필수 약관에 모두 동의해주셔야 가입이 진행됩니다.';
  }
  return GENERIC_REQUEST_ERROR_MESSAGE;
}
