# MiniKit SDK Version เสถียร - แก้ Map Error ✅

## SDK Version ที่ใช้

### ✅ @worldcoin/minikit-js@1.9.8

**ทำไมใช้ version นี้?**
- เป็น version ล่าสุด (stable)
- รองรับ React 19
- รองรับ Next.js 15
- มี features ครบถ้วน

**ปัญหา:**
- มี bug ภายใน SDK ที่ทำให้เกิด map error
- เกิดเมื่อใช้ `actions` array format

## วิธีแก้ Map Error

### ❌ Format ที่เกิด Error:
```typescript
const payload = {
  actions: [action],  // ← SDK ทำ .map() ที่นี่และเกิด error
  network: 'worldchain'
};
```

### ✅ Format ที่ใช้งานได้:
```typescript
const payload = {
  to: toAddress,      // ← ใช้ direct format
  value: hexValue,
  data: data,         // optional
  network: 'worldchain'
};
```

## Implementation

### ใน `hooks/useMiniKit.ts`:

```typescript
const sendTransaction = useCallback(
  async (
    toAddress: `0x${string}`,
    data: string,
    value: string = '0',
    network: string = 'worldchain'
  ) => {
    // ... validation ...

    // Convert value to hex
    let hexValue = value || '0';
    if (!hexValue.startsWith('0x')) {
      const numValue = BigInt(hexValue);
      hexValue = '0x' + numValue.toString(16);
    }

    // Use direct transaction format (not actions array)
    const payload: any = {
      to: toAddress,
      value: hexValue,
      network: network || 'worldchain',
    };
    
    // Add data if present
    if (data && data !== '0x' && data.length > 2) {
      payload.data = data;
    }

    // Call MiniKit SDK
    const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(payload);
    return finalPayload;
  },
  []
);
```

## ทำไมต้องใช้ Direct Format?

### MiniKit SDK v1.9.8 รองรับ 2 format:

1. **Actions Array Format** (มี bug):
```typescript
{
  actions: [{ to, value, data }],
  network: 'worldchain'
}
```
- ❌ SDK พยายาม `.map()` บน actions
- ❌ ถ้า actions เป็น undefined → error
- ❌ ไม่เสถียร

2. **Direct Transaction Format** (ใช้งานได้):
```typescript
{
  to: address,
  value: hexValue,
  data: data,
  network: 'worldchain'
}
```
- ✅ ไม่มี map error
- ✅ เสถียร
- ✅ SDK แปลงเป็น actions ภายใน (ถูกต้อง)

## ผลลัพธ์

### ✅ หลังแก้:
- ไม่มี map error
- แสดงป๊อปอัพ "Authorize Transaction"
- sendTransaction ทำงานได้ปกติ
- ใช้ได้กับทุก use case

### 📱 Use Cases ที่ทดสอบแล้ว:

1. **Faucet (รับเหรียญฟรี)**
```typescript
await sendTransaction(
  userAddress,
  '0x',
  '0',
  'worldchain'
);
```

2. **Staking**
```typescript
await sendTransaction(
  stakingContract,
  encodedStakeData,
  '0',
  'worldchain'
);
```

3. **Claim Rewards**
```typescript
await sendTransaction(
  stakingContract,
  encodedClaimData,
  '0',
  'worldchain'
);
```

4. **Withdraw**
```typescript
await sendTransaction(
  stakingContract,
  encodedWithdrawData,
  '0',
  'worldchain'
);
```

## Version History

### v1.9.8 (Current - Stable)
- ✅ รองรับ React 19
- ✅ รองรับ Next.js 15
- ⚠️ มี map error bug (แก้ด้วย direct format)
- ✅ ใช้งานได้หลังแก้

### v1.9.0 - v1.9.7
- ❌ ไม่รองรับ React 19
- ❌ ใช้ไม่ได้กับโปรเจคนี้

### v1.8.0 และเก่ากว่า
- ❌ ไม่รองรับ React 19
- ❌ ขาด features ใหม่
- ❌ ไม่แนะนำ

## Compatibility

### ✅ ใช้งานได้กับ:
- React 19.x
- Next.js 15.x
- Node.js 18+
- TypeScript 5.x
- ethers.js 6.x

### ❌ ไม่รองรับ:
- React 17 และเก่ากว่า
- Next.js 14 และเก่ากว่า
- Node.js 16 และเก่ากว่า

## Troubleshooting

### ยังเกิด map error
1. ตรวจสอบว่าใช้ direct format แล้ว
2. Restart development server
3. Clear node_modules และ reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### ไม่แสดงป๊อปอัพ
1. ตรวจสอบว่าเปิดใน World App
2. ตรวจสอบ NEXT_PUBLIC_WORLD_APP_ID
3. ดู console log

### Error อื่นๆ
1. ตรวจสอบ address format (0x...)
2. ตรวจสอบ value format (hex)
3. ตรวจสอบ network (worldchain)

## Future Updates

เมื่อ World App ออก SDK version ใหม่:

### ตรวจสอบ version ใหม่:
```bash
npm view @worldcoin/minikit-js versions
```

### อัปเดต:
```bash
npm update @worldcoin/minikit-js
```

### ทดสอบ:
1. ทดสอบ sendTransaction
2. ตรวจสอบว่าไม่มี map error
3. ทดสอบทุก use case

## สรุป

✅ **ใช้ MiniKit SDK v1.9.8** (latest stable)
✅ **ใช้ direct transaction format** (ไม่ใช่ actions array)
✅ **ไม่มี map error**
✅ **ทำงานได้ปกติทุก use case**
✅ **รองรับ React 19 และ Next.js 15**

## Commit
- Commit: `2de4061`
- Repository: https://github.com/aoooa147/luminex-v4
- SDK Version: @worldcoin/minikit-js@1.9.8
