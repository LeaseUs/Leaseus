# Figma Design Prompt: LeaseUs Mobile App

## Project Overview
Design a mobile application for **LeaseUs** – an e-services platform connecting clients with service providers. The app features a dual-currency wallet (GBP and LEUS coin), service marketplace, tiered subscriptions, loyalty program, MintLeaf value sharing, and local business partnerships.

---

## Brand Identity

| Element | Specification |
|---------|---------------|
| **Logo** | "LeaseUs" with tagline "Swift. Reliable. Precise." |
| **Colors** | Primary: Dark blue (#1E3A8A), Green (#10B981), White (#FFFFFF) |
| **Typography** | Clean sans-serif (Inter or SF Pro) |
| **Tone** | Professional, trustworthy, innovative, accessible |

---

## Key Screens

### 1. Onboarding & Authentication
- Splash screen with logo
- Welcome screen with value props and "Get 50 LEUS Free" badge
- Sign up (email/phone + password)
- OTP verification
- Log in (with biometric option)

### 2. Home Screen
- Header with logo, notifications, wallet summary pill (total GBP value)
- Welcome banner showing LEUS vesting progress (if new user)
- Quick action buttons (horizontal scroll): Find Services, My Bookings, Pay with LEUS, Create MintLeaf
- Search bar with filter icon
- Service categories grid (8-12 icons)
- Featured services/providers carousel
- "Near You" local businesses section

### 3. Service Marketplace
- Search results screen with filter drawer
- Filter options: Category, Price range, Rating, Location, LEUS-friendly toggle
- Service provider cards (image, name, rating, price, LEUS accepted badge)
- Provider profile screen (portfolio, reviews, availability, booking button)

### 4. Booking & Escrow
- Service booking form (date/time, details, price breakdown)
- Payment method selector (Fiat/LEUS toggle)
- Escrow confirmation screen
- Active booking status tracker
- Service completion confirmation with review prompt

### 5. Dual-Currency Wallet
- Wallet dashboard showing:
  - Total portfolio value (GBP)
  - Fiat balance section (GBP) with deposit/withdraw buttons
  - LEUS balance section (Ł) with convert/pay/create MintLeaf buttons
- Transaction history (filterable by currency)
- Conversion screen (fiat ↔ LEUS) with current rate

### 6. MintLeaf
- MintLeaf creation screen (amount, PIN setup, optional restrictions)
- MintLeaf QR code display (ready to share)
- MintLeaf scan/claim screen (camera view)
- MintLeaf wallet (list of owned/created MintLeafs)

### 7. Subscriptions
- Subscription tier comparison (Basic/Standard/Premium)
- Current plan display with benefits
- Upgrade/downgrade options
- Payment history

### 8. Loyalty Program
- Points balance and tier status (Silver/Gold/Platinum)
- Points earning activity log
- Points to LEUS conversion screen
- Conversion rate calculator with tier bonus

### 9. Local Business Map
- Map view with nearby partner locations
- Partner business cards (name, address, LEUS accepted)
- Business profile (hours, contact, directions)

### 10. Profile & Settings
- User profile (name, photo, contact)
- KYC verification status
- Notification preferences
- Security settings (2FA, biometric)
- Help & support

---

## Key User Flows to Design

1. **New user sign-up** → Get 50 LEUS bonus → Browse services → Book with fiat
2. **Service provider onboarding** → Create profile → Enable LEUS acceptance
3. **LEUS conversion** → Fiat to LEUS → Pay for service → Earn points
4. **MintLeaf creation** → Lock LEUS → Share QR → Recipient claims
5. **Local business payment** → Scan QR → Pay with LEUS → Earn points

---

## Special UI Components

| Component | Description |
|-----------|-------------|
| **Wallet Summary Pill** | Collapsible header showing total value |
| **LEUS Vesting Progress** | Circular progress indicator for new users |
| **LEUS-Friendly Badge** | Green badge on provider cards |
| **Currency Toggle** | Switch between fiat/LEUS in checkout |
| **Points Conversion Calculator** | Live calculation with tier bonus |
| **MintLeaf QR** | Stylized QR with LEUS amount and PIN entry |
| **Tier Badges** | Silver/Gold/Platinum visual indicators |

---

## Design Deliverables
- Mobile app wireframes (low-fi)
- High-fidelity mockups for all screens
- Interactive prototype linking key flows
- Component library (buttons, cards, inputs, badges)
- Dark mode option (optional)

---

## Target Audience
- **Primary:** UK-based service consumers and providers (ages 25-55)
- **Secondary:** Local business owners accepting LEUS

---

**Additional Notes:**
- Ensure accessibility (contrast, touch targets)
- Design for both iOS and Android (platform-agnostic)
- Include empty states, loading states, error states
- Consider offline mode for MintLeaf QR scanning

---