# 📋 Manual Testing Checklist

คู่มือการทดสอบระบบด้วยตนเอง (Manual Testing) สำหรับ Luminex v4

---

## 🔧 Prerequisites

1. ✅ Environment variables ตั้งค่าแล้ว (`.env.local`)
2. ✅ Dependencies ติดตั้งแล้ว (`npm install`)
3. ✅ Database ตั้งค่าแล้ว (ถ้าใช้)
4. ✅ Development server รันแล้ว (`npm run dev`)

---

## 1. 🔐 Wallet Connection Testing

### Test Cases:

#### 1.1 Connect Wallet
- [ ] เปิดแอปใน World App
- [ ] กดปุ่ม "Connect Wallet"
- [ ] เลือก wallet ใน World App
- [ ] Wallet address แสดงผลถูกต้อง
- [ ] Balance (WLD) แสดงผลถูกต้อง
- [ ] Balance (LUX) แสดงผลถูกต้อง

**Expected Result**: Wallet connection สำเร็จ, Balance แสดงผลถูกต้อง

---

#### 1.2 World ID Verification
- [ ] กดปุ่ม "Verify with World ID"
- [ ] ทำการ verify สำเร็จ
- [ ] Status เปลี่ยนเป็น "Verified"
- [ ] Verified address ถูกบันทึก

**Expected Result**: World ID verification สำเร็จ, Status เปลี่ยนเป็น "Verified"

---

#### 1.3 Wallet Disconnect
- [ ] กดปุ่ม "Disconnect"
- [ ] Wallet ถูกล้างออกจาก state
- [ ] ต้อง connect ใหม่เพื่อใช้งาน

**Expected Result**: Wallet disconnect สำเร็จ, State ถูกล้าง

---

## 2. 💰 Staking Operations Testing

### Test Cases:

#### 2.1 Stake WLD
- [ ] เลือก Pool (Flexible, 30d, 90d, 180d, 365d)
- [ ] กรอกจำนวน WLD ที่ต้องการ stake
- [ ] ดู APY และ lock period
- [ ] กดปุ่ม "Stake"
- [ ] Transaction สำเร็จ
- [ ] Staked amount อัพเดทถูกต้อง
- [ ] Balance ลดลงตามจำนวนที่ stake

**Expected Result**: Staking transaction สำเร็จ, Staked amount อัพเดทถูกต้อง

---

#### 2.2 Claim Rewards
- [ ] มี pending rewards
- [ ] กดปุ่ม "Claim Rewards"
- [ ] Transaction สำเร็จ
- [ ] Rewards ถูกโอนเข้าบัญชี
- [ ] Pending rewards เป็น 0

**Expected Result**: Rewards claim สำเร็จ, Balance เพิ่มขึ้น

---

#### 2.3 Withdraw Balance
- [ ] มี staked balance
- [ ] Pool หมดเวลา lock (สำหรับ locked pools)
- [ ] กดปุ่ม "Withdraw"
- [ ] Transaction สำเร็จ
- [ ] Staked amount เป็น 0
- [ ] Balance เพิ่มขึ้นตามจำนวนที่ withdraw

**Expected Result**: Withdraw transaction สำเร็จ, Balance เพิ่มขึ้น

---

## 3. ⚡ Power/Membership Purchase Testing

### Test Cases:

#### 3.1 Purchase Power
- [ ] เลือก Power Tier (Spark, Nova, Quantum, Infinity, Singularity)
- [ ] ดูราคาและ APY boost
- [ ] กดปุ่ม "Purchase"
- [ ] Payment transaction สำเร็จ
- [ ] Power status อัพเดทเป็น active
- [ ] APY boost มีผลทันที

**Expected Result**: Power purchase สำเร็จ, APY boost มีผล

---

#### 3.2 Power Status
- [ ] ดู Power status ที่ถูกต้อง
- [ ] ดู APY boost ที่ถูกต้อง
- [ ] ดู expiration date (ถ้ามี)
- [ ] ดู power tier ที่ active

**Expected Result**: Power status แสดงผลถูกต้อง

---

## 4. 🎁 Referral System Testing

### Test Cases:

#### 4.1 Create Referral Code
- [ ] Referral code สร้างอัตโนมัติ
- [ ] Referral code แสดงผลถูกต้อง
- [ ] Referral code ไม่ซ้ำ

