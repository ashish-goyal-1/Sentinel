# Sentinel - System Architecture

> **High-Level Design & Component Structure**  
> Visualizing the system components and their interactions.

---

## 🏗️ High-Level System Design

Sentinel is built on a **3-Tier Architecture** separating the presentation layer, business logic, and data layer.

```
       PRESENTATION LAYER               APPLICATION LAYER                   DATA LAYER
    ┌──────────────────────┐         ┌─────────────────────┐         ┌────────────────────┐
    │                      │         │                     │         │                    │
    │   React (Vite SPA)   │         │   Express Server    │         │     PostgreSQL     │
    │                      │         │                     │         │    (Neon.tech)     │
    │  • Face Detection    │  REST   │  • Authentication   │   SQL   │                    │
    │  • Dashboard UI      │◄───────►│  • API Endpoints    │◄───────►│  • User Data       │
    │  • Exam Interface    │  JSON   │  • Face Embeddings  │ (Prisma)│  • Exam Content    │
    │                      │         │  • Analytics Logic  │         │  • Submissions     │
    │                      │         │                     │         │                    │
    └──────────────────────┘         └─────────────────────┘         └────────────────────┘
               ▲                                ▲                                 ▲
               │                                │                                 │
           Browser                        Node.js Runtime                     Cloud DB
```

---

## 🔄 Data Flow Diagrams

### 1. Request Lifecycle

How a user action travels through the system:

```
USER ACTION      BROWSER (React)            API SERVER (Express)            DATABASE
   │                  │                            │                           │
   │  Clicks "Save"   │  1. Event Handler          │                           │
   └─────────────────►│  2. axios.post('/exam')────┼──────────────────────────►│
                      │  3. Attach JWT Token       │ 1. Rate Check (Limit)     │
                      │                            │ 2. Auth Check (Protect)   │
                      │                            │ 3. Controller Logic       │
                      │                            │ 4. prisma.create() ──────►│
                      │                            │                           │ SQL INSERT
                      │                            │                           │
                      │                            │◄──────────────────────────┘
                      │  4. Update React State     │ 5. Return JSON 201 Created
   ┌─────────────────◄│  5. Show Toast Notification│                           │
   │ "Exam Saved!"    │                            │                           │
   └──────────────────┘                            │                           │
```

---

### 2. Authentication Flow (Stateless JWT)

```
       CLIENT                               SERVER                                DATABASE
          │                                   │                                      │
          │ 1. Login (email/pass)             │                                      │
          │──────────────────────────────────►│                                      │
          │                                   │ 2. Hash & Compare Password           │
          │                                   │────────────────────────────────────► │
          │                                   │◄──────────────────────────────────── │
          │                                   │ 3. Match? Generate JWT               │
          │                                   │                                      │
          │ 4. Store Token (localStorage)     │◄─────────────────────────────────────┘
          │◄──────────────────────────────────│                                      │
          │                                   │                                      │
          │ 5. Subsequent Request + Token     │                                      │
          │──────────────────────────────────►│                                      │
          │                                   │ 6. Verify Token Signature            │
          │                                   │ 7. Fetch User Role & Context         │
          │                                   │────────────────────────────────────► │
          │                                   │◄──────────────────────────────────── │
          │                                   │ 8. Authorized Response               │
          │◄──────────────────────────────────│                                      │
```

---

## 🧩 Component Architecture

### Frontend Layer Structure (React)

The frontend is organized by **Feature-Based Routing**:

```
App.jsx (Router)
 │
 ├── Auth Layout (Public)
 │    ├── Login Page
 │    └── Register Page
 │
 ├── Dashboard Layout (Private + Role Check)
 │    │
 │    ├── Student Routes
 │    │    ├── Dashboard (Available Exams)
 │    │    ├── Exam Precheck (Face Verification)
 │    │    └── Results History
 │    │
 │    └── Teacher Routes
 │         ├── Dashboard (Created Exams)
 │         ├── Create/Edit Exam
 │         └── Exam Analytics
 │
 └── Exam Layout (Fullscreen + Locked)
      │
      └── TakeExam Page (Anti-Cheat Active)
```

### Backend Layer Structure (Express)

The backend follows the **Controller-Service-Repository** pattern (simplified with Prisma as Repository):

```
Server Entry Point (server.js)
 │
 ├── Middleware Layer
 │    ├── CORS & Security Headers
 │    ├── Global Rate Limiter
 │    └── Request Logger
 │
 └── Routes Layer
      ├── /auth      → authController
      ├── /exams     → examController
      └── /users     → faceController
           │
           └── Controllers (Business Logic)
                │
                ├── Input Validation
                ├── Role Authorization
                └── Data Access (Prisma Client)
                     │
                     └── Database Models
```

---

## 🗄️ Database Schema Relationships

A relational model prioritizing data integrity and efficient querying.

```
      ONE Teacher  ────────── creates ──────────►  MANY Exams
           │                                            │
           │                                            │ 1
           │                                            ▼
           │                                       MANY Questions
           │
           │
      ONE Student  ────────── submits ──────────►  MANY Submissions
                                                        │
                         (1 per Exam per Student)       │ 1
                                                        ▼
                                                   ONE Exam
```

### Design Decisions

1.  **Composite Unique Constraint**: `@@unique([studentId, examId])`
    *   **Why**: Enforces business rule (one attempt per exam) at the database level. Prevents race conditions.

2.  **JSON Fields**: `answers`, `options`, `malpracticeEvents`
    *   **Why**: Flexibility. Exam questions may vary in structure; malpractice logs are unstructured event streams. Efficient storage vs normalized tables.

3.  **Cascade Deletion**: `onDelete: Cascade`
    *   **Why**: clean-up. Deleting an Exam automatically removes all its Questions and Submissions, preventing orphaned data.

---

## 🛡️ Security Architecture

### Tiered Rate Limiting

We implement different security levels based on endpoint sensitivity:

| Tier | Rate Limit | Applied To | Reason |
|------|------------|------------|--------|
| **Public API** | 100 req / 15m | General Endpoints | Prevents basic DoS |
| **Auth API** | 5 req / 15m | Login/Register | Prevents Brute Force |
| **Reset API** | 3 req / 60m | Password Reset | Prevents Email Spam |

### Anti-Cheating Architecture

1.  **Frontend Proctor**:
    *   Runs `face-api.js` in a WebWorker/Main Thread.
    *   Calculates Euclidean distance of face descriptor every 3s.
    *   Captures `visibilitychange` and window `blur` events.

2.  **Backend Verification**:
    *   Receives `malpracticeEvents` array on submission.
    *   Calculates `warningsCount` and flags suspicious submissions.
    *   Does NOT process video stream (preserves bandwidth/privacy).
