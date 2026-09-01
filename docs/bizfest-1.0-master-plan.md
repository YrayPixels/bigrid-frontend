# BizFest 1.0 — Master Plan

**Programme ID:** `bizfest-1`  
**Status:** Phase 2 (Product) — in progress  
**Last updated:** 1 September 2026  
**Owner:** Bizgrid / Yray Labs  

---

## Executive summary

BizFest 1.0 is not a one-day conference. It is a **merchant-acquisition and activation engine** disguised as a business growth festival — a 6-week programme that helps Nigerian small businesses build, sell, and grow online on Bizgrid, culminating in a live conference, expo, pitch competition, and **₦6,000,000** prize ceremony.

The north-star metric is **activated merchants**: businesses that have created a store, published it, and completed at least one transaction on Bizgrid.

> **Learn. Build. Sell. Grow. Win.**

---

## 1. Core positioning

| Element | Definition |
| --- | --- |
| **What it is** | Nigeria's business growth festival for sellers ready to go online |
| **Who powers it** | Bizgrid — the commerce platform participants build on |
| **Campaign promise** | Learn. Build. Sell. Grow. Win. |
| **Participation cost** | Free |
| **Primary CTA** | Apply at `/grants/apply` |
| **Public landing** | `/grants` |

**Strategic intent:** Turn BizFest into a repeatable growth programme, not a one-off event. Every workshop, challenge, and leaderboard mechanic should drive real merchant activity on Bizgrid.

---

## 2. Prize structure

**Total prize pool: ₦6,000,000**

| Place | Prize |
| --- | ---: |
| Champion | ₦2,500,000 |
| Runner-up | ₦1,500,000 |
| Third | ₦1,000,000 |
| Next 10 finalists | ₦100,000 each |

Finalists pitch live at the conference (5 minutes each). Judges score on business story, BizFest journey, growth demonstrated, customer traction, and planned use of funding.

---

## 3. Target audience

### Primary audience

Businesses **already selling** but not fully digitized:

- Fashion, beauty & cosmetics, food & beverage, electronics, home & lifestyle, accessories, services, retail
- WhatsApp sellers, Instagram shops, Facebook sellers, small physical retailers

### Ideal participant profile

> *"I already sell something. I just don't have a proper online store."*

Pre-revenue or idea-stage applicants are lower priority — the programme optimizes for activation and first sale, not ideation.

### Business categories (application form)

Fashion · Beauty & cosmetics · Food & beverage · Electronics · Home & lifestyle · Accessories · Services · Retail · Other

---

## 4. Eligibility & activation gates

Registration is free. **Official participation** requires completing the activation ladder:

| Step | Requirement | Status tracked |
| --- | --- | --- |
| 1 | Apply via BizFest application form | `bizfest_applications` |
| 2 | Create Bizgrid account | `user_id` match |
| 3 | Create store | `has_store` |
| 4 | Add ≥5 products + complete business profile | *To build* |
| 5 | Publish store | `store_published` |
| 6 | Receive ≥1 successful transaction | *To build* |

**Key principle:** Registration ≠ activation. Competition scoring and finalist selection only consider merchants who pass step 6.

Application fields captured today: owner name, business name, email, phone, category, city, what you sell, sell channels, unique value, online presence URL, how heard, team type (solo/team), followed social (required checkbox), UTM attribution.

---

## 5. Growth funnel

```
              TARGETED ADS (Meta, TikTok, Google, influencers)
                              │
                              ▼
                   BIZFEST LANDING PAGE  (/grants)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           APPLY          PARTNERS        SPONSORS
        (/grants/apply) (/grants/partners) (/grants/sponsors)
              │
              ▼
        CREATE BIZGRID STORE
              │
              ▼
        COMPLETE STORE (5+ products, profile)
              │
              ▼
           PUBLISH STORE
              │
              ▼
         MAKE FIRST SALE  ← activation gate
              │
              ▼
        BIZFEST ACTIVATION (email / WhatsApp nurture)
              │
              ▼
      6-WEEK WORKSHOPS + CHALLENGES
              │
              ▼
         GROW TRANSACTIONS
              │
              ▼
           LEADERBOARD
              │
              ▼
        FINALIST SELECTION (Top 13)
              │
              ▼
    BIZFEST CONFERENCE + EXPO + PITCH
              │
              ▼
            ₦6M PRIZES
              │
              ▼
         SUCCESS STORIES → re-acquisition loop
```

