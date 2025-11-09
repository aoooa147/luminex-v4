# 🚀 สิ่งที่ต้องพัฒนาต่อ - Next Development Tasks

**วันที่อัพเดต**: 2024-12-19  
**สถานะ Tests**: 565/577 tests ผ่าน (98%) - มี 12 tests ที่ต้องแก้ไข

---

## 🔴 Priority 1: แก้ไข Tests ที่ล้มเหลว (ทำก่อน - สำคัญมาก)

### 1.1 แก้ไข Error Scenarios Tests (12 tests ล้มเหลว)

#### ✅ `error-scenarios/concurrent-requests.test.ts` (แก้ไขเสร็จแล้ว)
- **ปัญหา**: `mockPrisma` ถูกใช้ก่อน initialization
- **แก้ไข**: ย้าย `jest.mock()` ไปไว้ก่อนการ import routes และใช้ `prisma` จาก mock

#### ✅ `error-scenarios/network-timeouts.test.ts` (แก้ไขเสร็จแล้ว)
- **ปัญหา**: Syntax error - ขาด closing brace
- **แก้ไข**: เพิ่ม closing brace สำหรับ describe block

#### ⚠️ `error-scenarios.test.ts` (ยังมี 2 tests ไม่ผ่าน)
- **ปัญหา**: External API errors tests ไม่ผ่าน
  - `should handle external API 500 errors with retries` - response body เป็น empty string
  - `should handle external API 404 errors immediately` - response body เป็น empty string
  - ✅ `Database storage failed` - แก้ไขเสร็จแล้ว (ใช้ mock function แทน require)

**สาเหตุที่เป็นไปได้**:
- Response body ถูก consume ไปแล้วโดย mock หรือ handler อื่น
- NextResponse mock ใน Jest setup อาจมีปัญหา
- Route handler อาจไม่ได้ return response ถูกต้องในบางกรณี

**ต้องทำ**:
- ตรวจสอบว่า route handler return `createErrorResponse` ถูกต้องหรือไม่
- เปรียบเทียบกับ `confirm-payment.test.ts` ที่ทำงานได้
- อาจต้องใช้ `response.clone()` หรือวิธีอื่นในการอ่าน response body
- ตรวจสอบว่า mock ของ dependencies ไม่ได้ interfere กับการสร้าง response

---

## 🟡 Priority 2: เพิ่ม Test Coverage (ทำต่อ - สำคัญ)

### 2.1 API Routes Tests (ยังไม่มี unit tests)

Routes ที่ยังไม่มี unit tests:
- ✅ `/api/process-referral` - มี tests แล้ว
- ✅ `/api/game/score/submit` - มี tests แล้ว
- ✅ `/api/game/reward/lux` - มี tests แล้ว
- ✅ `/api/confirm-payment` - มี tests แล้ว
- ✅ `/api/admin/*` (7 routes) - มี tests แล้ว

**สรุป**: API routes ส่วนใหญ่มี tests แล้ว ✅

### 2.2 Component Tests (เพิ่มเติม)

Components ที่ยังไม่มี tests หรือ tests ไม่ครบ:
- ✅ `GameLauncherCard` - มี tests แล้ว
- ✅ `GameStatsCard` - มี tests แล้ว
- ✅ `GameTab` - มี tests แล้ว
- ✅ `StakingTab` - มี tests แล้ว
- ✅ `MembershipTab` - มี tests แล้ว
- ✅ `ReferralTab` - มี tests แล้ว
- ✅ `StakeModal` - มี tests แล้ว
- ✅ `QRModal` - มี tests แล้ว
- ✅ `MiniKitPanel` - มี tests แล้ว
- ✅ `WorldIDVerification` - มี tests แล้ว
- ✅ `Logo3D` - มี tests แล้ว

**Components ที่ยังไม่มี tests**:
- ⏭️ `BrandStyle.tsx` - ยังไม่มี tests
- ⏭️ `GoogleAnalytics.tsx` - ยังไม่มี tests
- ⏭️ `Toast.tsx` - ยังไม่มี tests
- ⏭️ `TronComponents.tsx` - ยังไม่มี tests
- ⏭️ `TronPanel.tsx` - ยังไม่มี tests
- ⏭️ `TronShell.tsx` - ยังไม่มี tests

### 2.3 Utility Tests (เพิ่มเติม)

