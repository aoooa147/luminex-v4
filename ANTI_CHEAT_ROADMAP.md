# 🛡️ แผนพัฒนาระบบกันโกง (Anti-Cheat System Roadmap)

## 📊 สถานะปัจจุบัน

### ✅ สิ่งที่มีอยู่แล้ว

1. **Game Anti-Cheat System** (`lib/game/anticheat.ts`)
   - ✅ Speed violation detection (minimum 50ms between actions)
   - ✅ Pattern detection (repetitive actions)
   - ✅ Score validation (score per second, score per action, duration checks)
   - ✅ Random difficulty generation per user/game combination
   - ✅ Action history tracking (in-memory)
   - ✅ Suspicious activity detection

2. **Referral Anti-Cheat System** (`lib/referral/anticheat.ts`)
   - ✅ IP-based tracking
   - ✅ Self-referral detection
   - ✅ Rate limiting
   - ✅ Multiple account detection

3. **Server-side Validation** (`app/api/game/score/submit/route.ts`)
   - ✅ Signature verification
   - ✅ Nonce validation
   - ✅ Timestamp validation
   - ✅ Score validation
   - ✅ Energy system

---

## 🎯 แผนการพัฒนา (เรียงตามความสำคัญ)

### 🔴 Phase 1: Database Persistence & Enhanced Tracking (สำคัญมาก)

#### 1.1 เก็บ Action History ใน Database ⏱️ 3-4 ชั่วโมง
**ปัญหา**: Action history เก็บใน memory (Map) ซึ่งจะหายไปเมื่อ server restart

**ต้องทำ**:
- ✅ สร้าง Prisma schema สำหรับ `GameAction` table
- ✅ เก็บ action history ใน database แทน memory
- ✅ เพิ่ม indexes สำหรับ query performance
- ✅ Cleanup old records (เก็บแค่ 30 วัน)

**Schema**:
```prisma
model GameAction {
  id          String   @id @default(cuid())
  userId      String   @index
  gameId      String   @index
  action      String
  data        Json?
  timestamp   DateTime @default(now()) @index
  suspicious  Boolean  @default(false)
  reason      String?
  confidence  Float?
  
  createdAt   DateTime @default(now())
  
  @@index([userId, gameId, timestamp])
  @@index([timestamp])
}
```

**ผลลัพธ์**: Action history ถูกเก็บอย่างถาวร และสามารถวิเคราะห์ได้

---

#### 1.2 เพิ่ม Device Fingerprinting ⏱️ 2-3 ชั่วโมง
**ปัญหา**: ไม่สามารถตรวจจับ multiple accounts จาก device เดียวกันได้

**ต้องทำ**:
- ✅ สร้าง device fingerprint จาก browser characteristics
- ✅ เก็บ device fingerprint ใน database
- ✅ ตรวจจับ multiple accounts จาก device เดียวกัน
- ✅ Block suspicious devices

**Implementation**:
```typescript
// lib/utils/deviceFingerprint.ts
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');
  
  return btoa(fingerprint).substring(0, 32);
}
```

**ผลลัพธ์**: ตรวจจับ multiple accounts ได้ดีขึ้น

---

#### 1.3 เพิ่ม IP Tracking & VPN Detection ⏱️ 2-3 ชั่วโมง
**ปัญหา**: ไม่สามารถตรวจจับ VPN/proxy ได้

**ต้องทำ**:
- ✅ เก็บ IP addresses ใน database
- ✅ ตรวจจับ VPN/proxy (ใช้บริการเช่น ipapi.co, ip-api.com)
- ✅ Block suspicious IPs
- ✅ Rate limiting based on IP