---

## 6. BizFest score & competition design

Scoring rewards **growth and execution**, not raw revenue alone — so a ₦500K → ₦1.2M business can compete with a ₦10M → ₦11M business.

### Proposed point system (v1 draft)

| Activity | Points |
| --- | ---: |
| Create Bizgrid store | 10 |
| Complete business profile | 5 |
| Add 5 products | 5 |
| Publish store | 10 |
| First transaction | 20 |
| 5 transactions | 10 |
| 10 transactions | 10 |
| Customer reviews | 5 |
| Attend workshops | 10 |
| Complete weekly challenges | 5 |
| Refer businesses | 5 |
| **Total possible** | **95** |

### Growth metric (for finale weighting)

Compare sales during BizFest window vs. baseline (pre-programme or week 1). Percentage growth is a primary tie-breaker alongside total score.

**Status:** Scoring engine, leaderboard UI, and challenge tracking — **not yet built**.

---

## 7. Six-week programme

### Weekly challenges

| Week | Challenge | Goal |
| --- | --- | --- |
| 1 | Build Your Store | Get your business online |
| 2 | First Sale Challenge | Make your first Bizgrid transaction |
| 3 | 10 Customers Challenge | Reach 10 customers |
| 4 | Marketing Challenge | Launch a campaign and generate sales |
| 5 | Customer Love | Reviews and repeat customers |
| 6 | Growth Challenge | Increase sales vs. baseline |

### Workshop programme (free for participants)

| # | Title | Format |
| --- | --- | --- |
| 1 | How to Build a Business That Sells Online | Hands-on — build store live |
| 2 | How to Get Your First 10 Customers | Share storefronts, practical outreach |
| 3 | AI for Small Business | Use Bizgrid AI tools in-session |
| 4 | Pricing, Profit & Cash Flow | Worksheets + merchant examples |
| 5 | Social Media That Actually Converts | Campaign build-along |
| 6 | How to Scale Your Business | Analytics review on Bizgrid |

**Design rule:** Workshops are onboarding infrastructure, not disconnected marketing. Every session uses Bizgrid as the classroom.

---

## 8. Leaderboard

Public-facing gamification for activated merchants:

- Rank, business name, score
- Personal view: *"Your rank: #342 — you need 12 points to reach Top 250"*
- Updated on a defined cadence (daily or weekly — TBD)

**Status:** Not built. Requires scoring backend + merchant-facing UI.

---

## 9. Conference & expo

The conference is the **finale**, not the product. Target attendance: **500–1,500** for edition 1.

### Conference components

- Keynotes and founder panels
- Business masterclasses
- Merchant networking
- Bizgrid product showcase
- **BizFest Business Expo** — live merchant and sponsor booths
- Finalist showcase and pitch competition
- Prize ceremony

### Expo

Sponsors and selected merchants display products at the venue. Inquiry types supported in product:

- Sponsorship packages (Title / Gold / Silver / Community partner)
- Expo booth (Standard / Premium / Corner)
- Exhibition / brand space (Brand wall, Demo zone, Lounge)

Partner inquiry form: `/grants/partners`  
Sponsor & expo inquiry form: `/grants/sponsors`

---

## 10. Sponsorship model

| Tier | Indicative range | Benefits |
| --- | --- | --- |
| Title sponsor | ₦10M–₦20M | Naming, keynote, premium expo, digital |
| Gold sponsor | ₦5M | Stage branding, booth, workshop slot |
| Silver sponsor | ₦2M | Brand placement, booth |
| Community partner | ₦500K–₦1M | Logo, community access |

Goal: BizFest becomes **self-funding or profitable** through sponsor revenue, reducing pure Bizgrid subsidy.

