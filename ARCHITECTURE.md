# Market Link — Platform Architecture

> **Agency CRM + Website Management Platform**
> Built with Next.js 15 (App Router), Supabase, Resend, and Tailwind CSS

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Design](#2-database-design)
3. [API Architecture](#3-api-architecture)
4. [Middleware & Auth](#4-middleware--auth)
5. [Workflows](#5-workflows)
6. [Frontend Architecture](#6-frontend-architecture)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Route Map](#8-route-map)
9. [External Integrations](#9-external-integrations)
10. [Infrastructure & Config](#10-infrastructure--config)

---

## 1. System Overview

```
┌──────────────────────────────────────────────────┐
│                   Next.js 15 App                  │
│  ┌─────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  Public Site │  │ Staff App  │  │Client Portal│ │
│  │  (Marketing) │  │  (/app)    │  │  (/portal) │  │
│  └─────────────┘  └────────────┘  └───────────┘  │
│             │              │              │        │
│         ┌───┴──────────────┴──────────────┴───┐   │
│         │         Middleware (Auth)            │   │
│         └───┬──────────────┬──────────────┬───┘   │
│         ┌───┴──────────────┴──────────────┴───┐   │
│         │        API Routes (17 files)         │   │
│         └───┬──────────────┬──────────────┬───┘   │
└─────────────┼──────────────┼──────────────┼──────┘
              │              │              │
    ┌─────────▼──┐    ┌──────▼──────┐  ┌───▼────────┐
    │  Supabase  │    │   Resend    │  │  Cloudinary │
    │  (Postgres │    │   (Email)   │  │ (Media/CDN) │
    │   + Auth)  │    │            │  │             │
    └────────────┘    └────────────┘  └─────────────┘
```

**Tech Stack:**
- **Framework:** Next.js 15.5.20 (App Router, React 19)
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Supabase Auth (JWT session cookies, service role for admin ops)
- **Email:** Resend (React Email templates)
- **Media:** Cloudinary (document/image upload)
- **CSS:** Custom design system (~2500 lines globals.css) + Tailwind v4
- **Fonts:** Space Grotesk (headings), Space Mono (UI/monospace), Inter (body)
- **Icons:** Lucide React
- **Maps:** Leaflet (inventory location maps)

**Environments:** Single `.env.local` with live Supabase and Resend keys.

---

## 2. Database Design

### 2.1 Schema Overview

```
19 tables — 31 foreign key relationships — 66 indexes — 15 triggers
```

### 2.2 Entity-Relationship Map

```
auth.users
  ├── clients        (assigned_to)
  ├── leads          (assigned_to)
  ├── projects       (assigned_to)
  ├── tasks          (assigned_to)
  ├── conversations  (assigned_to)
  ├── deliverables   (uploaded_by)
  ├── documents      (uploaded_by)
  ├── activity_log   (user_id)
  │
clients
  ├── projects       (client_id)
  ├── inventory      (booked_by)
  ├── bookings       (client_id)
  ├── invoices       (client_id)
  ├── conversations  (client_id)
  ├── engagements    (client_id)
  ├── research_proj  (client_id)
  ├── deliverables   (client_id)
  ├── documents      (client_id)
  ├── reports        (client_id)
  │
projects
  ├── tasks          (project_id)      [CASCADE]
  ├── invoices       (project_id)
  ├── deliverables   (project_id)      [CASCADE]
  ├── research_proj  (project_id)
  ├── engagements    (project_id)      [SET NULL]
  ├── documents      (project_id)      [CASCADE]
  ├── reports        (project_id)      [CASCADE]
  ├── activity_log   (project_id)
  │
inventory
  └── bookings       (inventory_id)

conversations
  └── messages       (conversation_id) [CASCADE]

reports
  └── report_metrics (report_id)       [CASCADE]

research_projects
  └── reports        (generated_from)
```

### 2.3 Core Tables Detail

| Table | Key Columns | Status Options | Purpose |
|-------|-------------|----------------|---------|
| **clients** | name, email, company, industry, assigned_to | active / inactive / churned | Agency clients |
| **leads** | name, company, email, source, value, service_interest | new / contacted / qualified / proposal / won / lost | Sales pipeline |
| **projects** | client_id, name, type, value, progress, assigned_to | draft / active / in_progress / review / completed / cancelled | Client projects |
| **tasks** | project_id, title, priority, assigned_to, due_date | todo / in_progress / done / blocked | Project tasks |
| **inventory** | type, name, location, price, daily_impressions | available / booked / maintenance | Physical media inventory |
| **bookings** | client_id, inventory_id, start_date, end_date, total_price | pending / confirmed / completed / cancelled | Inventory bookings |
| **invoices** | client_id, project_id, amount, line_items (jsonb), due_date | draft / sent / paid / overdue / cancelled | Billing |
| **conversations** | client_id, contact_name, channel, status | open / closed | Communication threads |
| **messages** | conversation_id, direction, text, channel | — | Individual messages |
| **deliverables** | project_id, title, file_url, visible_to_client | — | Client deliverables |
| **documents** | project_id, client_id, name, type, url, cloudinary_public_id | — | Shared documents |
| **research_projects** | client_id, project_id, type, progress, value | upcoming / in_progress / completed / cancelled | Research campaigns |
| **reports** | project_id, client_id, title, type, visible_to_client | — | Analytics reports |
| **report_metrics** | report_id, metric_key, metric_label, metric_value, chart_type | — | Individual KPIs |
| **engagements** | client_id, project_id, engagement_type, billable, staff_involved[] | — | Time/engagement tracking |
| **articles** | slug (unique), title, category, author, content, published | — | Public blog posts |
| **activity_log** | client_id, project_id, user_id, action, description | — | Audit trail |
| **automations** | name, type, enabled, config (jsonb) | — | Automation rules |
| **templates** | name, type, content | — | Content templates |

### 2.4 Row-Level Security (RLS) Summary

```
19 tables with RLS enabled → ~80 policies total

Role-based access pattern:
  super_admin  → everything
  crm_admin    → CRM tables + admin ops
  cms_admin    → CRM tables + admin ops
  crm_staff    → scoped to assigned records only
  finance      → bookings + invoices + reports
  client       → portal-visible records only
  public       → leads INSERT (web forms), articles SELECT (published)
```

**Notable RLS policies:**
- `leads` INSERT: fully public (anyone can submit a lead via website forms)
- `articles` SELECT: public can read published articles; admins see all
- `activity_log`: users can see their own activity; admins see all
- `documents`: staff see only documents for projects they're assigned to
- `reports`: clients see only reports where `visible_to_client = true`
- `automations` & `templates`: RLS enabled but **no policies defined** (blocked by default)

### 2.5 Key Functions

```sql
user_role()      → extracts role from JWT user_metadata, defaults to 'client'
is_admin()       → true if role IN ('super_admin', 'crm_admin', 'cms_admin')
set_updated_at() → trigger function to auto-update updated_at on row change
```

### 2.6 Migration Order

| Order | File | Changes |
|-------|------|---------|
| 0 | `supabase/schema.sql` | Base schema: all core tables, RLS, triggers, functions, articles |
| 1 | `migrations/003_documents.sql` | Adds `documents`, `reports`, `report_metrics` tables; alters `deliverables` |
| 2 | `migrations/004_security_rls.sql` | Tightens RLS on bookings/messages/activity_log; adds conditional FK on reports |

---

## 3. API Architecture

### 3.1 API Route Map

```
17 route files — 32 endpoint methods

  GET    POST   PUT   PATCH  DELETE
───────────────────────────────────
  ✓      ✓     —      —      —     /api/engagements
  ✓      ✓     —      —      —     /api/messages          (mock data)
  ✓      ✓     —      —      —     /api/documents
  —      —     —      ✓      ✓     /api/documents/[id]
  ✓      ✓     —      ✓      —     /api/tasks
  —      ✓     —      —      —     /api/email/send
  —      ✓     —      —      —     /api/auth/demo-login   (public)
  ✓      —     —      —      —     /api/leads
  —      ✓     —      —      —     /api/leads             (public POST)
  —      —     ✓      —      —     /api/leads/[id]
  ✓      —     —      —      —     /api/articles          (public-friendly)
  —      ✓     —      —      —     /api/articles          (admin only)
  ✓      ✓     —      —      —     /api/inventory         (public, mock)
  ✓      ✓     —      —      —     /api/bookings
  ✓      ✓     —      —      —     /api/projects
  ✓      ✓     —      —      —     /api/conversations     (mock data)
  ✓      ✓     —      —      —     /api/reports
  ✓      —     —      ✓      ✓     /api/reports/[id]
  ✓      ✓     —      —      —     /api/clients
```

### 3.2 Auth Enforcement Pattern

| Level | Applied By | Routes |
|-------|-----------|--------|
| **Public** (no auth) | Route handler | `messages/*`, `inventory/*`, `conversations/*`, `leads/POST`, `auth/demo-login/POST`, `articles/GET` |
| **Authenticated** (any session) | `getCurrentUser()` | Most GET/PUT endpoints — role-scoped via DB queries |
| **Admin-only** (`isAdmin`) | `getCurrentUser()` + role check | POST/PATCH/DELETE on sensitive resources |
| **Finance** (mixed) | `user_role() === 'finance'` | `bookings/POST`, `invoices/*`, `reports/GET` |

### 3.3 Auth Helper Chain

```
middleware.ts → supabase SSR client → getUser() → canAccess(role, pathname)
                                                          ↓
API route → getAuthenticatedClient() → getCurrentUser() → isAdmin() / DB scoping
```

### 3.4 Auth Client Variants

| File | Use Case | Key Type |
|------|----------|----------|
| `src/lib/supabase/api.ts` | Server API routes (cookies from `next/headers`) | Anon key |
| `src/lib/supabase/server.ts` | Server components | Anon key |
| `src/lib/supabase/browser.ts` | Client components | Anon key |
| `src/utils/supabase/server.ts` | Alternative server factory | Anon key |
| `src/utils/supabase/client.ts` | Alternative browser factory | Anon key |
| `src/utils/supabase/middleware.ts` | Middleware (request-scoped cookies) | Anon key |
| `src/lib/onboarding.ts` | Admin auth user creation | **Service role key** |

### 3.5 Key API Patterns

**Role scoping (CRM staff):**
```
if (role === 'crm_staff') {
  query = query.eq('assigned_to', userId)
}
```

**Admin-gated mutations:**
```
if (!isAdmin(role)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Error sanitization:**
```
catch (error) {
  return NextResponse.json(
    { error: sanitizeError(error, 'Failed to create') },
    { status: 500 }
  )
}
```
Returns real error in dev, generic message in production.

**Mock data routes** (`messages`, `inventory`, `conversations`):
Return hardcoded in-memory arrays rather than querying the database.

---

## 4. Middleware & Auth

### 4.1 Middleware Flow

```
Request → middleware.ts
  │
  ├── Is it a public route? (/, /login, /services/*, /api/*, etc.)
  │     └── YES → pass through
  │
  └── Is it an /app or /portal route?
        └── Check Supabase session
              │
              ├── No session → redirect to /login?next=<path>
              │
              └── Has session → extract role from JWT metadata
                    │
                    ├── canAccess(role, pathname)?
                    │     └── NO → redirect to role's default page
                    │
                    └── YES → pass through
```

### 4.2 Route Permission Map

```typescript
// src/lib/roles.ts  (simplified)
const routePermissions: Record<string, UserRole[]> = {
  '/app/my-day':         ['crm_staff'],
  '/app/content':        ['cms_admin'],
  '/app/pipeline':       ['super_admin', 'crm_admin', 'crm_staff'],
  '/app/clients':        ['super_admin', 'crm_admin'],
  '/app/projects':       ['super_admin', 'crm_admin', 'crm_staff'],
  '/app/tasks':          ['super_admin', 'crm_admin', 'crm_staff'],
  '/app/inbox':          ['super_admin', 'crm_admin', 'crm_staff'],
  '/app/inventory':      ['super_admin', 'crm_admin'],
  '/app/bookings':       ['super_admin', 'crm_admin', 'finance'],
  '/app/research':       ['super_admin', 'crm_admin'],
  '/app/invoices':       ['super_admin', 'finance'],
  '/app/settings':       ['super_admin'],
  '/app/reports':        ['super_admin', 'crm_admin', 'crm_staff'],
  '/app/preview-client': ['super_admin'],
  '/app/admin':          ['super_admin'],
}
```

### 4.3 Default Redirects by Role

| Role | Redirect On Access Denied |
|------|--------------------------|
| `super_admin` | `/app` (dashboard) |
| `crm_admin` | `/app/pipeline` |
| `crm_staff` | `/app/my-day` |
| `cms_admin` | `/app/content` |
| `finance` | `/app/invoices` |
| `client` | `/portal` |
| unauthenticated | `/login` |

---

## 5. Workflows

### 5.1 Client Onboarding

```
Admin creates client via UI (POST /api/clients)
  │
  ├── 1. Insert row into `clients` table
  │
  ├── 2. Call onboardClient({ email, name, company })
  │     │
  │     ├── Create Supabase Auth user (service role key)
  │     │   - email: client's email
  │     │   - password: auto-generated temp password
  │     │   - user_metadata: { role: 'client', name }
  │     │
  │     └── Send onboarding email via Resend
  │         - OnboardingEmail template
  │         - Contains: temp password, login link
  │
  └── 3. Response: { success, onboarding: { emailSent } }
```

**First login by client:**
```
Client clicks login link → enters email + temp password
  → Supabase forces password reset (requires_new_password)
  → Client sets new password
  → Redirected to /portal
```

### 5.2 Demo Login Flow

```
GET /login?demo=super_admin
  │
  └── POST /api/auth/demo-login { role: 'super_admin' }
        │
        ├── Map role to demo account: demo+{role}@playmaxagency.co.ke
        │
        ├── If service role key available:
        │     └── Create/update auth user with confirmed email + role metadata
        │
        ├── Sign in with email + known password via Supabase anon client
        │
        └── Return { session, role, redirect: '/app' }
```

### 5.3 Lead Capture (Website → CRM)

```
Visitor submits website form
  │
  └── POST /api/leads (public, no auth)
        │
        ├── Validate: name, company, email, service_interest required
        │
        └── INSERT into `leads` with status = 'new'
              │
              └── Notification bell in staff app polls /api/leads
```

### 5.4 Email Dispatch Workflow

```
Admin triggers email via UI
  │
  └── POST /api/email/send (admin-only)
        │
        ├── Validate type: 'onboarding' | 'reset_password' | 'notification'
        │
        ├── Build React Email template with provided templateData
        │
        └── Resend API: send({ from, to, subject, react: <Template /> })
              │
              └── Fallback mode: if RESEND_API_KEY absent, log + return mock success
```

### 5.5 Inventory Booking Conflict Detection

```
POST /api/bookings
  │
  ├── Validate required fields
  │
  ├── Check for overlapping confirmed bookings:
  │     SELECT * FROM bookings
  │     WHERE inventory_id = X
  │       AND status = 'confirmed'
  │       AND start_date <= new_end_date
  │       AND end_date >= new_start_date
  │
  ├── If conflict → 409 Conflict
  │
  └── If clear → INSERT booking with status = 'pending'
```

### 5.6 Report Generation

```
Admin creates report:
  │
  └── POST /api/reports { project_id, title, metrics? }
        │
        ├── INSERT into `reports`
        │
        └── If metrics[] provided → bulk INSERT into `report_metrics`

Admin edits report:
  │
  └── PATCH /api/reports/[id] { title?, visible_to_client?, metrics? }
        │
        └── If metrics provided:
              ├── DELETE all existing report_metrics for report
              └── Re-INSERT new metrics
```

### 5.7 Document Management

```
Upload flow (client-side):
  Upload file → Cloudinary (client-side upload) → get URL
  → POST /api/documents { project_id, name, url, cloudinary_public_id, visible_to_client }

Access control:
  - Staff: see documents for assigned projects only
  - Clients: see documents where visible_to_client = true
  - Admins: see everything
```

---

## 6. Frontend Architecture

### 6.1 Page Hierarchy (47 pages)

```
/                         Marketing Homepage
├── /services             Service listing
│   └── /services/[slug]  Service detail page
├── /inventory            Public inventory listing
├── /about                About the agency
├── /case-studies         Case study grid
├── /insights             Blog/articles listing
│   └── /insights/[slug]  Single article
├── /contact              Contact form
├── /login                Sign-in page
├── /forgot-password      Password reset
├── /auth/update-password  Password update
├── /terms                Terms of service
├── /privacy-policy       Privacy policy
└── /cookie-policy        Cookie policy

/app                      Staff Dashboard
├── /app/my-day           Staff daily view
├── /app/pipeline         Kanban pipeline
├── /app/clients          Client list
│   └── /app/clients/[id] Client detail
├── /app/projects         Project list
│   └── /app/projects/[id] Project detail
├── /app/tasks            Task management
├── /app/inbox            Unified inbox
├── /app/inventory        Media inventory
├── /app/bookings         Booking management
├── /app/research         Research & data
├── /app/invoices         Invoice management
├── /app/reports          Reports list
│   └── /app/reports/[id] Report detail
├── /app/content          CMS overview
│   ├── /app/content/articles     Article list
│   └── /app/content/articles/new New article editor
├── /app/settings         Platform settings
├── /app/preview-client   Client portal preview
└── /app/admin            Admin dashboard
    ├── /app/admin/staff       Staff management
    ├── /app/admin/billing     Billing overview
    │   ├── /app/admin/billing/history  Full history
    │   └── /app/admin/billing/upgrade  Plan upgrade
    ├── /app/admin/automation  Automation rules
    ├── /app/admin/whatsapp    WhatsApp templates
    │   └── /app/admin/whatsapp/submit  New template
    └── /app/admin/audit       Audit log

/workspace/[projectId]    Collaborative workspace

/portal                   Client Portal dashboard
├── /portal/deliverables  Client deliverables
├── /portal/messages      Client messages
├── /portal/invoices      Client invoices
├── /portal/bookings      Client bookings
├── /portal/projects      Client projects
└── /portal/settings      Client settings
```

### 6.2 Component Architecture (~55 components)

```
src/components/
├── ui/                    (18 atomic components)
│   ├── button.tsx          primary / secondary, sm / md / lg
│   ├── modal.tsx           escape-to-close, backdrop, scroll-lock
│   ├── badge.tsx           9 variants (available, booked, draft, active, etc.)
│   ├── status-badge.tsx    active / review / draft / confirmed
│   ├── card.tsx            base card with optional hover-yellow
│   ├── input.tsx           form input with forwarded ref
│   ├── avatar.tsx          initials avatar, yellow / dark, sm / md / lg
│   ├── search-box.tsx      search input with icon
│   ├── filter-pill.tsx     toggleable pill button
│   ├── empty-state.tsx     icon + title + description + action
│   ├── stat-card.tsx       big number + label
│   ├── progress-bar.tsx    horizontal progress bar
│   ├── bar-chart.tsx       simple horizontal bar chart
│   ├── calendar.tsx        availability grid (free/taken/today)
│   ├── Carousel.tsx        arrows + dots navigation
│   ├── RevealSection.tsx   IntersectionObserver fade/slide-up
│   ├── ProcessSteps.tsx    step flow (brief → scope → kickoff)
│   └── MiniMap.tsx         Leaflet map for inventory locations
│
├── layout/                 (6 layout components)
│   ├── SiteHeader.tsx      public site header, scroll-shrink, letter-bounce
│   ├── SiteFooter.tsx      full marketing footer, social links, legal
│   ├── Sidebar.tsx         app/portal sidebar, sections + user area
│   ├── PageHeader.tsx      title + subtitle + actions slot
│   ├── NotificationBell.tsx unread count + dropdown, polls /api/leads
│   └── PortalHeader.tsx    client portal top bar
│
├── modals/                 (11 modal dialogs)
│   ├── NewLeadModal        create CRM lead
│   ├── NewClientModal      create client
│   ├── NewProjectModal     create project
│   ├── NewTaskModal        create task
│   ├── NewBookingModal     create booking
│   ├── NewEngagementModal  create engagement
│   ├── NewReportModal      create report
│   ├── NewResearchModal    create research project
│   ├── InvoiceDetailModal  view invoice
│   ├── PaymentMethodModal  add/update/change payment
│   └── ConfirmActionModal  generic confirmation dialog
│
├── crm/                    (4 CRM components)
│   ├── LeadCard            kanban lead card
│   ├── KanbanColumn        kanban column container
│   ├── AddLeadModal        add lead from pipeline
│   └── ProjectCard         project card
│
├── inventory/              (3 inventory components)
│   ├── InventoryCardFull   full card with details
│   ├── InventoryDetailPanel detail slide panel
│   └── BookingModal        booking creation
│
├── inbox/                  (3 inbox components)
│   ├── ConversationList    thread list panel
│   ├── ConversationPanel   message thread view
│   └── MessageBubble       individual message
│
├── documents/              (2 document components)
│   ├── DocumentList        document listing
│   └── DocumentUpload      upload UI
│
├── reports/                (1 report component)
│   └── MetricsGrid         KPI metrics grid
│
├── sections/               (1 section)
│   └── ClientLogoStrip     client logos marquee
│
└── standalone              (7 standalone)
    ├── HeroClient.tsx      marketing hero
    ├── InventoryBar.tsx    services marquee strip
    ├── InventoryMap.tsx    full map view
    ├── InventoryCard.tsx   generic inventory card
    ├── LeadForm.tsx        CTA lead capture form
    ├── CountUp.tsx         animated counter
    └── ScrollToTop.tsx     floating back-to-top button
```

### 6.3 Design System

**Color Palette (Dark Theme):**

```
Backgrounds:
  --pm-black:        #0a0a0a  (page)
  --pm-black-2:      #141414  (cards)
  --pm-black-3:      #1e1e1e  (elevated)
  --pm-black-4:      #2a2a2a  (borders)

Accent:
  --pm-yellow:       #f4c300  (primary — CTAs, highlights)
  --pm-yellow-dim:   #c49b00  (dimmed)
  --pm-amber:        #c9a227  (warm secondary)

Semantic:
  --pm-green:        #22c55e  (success)
  --pm-red:          #ef4444  (error)
  --pm-blue:         #3b82f6  (info)
  --pm-wa-green:     #25d366  (WhatsApp)

Text:
  --pm-white:        #ffffff
  --pm-gray-1→5:     #f5f5f5 → #444444
```

**Typography:**
| Font | Usage | Weight |
|------|-------|--------|
| Space Grotesk | Headings, buttons, logo | Bold |
| Space Mono | Badges, stats, eyebrow labels | Regular/Bold |
| Inter | Body copy, form inputs | Regular |

**Page Background:**
Full-page sunset gradient: `#0a0a0a → warm amber → gold → #f7d774`

**Key Design Tokens (CSS Variables):**
- Spacing: `--space-1` (4px) through `--space-24` (96px)
- Radii: `--radius-sm` (4px) to `--radius-full` (9999px)
- Shadows: `--shadow-sm`, `--shadow`, `--shadow-lg`, `--shadow-yellow`
- Transitions: `--transition-fast` (100ms), `--transition` (150ms)
- Layout: `--sidebar-w` (220px), `--header-h` (72px)

### 6.4 Layout Architecture

```
┌────────────────────────────────────────────────┐
│            Root Layout (src/app/layout.tsx)     │
│  Font loading · globals.css · html/body setup  │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌────────────────────────────┐  │
│  │          │  │                            │  │
│  │ Sidebar  │  │    Page Content             │  │
│  │ (220px)  │  │                            │  │
│  │          │  │  ┌───────────────────────┐  │  │
│  │ Logo     │  │  │  PageHeader           │  │  │
│  │ ─────── │  │  │  (title+sub+actions)  │  │  │
│  │ Overview │  │  ├───────────────────────┤  │  │
│  │  • Dash  │  │  │                       │  │  │
│  │  • Pipe  │  │  │   Page-specific       │  │  │
│  │  • Cli.  │  │  │   content area        │  │  │
│  │  • Proj. │  │  │                       │  │  │
│  │ ─────── │  │  │                       │  │  │
│  │ Ops      │  │  └───────────────────────┘  │  │
│  │  • Inbox │  │                            │  │
│  │  • Inv.  │  │                            │  │
│  │  • etc.  │  │                            │  │
│  │ ─────── │  │                            │  │
│  │ Admin    │  │                            │  │
│  │  • Staff │  │                            │  │
│  │  • Bill  │  │                            │  │
│  └──────────┘  └────────────────────────────┘  │
│                                                 │
└────────────────────────────────────────────────┘
```

### 6.5 CSS Architecture

| File | Lines | Role |
|------|-------|------|
| `src/app/globals.css` | ~2500 | Primary design system: variables, components, utilities |
| `src/app/tailwind.css` | ~150 | Tailwind v4 theme mapping (`@theme inline`) |
| `src/styles/globals-addendum.css` | ~20 | Sunset gradient background class |

Pattern: **CSS-first with Tailwind augmentation.** Custom CSS defines the design tokens and component classes (`.pm-dash-*`, `.card`, `.btn-*`), while Tailwind provides spacing/sizing/flexbox utilities mapped to the same token values.

---

## 7. User Roles & Permissions

### 7.1 Role Definitions

| Role | Label | Dashboard | Admin Check | Default Redirect |
|------|-------|-----------|-------------|-----------------|
| `super_admin` | Super Admin | Full platform | ✅ Yes | `/app` |
| `crm_admin` | CRM Admin | CRM + operations | ✅ Yes | `/app/pipeline` |
| `cms_admin` | CMS Admin | Content management | ✅ Yes | `/app/content` |
| `crm_staff` | CRM Staff | Limited CRM | ❌ No | `/app/my-day` |
| `finance` | Finance | Billing + bookings | ❌ No | `/app/invoices` |
| `client` | Client | Portal only | ❌ No | `/portal` |

### 7.2 Access Matrix

```
                      super  crm    cms    crm    finance client
                      _admin _admin _admin _staff
──────────────────────────────────────────────────────────────
Dashboard (/app)        ✓     ✓      ✓      ✓      ✓      ✗
Pipeline                ✓     ✓      ✗      ✓      ✗      ✗
My Day                  ✗     ✗      ✗      ✓      ✗      ✗
Clients                 ✓     ✓      ✗      ✗      ✗      ✗
Projects                ✓     ✓      ✗      ✓      ✗      ✗
Tasks                   ✓     ✓      ✗      ✓      ✗      ✗
Inbox                   ✓     ✓      ✗      ✓      ✗      ✗
Inventory               ✓     ✓      ✗      ✗      ✗      ✗
Bookings                ✓     ✓      ✗      ✗      ✓      ✗
Research                ✓     ✓      ✗      ✗      ✗      ✗
Invoices                ✓     ✗      ✗      ✗      ✓      ✗
Content (CMS)           ✓     ✗      ✓      ✗      ✗      ✗
Reports                 ✓     ✓      ✗      ✓      ✓      ✗
Settings                ✓     ✗      ✗      ✗      ✗      ✗
Preview Client Portal   ✓     ✗      ✗      ✗      ✗      ✗
Admin Settings          ✓     ✗      ✗      ✗      ✗      ✗
Client Portal           ✓     ✓      ✓      ✓      ✓      ✓
```

### 7.3 RLS Policy by Role (Database Level)

```
super_admin → any row in any table
crm_admin   → any row in CRM tables
cms_admin   → any row in CRM tables
crm_staff   → rows where assigned_to = their uid
finance     → bookings, invoices, reports
client      → rows where visible_to_client = true
```

---

## 8. Route Map

### 8.1 Complete Route Table

```
  Method   Path                          Auth    DB / Mock   Page File Exists
─────────────────────────────────────────────────────────────────────────────
  ANY      /                             public  —             ✓
  ANY      /about                        public  —             ✓
  ANY      /case-studies                 public  —             ✓
  ANY      /contact                      public  —             ✓
  ANY      /cookie-policy                public  —             ✓
  ANY      /forgot-password              public  —             ✓
  ANY      /insights                     public  —             ✓
  ANY      /insights/[slug]              public  —             ✓
  ANY      /inventory                    public  —             ✓
  ANY      /login                        public  —             ✓
  ANY      /privacy-policy               public  —             ✓
  ANY      /services                     public  —             ✓
  ANY      /services/[slug]              public  —             ✓
  ANY      /terms                        public  —             ✓
  ANY      /auth/update-password         auth    —             ✓
  ANY      /app/*                        auth    —             ✓ (24 pages)
  ANY      /portal/*                     auth    —             ✓ (7 pages)
  ANY      /workspace/[projectId]        auth    —             ✓
  GET      /api/engagements              auth    DB            ✓
  POST     /api/engagements              admin   DB            ✓
  GET      /api/messages                 public  Mock          ✓
  POST     /api/messages                 public  Mock          ✓
  GET      /api/documents                auth    DB            ✓
  POST     /api/documents                auth    DB            ✓
  PATCH    /api/documents/[id]           admin   DB            ✓
  DELETE   /api/documents/[id]           admin   DB            ✓
  GET      /api/tasks                    auth    DB            ✓
  POST     /api/tasks                    admin   DB            ✓
  PATCH    /api/tasks                    auth    DB            ✓
  POST     /api/email/send              admin   Resend        ✓
  POST     /api/auth/demo-login          public  Supabase      ✓
  GET      /api/leads                    auth    DB            ✓
  POST     /api/leads                    public  DB            ✓
  PUT      /api/leads/[id]               auth    DB            ✓
  GET      /api/articles                 public  DB            ✓
  POST     /api/articles                 admin   DB            ✓
  GET      /api/inventory                public  Mock          ✓
  POST     /api/inventory                public  Mock          ✓
  GET      /api/bookings                 auth    DB            ✓
  POST     /api/bookings                 auth    DB            ✓
  GET      /api/projects                 auth    DB            ✓
  POST     /api/projects                 admin   DB            ✓
  GET      /api/conversations            public  Mock          ✓
  POST     /api/conversations            public  Mock          ✓
  GET      /api/reports                  auth    DB            ✓
  POST     /api/reports                  admin   DB            ✓
  GET      /api/reports/[id]             auth    DB            ✓
  PATCH    /api/reports/[id]             admin   DB            ✓
  DELETE   /api/reports/[id]             admin   DB            ✓
  GET      /api/clients                  auth    DB            ✓
  POST     /api/clients                  admin   DB            ✓
```

### 8.2 Zero Broken Routes Verified

> Every `router.push()`, `<Link href>`, and `<a href>` with a static internal path resolves to a real `page.tsx` file. All 47 pages and 32 API endpoints are navigable.

---

## 9. External Integrations

### 9.1 Supabase (Database + Auth)

| Detail | Value |
|--------|-------|
| URL | `https://visycgzuszhgvtmqfnbx.supabase.co` |
| SDK | `@supabase/supabase-js` + `@supabase/ssr` |
| Auth | JWT cookies, service role for admin operations |
| Clients | 7 client variants (api, server, browser, middleware, legacy, utils, admin) |

### 9.2 Resend (Email)

| Detail | Value |
|--------|-------|
| API Key | `re_9jctTuKd_8tkdePSP7nwpNHmKAFEgkT2y` (live) |
| SDK | `resend` npm package |
| Templates | 3 React Email components (onboarding, reset-password, notification) |
| Domain | Falls back to `resend.dev` if `RESEND_DOMAIN` not set |
| Rate Limit | Resend free tier: 100 emails/day |

### 9.3 Cloudinary (Media)

| Detail | Value |
|--------|-------|
| Config | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` |
| Upload Preset | `playmax_documents` |
| Folder | `playmax/documents` |
| Usage | Client-side document upload only |

---

## 10. Infrastructure & Config

### 10.1 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL        = https://visycgzuszhgvtmqfnbx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = anon_key
SUPABASE_SERVICE_ROLE_KEY       = service_role_key   (gitignored)

# Resend
RESEND_API_KEY                  = re_9jctTuKd_...    (gitignored)
RESEND_DOMAIN                   = (optional, for custom domain)

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = playmax

# Demo
DEMO_PASSWORD                   = demo_password      (gitignored)
```

### 10.2 Build

```
Framework:  Next.js 15.5.20
Build time: ~18s
Output:     Static + Server-rendered + SSG pages
            Lambda functions for dynamic routes
Bundle:     ~103 kB First Load JS (shared)
```

### 10.3 Security Headers (next.config.mjs)

```
X-Frame-Options:           DENY
X-Content-Type-Options:    nosniff
Referrer-Policy:           strict-origin-when-cross-origin
X-XSS-Protection:          1; mode=block
```

---

*Generated from codebase analysis — July 2026*
