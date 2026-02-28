# YT Organizer

유튜브 구독 채널을 카테고리별로 정리하고, 카테고리별 최신 영상을 한눈에 볼 수 있는 웹앱입니다.

🔗 **Live**: [owesean-yt-organizer.vercel.app](https://owesean-yt-organizer.vercel.app/)

## 주요 기능

- **채널 추가**: YouTube 채널 URL을 붙여넣어 채널 등록 (상단 모달에서 카테고리 즉시 배정 가능)
- **카테고리 관리**: 카테고리 생성/수정/삭제, 채널 배정/해제
- **카테고리별 피드**: 전체 / 카테고리별 / 미분류 탭으로 최신 영상 필터링
- **영상 시청**: 임베드 플레이어 + 같은 카테고리(또는 전체) 사이드바
- **멀티 유저**: Google 로그인 기반, 유저별 데이터 분리 (Supabase)
- **제로 API 쿼터**: YouTube RSS 피드 사용으로 API 쿼터 소모 없음

## 기술 스택

- **Next.js 14** (App Router)
- **NextAuth.js** (Google OAuth)
- **Supabase** (PostgreSQL)
- **YouTube RSS** (영상 피드)
- **Tailwind CSS**

## 사전 준비

### 1. Supabase 프로젝트

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. Settings > API에서 `Project URL`과 `service_role` key 메모

### 2. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. APIs & Services > Credentials에서 OAuth 2.0 Client ID 생성:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (로컬)
     - `https://your-domain.com/api/auth/callback/google` (배포)
3. OAuth consent screen에서 앱 이름, 이메일 등 설정

> YouTube Data API 활성화는 불필요합니다. RSS 피드를 사용하므로 API 쿼터가 소모되지 않습니다.

### 3. 환경 변수

```bash
cp .env.local.example .env.local
```

```
GOOGLE_CLIENT_ID=발급받은_클라이언트_ID
GOOGLE_CLIENT_SECRET=발급받은_클라이언트_시크릿
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=임의의_비밀키 (openssl rand -base64 32)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=발급받은_service_role_key
```

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에 접속합니다.

## Vercel 배포

1. Vercel에서 GitHub 레포 Import
2. Environment Variables에 위 환경 변수 모두 추가 (`NEXTAUTH_URL`은 배포 도메인으로)
3. Deploy

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth 핸들러
│   │   ├── categories/           # 카테고리 CRUD API
│   │   ├── channels/             # 채널 추가/삭제 API
│   │   └── feed/                 # RSS 피드 API
│   ├── manage/                   # 채널/카테고리 관리 페이지
│   ├── watch/[id]/               # 영상 시청 페이지
│   └── page.tsx                  # 메인 피드 페이지
├── components/
│   ├── AddChannelModal.tsx       # 채널 추가 모달 (카테고리 선택 포함)
│   ├── Header.tsx                # 상단 네비게이션
│   ├── VideoCard.tsx             # 영상 카드
│   └── ...
└── lib/
    ├── channel.ts                # 채널 URL 파싱/리졸브
    ├── rss.ts                    # YouTube RSS 피드 파싱
    ├── storage.ts                # Supabase 데이터 저장
    └── supabase.ts               # Supabase 클라이언트
```
