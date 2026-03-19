import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { connectDatabase } from '../config/database';

dotenv.config();

const forceReseed = process.argv.includes('--force');

async function seedDemoUser() {
  try {
    await connectDatabase();

    const demoEmail = 'demo@dev-codex.com';
    const demoUsername = 'demo_user';

    // Check if demo user already exists
    let demoUser = await User.findOne({ email: demoEmail });

    // Also check old email in case of migration
    if (!demoUser) {
      demoUser = await User.findOne({ email: 'demo@projectmanager.example' });
      if (demoUser) {
        demoUser.email = demoEmail;
        await demoUser.save();
        console.log('Migrated demo user email to', demoEmail);
      }
    }

    if (demoUser) {
      console.log('Demo user already exists:', demoEmail);
      if (!demoUser.isDemo) {
        demoUser.isDemo = true;
        await demoUser.save();
        console.log('Updated demo user with isDemo flag');
      }
    } else {
      demoUser = new User({
        email: demoEmail,
        password: 'demo-password-not-used',
        firstName: 'Demo',
        lastName: 'User',
        username: demoUsername,
        theme: 'retro',
        planTier: 'pro',
        projectLimit: 10,
        isDemo: true,
        isAdmin: false,
        tutorialCompleted: false,
        bio: 'Demo account — try the terminal, AI assistant, and explore sample projects. Sign up to create your own!',
        isPublic: true,
        publicSlug: 'demo',
        publicDescription: 'Demo account showcasing Dev Codex features',
        ideas: [
          {
            id: 'idea1',
            title: 'CLI companion tool',
            description: 'Quick-access from the terminal without opening the browser',
            content: 'A lightweight CLI that talks to the Dev Codex API. `dx add todo "fix auth bug"` from the terminal, syncs to the project. Could use Go + BubbleTea for a TUI dashboard view. Start with just add/view commands, expand later.',
            createdAt: new Date('2026-02-20'),
            updatedAt: new Date('2026-02-20')
          },
          {
            id: 'idea2',
            title: 'Weekly digest email',
            description: 'Automated summary of what happened this week',
            content: 'Cron job that runs Sunday night, aggregates: todos completed, devlog entries, time tracked, features added. Sends via Resend. Could include a "streak" counter for consecutive active weeks. Low effort, high perceived value.',
            createdAt: new Date('2026-03-05'),
            updatedAt: new Date('2026-03-05')
          },
          {
            id: 'idea3',
            title: 'Project templates',
            description: 'Save and reuse project structures',
            content: 'Export a project\'s stack + features + empty todos as a "template". Import it into a new project to skip boilerplate setup. Community templates could be shared via the Discover feed. Think: create-next-app but for project management structure.',
            createdAt: new Date('2026-03-12'),
            updatedAt: new Date('2026-03-12')
          }
        ]
      });
      await demoUser.save();
      console.log('✓ Demo user created:', demoEmail);
    }

    const ownerId = demoUser._id;
    const existingProjects = await Project.find({ ownerId });

    if (existingProjects.length > 0 && !forceReseed) {
      console.log(`Demo user has ${existingProjects.length} projects. Use --force to recreate.`);
    } else {
      if (existingProjects.length > 0) {
        await Project.deleteMany({ ownerId });
        console.log(`✓ Deleted ${existingProjects.length} existing demo projects`);
      }

      await seedDemoProjects(ownerId);

      console.log('\n✅ Demo seeded: 3 projects (mid-build, near-done, planning)');
      console.log('  User:', demoEmail, '| ID:', ownerId);
    }

  } catch (error) {
    console.error('Error seeding demo user:', error);
    process.exit(1);
  } finally {
    // Only close connection when run directly as a script
    const isDirectRun = process.argv[1]?.includes('seedDemoUser');
    if (isDirectRun) {
      await mongoose.connection.close();
    }
  }
}

seedDemoUser();

