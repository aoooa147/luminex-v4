# วิธีตั้งค่า Faucet (รับเหรียญฟรี) 🪙

## ปัญหาที่พบ
```
❌ [faucet/confirm] Failed to distribute faucet reward via contract 
{"error":"WORLDCHAIN_RPC_URL or NEXT_PUBLIC_WALLET_RPC_URL is not set"}
```

## สาเหตุ
Backend ต้องการ environment variables เพื่อเชื่อมต่อกับ blockchain และจ่ายเหรียญ

## วิธีแก้ไข

### 1. เพิ่ม Environment Variables ใน `.env.local`

```bash
# Backend RPC URL (สำหรับ server-side)
WORLDCHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/public

# Private Key สำหรับจ่ายเหรียญ (REQUIRED!)
GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY=0x...your_private_key...
```

### 2. สร้าง Distributor Wallet

คุณต้องมี wallet สำหรับจ่ายเหรียญ:

#### Option A: สร้าง wallet ใหม่ (แนะนำ)
```bash
# ใช้ ethers.js หรือ web3.js
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

#### Option B: ใช้ wallet ที่มีอยู่
- ใช้ private key จาก MetaMask หรือ wallet อื่นๆ
- **⚠️ อย่าใช้ wallet หลักที่มีเงินเยอะ!**

### 3. เพิ่ม Distributor ใน Smart Contract

Wallet ที่ใช้จ่ายเหรียญต้องได้รับ authorization ใน staking contract:

```solidity
// ใน staking contract
function addGameRewardDistributor(address distributor) external onlyOwner {
    gameRewardDistributors[distributor] = true;
}
```

เรียก function นี้ด้วย owner wallet:
```javascript
// ตัวอย่าง script
const stakingContract = new ethers.Contract(STAKING_ADDRESS, ABI, ownerWallet);
await stakingContract.addGameRewardDistributor('0x...distributor_address...');
```

### 4. เติมเงินให้ Distributor Wallet

Distributor wallet ต้องมี:
- **ETH/WLD** สำหรับ gas fees
- **LUX tokens** ไม่จำเป็น (contract จะ mint ให้)

```bash
# ส่ง ETH/WLD ไปยัง distributor address
# จำนวนแนะนำ: 0.01 ETH หรือมากกว่า
```

### 5. Restart Development Server

```bash
# หยุด server
Ctrl+C

# Start ใหม่
npm run dev
```

## ตรวจสอบการตั้งค่า

### 1. ตรวจสอบ Environment Variables
```bash
# ใน terminal
echo $WORLDCHAIN_RPC_URL
echo $GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY
```

### 2. ตรวจสอบ Distributor Authorization
```javascript
// เรียก contract
const isAuthorized = await stakingContract.gameRewardDistributors(distributorAddress);
console.log('Is Authorized:', isAuthorized); // ต้องเป็น true
```

### 3. ตรวจสอบ Balance
```javascript
const balance = await provider.getBalance(distributorAddress);
console.log('Balance:', ethers.formatEther(balance), 'ETH');
```

## ทดสอบ Faucet

1. เปิดแอปใน World App
2. คลิก "รับ 1 LUX"
3. รอสักครู่
4. ตรวจสอบ balance ใน wallet

## Troubleshooting

### Error: "Distributor not authorized"
- ตรวจสอบว่า distributor address ถูก add ใน contract แล้ว
- ใช้ owner wallet ในการ add

### Error: "Insufficient funds"
- Distributor wallet ไม่มี ETH สำหรับ gas
- เติมเงินให้ distributor wallet

### Error: "Transaction failed"
- ตรวจสอบ RPC URL ว่าถูกต้อง
- ตรวจสอบ network (worldchain mainnet)
- ตรวจสอบ contract address

## Security Notes

⚠️ **สำคัญมาก:**
- **อย่า commit private key ลง git!**
- เพิ่ม `.env.local` ใน `.gitignore`
- ใช้ wallet แยกสำหรับ distributor
- เก็บ private key ให้ปลอดภัย
- ใช้ environment variables ใน production

## Alternative: ไม่ใช้ Faucet

ถ้าไม่ต้องการ faucet สามารถ:
1. ลบปุ่ม "รับ 1 LUX ฟรี" ออก
2. ให้ผู้ใช้ซื้อ LUX จาก DEX
3. ใช้ game rewards แทน

## สรุป

✅ เพิ่ม `WORLDCHAIN_RPC_URL` ใน `.env.local`
✅ เพิ่ม `GAME_REWARD_DISTRIBUTOR_PRIVATE_KEY` ใน `.env.local`
✅ สร้าง distributor wallet
✅ Add distributor ใน smart contract
✅ เติมเงินให้ distributor wallet
✅ Restart server
✅ ทดสอบ faucet