Utilities ที่ยังไม่มี tests:
- ✅ `analytics.ts` - มี tests แล้ว
- ✅ `deviceFingerprint.ts` - มี tests แล้ว
- ✅ `i18n.ts` - มี tests แล้ว
- ✅ `performance.ts` - มี tests แล้ว
- ✅ `pwa.ts` - มี tests แล้ว
- ✅ `translations.ts` - มี tests แล้ว
- ✅ `apiHandler.ts` - มี tests แล้ว
- ✅ `helpers.ts` - มี tests แล้ว
- ✅ `ipTracking.ts` - มี tests แล้ว
- ✅ `rateLimit.ts` - มี tests แล้ว
- ✅ `requestId.ts` - มี tests แล้ว

**Utilities ที่ยังไม่มี tests**:
- ⏭️ `env.ts` - ยังไม่มี tests (อาจไม่จำเป็นเพราะเป็น config)

---

## 🟢 Priority 3: Performance Optimization (ทำเมื่อมีเวลา)

### 3.1 React Optimization
- ⏭️ เพิ่ม `React.memo` สำหรับ components ที่ไม่ค่อยเปลี่ยน
- ⏭️ เพิ่ม `useMemo` สำหรับ expensive computations
- ⏭️ เพิ่ม `useCallback` สำหรับ event handlers ที่ pass เป็น props
- ⏭️ ตรวจสอบ re-renders ที่ไม่จำเป็น

### 3.2 Bundle Optimization
- ⏭️ วิเคราะห์ bundle size
- ⏭️ Implement code splitting สำหรับ routes ที่ไม่ใช้บ่อย
- ⏭️ ลบ unused dependencies
- ⏭️ Optimize images (ใช้ Next.js Image component)

### 3.3 API Optimization
- ⏭️ Implement caching สำหรับ API calls
- ⏭️ Optimize database queries
- ⏭️ เพิ่ม response compression
- ⏭️ Implement request batching

---

## 🔵 Priority 4: UI/UX Improvements (ทำเมื่อมีเวลา)

### 4.1 Loading States
- ⏭️ เพิ่ม Loading skeletons สำหรับทุกหน้า
- ⏭️ ปรับปรุง loading indicators
- ⏭️ เพิ่ม progress indicators สำหรับ long operations

### 4.2 Empty States
- ⏭️ เพิ่ม Empty states สำหรับทุก section
- ⏭️ เพิ่ม helpful messages เมื่อไม่มีข้อมูล
- ⏭️ เพิ่ม call-to-action buttons

### 4.3 Error Messages
- ⏭️ ปรับปรุง error messages ให้ชัดเจนขึ้น
- ⏭️ เพิ่ม helpful error messages
- ⏭️ เพิ่ม error recovery options

### 4.4 Accessibility
- ⏭️ เพิ่ม ARIA labels
- ⏭️ เพิ่ม keyboard navigation
- ⏭️ เพิ่ม screen reader support
- ⏭️ ปรับปรุง color contrast

### 4.5 Responsive Design
- ⏭️ ปรับปรุง responsive design สำหรับ mobile devices
- ⏭️ ทดสอบบน devices ต่างๆ
- ⏭️ ปรับปรุง touch interactions

---

## 🟣 Priority 5: Security Tests (ทำเมื่อมีเวลา)

### 5.1 Security Tests (เสร็จแล้ว ✅)
- ✅ SQL injection tests
  - ✅ Tests สำหรับ process-referral endpoint
  - ✅ Tests สำหรับ game score submit endpoint
  - ✅ ป้องกัน SQL injection ในทุก input fields
  - ✅ แก้ไข mock modules ให้ถูกต้อง (@/lib/game/storage, @/lib/game/verify)
  - ✅ แก้ไข response body reading ใน tests
- ✅ XSS tests
  - ✅ Tests สำหรับ XSS payloads ใน input fields
  - ✅ Tests สำหรับ response sanitization
  - ✅ ป้องกัน XSS attacks
  - ✅ แก้ไข mock modules ให้ถูกต้อง
  - ✅ แก้ไข response body reading ใน tests
- ✅ CSRF protection tests
  - ✅ Tests สำหรับ CSRF token generation
  - ✅ Tests สำหรับ CSRF token validation
  - ✅ Tests สำหรับ GET/POST/PUT/DELETE methods
  - ✅ แก้ไข response body reading ใน tests (ใช้ response.text() แล้ว parse JSON)