Founding partner slots (placeholder on landing): Banking · Media · Logistics · Technology · SME ecosystem · Community

---

## 11. Bizgrid Growth plan (₦5K/month)

Optional upgrade path during BizFest:

| Plan | Price | Notes |
| --- | --- | --- |
| Bizgrid Starter | Free | Basic store |
| Bizgrid Growth | ₦5,000/month | AI, marketing, analytics, advanced storefront |

**BizFest offer (proposed):** First month of Growth free for activated participants who upgrade during the programme.

---

## 12. Success metrics

### Funnel targets (BizFest 1.0 ambition)

| Stage | Target |
| --- | ---: |
| Applications | 20,000 |
| Stores created | 10,000 |
| Stores published | 7,000 |
| **Activated merchants** | **3,000** |
| Paying merchants (Growth plan) | 1,000 |
| MRR potential | ₦5M+ |

### Internal dashboard metrics

**Acquisition:** ad spend, applications, CAC  
**Activation:** stores created/published, products uploaded, first transactions  
**Commerce:** GMV, transaction count, AOV, repeat purchases  
**Monetization:** Growth subscriptions, conversion rate, MRR  
**Community:** workshop attendance, challenge completion, referrals  
**Competition:** leaderboard, finalists, category breakdown  

Analytics events live today: `bizfest_landing_viewed`, `bizfest_apply_clicked`. Admin stats: total applications, new, with store, published.

---

## 13. Rollout phases

| Phase | Focus | Status |
| --- | --- | --- |
| **1 — Strategy** | Rules, scoring, prizes, categories, timeline | 🟡 Draft complete — finalize scoring weights & dates |
| **2 — Product** | Landing, apply, onboarding, leaderboard, analytics | 🟡 In progress (see §14) |
| **3 — Content** | Ads, workshop materials, email/WhatsApp sequences | ⚪ Not started |
| **4 — Acquisition** | Meta, TikTok, Google, influencers, partners | ⚪ Not started |
| **5 — Programme** | 6-week challenges + workshops | ⚪ Not started |
| **6 — Conference** | Venue, expo, judges, finale | ⚪ Not started |
| **7 — Post-BizFest** | Retain merchants, case studies, BizFest 2.0 learnings | ⚪ Not started |

**Recommended build order:** Lock Phase 1 scoring rules → finish Phase 2 activation tracking & leaderboard → Phase 3 content in parallel with soft launch → Phase 4 paid acquisition once funnel converts.

---

## 14. Implementation status (engineering)

### Storefront (`storehause`)

| Deliverable | Route / path | Status |
| --- | --- | --- |
| Landing page | `/grants` | ✅ Shipped |
| Application form | `/grants/apply` | ✅ Shipped |
| Partners inquiry form | `/grants/partners` | ✅ Shipped |
| Sponsors / expo inquiry form | `/grants/sponsors` | ✅ Shipped |
| Shared constants & social links | `src/lib/marketing/bizfest-signup.ts` | ✅ Shipped |
| Platform analytics events | `bizfest_landing_viewed`, `bizfest_apply_clicked` | ✅ Shipped |
| Leaderboard page | — | ❌ Not started |
| Merchant BizFest dashboard | — | ❌ Not started |
| Challenge progress UI | — | ❌ Not started |

### Backend (`storehausebackend`)

| Deliverable | API / model | Status |
| --- | --- | --- |
| Applications CRUD (public) | `POST /public/bizfest/applications` | ✅ Shipped |
| Partner/sponsor inquiries (public) | `POST /public/bizfest/partner-inquiries` | ✅ Shipped |
| Application model + store matching | `BizfestApplication`, `matchStore()` | ✅ Shipped |
| Confirmation email | `BizfestApplicationReceivedEmail` | ✅ Shipped |
| Admin list/detail/status | `GET/PATCH /admin/bizfest/applications` | ✅ Shipped |
| Partner inquiry admin | — | ❌ Not started |
| Activation sync (products, transactions) | — | ❌ Not started |
| Scoring & leaderboard API | — | ❌ Not started |
| Challenge completion tracking | — | ❌ Not started |