// ── Exported helper: create demo projects for a given user ──────────
// Used by: this script (CLI seed) AND auth.ts (demo login reset)
export async function seedDemoProjects(ownerId: any): Promise<void> {
  // ──────────────────────────────────────────────────────────
  // Project 1: E-Commerce API — mid-build, ~60% complete
  // Shows: rich todos, devlog story, feature graph, deployment
  // ──────────────────────────────────────────────────────────
  const ecommerceApi = new Project({
    name: 'ShopStack API',
    description: 'Headless e-commerce REST API with Stripe payments, inventory management, and order fulfillment',
    color: '#6366F1',
    category: 'general',
    ownerId,
    userId: ownerId,
    status: 'in_progress',
    isPublic: true,
    publicSlug: 'demo-shopstack-api',
    publicDescription: 'Production-grade headless e-commerce API built with Go and PostgreSQL. Stripe integration, JWT auth, full inventory and order management.',
    notes: [
      {
        id: 'n1',
        title: 'Architecture Decision Records',
        description: 'Key technical decisions',
        content: `# Architecture Decisions

## ADR-001: Go over Node.js
Chose Go for the API layer. Reasons:
- Native concurrency (goroutines for webhook processing)
- Single binary deployment, no node_modules
- Strong typing without transpilation step
- Better performance under load for order processing

## ADR-002: PostgreSQL over MongoDB
- Relational data (orders → line_items → products) maps naturally to SQL
- ACID transactions for payment flows (can't have partial order writes)
- JSON columns for flexible product metadata
- pg_trgm for product search without Elasticsearch

## ADR-003: Stripe over custom payment
- PCI compliance handled by Stripe
- Webhook-driven architecture keeps our DB eventually consistent
- Support for subscriptions if we add them later`,
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-10'),
        createdBy: ownerId,
        updatedBy: ownerId
      },
      {
        id: 'n2',
        title: 'API Design Conventions',
        description: 'REST patterns used across all endpoints',
        content: `# API Conventions

## URL Structure
- Collections: \`GET /api/v1/products\`
- Single resource: \`GET /api/v1/products/:id\`
- Nested: \`GET /api/v1/orders/:id/items\`
- Actions: \`POST /api/v1/orders/:id/fulfill\`

## Response Format
\`\`\`json
{
  "data": { ... },
  "meta": { "page": 1, "perPage": 25, "total": 142 }
}
\`\`\`

## Error Format
\`\`\`json
{
  "error": { "code": "PRODUCT_NOT_FOUND", "message": "...", "details": {} }
}
\`\`\`

## Auth
- JWT in Authorization header (Bearer)
- Refresh token rotation (7-day expiry)
- Role-based: admin, merchant, customer`,
        createdAt: new Date('2026-01-20'),
        updatedAt: new Date('2026-02-15'),
        createdBy: ownerId,
        updatedBy: ownerId
      },
      {
        id: 'n3',
        title: 'Stripe Webhook Flow',
        description: 'How payment events flow through the system',
        content: `# Stripe Webhook Processing

## Flow
1. Customer hits checkout → frontend creates PaymentIntent via our API
2. Stripe processes payment → sends webhook to \`/webhooks/stripe\`
3. We verify signature, parse event type
4. Switch on event:
   - \`payment_intent.succeeded\` → mark order as paid, trigger fulfillment
   - \`payment_intent.failed\` → mark order failed, notify customer
   - \`charge.refunded\` → update order status, restock inventory

## Idempotency
- Store processed webhook event IDs in \`stripe_events\` table
- Skip duplicates (Stripe retries on 5xx)
- Use DB transaction: update order + log event atomically

## Testing
- Use Stripe CLI: \`stripe listen --forward-to localhost:8080/webhooks/stripe\`
- Seed test products with known prices for integration tests`,
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-03-05'),
        createdBy: ownerId,
        updatedBy: ownerId
      }
    ],
    todos: [
      {
        id: 't1', title: 'Set up Go project with Gin router', description: 'Init module, folder structure, middleware stack',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-01-15'), updatedAt: new Date('2026-01-18'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't2', title: 'Design PostgreSQL schema', description: 'users, products, orders, line_items, inventory, categories — with migrations',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-01-18'), updatedAt: new Date('2026-01-25'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't3', title: 'JWT auth + refresh token rotation', description: 'Register, login, refresh, logout. bcrypt passwords, role middleware',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-01-22'), updatedAt: new Date('2026-02-02'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't4', title: 'Product CRUD + image uploads', description: 'Full CRUD with S3 presigned URLs for images. Category filtering, search with pg_trgm',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-12'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't5', title: 'Inventory tracking with stock reservations', description: 'Reserve stock on cart add, release on timeout/cancel, decrement on purchase',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-02-08'), updatedAt: new Date('2026-02-18'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't6', title: 'Stripe payment integration', description: 'PaymentIntent creation, webhook handler, refund flow',
        priority: 'high', completed: false, status: 'in_progress',
        dueDate: new Date(Date.now() + 4 * 86400000),
        createdAt: new Date('2026-02-15'), updatedAt: new Date('2026-03-10'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't7', title: 'Order management endpoints', description: 'Create order from cart, list orders, order details, status transitions',
        priority: 'high', completed: false, status: 'in_progress',
        dueDate: new Date(Date.now() + 7 * 86400000),
        createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-03-08'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't8', title: 'Email notifications (order confirmation, shipping)', description: 'Transactional emails via Resend — order placed, shipped, delivered',
        priority: 'medium', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-01'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't9', title: 'Rate limiting + API key auth for merchants', description: 'Per-key rate limits, usage tracking dashboard',
        priority: 'medium', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-05'), updatedAt: new Date('2026-03-05'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't10', title: 'Write integration tests for payment flow', description: 'Stripe test mode, mock webhooks, verify order state transitions',
        priority: 'high', completed: false, status: 'blocked',
        createdAt: new Date('2026-03-08'), updatedAt: new Date('2026-03-10'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't11', title: 'Admin dashboard API endpoints', description: 'Order analytics, revenue reports, product performance metrics',
        priority: 'low', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-10'), updatedAt: new Date('2026-03-10'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't12', title: 'Shipping label generation (EasyPost)', description: 'Generate labels, track packages, delivery webhooks',
        priority: 'medium', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-12'), updatedAt: new Date('2026-03-12'), createdBy: ownerId, updatedBy: ownerId
      }
    ],
    devLog: [
      {
        id: 'd1', title: 'Project Bootstrap',
        description: `Initialized Go module with Gin, GORM, and golang-migrate. Set up folder structure: cmd/, internal/handlers, internal/models, internal/middleware, internal/repository, migrations/. Configured Docker Compose for local Postgres + Redis. First migration creates users table with bcrypt password column.`,
        date: new Date('2026-01-18'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd2', title: 'Auth System Complete',
        description: `Finished JWT auth with refresh token rotation. Access tokens expire in 15min, refresh tokens in 7 days (stored in httpOnly cookie). Added role-based middleware — admin, merchant, customer. Registration sends welcome email via Resend. All 24 auth tests passing.`,
        date: new Date('2026-02-02'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd3', title: 'Product Catalog + Search',
        description: `Built full product CRUD with category tree, variant support (size/color), and S3 image uploads via presigned URLs. Search uses PostgreSQL pg_trgm extension — fast enough for <100k products without needing Elasticsearch. Added cursor-based pagination (no offset skipping issues).`,
        date: new Date('2026-02-12'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd4', title: 'Inventory System with Reservations',
        description: `Implemented stock reservation pattern: adding to cart reserves units (15min TTL via Redis), checkout converts reservation to decrement, timeout/cancel releases back to available. This prevents overselling during flash sales. Learned a lot about distributed locking — went with Redis SETNX for simplicity over Postgres advisory locks.`,
        date: new Date('2026-02-18'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd5', title: 'Stripe Integration Started',
        description: `Set up Stripe in test mode. PaymentIntent creation working — frontend can initiate checkout. Webhook endpoint receives events but processing logic is half-done. Need to handle: payment_intent.succeeded → fulfill order, charge.refunded → restock. The webhook signature verification was tricky — had to use raw body, not parsed JSON.`,
        date: new Date('2026-03-10'), createdBy: ownerId, updatedBy: ownerId
      }
    ],
    stack: [
      { category: 'language', name: 'Go', version: '1.22', description: 'API language' },
      { category: 'framework', name: 'Gin', version: '1.9', description: 'HTTP router + middleware' },
      { category: 'database', name: 'PostgreSQL', version: '16', description: 'Primary data store' },
      { category: 'orm', name: 'GORM', version: '2.x', description: 'ORM + migrations' },
      { category: 'cache', name: 'Redis', version: '7.x', description: 'Stock reservations, sessions' },
      { category: 'payments', name: 'Stripe', version: '', description: 'Payment processing' },
      { category: 'storage', name: 'AWS S3', version: '', description: 'Product images' },
      { category: 'email', name: 'Resend', version: '', description: 'Transactional emails' },
      { category: 'testing', name: 'testify', version: '1.x', description: 'Test assertions + mocks' },
      { category: 'tooling', name: 'Docker', version: '', description: 'Local dev + deployment' }
    ],
    features: [
      {
        id: 'f1', category: 'backend', type: 'middleware', title: 'Auth Middleware',
        content: 'JWT verification, role-based access control (admin/merchant/customer), refresh token rotation with httpOnly cookies.',
        group: 'Authentication', filePath: 'internal/middleware/auth.go', tags: ['auth', 'jwt', 'security'],
        relationships: [
          { id: 'r1', targetId: 'f2', relationType: 'uses', description: 'Queries user repository for role checks' }
        ],
        createdAt: new Date('2026-01-25'), updatedAt: new Date('2026-02-02')
      },
      {
        id: 'f2', category: 'backend', type: 'repository', title: 'User Repository',
        content: 'GORM-based user CRUD with bcrypt password hashing, email uniqueness, and profile updates.',
        group: 'Data Layer', filePath: 'internal/repository/user.go', tags: ['database', 'gorm', 'users'],
        createdAt: new Date('2026-01-20'), updatedAt: new Date('2026-01-28')
      },
      {
        id: 'f3', category: 'backend', type: 'handler', title: 'Product Handler',
        content: 'REST handlers for product CRUD, category filtering, variant management, and full-text search via pg_trgm.',
        group: 'Product Catalog', filePath: 'internal/handlers/product.go', tags: ['api', 'products', 'search'],
        relationships: [
          { id: 'r1', targetId: 'f4', relationType: 'uses', description: 'Queries product repository' },
          { id: 'r2', targetId: 'f6', relationType: 'uses', description: 'Generates presigned URLs for images' }
        ],
        createdAt: new Date('2026-02-05'), updatedAt: new Date('2026-02-12')
      },
      {
        id: 'f4', category: 'backend', type: 'repository', title: 'Product Repository',
        content: 'Product queries with cursor pagination, category tree traversal, and variant stock aggregation.',
        group: 'Data Layer', filePath: 'internal/repository/product.go', tags: ['database', 'gorm', 'products'],
        createdAt: new Date('2026-02-03'), updatedAt: new Date('2026-02-10')
      },
      {
        id: 'f5', category: 'backend', type: 'service', title: 'Inventory Service',
        content: 'Stock reservation system using Redis SETNX for distributed locking. Reserves stock on cart-add (15min TTL), decrements on purchase, releases on timeout.',
        group: 'Inventory', filePath: 'internal/services/inventory.go', tags: ['inventory', 'redis', 'locking'],
        relationships: [
          { id: 'r1', targetId: 'f4', relationType: 'depends_on', description: 'Reads/writes product stock levels' }
        ],
        createdAt: new Date('2026-02-10'), updatedAt: new Date('2026-02-18')
      },
      {
        id: 'f6', category: 'backend', type: 'service', title: 'S3 Upload Service',
        content: 'Generates presigned PUT URLs for direct browser-to-S3 uploads. Validates file type/size, generates thumbnails via Lambda trigger.',
        group: 'Storage', filePath: 'internal/services/s3.go', tags: ['aws', 's3', 'uploads'],
        createdAt: new Date('2026-02-08'), updatedAt: new Date('2026-02-12')
      },
      {
        id: 'f7', category: 'backend', type: 'handler', title: 'Stripe Webhook Handler',
        content: 'Receives Stripe webhook events, verifies signatures, processes payment successes/failures/refunds. Idempotent via event ID deduplication.',
        group: 'Payments', filePath: 'internal/handlers/stripe_webhook.go', tags: ['stripe', 'webhooks', 'payments'],
        relationships: [
          { id: 'r1', targetId: 'f8', relationType: 'uses', description: 'Updates order status on payment events' },
          { id: 'r2', targetId: 'f5', relationType: 'uses', description: 'Restocks inventory on refunds' }
        ],
        createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-10')
      },
      {
        id: 'f8', category: 'backend', type: 'handler', title: 'Order Handler',
        content: 'Order creation from cart, status transitions (pending→paid→shipped→delivered), order history with filtering.',
        group: 'Orders', filePath: 'internal/handlers/order.go', tags: ['orders', 'api', 'state-machine'],
        relationships: [
          { id: 'r1', targetId: 'f5', relationType: 'depends_on', description: 'Converts stock reservations to decrements' },
          { id: 'r2', targetId: 'f1', relationType: 'depends_on', description: 'Requires authenticated user' }
        ],
        createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-03-08')
      }
    ],
    deploymentData: {
      liveUrl: '',
      githubRepo: 'https://github.com/demo/shopstack-api',
      deploymentPlatform: 'Railway',
      deploymentStatus: 'inactive',
      buildCommand: 'go build -o bin/server cmd/server/main.go',
      startCommand: './bin/server',
      deploymentBranch: 'main',
      environmentVariables: [
        { key: 'DATABASE_URL', value: '***' },
        { key: 'REDIS_URL', value: '***' },
        { key: 'STRIPE_SECRET_KEY', value: '***' },
        { key: 'STRIPE_WEBHOOK_SECRET', value: '***' },
        { key: 'AWS_S3_BUCKET', value: 'shopstack-product-images' }
      ],
      notes: 'Not deployed yet — finishing payment integration first. Will deploy to Railway with managed Postgres addon.'
    }
  });

  await ecommerceApi.save();
  console.log('✓ Created project: ShopStack API');

  // ──────────────────────────────────────────────────────────
  // Project 2: Portfolio Site — near-complete, polish phase
  // Shows: mostly done todos, clean devlog, simple stack
  // ──────────────────────────────────────────────────────────
  const portfolioSite = new Project({
    name: 'Portfolio v3',
    description: 'Personal developer portfolio with blog, project showcase, and contact form',
    color: '#EC4899',
    category: 'general',
    ownerId,
    userId: ownerId,
    status: 'active',
    isPublic: true,
    publicSlug: 'demo-portfolio-v3',
    publicDescription: 'Modern portfolio site built with Next.js 14 and Tailwind. Markdown blog, project cards with live links, dark mode, and perfect Lighthouse scores.',
    notes: [
      {
        id: 'n1',
        title: 'Content Plan',
        description: 'What to include on the portfolio',
        content: `# Portfolio Content

## Hero Section
- Name, title ("Full-Stack Developer"), short tagline
- Links: GitHub, LinkedIn, email
- Subtle animation (fade-in, not distracting)

## Projects Section
- 4-6 best projects with screenshots
- Each card: title, description, tech tags, live link, source link
- Filter by tech stack

## Blog
- MDX files in /content/blog/
- Topics: things I've learned, project deep-dives, tutorials
- RSS feed for discoverability

## About
- Short bio, self-taught path into development
- Skills grid with proficiency levels
- Currently learning section

## Contact
- Simple form → Resend API (no backend needed with Next.js API routes)
- Rate limited to prevent spam`,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-20'),
        createdBy: ownerId,
        updatedBy: ownerId
      }
    ],
    todos: [
      {
        id: 't1', title: 'Set up Next.js 14 with App Router', description: '',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-02-05'), updatedAt: new Date('2026-02-06'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't2', title: 'Design system — colors, typography, spacing', description: 'Tailwind config, CSS variables for dark/light mode',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-02-06'), updatedAt: new Date('2026-02-08'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't3', title: 'Hero section + navigation', description: 'Responsive nav, hero with animated gradient, social links',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-02-08'), updatedAt: new Date('2026-02-12'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't4', title: 'Project showcase cards', description: 'Filterable grid, hover effects, tech stack tags',
        priority: 'high', completed: true, status: 'completed',
        createdAt: new Date('2026-02-10'), updatedAt: new Date('2026-02-15'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't5', title: 'MDX blog with syntax highlighting', description: 'contentlayer for MDX parsing, rehype-pretty-code for code blocks',
        priority: 'medium', completed: true, status: 'completed',
        createdAt: new Date('2026-02-12'), updatedAt: new Date('2026-02-20'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't6', title: 'Contact form with Resend', description: 'API route, rate limiting, validation, success/error states',
        priority: 'medium', completed: true, status: 'completed',
        createdAt: new Date('2026-02-18'), updatedAt: new Date('2026-02-25'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't7', title: 'Dark mode toggle', description: 'System preference detection + manual toggle, persist in localStorage',
        priority: 'medium', completed: true, status: 'completed',
        createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-02-22'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't8', title: 'SEO + meta tags + OG images', description: 'Dynamic OG images with @vercel/og, sitemap, robots.txt',
        priority: 'medium', completed: true, status: 'completed',
        createdAt: new Date('2026-02-22'), updatedAt: new Date('2026-03-01'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't9', title: 'Lighthouse audit — hit 100/100/100/100', description: 'Fix any performance, a11y, best practices, or SEO issues',
        priority: 'high', completed: false, status: 'in_progress',
        dueDate: new Date(Date.now() + 2 * 86400000),
        createdAt: new Date('2026-03-05'), updatedAt: new Date('2026-03-15'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't10', title: 'Add RSS feed for blog', description: 'Generate at build time, link in <head>',
        priority: 'low', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-10'), updatedAt: new Date('2026-03-10'), createdBy: ownerId, updatedBy: ownerId
      }
    ],
    devLog: [
      {
        id: 'd1', title: 'Scaffold + Design System',
        description: `Created Next.js 14 project with App Router. Set up Tailwind with custom theme — two palettes (light/dark) using CSS variables so they work with Tailwind's dark: prefix. Typography scale based on system fonts with Inter as fallback.`,
        date: new Date('2026-02-08'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd2', title: 'Core Pages Done',
        description: `Hero, projects grid, about section, and contact form all responsive and working. The project cards use framer-motion for hover effects — subtle scale + shadow that feels premium without being distracting. Contact form hits a Next.js API route that forwards to Resend.`,
        date: new Date('2026-02-20'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd3', title: 'Blog System Working',
        description: `MDX blog is live. Using contentlayer to parse .mdx files from /content/blog/ into typed objects. Code blocks use rehype-pretty-code with the Vitesse Dark theme. Added reading time calculation and prev/next navigation. Pretty happy with the DX — just drop a .mdx file and it appears.`,
        date: new Date('2026-02-25'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 'd4', title: 'SEO + OG Images',
        description: `Generated dynamic OG images using @vercel/og — each blog post gets a unique social preview with title and date. Added JSON-LD structured data, sitemap.xml generation, and proper meta tags. Google Search Console verified.`,
        date: new Date('2026-03-01'), createdBy: ownerId, updatedBy: ownerId
      }
    ],
    stack: [
      { category: 'framework', name: 'Next.js', version: '14', description: 'React framework with SSR/SSG' },
      { category: 'language', name: 'TypeScript', version: '5.x', description: 'Type safety' },
      { category: 'styling', name: 'Tailwind CSS', version: '3.4', description: 'Utility-first CSS' },
      { category: 'content', name: 'MDX', version: '', description: 'Markdown + JSX for blog' },
      { category: 'animation', name: 'Framer Motion', version: '11', description: 'Page transitions + hover effects' },
      { category: 'email', name: 'Resend', version: '', description: 'Contact form emails' },
      { category: 'hosting', name: 'Vercel', version: '', description: 'Edge deployment' }
    ],
    features: [
      {
        id: 'f1', category: 'frontend', type: 'page', title: 'Home / Hero',
        content: 'Landing page with animated gradient background, name, title, social links, and scroll-to-projects CTA.',
        group: 'Pages', filePath: 'app/page.tsx', tags: ['landing', 'hero', 'animation'],
        relationships: [
          { id: 'r1', targetId: 'f2', relationType: 'uses', description: 'Links to project cards section' }
        ],
        createdAt: new Date('2026-02-10'), updatedAt: new Date('2026-02-15')
      },
      {
        id: 'f2', category: 'frontend', type: 'component', title: 'ProjectCard',
        content: 'Card with screenshot thumbnail, title, description, tech tags, and links to live site + source. Framer Motion hover scale.',
        group: 'Components', filePath: 'components/ProjectCard.tsx', tags: ['ui', 'projects', 'card'],
        createdAt: new Date('2026-02-12'), updatedAt: new Date('2026-02-15')
      },
      {
        id: 'f3', category: 'frontend', type: 'page', title: 'Blog Index',
        content: 'Lists all blog posts sorted by date. Shows title, excerpt, reading time, and tags. Search/filter by tag.',
        group: 'Blog', filePath: 'app/blog/page.tsx', tags: ['blog', 'mdx', 'content'],
        relationships: [
          { id: 'r1', targetId: 'f4', relationType: 'uses', description: 'Renders individual post pages' }
        ],
        createdAt: new Date('2026-02-18'), updatedAt: new Date('2026-02-25')
      },
      {
        id: 'f4', category: 'frontend', type: 'page', title: 'Blog Post',
        content: 'Individual post page with MDX rendering, syntax-highlighted code blocks, table of contents, and prev/next navigation.',
        group: 'Blog', filePath: 'app/blog/[slug]/page.tsx', tags: ['blog', 'mdx', 'syntax-highlighting'],
        createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-02-25')
      },
      {
        id: 'f5', category: 'backend', type: 'api', title: 'Contact API Route',
        content: 'Next.js API route that validates form input, rate-limits by IP (5/hour), and sends email via Resend SDK.',
        group: 'API', filePath: 'app/api/contact/route.ts', tags: ['api', 'email', 'rate-limit'],
        createdAt: new Date('2026-02-22'), updatedAt: new Date('2026-02-25')
      }
    ],
    deploymentData: {
      liveUrl: 'https://demo-portfolio.vercel.app',
      githubRepo: 'https://github.com/demo/portfolio-v3',
      deploymentPlatform: 'Vercel',
      deploymentStatus: 'active',
      buildCommand: 'next build',
      startCommand: 'next start',
      lastDeployDate: new Date('2026-03-01'),
      deploymentBranch: 'main',
      environmentVariables: [
        { key: 'RESEND_API_KEY', value: '***' }
      ],
      notes: 'Auto-deploys on push to main. Preview deploys for PRs. Edge runtime for API routes.'
    }
  });

  await portfolioSite.save();
  console.log('✓ Created project: Portfolio v3');

  // ──────────────────────────────────────────────────────────
  // Project 3: Mobile App — planning phase
  // Shows: requirements in notes, all todos not-started, no devlog
  // ──────────────────────────────────────────────────────────
  const budgetApp = new Project({
    name: 'Splitwise Clone',
    description: 'Group expense splitting app with real-time sync, receipt scanning, and settlement suggestions',
    color: '#10B981',
    category: 'general',
    ownerId,
    userId: ownerId,
    status: 'planning',
    isPublic: true,
    publicSlug: 'demo-splitwise-clone',
    publicDescription: 'React Native expense-splitting app for groups. OCR receipt scanning, real-time balance sync, smart settlement suggestions.',
    notes: [
      {
        id: 'n1',
        title: 'MVP Feature Scope',
        description: 'What to build first',
        content: `# MVP Scope

## Must Have (v1)
- Create/join groups (invite link)
- Add expenses with split options (equal, exact, percentage)
- Real-time balance calculation ("you owe Alex $23.50")
- Settlement suggestions (minimize total transactions)
- Push notifications for new expenses
- Offline-first with sync when reconnected

## Nice to Have (v1.1)
- Receipt photo → OCR → auto-fill amount + description
- Recurring expenses (rent, utilities)
- Export to CSV/PDF
- Currency conversion for travel groups

## Out of Scope (v2+)
- Payment integration (Venmo/PayPal API)
- Budget tracking / spending categories
- Shared shopping lists`,
        createdAt: new Date('2026-03-10'),
        updatedAt: new Date('2026-03-15'),
        createdBy: ownerId,
        updatedBy: ownerId
      },
      {
        id: 'n2',
        title: 'Tech Stack Decision',
        description: 'Why these choices',
        content: `# Tech Stack Rationale

## React Native + Expo
- Already know React, minimal new surface area
- Expo Router for file-based navigation (familiar from Next.js)
- EAS Build for app store submissions without Xcode/Android Studio hassle

## Supabase (Backend)
- Postgres + real-time subscriptions = perfect for live balance updates
- Row Level Security handles auth without custom middleware
- Edge Functions for settlement algorithm (compute-heavy)
- Free tier generous enough for MVP testing

## Zustand + MMKV
- Zustand for in-memory state (current group, UI state)
- MMKV for offline persistence (way faster than AsyncStorage)
- Sync queue: offline mutations stored in MMKV, replayed on reconnect

## OCR (v1.1)
- Google ML Kit (on-device, no API costs)
- Fallback: Tesseract.js if ML Kit is flaky`,
        createdAt: new Date('2026-03-12'),
        updatedAt: new Date('2026-03-16'),
        createdBy: ownerId,
        updatedBy: ownerId
      }
    ],
    todos: [
      {
        id: 't1', title: 'Initialize Expo project with Expo Router', description: 'File-based routing, TypeScript, ESLint, Prettier',
        priority: 'high', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-14'), updatedAt: new Date('2026-03-14'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't2', title: 'Set up Supabase project + schema', description: 'Tables: users, groups, group_members, expenses, expense_splits. RLS policies',
        priority: 'high', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-14'), updatedAt: new Date('2026-03-14'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't3', title: 'Auth flow — email + Google OAuth', description: 'Supabase Auth with deep link handling for OAuth redirect',
        priority: 'high', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-14'), updatedAt: new Date('2026-03-14'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't4', title: 'Group CRUD + invite link generation', description: 'Create group, generate shareable invite link, join via link',
        priority: 'high', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't5', title: 'Add expense screen with split options', description: 'Equal / exact / percentage split, multi-payer support',
        priority: 'high', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't6', title: 'Balance calculation + settlement algorithm', description: 'Net balance per member, minimize-transactions algorithm (greedy approach)',
        priority: 'high', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't7', title: 'Real-time sync with Supabase subscriptions', description: 'Subscribe to expense changes, update balances live',
        priority: 'medium', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-16'), updatedAt: new Date('2026-03-16'), createdBy: ownerId, updatedBy: ownerId
      },
      {
        id: 't8', title: 'Offline-first with MMKV sync queue', description: 'Queue mutations when offline, replay on reconnect, handle conflicts',
        priority: 'medium', completed: false, status: 'not_started',
        createdAt: new Date('2026-03-16'), updatedAt: new Date('2026-03-16'), createdBy: ownerId, updatedBy: ownerId
      }
    ],
    devLog: [],
    stack: [
      { category: 'framework', name: 'React Native', version: '0.74', description: 'Cross-platform mobile' },
      { category: 'tooling', name: 'Expo', version: '51', description: 'Build toolchain + router' },
      { category: 'backend', name: 'Supabase', version: '', description: 'Postgres + Auth + Realtime' },
      { category: 'state', name: 'Zustand', version: '4.x', description: 'Client state management' },
      { category: 'storage', name: 'MMKV', version: '2.x', description: 'Fast offline persistence' },
      { category: 'language', name: 'TypeScript', version: '5.x', description: 'Type safety' }
    ],
    features: [
      {
        id: 'f1', category: 'frontend', type: 'screen', title: 'Group Dashboard',
        content: 'Main screen showing all groups with total balance per group. Pull-to-refresh, group avatars, "you owe" / "you are owed" summary.',
        group: 'Screens', filePath: 'app/(tabs)/groups.tsx', tags: ['screen', 'groups', 'dashboard'],
        relationships: [
          { id: 'r1', targetId: 'f2', relationType: 'uses', description: 'Navigates to group detail' }
        ],
        createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15')
      },
      {
        id: 'f2', category: 'frontend', type: 'screen', title: 'Group Detail',
        content: 'Expense list for a group with running balances. "Add Expense" FAB, member list, settle-up button.',
        group: 'Screens', filePath: 'app/group/[id].tsx', tags: ['screen', 'expenses', 'detail'],
        relationships: [
          { id: 'r1', targetId: 'f3', relationType: 'uses', description: 'Opens add expense modal' },
          { id: 'r2', targetId: 'f4', relationType: 'uses', description: 'Calls settlement algorithm' }
        ],
        createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15')
      },
      {
        id: 'f3', category: 'frontend', type: 'screen', title: 'Add Expense',
        content: 'Form for logging a new expense. Amount, description, payer selection, split method (equal/exact/percentage), date picker.',
        group: 'Screens', filePath: 'app/group/[id]/add-expense.tsx', tags: ['screen', 'form', 'expense'],
        createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-03-15')
      },
      {
        id: 'f4', category: 'backend', type: 'function', title: 'Settlement Algorithm',
        content: 'Supabase Edge Function that calculates minimum transactions to settle all debts in a group. Greedy approach: pair largest debtor with largest creditor.',
        group: 'Business Logic', filePath: 'supabase/functions/settle/index.ts', tags: ['algorithm', 'edge-function', 'payments'],
        createdAt: new Date('2026-03-16'), updatedAt: new Date('2026-03-16')
      },
      {
        id: 'f5', category: 'backend', type: 'schema', title: 'Database Schema',
        content: 'Supabase Postgres schema: users, groups, group_members (with roles), expenses, expense_splits. RLS policies ensure users only see their groups.',
        group: 'Data Layer', filePath: 'supabase/migrations/001_initial.sql', tags: ['database', 'postgres', 'rls'],
        relationships: [
          { id: 'r1', targetId: 'f4', relationType: 'depends_on', description: 'Settlement queries expense data' }
        ],
        createdAt: new Date('2026-03-14'), updatedAt: new Date('2026-03-14')
      }
    ],
    deploymentData: {
      liveUrl: '',
      githubRepo: '',
      deploymentPlatform: 'Expo EAS',
      deploymentStatus: 'inactive',
      buildCommand: 'eas build --platform all',
      startCommand: 'expo start',
      deploymentBranch: 'main',
      environmentVariables: [
        { key: 'EXPO_PUBLIC_SUPABASE_URL', value: 'https://xxx.supabase.co' },
        { key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', value: '***' }
      ],
      notes: 'Not started yet. Will use EAS Build for TestFlight/Play Store internal testing.'
    }
  });

  await budgetApp.save();
  console.log('✓ Created project: Splitwise Clone');
}
