# วิธีใช้ MiniKit สำหรับ Faucet (รับเหรียญฟรี) ✅

## ปัญหาเดิม
- ไม่แสดงป๊อปอัพ "อนุญาตการทำธุรกรรม" เหมือนรูปตัวอย่าง (Free Sushi)
- ใช้ `sendTransaction` แล้วเกิด error "Cannot read properties of undefined (reading 'map')"

## วิธีแก้ - ใช้ `pay` Command

### ทำไมต้องใช้ `pay`?

ตามรูปตัวอย่าง Free Sushi:
- แสดงป๊อปอัพ "อนุญาตการทำธุรกรรม"
- แสดง "รับ 7 SUSHI" (ผู้ใช้รับเหรียญ)
- ใช้ `pay` command ของ MiniKit

### Implementation

```typescript
const { pay } = useMiniKit();

// ใช้ pay command
payload = await pay(
  reference,                    // Payment reference
  treasuryAddress,              // Treasury/contract address
  '0',                          // 0 amount (user is receiving, not paying)
  'WLD'                         // Token type
);
```

### Flow การทำงาน

1. **User กดปุ่ม "รับ 1 LUX"**
2. **Frontend เรียก `/api/faucet/init`**
   - Backend สร้าง reference
   - ตรวจสอบ cooldown

3. **Frontend เรียก MiniKit `pay` command**
   - แสดงป๊อปอัพ "อนุญาตการทำธุรกรรม"
   - แสดงข้อมูล: "รับ" (ไม่ใช่จ่าย)
   - Amount: 0 WLD

4. **User กด "อนุญาต"**
   - MiniKit return `transaction_id`

5. **Frontend เรียก `/api/faucet/confirm`**
   - ส่ง `reference` + `transaction_id`
   - Backend ตรวจสอบและจ่ายเหรียญ

6. **User ได้รับ 1 LUX**

### ทำไมใช้ amount = 0?

- **User ไม่ได้จ่ายเงิน** - พวกเขารับเหรียญฟรี
- **Backend จ่ายเหรียญจริง** - ผ่าน smart contract
- **MiniKit แค่ authorization** - ยืนยันว่า user อนุญาต

### ข้อดีของวิธีนี้

✅ **แสดงป๊อปอัพ** - เหมือนรูปตัวอย่าง Free Sushi
✅ **UX ดี** - ผู้ใช้เห็นว่ากำลัง "รับ" เหรียญ
✅ **ปลอดภัย** - มี authorization จาก MiniKit
✅ **มี transaction_id** - สำหรับ tracking
✅ **ไม่มี map error** - ใช้ `pay` แทน `sendTransaction`

### Error Handling

```typescript
try {
  payload = await pay(reference, address, '0', 'WLD');
} catch (e: any) {
  if (e?.type === 'user_cancelled') {
    // User กด cancel
    return;
  }
  // Error อื่นๆ
  alert(e?.message || 'Failed to authorize');
}
```

### ความแตกต่างระหว่าง `pay` และ `sendTransaction`

| Feature | `pay` | `sendTransaction` |
|---------|-------|-------------------|
| ใช้สำหรับ | การจ่าย/รับเงิน | Contract interaction |
| แสดงป๊อปอัพ | ✅ "อนุญาตการทำธุรกรรม" | ✅ "Authorize Transaction" |
| รองรับ amount = 0 | ✅ ใช่ | ⚠️ อาจมีปัญหา |
| Map error | ❌ ไม่มี | ⚠️ มีในบางกรณี |
| เหมาะกับ faucet | ✅ ใช่ | ❌ ไม่เหมาะ |

## Backend Requirements

Backend ยังคงต้องการ:

### 1. Environment Variables
```bash
WORLDCHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/public
GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY=0x...
```

### 2. Distributor Authorization
```javascript
// Add distributor in smart contract
await stakingContract.addGameRewardDistributor(distributorAddress);
```

### 3. Gas Fees
- Distributor wallet ต้องมี ETH/WLD สำหรับ gas

## Testing

### 1. ทดสอบ Authorization Popup
```
1. กดปุ่ม "รับ 1 LUX"
2. ควรเห็นป๊อปอัพ "อนุญาตการทำธุรกรรม"
3. แสดง "รับ" (ไม่ใช่จ่าย)
4. แสดง amount และ token
```

### 2. ทดสอบ User Cancellation
```
1. กดปุ่ม "รับ 1 LUX"
2. เห็นป๊อปอัพ
3. กด X (cancel)
4. ไม่ควรมี error
5. สามารถลองใหม่ได้
```

### 3. ทดสอบ Success Flow
```
1. กดปุ่ม "รับ 1 LUX"
2. เห็นป๊อปอัพ
3. กด "อนุญาต"
4. รอสักครู่
5. ได้รับ 1 LUX
6. Balance เพิ่มขึ้น
```

## Troubleshooting

### ไม่แสดงป๊อปอัพ
- ตรวจสอบว่าเปิดใน World App
- ตรวจสอบ `NEXT_PUBLIC_WORLD_APP_ID`
- ดู console log

### แสดงป๊อปอัพแต่ error
- ตรวจสอบ treasury address
- ตรวจสอบ network (worldchain)
- ดู error message

### กด "อนุญาต" แล้วไม่ได้เหรียญ
- ตรวจสอบ backend logs
- ตรวจสอบ distributor authorization
- ตรวจสอบ gas fees

## สรุป

✅ ใช้ `pay` command แทน `sendTransaction`
✅ แสดงป๊อปอัพ "อนุญาตการทำธุรกรรม"
✅ ใช้ amount = 0 (user รับ ไม่ใช่จ่าย)
✅ Backend จ่ายเหรียญจริงหลัง authorization
✅ UX ดี เหมือนรูปตัวอย่าง Free Sushi

## Commit
- Commit: `b0971ae`
- Repository: https://github.com/aoooa147/luminex-v4
