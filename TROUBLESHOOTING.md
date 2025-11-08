# 🔧 Troubleshooting Guide - Wallet Connection & World ID Verification

## ปัญหาที่พบบ่อย

### 1. ❌ Wallet ไม่สามารถเชื่อมต่อได้

**อาการ:**
- กดเชื่อมต่อกระเป๋าแล้วไม่มีการตอบสนอง
- ไม่แสดง wallet address
- Balance ไม่แสดง

**สาเหตุ:**
- แอพไม่เปิดใน World App (MiniKit ทำงานได้เฉพาะใน World App)
- NEXT_PUBLIC_WORLD_APP_ID ไม่ถูกต้อง
- World App ไม่รองรับ MiniKit

**วิธีแก้ไข:**
1. **เปิดแอพใน World App**: 
   - เปิด World App บนมือถือ
   - ค้นหา "Luminex" หรือใช้ QR Code
   - เปิดแอพผ่าน World App

2. **ตรวจสอบ Environment Variables**:
   - ตั้งค่า `NEXT_PUBLIC_WORLD_APP_ID` ใน Vercel Environment Variables
   - Format ต้องเป็น `app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ตรวจสอบว่า App ID ถูกต้องใน World ID Developer Portal

3. **ตรวจสอบ MiniKit**:
   - เปิด Developer Console (F12)
   - ตรวจสอบว่า `window.MiniKit` มีอยู่หรือไม่
   - ถ้าไม่มี แสดงว่าไม่ได้เปิดใน World App

---

### 2. ❌ World ID Verification Fail

**อาการ:**
```
{"success":false,"action":"luminexstaking","ip":"xxx.xxx.xxx.xxx"}
```

**สาเหตุ:**
- NEXT_PUBLIC_WORLD_APP_ID ไม่ถูกต้อง
- Action `luminexstaking` ไม่ถูก register ใน World ID
- Payload verification fail

**วิธีแก้ไข:**
1. **ตรวจสอบ World ID Configuration**:
   - เข้า World ID Developer Portal
   - ตรวจสอบว่า App ID ถูกต้อง
   - ตรวจสอบว่า Action `luminexstaking` ถูก register หรือไม่

2. **ตั้งค่า Environment Variables**:
   ```env
   NEXT_PUBLIC_WORLD_APP_ID=app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_WORLD_ACTION=luminexstaking
   ```

3. **ตรวจสอบ Action Name**:
   - Action name ต้องตรงกับที่ register ใน World ID
   - ตรวจสอบว่า action name ถูกต้องใน code

---

### 3. ❌ แอพไม่ทำงานใน Browser ธรรมดา

**อาการ:**
- แอพเปิดใน browser ธรรมดาแล้วไม่ทำงาน
- MiniKit ไม่พร้อมใช้งาน

**สาเหตุ:**
- MiniKit ทำงานได้เฉพาะใน World App เท่านั้น
- Browser ธรรมดาไม่มี MiniKit API

**วิธีแก้ไข:**
1. **เปิดแอพใน World App**:
   - ใช้ QR Code เพื่อเปิดใน World App
   - หรือค้นหาแอพใน World App

2. **ตรวจสอบว่าเปิดใน World App หรือไม่**:
   ```javascript
   // ใน Browser Console
   console.log(window.MiniKit); // ควรมี object
   console.log(window.MiniKit?.isInstalled?.()); // ควรเป็น true
   ```

---

## Environment Variables ที่ต้องตั้งค่า

### ใน Vercel Dashboard:
1. **NEXT_PUBLIC_WORLD_APP_ID**: World App ID (format: `app_xxx`)
2. **NEXT_PUBLIC_WORLD_ACTION**: Action name (default: `luminexstaking`)
3. **WORLD_API_KEY**: World API Key (สำหรับ payment confirmation)
4. **NEXT_PUBLIC_TREASURY_ADDRESS**: Treasury address สำหรับรับเงิน

### วิธีตั้งค่าใน Vercel:
1. เข้า Vercel Dashboard
2. เลือก Project
3. ไปที่ Settings > Environment Variables
4. เพิ่ม Environment Variables ตามด้านบน
5. Redeploy application

---

## Debug Steps

### 1. ตรวจสอบ MiniKit Availability
```javascript
// ใน Browser Console
if (typeof window !== 'undefined' && window.MiniKit) {
  console.log('MiniKit available:', window.MiniKit);
  console.log('MiniKit installed:', window.MiniKit.isInstalled?.());
} else {
  console.error('MiniKit not available - please open in World App');
}
```

### 2. ตรวจสอบ Environment Variables
```javascript
// ใน Browser Console
console.log('WORLD_APP_ID:', process.env.NEXT_PUBLIC_WORLD_APP_ID);
console.log('WORLD_ACTION:', process.env.NEXT_PUBLIC_WORLD_ACTION);
```

### 3. ตรวจสอบ API Response
- เปิด Network tab ใน Developer Tools
- ตรวจสอบ `/api/verify` response
- ตรวจสอบ `/api/complete-siwe` response
- ดู error messages ใน response

---

## Common Error Messages

### "MiniKit is not available"
- **สาเหตุ**: ไม่ได้เปิดแอพใน World App
- **แก้ไข**: เปิดแอพใน World App

### "Missing NEXT_PUBLIC_WORLD_APP_ID"
- **สาเหตุ**: Environment variable ไม่ถูกตั้งค่า
- **แก้ไข**: ตั้งค่า `NEXT_PUBLIC_WORLD_APP_ID` ใน Vercel

### "Verification failed"
- **สาเหตุ**: World ID verification fail
- **แก้ไข**: ตรวจสอบ App ID และ Action name

### "Wallet auth not available"
- **สาเหตุ**: MiniKit walletAuth API ไม่พร้อมใช้งาน
- **แก้ไข**: ตรวจสอบว่าเปิดใน World App และ World App version ใหม่พอ

---

## Support

ถ้ายังมีปัญหา:
1. ตรวจสอบ logs ใน Vercel Dashboard
2. ตรวจสอบ Browser Console สำหรับ errors
3. ตรวจสอบ Network requests ใน Developer Tools
4. ติดต่อ World ID Support

---

## Quick Checklist

- [ ] แอพเปิดใน World App (ไม่ใช่ browser ธรรมดา)
- [ ] NEXT_PUBLIC_WORLD_APP_ID ถูกตั้งค่าใน Vercel
- [ ] NEXT_PUBLIC_WORLD_ACTION ถูกตั้งค่าใน Vercel
- [ ] App ID ถูกต้องใน World ID Developer Portal
- [ ] Action name ถูก register ใน World ID
- [ ] World App version ใหม่พอ (รองรับ MiniKit)
- [ ] Network connection ทำงานปกติ

