# Luminex Staking - Premium DeFi Platform

A premium DeFi staking platform built for World App with up to 500% APY, built with Next.js, TypeScript, and Prisma.

## Features

- **Staking System**: Multiple staking pools with flexible lock periods
- **Power Licenses**: Boost your APY with power licenses (Spark, Nova, Quantum, Infinity, Singularity)
- **Referral Program**: Invite friends and earn rewards
- **Game Center**: Play games and earn LUX tokens
- **Admin Dashboard**: Full control over system settings and maintenance mode
- **World App Integration**: Seamless integration with World ID verification

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Blockchain**: Worldcoin MiniKit, Ethereum/Worldchain

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── game/              # Game pages
│   ├── admin/             # Admin dashboard
│   └── main-app.tsx       # Main application component
├── components/            # React components
│   ├── common/           # Common components
│   ├── game/             # Game components
│   ├── layout/           # Layout components
│   ├── membership/       # Membership components
│   ├── modals/           # Modal components
│   ├── referral/         # Referral components
│   ├── staking/          # Staking components
│   └── tron/             # Tron UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── admin/           # Admin utilities
│   ├── game/            # Game utilities
│   ├── utils/           # General utilities
│   └── ...
├── docs/                 # Documentation
│   ├── archive/         # Archived documentation
│   ├── development/     # Development docs
│   ├── guides/          # Guides
│   ├── security/        # Security docs
│   └── setup/           # Setup guides
└── prisma/              # Database schema and migrations
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- World App Mini App credentials

### Installation

1. Clone the repository
```bash
git clone https://github.com/aoooa147/luminex-v4.git
cd luminex-v4-ultimate
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Set up the database
```bash
npx prisma migrate dev
npx prisma generate
```

5. Run the development server
```bash
npm run dev
```

## Development

### Quick Start Guide
See `docs/development/GETTING_STARTED.md` for a comprehensive guide on how to continue developing the application.

### Development Priorities
See `docs/development/DEVELOPMENT_PRIORITIES.md` for prioritized development tasks.

### Roadmap
See `docs/development/DEVELOPMENT_ROADMAP.md` for the long-term development roadmap.

## Documentation

- **Getting Started**: See `docs/development/GETTING_STARTED.md` for development guide
- **Setup Guides**: See `docs/setup/` for setup instructions
- **Development**: See `docs/development/` for development guides
- **Security**: See `docs/security/` for security documentation
- **Testing**: See `docs/guides/TESTING.md` for testing information

## License

This project is licensed under the MIT License.