**Expected Result**: Referral code สร้างและแสดงผลถูกต้อง

---

#### 4.2 Share Referral Link
- [ ] กดปุ่ม "Share Link"
- [ ] Link แสดงผลถูกต้อง
- [ ] QR Code แสดงผลถูกต้อง
- [ ] Copy link สำเร็จ
- [ ] Share via social media สำเร็จ

**Expected Result**: Referral link แชร์ได้สำเร็จ

---

#### 4.3 Referral Stats
- [ ] Total Referrals แสดงผลถูกต้อง
- [ ] Total Earnings แสดงผลถูกต้อง
- [ ] Stats อัพเดทแบบ real-time
- [ ] Referral list แสดงผลถูกต้อง

**Expected Result**: Referral stats แสดงผลถูกต้อง

---

#### 4.4 Use Referral Code
- [ ] ใช้ referral code จาก URL parameter
- [ ] Referral code ถูกบันทึกใน localStorage
- [ ] Referral code ถูก process หลังจาก wallet connection
- [ ] Referral rewards ได้รับ

**Expected Result**: Referral code ใช้งานได้สำเร็จ

---

## 5. 🌐 Language Switching Testing

### Test Cases:

#### 5.1 Change Language
- [ ] เลือกภาษา English
- [ ] ข้อความเปลี่ยนเป็นภาษาอังกฤษ
- [ ] เลือกภาษา ไทย
- [ ] ข้อความเปลี่ยนเป็นภาษาไทย
- [ ] เลือกภาษา 中文
- [ ] ข้อความเปลี่ยนเป็นภาษาจีน
- [ ] เลือกภาษา 日本語
- [ ] ข้อความเปลี่ยนเป็นภาษาญี่ปุ่น
- [ ] เลือกภาษา Español
- [ ] ข้อความเปลี่ยนเป็นภาษาสเปน

**Expected Result**: Language switching ทำงานถูกต้อง

---

#### 5.2 Language Persistence
- [ ] เปลี่ยนภาษา
- [ ] Refresh หน้า
- [ ] ภาษายังคงเหมือนเดิม (บันทึกใน localStorage)

**Expected Result**: Language persistence ทำงานถูกต้อง

---

## 6. 🎮 Games Testing

### Test Cases:

#### 6.1 Coin Flip
- [ ] เปิดเกม Coin Flip
- [ ] เล่นเกมสำเร็จ
- [ ] Sound effects ทำงาน
- [ ] Score submission สำเร็จ
- [ ] Rewards ได้รับ
- [ ] Anti-cheat ทำงาน

**Expected Result**: เกม Coin Flip ทำงานถูกต้อง

---

#### 6.2 Memory Match
- [ ] เปิดเกม Memory Match
- [ ] เล่นเกมสำเร็จ
- [ ] Sound effects ทำงาน
- [ ] Score submission สำเร็จ
- [ ] Anti-cheat ทำงาน

**Expected Result**: เกม Memory Match ทำงานถูกต้อง

---

#### 6.3 Number Rush
- [ ] เปิดเกม Number Rush
- [ ] เล่นเกมสำเร็จ
- [ ] Sound effects ทำงาน
- [ ] Score submission สำเร็จ
- [ ] Anti-cheat ทำงาน

**Expected Result**: เกม Number Rush ทำงานถูกต้อง

---

#### 6.4 Color Tap
- [ ] เปิดเกม Color Tap
- [ ] เล่นเกมสำเร็จ
- [ ] Sound effects ทำงาน
- [ ] Score submission สำเร็จ
- [ ] Anti-cheat ทำงาน

**Expected Result**: เกม Color Tap ทำงานถูกต้อง

---

#### 6.5 Word Builder
- [ ] เปิดเกม Word Builder
- [ ] เล่นเกมสำเร็จ
- [ ] Sound effects ทำงาน
- [ ] Score submission สำเร็จ
- [ ] Anti-cheat ทำงาน

**Expected Result**: เกม Word Builder ทำงานถูกต้อง

---

#### 6.6 Math Quiz
- [ ] เปิดเกม Math Quiz
- [ ] เล่นเกมสำเร็จ
- [ ] Sound effects ทำงาน
- [ ] Score submission สำเร็จ
- [ ] Anti-cheat ทำงาน

