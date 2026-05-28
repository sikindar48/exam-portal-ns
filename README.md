# NS Exam Portal

A comprehensive online examination platform designed for educational institutions. Built with modern web technologies and enterprise-grade security.

**Powered by [NS Software Solutions](https://www.nssoftwaresolutions.in)**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ & npm (or bun)
- Supabase account
- Git

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

---

## 🛠️ Tech Stack

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| Frontend      | React 18, TypeScript, Vite                  |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS)         |
| Routing       | React Router v6                             |
| State         | React Context, TanStack Query               |
| Backend       | Supabase (PostgreSQL, Auth, Edge Functions) |
| Styling       | Tailwind CSS with dark mode support         |
| Deployment    | Vercel (frontend), Supabase (backend)       |

---

## ✨ Key Features

### Multi-Role System

- **Super Admin** - Platform management, client organization control
- **Client Admin** - Student management, test creation, analytics
- **Student** - Test taking, history tracking, performance review

### Test Management

- Folder-based test organization
- Nested question categories/folders
- Interactive **Assessment Builder** visual palette (create/edit inline)
- Draft/Publish workflow
- Scheduled tests (start/end date-time)
- Unlimited or limited attempts
- CSV question import
- Test sharing via invite codes, public links (with optional **Guest Access**), and QR codes

### Secure Test Engine

- Fullscreen enforcement with violation tracking
- Tab switch detection (3 strikes = auto-submit)
- Copy/paste/print screen blocking
- Right-click disabled
- Keyboard shortcut prevention
- Auto-save answers
- Timer with auto-submit

### Advanced Features

- Question shuffling
- Negative marking support
- Mark for review functionality
- Restrict navigation option
- Real-time answer persistence
- Comprehensive analytics dashboard

### User Experience

- Light/Dark/System theme support
- Responsive design (mobile-friendly)
- Accessible UI components
- Toast notifications
- Loading states and error handling

---

## 📁 Project Structure

```
exam-portal-ns/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Auth/            # Route guarding components
│   │   ├── Brand/           # NS Branding components
│   │   ├── ClientAdmin/     # Management tables & folders
│   │   ├── Common/          # Error boundary and nav components
│   │   ├── QuestionImport/  # CSV importer
│   │   ├── SuperAdmin/      # Client admin user creators
│   │   ├── Test/            # Share & QR dialogs
│   │   ├── TestBuilder/     # Builder sidebar & inline cards
│   │   ├── TestEngine/      # Instructions & secure test player
│   │   ├── Theme/           # Theme provider & toggle dropdown
│   │   └── ui/              # shadcn/ui base elements
│   ├── contexts/           # React Contexts (AuthContext)
│   ├── hooks/              # Custom React hooks (useMobile, useToast)
│   ├── integrations/       # Supabase client & generated types
│   ├── pages/              # Lazy-loaded route layouts
│   │   ├── Auth/            # Login, Reset, Forgot pages
│   │   ├── ClientAdmin/     # Dashboard, Questions, Builder, Results pages
│   │   ├── Home/            # Public Landing page
│   │   ├── Student/         # Dashboard, History, Engine pages
│   │   └── SuperAdmin/      # Platform admin panel
│   ├── utils/              # Helper functions (CSV, validators)
│   └── App.tsx             # Root router configurations
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── docs/                   # Documentation
└── public/                 # Static assets
```

---

## 🎯 High-Value Features You Can Add

### 1. ⭐ Post-Test Review Screen (Highest Value)

The `allow_review` flag exists in the database. Build a UI showing:

- Each question with student's answer
- Correct answer highlighted
- Explanation (if added to schema)
- Score breakdown per question

### 2. Enhanced Analytics

- Per-student detailed analytics
- Question-level statistics (most missed, easiest, hardest)
- Time spent per question tracking
- Performance trends over time

### 3. Question Bank Enhancements

- Tags/categories for questions
- Question difficulty auto-adjustment based on performance
- Question reuse statistics
- Bulk edit capabilities

### 4. Test Features

- Test duplication/cloning
- Question pools (random selection from category)
- Section-based tests
- Partial credit for multiple correct answers

### 5. Student Features

- Practice mode (unlimited attempts, no scoring)
- Bookmarked questions
- Performance comparison with peers
- Certificate generation

### 6. Admin Tools

- Bulk student import via CSV
- Email notifications for test assignments
- Proctoring features (webcam monitoring)
- Plagiarism detection

### 7. UI/UX Improvements

- Search & filter in all tables
- Pagination for large datasets
- Empty state illustrations
- Confirmation dialogs for destructive actions
- Keyboard shortcuts for power users

---

## 🔒 Security Features

- Row Level Security (RLS) on all tables
- JWT-based authentication
- Role-based access control (RBAC)
- Service role key isolation (Edge Functions only)
- HTTPS-only communication
- Password hashing (Supabase Auth)
- Anti-cheating measures in test engine

---

## 📊 Database Schema

See [docs/architecture-db-schema.md](docs/architecture-db-schema.md) for complete schema documentation including:

- Entity Relationship Diagrams
- Table definitions
- RLS policies
- Database functions
- Performance indexes

---

## 🔄 User Flows

See [docs/features-flow.md](docs/features-flow.md) for detailed user flows including:

- Authentication flow
- Super Admin workflows
- Client Admin workflows
- Student test-taking flow
- Test sharing mechanisms

---

## 🌐 Deployment

### Frontend (Vercel)

```sh
# Build for production
npm run build

# Preview build locally
npm run preview
```

Deploy to Vercel:

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (Supabase)

1. Create a Supabase project
2. Run migrations: `supabase db push`
3. Deploy Edge Functions: `supabase functions deploy`
4. Set up environment variables

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

For Edge Functions (server-side only):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📝 Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured
- Component-based architecture
- Custom hooks for reusable logic

### Git Workflow

- Feature branches from `main`
- Descriptive commit messages
- Pull requests for review
- Automated CI checks

### Testing

- Manual testing checklist in `/docs`
- Test all user roles
- Verify RLS policies
- Check responsive design

---

## 🐛 Known Issues & Limitations

- Test review feature UI not implemented (data structure ready)
- No pagination on large tables (loads all data)
- CSV import limited to questions (students need manual entry)
- No email notifications for test assignments
- Theme toggle not visible on all pages

---

## 📞 Support & Contact

**Developed by:** [NS Software Solutions](https://www.nssoftwaresolutions.in)  
**Email:** info.nssoftwaresolutions@gmail.com  
**Internship Program:** [internships.nssoftwaresolutions.in](https://internships.nssoftwaresolutions.in)

---

## 📄 License

© 2024-2026 NS Software Solutions. All rights reserved.

---

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- Hosted on [Vercel](https://vercel.com/)