**Implementation**:
```typescript
// lib/utils/ipTracking.ts
export async function checkIPRisk(ip: string): Promise<{
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  country: string;
  risk: 'low' | 'medium' | 'high';
}> {
  // Use ipapi.co or similar service
  const response = await fetch(`https://ipapi.co/${ip}/json/`);
  const data = await response.json();
  
  return {
    isVPN: data.org?.toLowerCase().includes('vpn'),
    isProxy: data.org?.toLowerCase().includes('proxy'),
    isTor: false, // Need special Tor detection
    country: data.country_name,
    risk: calculateRisk(data),
  };
}
```

**ผลลัพธ์**: ตรวจจับ VPN/proxy และ block ได้

---

### 🟡 Phase 2: Advanced Detection & Analysis (สำคัญ)

#### 2.1 Behavioral Analysis ⏱️ 4-5 ชั่วโมง
**ปัญหา**: การตรวจจับยังไม่ครอบคลุม enough patterns

**ต้องทำ**:
- ✅ วิเคราะห์พฤติกรรมการเล่นเกม (timing patterns, accuracy, etc.)
- ✅ ตรวจจับ bot-like behavior (perfect timing, no mistakes)
- ✅ ตรวจจับ human-like behavior vs machine-like behavior
- ✅ Machine learning models สำหรับ pattern detection

**Implementation**:
```typescript
// lib/game/behaviorAnalysis.ts
export class BehaviorAnalyzer {
  analyzeTimingPattern(actions: ActionRecord[]): {
    isHuman: boolean;
    confidence: number;
    reasons: string[];
  } {
    // Analyze timing variance
    // Human players have variable timing
    // Bots have consistent timing
    const intervals = this.calculateIntervals(actions);
    const variance = this.calculateVariance(intervals);
    
    return {
      isHuman: variance > THRESHOLD,
      confidence: this.calculateConfidence(variance),
      reasons: this.generateReasons(variance),
    };
  }
  