- ✅ Rate limit bypass tests
  - ✅ Tests สำหรับ rate limit enforcement
  - ✅ Tests สำหรับ IP spoofing attempts
  - ✅ Tests สำหรับ concurrent requests
  - ✅ แก้ไข response body reading ใน tests
- ✅ Authentication/Authorization tests
  - ✅ Tests สำหรับ admin access control
  - ✅ Tests สำหรับ wallet address validation
  - ✅ Tests สำหรับ signature validation
  - ✅ Tests สำหรับ nonce validation
  - ✅ แก้ไข invalid address ใน validAddresses array

**สรุป:** Security tests ทั้งหมดผ่านแล้ว (32 tests passed) ✅

### 5.2 Security Improvements (เสร็จแล้ว ✅)
- ✅ เพิ่ม input validation
  - ✅ สร้าง sanitization utilities (sanitizeString, sanitizeHTML, sanitizeNumber, etc.)
  - ✅ เพิ่ม SQL injection prevention
  - ✅ เพิ่ม XSS prevention
  - ✅ เพิ่ม address validation
  - ✅ เพิ่ม URL validation
- ✅ เพิ่ม output encoding
  - ✅ HTML entity encoding (encodeHTML)
  - ✅ JavaScript string encoding (encodeJS)
  - ✅ URL encoding (encodeURL)
  - ✅ Response sanitization
- ✅ เพิ่ม security headers
  - ✅ Content-Security-Policy (CSP)
  - ✅ Strict-Transport-Security (HSTS) - production only
  - ✅ X-Frame-Options
  - ✅ X-Content-Type-Options
  - ✅ X-XSS-Protection
  - ✅ Referrer-Policy
  - ✅ Permissions-Policy
- ✅ เพิ่ม security monitoring
  - ✅ Security event logging (logSecurityEvent)
  - ✅ Security statistics API (/api/security/stats)
  - ✅ IP flagging for suspicious activity (isIPFlagged)
  - ✅ Integration with logger
  - ✅ Critical event tracking
  - ✅ **เพิ่ม security threat detection (detectSQLInjection, detectXSS, checkSecurityThreats)**
  - ✅ **เพิ่ม security monitoring ใน API routes (process-referral, game/score/submit, referral/process)**
  - ✅ **Integrate security monitoring กับ Sentry (sendToExternalMonitoring)**
  - ✅ **เพิ่ม security middleware สำหรับ threat detection และ suspicious activity detection**
- ✅ เพิ่ม CSRF protection
  - ✅ CSRF token generation
  - ✅ CSRF token validation
  - ✅ CSRF token API endpoint (/api/csrf-token)
  - ✅ Constant-time comparison (ป้องกัน timing attacks)
  - ✅ Security middleware สำหรับ CSRF protection
- ✅ **เพิ่ม security threat detection**
  - ✅ **สร้าง threatDetection.ts สำหรับ detect SQL injection และ XSS**
  - ✅ **เพิ่ม checkSecurityThreats และ checkURLThreats functions**
  - ✅ **เพิ่ม detectSuspiciousActivity function**
  - ✅ **Integrate threat detection ใน API routes**

---

## 📊 สรุปความคืบหน้า

### ✅ Completed (เสร็จแล้ว)
- **Tests**: 565/577 tests ผ่าน (98%)
- **API Route Tests**: มี tests สำหรับ routes หลักๆ
- **Integration Tests**: 24 tests สำหรับ 6 flows
- **Component Tests**: มี tests สำหรับ components หลักๆ
- **Utility Tests**: มี tests สำหรับ utilities หลักๆ
- **Hooks Tests**: 100% coverage (5/5 hooks)

### ⏭️ Pending (ยังต้องทำ)
- **Error Scenarios Tests**: แก้ไข 12 tests ที่ล้มเหลว
- **Component Tests**: เพิ่ม tests สำหรับ 6 components
- **Performance Optimization**: React, Bundle, API optimization
- **UI/UX Improvements**: Loading, Empty, Error states, Accessibility
- **Security Tests**: SQL injection, XSS, CSRF, Rate limit tests

---

## 🎯 Next Steps (ลำดับความสำคัญ)