### Admin (`storehouseadmin`)

| Deliverable | Status |
| --- | --- |
| Applications list, search, filters, stats | ✅ Shipped |
| Status workflow (new → reviewed → shortlisted → rejected → winner) | ✅ Shipped |
| Partner/sponsor inquiry management | ❌ Not started |
| Programme analytics dashboard | 🟡 Partial (site analytics) |
| Leaderboard admin | ❌ Not started |

### Database

| Table | Purpose |
| --- | --- |
| `bizfest_applications` | Merchant applications, store linkage, UTM, status |
| `bizfest_partner_inquiries` | Sponsor, partner, expo booth/space inquiries |

---

## 15. Engineering backlog (prioritized)

### P0 — Before paid acquisition

1. **Activation pipeline** — Cron/job to sync `has_store`, `store_published`, product count, first transaction per application
2. **Post-apply nurture** — Email/WhatsApp sequence: create store → add products → publish → first sale
3. **Finalize competition rules doc** — Legal-ready T&Cs linked from apply form
4. **Partner inquiry admin** — Review sponsor/partner leads in admin panel

### P1 — Programme launch

5. **Scoring service** — Compute BizFest score from merchant activity
6. **Leaderboard** — Public page + merchant "your rank" widget in dashboard
7. **Weekly challenge tracking** — Mark completion, award points
8. **Workshop registration & attendance** — Integrate with Zoom/live events or manual check-in

### P2 — Conference prep

9. **Finalist selection tooling** — Admin shortlist from leaderboard + manual override
10. **Conference registration** — Ticket/RSVP for activated merchants and public
11. **Expo booth assignment** — Link sponsor inquiries to floor plan
12. **Judge scoring app** — Pitch night score entry

### P3 — Growth & iteration

13. **Referral tracking** — Points for referred businesses that activate
14. **Growth plan promo** — First month free coupon for BizFest cohort
15. **Post-BizFest retention campaigns** — Case studies, re-engagement

---

## 16. Marketing & channels

### Paid

- Meta (Instagram/Facebook)
- TikTok
- Google Search / Display

### Organic & partnership

- Bizgrid social: [@biz_grid](https://www.instagram.com/biz_grid/) (Instagram, TikTok, X, LinkedIn)
- Influencer and SME ecosystem partners
- WhatsApp community distribution
- Event/flyer (tracked via "how heard" field)

All campaigns should use UTM parameters; stored on applications and partner inquiries.

---

## 17. Judges (conference finale)

Mix of Bizgrid team and external credibility:

- Successful founders
- Investors and bank executives
- Marketing and technology leaders
- SME ecosystem operators

---

## 18. Related documents

| Document | Purpose |
| --- | --- |
| `docs/bizgridcomp.md` | Original strategy brainstorm & funnel design |
| This file | Master operating plan — single source of truth for BizFest 1.0 |

### Planned sub-documents (to create when Phase 1 locks)

1. BizFest Strategy & Business Case  
2. Competition Rules & Scoring System (legal T&Cs)  
3. Merchant Journey & Product Requirements  
4. 6-Week Workshop & Challenge Programme (runbook)  
5. Marketing & Paid Ads Strategy  
6. Conference + Expo Event Plan  
7. Sponsorship & Financial Model  

---

## 19. Open decisions

| Decision | Options | Owner | Due |
| --- | --- | --- | --- |
| Programme start date | TBD | Ops | Before Phase 4 |
| Conference date & city | TBD | Events | Phase 6 |
| Scoring weight finalization | Draft in §6 | Product | Before leaderboard build |
| Leaderboard visibility | Public vs. participants-only | Product | P1 |
| Workshop delivery | Live virtual vs. in-person mix | Content | Phase 3 |
| First-month-free Growth offer | Yes/no, eligibility rules | Growth | Phase 5 |

---

## 20. One-line summary

**BizFest 1.0 is a 6-week Bizgrid-powered growth programme that converts Nigerian sellers into activated online merchants, gamifies their progress, and celebrates the top performers at a ₦6M conference finale — built as a repeatable acquisition engine, not a one-off event.**