**Expected Result**: เกม Math Quiz ทำงานถูกต้อง

---

## 7. 🎨 UI/UX Testing

### Test Cases:

#### 7.1 Loading States
- [ ] Loading skeleton แสดงผลขณะโหลดข้อมูล
- [ ] Loading spinner แสดงผลขณะทำ transaction
- [ ] Loading state หายไปเมื่อโหลดเสร็จ

**Expected Result**: Loading states ทำงานถูกต้อง

---

#### 7.2 Toast Notifications
- [ ] Success toast แสดงผลเมื่อสำเร็จ
- [ ] Error toast แสดงผลเมื่อเกิด error
- [ ] Toast หายไปอัตโนมัติ
- [ ] Toast แสดงผลในตำแหน่งที่ถูกต้อง

**Expected Result**: Toast notifications ทำงานถูกต้อง

---

#### 7.3 Responsive Design
- [ ] แอปทำงานได้ดีบน mobile
- [ ] แอปทำงานได้ดีบน tablet
- [ ] แอปทำงานได้ดีบน desktop
- [ ] Layout ไม่แตก

**Expected Result**: Responsive design ทำงานถูกต้อง

---

#### 7.4 Animations
- [ ] Animations ทำงาน smoothly
- [ ] ไม่มี lag หรือ stutter
- [ ] Transitions ทำงานถูกต้อง

**Expected Result**: Animations ทำงาน smoothly

---

## 8. 🔒 Security Testing

### Test Cases:

#### 8.1 Security Headers
- [ ] CSP headers ถูกต้อง
- [ ] Security headers ถูกต้อง
- [ ] XSS protection ทำงาน

**Expected Result**: Security headers ถูกต้อง

---

#### 8.2 Rate Limiting
- [ ] Rate limiting ทำงานถูกต้อง
- [ ] ไม่สามารถ spam API ได้
- [ ] Rate limit error แสดงผลถูกต้อง

**Expected Result**: Rate limiting ทำงานถูกต้อง

---

#### 8.3 Input Validation
- [ ] Input validation ทำงานถูกต้อง
- [ ] ไม่สามารถส่งข้อมูลที่ไม่ถูกต้องได้
- [ ] Error messages แสดงผลถูกต้อง

**Expected Result**: Input validation ทำงานถูกต้อง

---

## 9. 📊 Admin Dashboard Testing

### Test Cases:

#### 9.1 Admin Access
- [ ] Admin wallet address ถูกต้อง
- [ ] Admin dashboard เข้าถึงได้
- [ ] Non-admin users ไม่สามารถเข้าถึงได้

**Expected Result**: Admin access ทำงานถูกต้อง

---

#### 9.2 Admin Functions
- [ ] ดู system settings
- [ ] เปลี่ยน maintenance mode
- [ ] ดู user stats
- [ ] ดู transaction history
- [ ] ดู game stats

**Expected Result**: Admin functions ทำงานถูกต้อง

---

## 10. 📱 Performance Testing

### Test Cases:

#### 10.1 Page Load Time
- [ ] หน้าแรกโหลดเร็ว (< 3 seconds)
- [ ] หน้าเกมโหลดเร็ว (< 2 seconds)
- [ ] API calls เร็ว (< 1 second)

**Expected Result**: Page load time เร็ว

---

#### 10.2 Bundle Size
- [ ] Bundle size ไม่ใหญ่เกินไป
- [ ] Code splitting ทำงานถูกต้อง
- [ ] Lazy loading ทำงานถูกต้อง

**Expected Result**: Bundle size เหมาะสม

---

## 📝 Test Results

### สรุปผลการทดสอบ:

- ✅ **ผ่าน**: __________
- ❌ **ไม่ผ่าน**: __________
- ⚠️ **มีปัญหา**: __________

### หมายเหตุ:

- __________
- __________
- __________

---

## 🎯 Next Steps

หลังจากทดสอบเสร็จ:

1. ✅ แก้ไข bugs ที่พบ
2. ✅ อัพเดท documentation
3. ✅ Deploy to production

---

**สร้างเมื่อ**: __________  
**ทดสอบโดย**: __________  
**สถานะ**: ⬜ ยังไม่เริ่ม  ⬜ กำลังทดสอบ  ⬜ เสร็จแล้ว

