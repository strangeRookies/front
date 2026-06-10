프론트 측 전달 내용은 아래입니다.

**신규 API**
1. SMS 발송
`POST /api/auth/password-reset/verifications/sms`

요청:
```json
{
  "email": "user@example.com",
  "phone": "010-1234-5678"
}
```

성공 응답:
```json
{
  "success": true,
  "message": "비밀번호 재설정 인증번호가 발급되었습니다.",
  "data": {
    "verificationId": 1,
    "expiresInSeconds": 300
  }
}
```

2. 비밀번호 재설정
`POST /api/auth/password-reset`

요청:
```json
{
  "email": "user@example.com",
  "phone": "010-1234-5678",
  "verificationToken": "confirm-api-response-token",
  "newPassword": "NewPassword123!"
}
```

성공 응답:
```json
{
  "success": true,
  "message": "비밀번호가 재설정되었습니다.",
  "data": null
}
```

**프론트 플로우**
1. 사용자가 이메일, 휴대폰 번호 입력
2. `POST /api/auth/password-reset/verifications/sms` 호출
3. 사용자가 SMS 인증번호 입력
4. 기존 API `POST /api/auth/verifications/sms/confirm` 호출
5. confirm 응답의 `verificationToken` 저장
6. 새 비밀번호 입력 후 `POST /api/auth/password-reset` 호출
7. 성공하면 로그인 화면으로 이동

**주의사항**
- SMS confirm API는 기존 그대로 사용합니다.
- 휴대폰 번호는 `010` 11자리만 허용됩니다.
  - 허용: `01012345678`, `010-1234-5678`, `010 1234 5678`
  - 실패: `011...`, `02...`, `010-123-4567`, 빈 값, 문자 포함
- 새 비밀번호는 `8~100자`입니다.
- 이메일과 휴대폰 번호가 기존 활성 계정과 일치하지 않으면 `USER_NOT_FOUND`가 내려옵니다.
- 인증번호 오류, 만료, 목적이 다른 토큰 사용 시 `AUTH_INVALID_VERIFICATION`입니다.
- 비밀번호 재설정 성공 후 기존 refresh token은 모두 만료되므로, 기존 로그인 세션은 재로그인이 필요합니다.