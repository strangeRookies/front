프론트 수정 필요합니다. 이제 백엔드는 123456 고정 인증이 아니라 매 요청마다 생성된 6자리 코드를 기준으로 검증합니다.

프론트 측 개발/확인할 부분:

인증번호 입력값을 실제 사용자 입력으로 보내기
기존에 confirm 요청에서 code: "123456"을 하드코딩했다면 제거해야 합니다.
사용자가 입력한 값을 그대로 보내야 합니다.
POST /api/auth/verifications/sms/confirm

{
  "verificationId": 1,
  "code": "사용자가 입력한 6자리 코드"
}
SMS 발송 응답의 verificationId 저장
발송 API 응답에서 받은 verificationId를 프론트 상태에 저장해야 합니다.
이후 인증번호 확인 API에 같은 verificationId를 보내야 합니다.
POST /api/auth/verifications/sms

{
  "phone": "01012345678",
  "purpose": "SIGN_UP"
}
응답 데이터:

{
  "verificationId": 123,
  "expiresIn": 300
}
Mock 모드 안내

CoolSMS 연동 전에는 실제 문자가 안 옵니다.
local/test에서는 백엔드 서버 로그에 인증번호가 찍힙니다.
프론트 화면에 계속 123456을 보여주면 안 됩니다.
개발 중에는 “인증번호는 백엔드 로그에서 확인” 정도로만 처리하는 게 맞습니다.
재발송 제한 에러 처리

너무 빨리 재요청하면 백엔드가 SMS_RATE_LIMITED를 반환합니다.
프론트는 이 경우 재발송 버튼을 잠시 비활성화하거나 에러 메시지를 보여줘야 합니다.
발송 실패 에러 처리

실제 CoolSMS 연동 후 발송 실패 시 SMS_SEND_FAILED가 올 수 있습니다.
프론트는 “인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.” 같은 메시지를 표시하면 됩니다.
정리하면, 프론트는 123456 고정값 의존 제거, 사용자 입력값으로 confirm 요청, verificationId 저장, rate limit/발송 실패 에러 처리가 필요합니다.