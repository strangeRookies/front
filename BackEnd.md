프론트 측 전달 사항입니다.

**백엔드 인증 변경 사항**
Refresh Token 전달 방식이 변경되었습니다.

기존:
```ts
{
  accessToken: "...",
  refreshToken: "...",
  expiresIn: 1800,
  user: {...}
}
```

변경 후:
```ts
{
  accessToken: "...",
  expiresIn: 1800,
  user: {...}
}
```

`refreshToken`은 더 이상 response body로 내려오지 않고, `HttpOnly Cookie`로 저장됩니다.

**프론트 수정 필요 사항**

1. `loginResponse.refreshToken` 사용 제거
```ts
saveAuthSession(loginResponse);
```

기존처럼 `refreshToken`을 인자로 넘기는 구조라면 제거해야 합니다.

예상 변경:
```ts
authStore.setSession(loginResponse.accessToken, loginResponse.user);
```

2. `authStore`에서 `refreshToken` 제거
현재 구조:
```ts
let session = {
  accessToken: null,
  refreshToken: null,
  user: null,
};
```

변경:
```ts
let session = {
  accessToken: null,
  user: null,
};
```

3. `/api/auth/reissue` 호출 방식 변경
기존:
```ts
export async function reissueToken(refreshToken: string) {
  return apiRequest('/api/auth/reissue', {
    method: 'POST',
    body: { refreshToken },
  });
}
```

변경:
```ts
export async function reissueToken() {
  return apiRequest('/api/auth/reissue', {
    method: 'POST',
  });
}
```

4. `/api/auth/logout` 호출 방식 변경
기존에 refreshToken을 body로 보내고 있었다면 제거해야 합니다.

변경 후:
```ts
POST /api/auth/logout
```

body에 `refreshToken` 없음.

5. `fetch`에 credentials 추가
Refresh Token cookie를 주고받으려면 공통 API 요청에 아래 옵션이 필요합니다.

```ts
credentials: 'include'
```

예상 위치:
```ts
fetch(buildApiUrl(path), {
  ...init,
  credentials: 'include',
  headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(body),
});
```

6. localStorage/sessionStorage에 refreshToken 저장 금지 유지
앞으로도 refreshToken은 프론트 JS에서 직접 다루지 않습니다.

```text
refreshToken 저장 X
refreshToken 읽기 X
refreshToken request body 전송 X
```

7. 로그인 유지 기능을 만들 경우
앱 시작 시 `/api/auth/reissue`를 호출해서 accessToken을 복원하면 됩니다.

```text
앱 시작
→ POST /api/auth/reissue
→ Cookie의 REFRESH_TOKEN으로 백엔드가 검증
→ 새 accessToken 응답
→ 프론트 메모리에 accessToken 저장
```

**프론트에서 알아야 할 API 계약**
```text
POST /api/auth/login
- request: 기존 동일
- response body: accessToken만 포함
- response header: Set-Cookie: REFRESH_TOKEN=...

POST /api/auth/reissue
- request body 없음
- cookie 필요
- response body: 새 accessToken
- response header: 새 REFRESH_TOKEN cookie

POST /api/auth/logout
- request body 없음
- cookie 필요
- response header: REFRESH_TOKEN 만료 cookie
```

핵심은 이겁니다.

```text
프론트는 refreshToken을 더 이상 저장하거나 전달하지 않는다.
백엔드가 HttpOnly Cookie로 관리한다.
프론트는 모든 인증 요청에 credentials: 'include'를 적용한다.
```