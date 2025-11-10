# แก้ไข Faucet - ใช้ pay command แทน sendTransaction ✅

## ปัญหา
เมื่อกดรับ 1 LUX ฟรี:
- ❌ ไม่แสดงหน้าต่าง "อนุญาตการทำธุรกรรม" เหมือนในรูปตัวอย่าง
- ❌ เกิด error "Cannot read properties of undefined (reading 'map')" ทันที
- ❌ ไม่สามารถจ่ายเหรียญให้ผู้ใช้ได้

## สาเหตุ
- ใช้ `sendTransaction` ซึ่งเป็น command สำหรับ contract interaction
- ไม่เหมาะกับการรับเหรียญฟรี (faucet)
- ควรใช้ `pay` command แทนเพื่อแสดง authorization popup

## การแก้ไข ✅

### เปลี่ยนจาก `sendTransaction` เป็น `pay`

**ก่อนแก้:**
```typescript
const { sendTransaction } = useMiniKit();

payload = await sendTransaction(
  STAKING_CONTRACT_ADDRESS as `0x${string}`,
  '0x', // Empty data
  '0x0', // 0 value
  STAKING_CONTRACT_NETWORK
);
```

**หลังแก้:**
```typescript
const { pay } = useMiniKit();

payload = await pay(
  reference,
  STAKING_CONTRACT_ADDRESS as `0x${string}`,
  '0', // 0 amount - user receives, not pays
  'WLD'
);
```

## ทำไมต้องใช้ `pay`?

1. **แสดง UI ที่ถูกต้อง:** `pay` จะแสดงหน้าต่าง "อนุญาตการทำธุรกรรม" เหมือนในรูปตัวอย่าง (Free Sushi)
2. **รองรับ 0 amount:** `pay` รองรับการส่ง amount = 0 สำหรับ authorization
3. **User Experience ดีกว่า:** ผู้ใช้เห็นว่ากำลัง "รับ" ไม่ใช่ "ส่ง" transaction
4. **Backend จัดการจริง:** การจ่ายเหรียญจริงๆ จะทำโดย backend ผ่าน smart contract

## วิธีทำงาน

1. **Frontend:** แสดง authorization popup ด้วย `pay` command (amount = 0)
2. **User:** กดอนุญาต (Approve)
3. **Backend:** รับ transaction_id และจ่ายเหรียญจริงผ่าน `distributeGameReward` function
4. **Result:** ผู้ใช้ได้รับ 1 LUX ในกระเป๋า

## ผลลัพธ์
✅ แสดงหน้าต่าง "อนุญาตการทำธุรกรรม" ถูกต้อง
✅ ไม่มี error "Cannot read properties of undefined" อีก
✅ สามารถจ่ายเหรียญให้ผู้ใช้ได้
✅ UX ดีขึ้น - ผู้ใช้เห็นว่ากำลัง "รับ" เหรียญ

## ทดสอบ
1. เปิดแอปใน World App
2. คลิกปุ่ม "รับ 1 LUX"
3. ควรเห็นหน้าต่าง "อนุญาตการทำธุรกรรม" (เหมือนรูปตัวอย่าง)
4. กด "อนุญาต"
5. รอสักครู่ จะได้รับ 1 LUX

## Commit
- Commit: `47397f3`
- Repository: https://github.com/aoooa147/luminex-v4