### ทันที (ทำก่อน)
1. ✅ แก้ไข Error Scenarios Tests (12 tests)
   - แก้ `error-scenarios.test.ts` (3 tests)
   - แก้ `network-timeouts.test.ts` (syntax error)
   - แก้ `concurrent-requests.test.ts` (mock initialization)

### สั้น (ทำต่อ)
2. ⏭️ เพิ่ม Component Tests (6 components)
   - `BrandStyle.tsx`
   - `GoogleAnalytics.tsx`
   - `Toast.tsx`
   - `TronComponents.tsx`
   - `TronPanel.tsx`
   - `TronShell.tsx`

### กลาง (ทำเมื่อมีเวลา)
3. ⏭️ Performance Optimization
   - ✅ React optimization (เสร็จแล้ว)
     - ✅ เพิ่ม React.memo ใน MiniKitPanel, GameStatsCard, Logo3D
     - ✅ เพิ่ม useCallback และ useMemo ใน components
     - ✅ Optimize event handlers และ computed values
     - ✅ เพิ่ม useCallback ใน ReferralTab, BottomNav, AppHeader, StakeModal, MembershipTab
     - ✅ เพิ่ม useMemo สำหรับ computed values ใน AppHeader และ MembershipTab
   - ✅ Bundle optimization (เสร็จแล้ว)
     - ✅ Setup bundle analyzer (@next/bundle-analyzer)
     - ✅ เพิ่ม build:analyze script
     - ✅ Enable compression และ swcMinify
     - ✅ Optimize webpack config สำหรับ tree shaking
     - ✅ Enable font optimization
   - ✅ API optimization (เสร็จแล้ว)
     - ✅ เพิ่ม response caching สำหรับ system/status (30s cache)
     - ✅ เพิ่ม response caching สำหรับ system/health (15s cache)
     - ✅ Enable compression headers
     - ⏭️ เพิ่ม request debouncing/throttling (ทำต่อไป)
     - ⏭️ Implement request batching (ทำต่อไป)

4. ✅ UI/UX Improvements (เสร็จแล้ว)
   - ✅ Loading states
     - ✅ เพิ่ม isLoadingStakingData ใน useStaking hook
     - ✅ เพิ่ม isLoadingPowerData ใน usePower hook
     - ✅ เพิ่ม isLoadingReferralData ใน useReferral hook
     - ✅ เพิ่ม LoadingSkeleton ใน StakingTab, MembershipTab, ReferralTab
   - ✅ Empty states (เสร็จแล้ว)
     - ✅ เพิ่ม EmptyState ใน StakingTab เมื่อไม่มี staking (stakedAmount === 0)
     - ✅ เพิ่ม EmptyState ใน ReferralTab เมื่อไม่มี referrals (safeTotalReferrals === 0 && safeTotalEarnings === 0)
     - ✅ EmptyState components รองรับ action buttons (เช่น "Start Staking" button)
     - ✅ EmptyState แสดงข้อความแนะนำและ call-to-action ที่ชัดเจน
   - ✅ Error messages (เสร็จแล้ว)
     - ✅ สร้าง ErrorMessage component ที่รองรับ solutions/hints
     - ✅ ปรับปรุง error messages ใน useStaking hook ให้มี solutions/hints
     - ✅ ปรับปรุง error messages ใน usePower hook ให้มี solutions/hints
     - ✅ Error messages แสดง solution และ hint เพื่อช่วยเหลือผู้ใช้
     - ✅ Error messages รวม solutions/hints ในข้อความ (format: "Message. Solution: ... Hint: ...")
   - ✅ Accessibility
     - ✅ เพิ่ม ARIA labels (aria-label, aria-hidden)
     - ✅ เพิ่ม role attributes (role="list", role="status", role="region")
     - ✅ เพิ่ม semantic HTML
     - ✅ เพิ่ม keyboard navigation support

### ยาว (ทำเมื่อมีเวลา)
5. ⏭️ Security Tests
   - SQL injection
   - XSS
   - CSRF
   - Rate limit bypass

---

## 📚 เอกสารอ้างอิง

- [Progress Summary Final](./PROGRESS_SUMMARY_FINAL.md)
- [Progress Update](./PROGRESS_UPDATE.md)
- [Test Results](./TEST_RESULTS.md)
- [Component Tests Complete](./COMPONENT_TESTS_COMPLETE.md)
- [Utility Tests Complete](./UTILITY_TESTS_COMPLETE.md)

