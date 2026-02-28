# YT Organizer

유튜브 구독 채널을 카테고리별로 정리하고, 카테고리별 최신 영상을 한눈에 볼 수 있는 웹앱입니다.
누구든 Google 로그인만 하면 자신의 구독 채널을 불러와 카테고리로 관리할 수 있습니다.

## 주요 기능

- Google 로그인으로 유튜브 구독 채널 자동 로드
- 카테고리 생성/수정/삭제
- 채널을 카테고리에 배정 (드롭다운 선택)
- 카테고리별 최신 영상 피드
- 미분류 채널 별도 관리
- 채널 검색 및 필터링
- 유저별 카테고리 데이터 서버 저장 (Supabase)

## 사전 준비

### 1. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. **SQL Editor**에서 `supabase/schema.sql` 파일의 내용을 실행합니다.
3. **Settings > API**에서 아래 값을 메모합니다:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com)에서 새 프로젝트를 생성합니다.
2. **APIs & Services > Library**에서 **YouTube Data API v3**를 활성화합니다.
3. **APIs & Services > Credentials**에서 **OAuth 2.0 Client ID**를 생성합니다:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - (배포 시: `https://your-domain.com/api/auth/callback/google` 추가)
4. Client ID와 Client Secret을 메모합니다.

#### 퍼블릭 배포 시 추가 설정

5. **OAuth consent screen**에서 Publishing status를 **In production**으로 변경합니다.
6. `youtube.readonly` 스코프는 sensitive scope이므로 Google 검증이 필요합니다.
   - 검증 전에는 "unverified app" 경고가 뜨지만, 사용자가 "Advanced > Go to app" 을 누르면 진행 가능합니다.
   - 검증을 받으려면 Google의 OAuth 앱 검증 절차를 진행하세요.

### 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어 아래 값을 채웁니다:

```
GOOGLE_CLIENT_ID=발급받은_클라이언트_ID
GOOGLE_CLIENT_SECRET=발급받은_클라이언트_시크릿
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=임의의_비밀키(openssl rand -base64 32 로 생성 가능)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=발급받은_service_role_key
```

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다.

## Vercel 배포

```bash
npm install -g vercel
vercel
```

Vercel 대시보드에서 위의 환경 변수들을 모두 설정하고, `NEXTAUTH_URL`은 배포된 도메인으로 변경합니다.
Google Cloud Console에서 Authorized redirect URIs에 배포 도메인도 추가하세요.

## 기술 스택

- Next.js 14 (App Router)
- NextAuth.js (Google OAuth)
- YouTube Data API v3
- Supabase (PostgreSQL - 카테고리 데이터)
- Tailwind CSS
