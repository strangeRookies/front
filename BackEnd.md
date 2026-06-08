프론트에 전달할 핵심은 “경로, 요청 JSON, 응답 위치, 토큰 처리, 아직 미구현 범위”입니다.

**연동 가능 API**

```http
POST /api/auth/verifications/sms
POST /api/auth/verifications/sms/confirm
GET  /api/auth/email-availability?email=user@example.com
GET  /api/companies/business-number-availability?businessNumber=1234567890

POST /api/auth/signup/individual
POST /api/auth/signup/corporate
POST /api/auth/login
POST /api/auth/reissue
POST /api/auth/logout

GET  /api/users/me
GET  /api/users/me/agreements
PATCH /api/users/me/agreements/marketing
```

**공통 응답 구조**

모든 성공 응답은 `data` 안에 실제 값이 들어갑니다.

```json
{
  "success": true,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

에러 응답은 아래 형태입니다.

```json
{
  "success": false,
  "error": {
    "code": "AGREEMENT_REQUIRED",
    "message": "필수 약관에 동의해야 합니다.",
    "fieldErrors": null
  }
}
```

**SMS 인증**

로컬/개발 환경 인증번호는 현재 `123456`입니다.

발송:

```http
POST /api/auth/verifications/sms
```

```json
{
  "phone": "01012345678",
  "purpose": "SIGN_UP"
}
```

확인:

```http
POST /api/auth/verifications/sms/confirm
```

```json
{
  "verificationId": "응답받은 verificationId",
  "code": "123456"
}
```

확인 성공 후 응답의 `verificationToken`을 회원가입 API에 넣어야 합니다.

**개인 회원가입**

```http
POST /api/auth/signup/individual
```

필수로 `agreements`를 포함해야 합니다.

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "홍길동",
  "phone": "01012345678",
  "verificationToken": "verified-token",
  "careTarget": {
    "name": "홍부모",
    "relation": "부모",
    "ageGroup": "70대",
    "postcode": "04123",
    "address": "서울특별시 마포구 월드컵로 1",
    "addressDetail": "101동 101호",
    "district": "마포구",
    "jurisdiction": "마포소방서"
  },
  "emergencyContacts": [
    {
      "name": "김보호",
      "relation": "첫째 아들",
      "phone": "01098765432"
    }
  ],
  "agreements": {
    "termsAgreed": true,
    "privacyAgreed": true,
    "marketingAgreed": false
  }
}
```

**기업 회원가입**

```http
POST /api/auth/signup/corporate
```

```json
{
  "email": "admin@company.com",
  "password": "Password123!",
  "phone": "01012345678",
  "verificationToken": "verified-token",
  "company": {
    "name": "스마트안전병원",
    "businessNumber": "1234567890",
    "industry": "의료/보건",
    "size": "50~200인",
    "postcode": "06123",
    "address": "서울특별시 강남구 테헤란로 1",
    "addressDetail": "안전관리실",
    "district": "강남구",
    "jurisdiction": "강남소방서"
  },
  "manager": {
    "name": "김담당",
    "department": "안전관리팀",
    "rank": "과장",
    "email": "manager@company.com",
    "contact": "01012345678"
  },
  "installation": {
    "count": "6~15개소",
    "preferredDate": "2026-07-01",
    "specialRequest": "실외 카메라 설치 필요"
  },
  "agreements": {
    "termsAgreed": true,
    "privacyAgreed": true,
    "marketingAgreed": false
  }
}
```

**로그인**

```http
POST /api/auth/login
```

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "accountType": "INDIVIDUAL"
}
```

`accountType` 값:

```text
INDIVIDUAL
CORPORATE
ADMIN
```

로그인 성공 후 프론트는:

```text
data.accessToken 저장
data.refreshToken 저장
data.user.role 기준으로 화면 이동
```

인증 필요한 API 호출 시:

```http
Authorization: Bearer {accessToken}
```

**토큰 재발급/로그아웃**

재발급:

```http
POST /api/auth/reissue
```

```json
{
  "refreshToken": "refresh-token"
}
```

로그아웃:

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

```json
{
  "refreshToken": "refresh-token"
}
```

**약관 조회/마케팅 변경**

```http
GET /api/users/me/agreements
Authorization: Bearer {accessToken}
```

```http
PATCH /api/users/me/agreements/marketing
Authorization: Bearer {accessToken}
```

```json
{
  "agreed": false
}
```

**주의 사항**

- 아이디 저장은 API가 아니라 프론트 `localStorage`에서 처리
- 필수 약관 미동의 시 `AGREEMENT_REQUIRED`
- 중복 이메일: `USER_EMAIL_ALREADY_EXISTS`
- 중복 사업자등록번호: `COMPANY_BUSINESS_NUMBER_ALREADY_EXISTS`
- 잘못된 로그인: `AUTH_INVALID_CREDENTIALS`
- 인증 없음: `AUTH_UNAUTHORIZED`
- 비밀번호 재설정은 아직 미구현
- 기업 승인은 아직 미구현이라 현재 기업 회원도 가입 즉시 `ACTIVE` 기준입니다.