  analyzeAccuracyPattern(actions: ActionRecord[]): {
    isSuspicious: boolean;
    confidence: number;
  } {
    // Perfect accuracy over long period is suspicious
    const accuracy = this.calculateAccuracy(actions);
    const isSuspicious = accuracy > 0.95 && actions.length > 50;
    
    return {
      isSuspicious,
      confidence: isSuspicious ? 0.9 : 0.1,
    };
  }
}
```

**ผลลัพธ์**: ตรวจจับ bot-like behavior ได้ดีขึ้น

---

#### 2.2 Real-time Monitoring & Alerting ⏱️ 3-4 ชั่วโมง
**ปัญหา**: ไม่มี real-time monitoring สำหรับ suspicious activity

**ต้องทำ**:
- ✅ สร้าง monitoring dashboard
- ✅ Real-time alerts เมื่อพบ suspicious activity
- ✅ Logging และ tracking
- ✅ Admin notifications

**Implementation**:
```typescript
// lib/monitoring/alertSystem.ts
export class AlertSystem {
  async sendAlert(alert: {
    type: 'suspicious_score' | 'multiple_accounts' | 'vpn_detected';
    userId: string;
    severity: 'low' | 'medium' | 'high';
    data: any;
  }): Promise<void> {
    // Send to monitoring system (Sentry, Discord, Email, etc.)
    await this.sendToSentry(alert);
    await this.sendToDiscord(alert);
    if (alert.severity === 'high') {
      await this.sendToAdmin(alert);
    }
  }
}
```

**ผลลัพธ์**: สามารถ monitor และ respond ต่อ suspicious activity ได้ทันที

---

#### 2.3 Score Normalization & Difficulty Adjustment ⏱️ 2-3 ชั่วโมง
**ปัญหา**: Score ไม่ได้ normalize ตาม difficulty

**ต้องทำ**:
- ✅ Normalize score ตาม difficulty
- ✅ ปรับ difficulty ตาม performance
- ✅ Dynamic difficulty adjustment
- ✅ Fair scoring system

**Implementation**:
```typescript
// lib/game/scoreNormalization.ts
export function normalizeScore(
  rawScore: number,
  difficulty: number,
  gameDuration: number,
  actionsCount: number
): number {
  // Base normalization
  const baseMultiplier = 1 / difficulty;
  
  // Time-based normalization
  const timeMultiplier = Math.min(gameDuration / 60, 1); // Prefer longer games
  
  // Action-based normalization
  const actionMultiplier = Math.min(actionsCount / 100, 1);
  
  return rawScore * baseMultiplier * timeMultiplier * actionMultiplier;
}
```

**ผลลัพธ์**: Scoring system ที่ยุติธรรมมากขึ้น

---

### 🟢 Phase 3: Machine Learning & Advanced Features (Nice to Have)

#### 3.1 Machine Learning Models ⏱️ 5-7 ชั่วโมง
**ปัญหา**: การตรวจจับยังไม่แม่นยำ enough

**ต้องทำ**:
- ✅ Train ML models สำหรับ cheat detection
- ✅ Feature engineering (extract features from game data)
- ✅ Model training และ evaluation
- ✅ Model deployment และ inference

**Features**:
- Timing patterns
- Accuracy patterns
- Score patterns
- Device patterns
- IP patterns
- Behavioral patterns

**ผลลัพธ์**: ตรวจจับ cheating ได้แม่นยำมากขึ้น

---

#### 3.2 Session Management & Tracking ⏱️ 2-3 ชั่วโมง
**ปัญหา**: ไม่มีการ track sessions

**ต้องทำ**:
- ✅ สร้าง session management system
- ✅ Track user sessions
- ✅ Detect suspicious session patterns
- ✅ Session-based rate limiting

**ผลลัพธ์**: ติดตาม sessions และ detect suspicious patterns ได้

---

#### 3.3 Advanced Rate Limiting ⏱️ 2-3 ชั่วโมง
**ปัญหา**: Rate limiting ยังไม่ครอบคลุม enough

**ต้องทำ**:
- ✅ Implement advanced rate limiting (sliding window, token bucket)
- ✅ Rate limiting based on multiple factors (IP, device, user)
- ✅ Dynamic rate limiting
- ✅ Adaptive rate limiting

**ผลลัพธ์**: Rate limiting ที่มีประสิทธิภาพมากขึ้น

---

## 📋 Implementation Plan

### Week 1: Database & Persistence
- ✅ Day 1-2: Database schema และ migration
- ✅ Day 3-4: Device fingerprinting
- ✅ Day 5: IP tracking และ VPN detection

### Week 2: Advanced Detection
- ✅ Day 1-2: Behavioral analysis
- ✅ Day 3-4: Real-time monitoring
- ✅ Day 5: Score normalization

### Week 3: ML & Advanced Features
- ✅ Day 1-3: Machine learning models
- ✅ Day 4: Session management
- ✅ Day 5: Advanced rate limiting

---

## 🎯 Quick Wins (ทำได้เร็ว, ผลลัพธ์ดี)

### 1. เพิ่ม Database Persistence (3-4 ชั่วโมง)
- เก็บ action history ใน database
- สามารถวิเคราะห์ได้ดีขึ้น
- **ผลลัพธ์**: ข้อมูลถาวร และสามารถ query ได้

### 2. เพิ่ม Device Fingerprinting (2-3 ชั่วโมง)
- ตรวจจับ multiple accounts
- Block suspicious devices
- **ผลลัพธ์**: ตรวจจับ multiple accounts ได้ดีขึ้น

### 3. เพิ่ม IP Tracking (2-3 ชั่วโมง)
- ตรวจจับ VPN/proxy
- Rate limiting based on IP
- **ผลลัพธ์**: ตรวจจับ VPN/proxy ได้

### 4. เพิ่ม Behavioral Analysis (4-5 ชั่วโมง)
- วิเคราะห์พฤติกรรมการเล่นเกม
- ตรวจจับ bot-like behavior
- **ผลลัพธ์**: ตรวจจับ bots ได้ดีขึ้น

---

## 📊 Metrics & KPIs

### Key Metrics:
- **False Positive Rate**: < 1% (legitimate users blocked)
- **False Negative Rate**: < 5% (cheaters not detected)
- **Detection Accuracy**: > 95%
- **Response Time**: < 1 second

### Monitoring:
- Number of suspicious activities detected
- Number of blocked users
- Number of false positives
- System performance metrics

---

## 🚀 ขั้นตอนต่อไป

### Immediate Actions (ทำก่อน):
1. **เพิ่ม Database Persistence** → 3-4 ชั่วโมง
2. **เพิ่ม Device Fingerprinting** → 2-3 ชั่วโมง
3. **เพิ่ม IP Tracking** → 2-3 ชั่วโมง

### Short-term (ทำต่อ):
4. **Behavioral Analysis** → 4-5 ชั่วโมง
5. **Real-time Monitoring** → 3-4 ชั่วโมง
6. **Score Normalization** → 2-3 ชั่วโมง

### Long-term (ทำเมื่อมีเวลา):
7. **Machine Learning Models** → 5-7 ชั่วโมง
8. **Session Management** → 2-3 ชั่วโมง
9. **Advanced Rate Limiting** → 2-3 ชั่วโมง

---

## 📚 Resources

### Tools & Libraries:
- **Prisma**: Database ORM
- **ipapi.co / ip-api.com**: IP geolocation และ VPN detection
- **TensorFlow.js / ML5.js**: Machine learning
- **Sentry**: Error tracking และ monitoring
- **Redis**: Rate limiting และ caching

### Documentation:
- `lib/game/anticheat.ts` - Current anti-cheat system
- `lib/referral/anticheat.ts` - Referral anti-cheat system
- `app/api/game/score/submit/route.ts` - Score submission validation

---

**พร้อมเริ่มพัฒนาได้เลย!** 🚀

