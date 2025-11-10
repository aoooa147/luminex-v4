# แก้ไข Faucet ตาม World App Documentation ✅

## อ้างอิง
- World App Docs: https://docs.world.org/mini-apps/commands/send-transaction

## ปัญหา
- แอปค้างเมื่อกดรับ 1 LUX ฟรี
- ไม่แสดงหน้าต่างอนุญาตการทำธุรกรรม
- ใช้ MiniKit commands ไม่ถูกต้อง

## วิธีแก้ที่ถูกต้อง (ตาม World App Docs)

### ใช้ `sendTransaction` command

ตาม World App documentation:
- `sendTransaction` ใช้สำหรับขอ authorization จากผู้ใช้
- รองรับทั้งการส่งและรับเงิน
- แสดงหน้าต่าง "อนุญาตการทำธุรกรรม"

### Implementation

```typescript
const { sendTransaction } = useMiniKit();

// Request authorization
payload = await sendTransaction(
  actualAddress as `0x${string}`, // User's address (they receive)
  '0x', // Empty data
  '0', // 0 value
  STAKING_CONTRACT_NETWORK // Network (worldchain)
);

// Get transaction_id from MiniKit
const transactionId = payload.transaction_id;

// Send to backend for actual distribution
await fetch('/api/faucet/confirm', {
  method: 'POST',
  body: JSON.stringify({ 
    payload: {
      reference,
      transaction_id: transactionId
    }
  })
});
```

## Flow การทำงาน

1. **User กดปุ่ม "รับ 1 LUX"**
2. **Frontend เรียก `/api/faucet/init`** → ได้ `reference`
3. **Frontend เรียก `sendTransaction`** → แสดงหน้าต่างอนุญาต
4. **User กด "อนุญาต"** → ได้ `transaction_id`
5. **Frontend เรียก `/api/faucet/confirm`** → ส่ง `reference` + `transaction_id`
6. **Backend ตรวจสอบ** → จ่ายเหรียญผ่าน smart contract
7. **User ได้รับ 1 LUX** ในกระเป๋า

## ทำไมต้องใช้วิธีนี้?

✅ **ตาม World App documentation**
✅ **แสดง authorization popup ถูกต้อง**
✅ **Backend ควบคุมการจ่ายเหรียญ** (ปลอดภัย)
✅ **มี transaction_id สำหรับ tracking**
✅ **User experience ดี** - เห็นว่ากำลังอนุญาตให้รับเหรียญ

## Error Handling

- **User cancellation:** จับ error type `user_cancelled`
- **Transaction failed:** แสดง error message
- **Backend error:** แสดง error จาก API response

## ทดสอบ

1. เปิดแอปใน World App
2. คลิก "รับ 1 LUX"
3. ควรเห็นหน้าต่าง "อนุญาตการทำธุรกรรม"
4. กด "อนุญาต"
5. รอสักครู่ → ได้รับ 1 LUX

## Commit
- Commit: `5773465`
- Repository: https://github.com/aoooa147/luminex-v4
- Docs: https://docs.world.org/mini-apps/commands/send-transaction
