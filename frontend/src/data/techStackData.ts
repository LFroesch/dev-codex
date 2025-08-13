// frontend/src/data/techStackData.ts

export interface TechOption {
  name: string;
  description: string;
  popularity: 'high' | 'medium' | 'low';
  latestVersion?: string;
  url?: string;
  platforms?: ('web' | 'mobile' | 'desktop')[];
}

export interface TechCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  options: TechOption[];
}

export const STACK_CATEGORIES: TechCategory[] = [
  {
    id: 'frontend-framework',
    name: 'Frontend Framework',
    emoji: '⚛️',
    color: '#61DAFB',
    description: 'Core framework for building your user interface',
    options: [
      {
        name: 'React',
        description: 'Most popular library for building UIs with components',
        popularity: 'high',
        latestVersion: '18.2',
        url: 'https://reactjs.org',
        platforms: ['web']
      },
      {
        name: 'Vue.js',
        description: 'Progressive framework that\'s beginner-friendly',
        popularity: 'high',
        latestVersion: '3.4',
        url: 'https://vuejs.org',
        platforms: ['web']
      },
      {
        name: 'Angular',
        description: 'Full-featured framework with TypeScript built-in',
        popularity: 'high',
        latestVersion: '17.0',
        url: 'https://angular.io',
        platforms: ['web']
      },
      {
        name: 'Svelte',
        description: 'Compiler-based framework with minimal runtime',
        popularity: 'medium',
        latestVersion: '4.2',
        url: 'https://svelte.dev',
        platforms: ['web']
      },
    ]
  },
  {
    id: 'meta-framework',
    name: 'Meta Framework',
    emoji: '🚀',
    color: '#000000',
    description: 'Full-stack frameworks that handle routing, SSR, and more',
    options: [
      {
        name: 'Next.js',
        description: 'Most popular React meta-framework with great DX',
        popularity: 'high',
        latestVersion: '14.0',
        url: 'https://nextjs.org',
        platforms: ['web']
      },
      {
        name: 'Nuxt',
        description: 'Vue.js meta-framework with automatic routing',
        popularity: 'medium',
        latestVersion: '3.8',
        url: 'https://nuxt.com',
        platforms: ['web']
      },
      {
        name: 'SvelteKit',
        description: 'Official Svelte framework with file-based routing',
        popularity: 'medium',
        latestVersion: '1.27',
        url: 'https://kit.svelte.dev',
        platforms: ['web']
      },
      {
        name: 'Remix',
        description: 'React framework focused on web standards',
        popularity: 'medium',
        latestVersion: '2.4',
        url: 'https://remix.run',
        platforms: ['web']
      },
      {
        name: 'Astro',
        description: 'Static site generator with component islands',
        popularity: 'medium',
        latestVersion: '4.0',
        url: 'https://astro.build',
        platforms: ['web']
      },
      {
        name: 'Gatsby',
        description: 'React-based static site generator',
        popularity: 'medium',
        latestVersion: '5.12',
        url: 'https://gatsbyjs.com',
        platforms: ['web']
      },
      {
        name: 'Vite + SSG',
        description: 'Fast static site generation with Vite',
        popularity: 'medium',
        latestVersion: '5.0',
        url: 'https://vitejs.dev/guide/static-deploy.html',
        platforms: ['web']
      },
      {
        name: 'Eleventy (11ty)',
        description: 'Simple static site generator with flexible templating',
        popularity: 'medium',
        latestVersion: '2.0',
        url: 'https://11ty.dev',
        platforms: ['web']
      },
      {
        name: 'T3 Stack',
        description: 'Full-stack TypeScript with Next.js, Prisma, tRPC',
        popularity: 'medium',
        latestVersion: '7.25',
        url: 'https://create.t3.gg',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'ui-library',
    name: 'UI Component Library',
    emoji: '🧩',
    color: '#EC4899',
    description: 'Pre-built components to speed up UI development',
    options: [
      {
        name: 'Material-UI (MUI)',
        description: 'Google Material Design components for React',
        popularity: 'high',
        latestVersion: '5.15',
        url: 'https://mui.com',
        platforms: ['web']
      },
      {
        name: 'Ant Design',
        description: 'Enterprise-grade UI components for React',
        popularity: 'high',
        latestVersion: '5.12',
        url: 'https://ant.design',
        platforms: ['web']
      },
      {
        name: 'Chakra UI',
        description: 'Simple and modular React component library',
        popularity: 'high',
        latestVersion: '2.8',
        url: 'https://chakra-ui.com',
        platforms: ['web']
      },
      {
        name: 'shadcn/ui',
        description: 'Copy-paste components built with Radix and Tailwind',
        popularity: 'high',
        latestVersion: '0.8',
        url: 'https://ui.shadcn.com',
        platforms: ['web']
      },
      {
        name: 'Mantine',
        description: 'Full-featured React components and hooks',
        popularity: 'medium',
        latestVersion: '7.4',
        url: 'https://mantine.dev',
        platforms: ['web']
      },
      {
        name: 'Headless UI',
        description: 'Unstyled, accessible components for React/Vue',
        popularity: 'medium',
        latestVersion: '1.7',
        url: 'https://headlessui.com',
        platforms: ['web']
      },
      {
        name: 'Vuetify',
        description: 'Material Design components for Vue.js',
        popularity: 'medium',
        latestVersion: '3.4',
        url: 'https://vuetifyjs.com',
        platforms: ['web']
      },
      {
        name: 'PrimeNG',
        description: 'Rich UI components for Angular',
        popularity: 'medium',
        latestVersion: '17.0',
        url: 'https://primeng.org',
        platforms: ['web']
      },
      {
        name: 'Radix UI',
        description: 'Low-level accessible components for design systems',
        popularity: 'high',
        latestVersion: '1.0',
        url: 'https://radix-ui.com',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'styling',
    name: 'Styling Solution',
    emoji: '🎨',
    color: '#EF4444',
    description: 'How you write and organize your CSS',
    options: [
      {
        name: 'Tailwind CSS',
        description: 'Most popular utility-first CSS framework',
        popularity: 'high',
        latestVersion: '3.4',
        url: 'https://tailwindcss.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'CSS Modules',
        description: 'Locally scoped CSS to avoid naming conflicts',
        popularity: 'high',
        latestVersion: '4.3',
        url: 'https://github.com/css-modules/css-modules',
        platforms: ['web']
      },
      {
        name: 'Styled Components',
        description: 'CSS-in-JS library for styling React components',
        popularity: 'high',
        latestVersion: '6.1',
        url: 'https://styled-components.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Emotion',
        description: 'Performant and flexible CSS-in-JS library',
        popularity: 'medium',
        latestVersion: '11.11',
        url: 'https://emotion.sh',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Sass/SCSS',
        description: 'CSS preprocessor with variables and nesting',
        popularity: 'high',
        latestVersion: '1.69',
        url: 'https://sass-lang.com',
        platforms: ['web']
      },
      {
        name: 'PostCSS',
        description: 'Tool for transforming CSS with JavaScript plugins',
        popularity: 'high',
        latestVersion: '8.4',
        url: 'https://postcss.org',
        platforms: ['web']
      },
      {
        name: 'Vanilla Extract',
        description: 'Zero-runtime CSS-in-JS with full type safety',
        popularity: 'medium',
        latestVersion: '1.14',
        url: 'https://vanilla-extract.style',
        platforms: ['web']
      },
      {
        name: 'Bootstrap',
        description: 'Most popular CSS framework worldwide',
        popularity: 'high',
        latestVersion: '5.3',
        url: 'https://getbootstrap.com',
        platforms: ['web']
      },
      {
        name: 'DaisyUI',
        description: 'Tailwind CSS component library',
        popularity: 'high',
        latestVersion: '4.12',
        url: 'https://daisyui.com',
        platforms: ['web']
      },
      {
        name: 'Bulma',
        description: 'Modern CSS framework based on Flexbox',
        popularity: 'medium',
        latestVersion: '0.9.4',
        url: 'https://bulma.io',
        platforms: ['web']
      },
    ]
  },
  {
    id: 'backend-language',
    name: 'Backend Language',
    emoji: '🖥️',
    color: '#4B5563',
    description: 'Programming language and runtime for your server',
    options: [
      {
        name: 'Node.js',
        description: 'JavaScript runtime - same language as frontend',
        popularity: 'high',
        latestVersion: '21.2',
        url: 'https://nodejs.org',
        platforms: ['web']
      },
      {
        name: 'Python',
        description: 'Beginner-friendly with great libraries',
        popularity: 'high',
        latestVersion: '3.12',
        url: 'https://python.org',
        platforms: ['web']
      },
      {
        name: 'PHP',
        description: 'Popular for web development with lots of hosting',
        popularity: 'high',
        latestVersion: '8.3',
        url: 'https://php.net',
        platforms: ['web']
      },
      {
        name: 'Go',
        description: 'Fast, simple language built by Google',
        popularity: 'medium',
        latestVersion: '1.21',
        url: 'https://golang.org',
        platforms: ['web']
      },
      {
        name: 'Rust',
        description: 'Extremely fast and memory-safe systems language',
        popularity: 'medium',
        latestVersion: '1.75',
        url: 'https://rust-lang.org',
        platforms: ['web']
      },
      {
        name: 'Java',
        description: 'Enterprise-grade language with strong ecosystem',
        popularity: 'medium',
        latestVersion: '21',
        url: 'https://java.com',
        platforms: ['web']
      },
      {
        name: 'C#/.NET',
        description: 'Microsoft\'s modern, cross-platform framework',
        popularity: 'medium',
        latestVersion: '8.0',
        url: 'https://dotnet.microsoft.com',
        platforms: ['web', 'desktop']
      },
    ]
  },
  {
    id: 'backend-framework',
    name: 'Backend Framework',
    emoji: '⚙️',
    color: '#8B5CF6',
    description: 'Framework to build your API and server logic',
    options: [
      {
        name: 'Express.js',
        description: 'Most popular Node.js framework - minimal and flexible',
        popularity: 'high',
        latestVersion: '4.18',
        url: 'https://expressjs.com',
        platforms: ['web']
      },
      {
        name: 'Fastify',
        description: 'Faster Node.js alternative to Express',
        popularity: 'medium',
        latestVersion: '4.24',
        url: 'https://fastify.dev',
        platforms: ['web']
      },
      {
        name: 'NestJS',
        description: 'Enterprise Node.js framework with TypeScript',
        popularity: 'high',
        latestVersion: '10.2',
        url: 'https://nestjs.com',
        platforms: ['web']
      },
      {
        name: 'Django',
        description: 'Full-featured Python framework with admin panel',
        popularity: 'high',
        latestVersion: '5.0',
        url: 'https://djangoproject.com',
        platforms: ['web']
      },
      {
        name: 'FastAPI',
        description: 'Modern Python framework with automatic API docs',
        popularity: 'high',
        latestVersion: '0.104',
        url: 'https://fastapi.tiangolo.com',
        platforms: ['web']
      },
      {
        name: 'Flask',
        description: 'Lightweight Python framework for simple APIs',
        popularity: 'medium',
        latestVersion: '3.0',
        url: 'https://flask.palletsprojects.com',
        platforms: ['web']
      },
      {
        name: 'Laravel',
        description: 'Full-featured PHP framework with great tooling',
        popularity: 'high',
        latestVersion: '10.40',
        url: 'https://laravel.com',
        platforms: ['web']
      },
      {
        name: 'Ruby on Rails',
        description: 'Convention-over-configuration Ruby framework',
        popularity: 'medium',
        latestVersion: '7.1',
        url: 'https://rubyonrails.org',
        platforms: ['web']
      },
      {
        name: 'Spring Boot',
        description: 'Popular Java framework for enterprise apps',
        popularity: 'medium',
        latestVersion: '3.2',
        url: 'https://spring.io/projects/spring-boot',
        platforms: ['web']
      },
      {
        name: 'Hono',
        description: 'Fast, lightweight web framework for edge',
        popularity: 'medium',
        latestVersion: '3.12',
        url: 'https://hono.dev',
        platforms: ['web']
      },
      {
        name: 'Koa.js',
        description: 'Next generation framework by Express team',
        popularity: 'medium',
        latestVersion: '2.14',
        url: 'https://koajs.com',
        platforms: ['web']
      },
      {
        name: 'Gin',
        description: 'High-performance HTTP web framework for Go',
        popularity: 'medium',
        latestVersion: '1.9',
        url: 'https://gin-gonic.com',
        platforms: ['web']
      },
    ]
  },
  {
    id: 'database',
    name: 'Database',
    emoji: '🗄️',
    color: '#3B82F6',
    description: 'Where you store and manage your data',
    options: [
      {
        name: 'PostgreSQL',
        description: 'Most popular open-source SQL database',
        popularity: 'high',
        latestVersion: '16.0',
        url: 'https://postgresql.org',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'MySQL',
        description: 'Widely used SQL database with great hosting support',
        popularity: 'high',
        latestVersion: '8.2',
        url: 'https://mysql.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'MongoDB',
        description: 'Popular NoSQL database for flexible data',
        popularity: 'high',
        latestVersion: '7.0',
        url: 'https://mongodb.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'SQLite',
        description: 'Lightweight file-based database perfect for small apps',
        popularity: 'medium',
        latestVersion: '3.44',
        url: 'https://sqlite.org',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Redis',
        description: 'In-memory database for caching and sessions',
        popularity: 'high',
        latestVersion: '7.2',
        url: 'https://redis.io',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Supabase',
        description: 'PostgreSQL with real-time features and auth',
        popularity: 'high',
        latestVersion: '2.38',
        url: 'https://supabase.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Firebase Firestore',
        description: 'Google\'s NoSQL database with real-time sync',
        popularity: 'high',
        latestVersion: '10.7',
        url: 'https://firebase.google.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'PlanetScale',
        description: 'Serverless MySQL with branching like Git',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://planetscale.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Neon',
        description: 'Serverless PostgreSQL with branching',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://neon.tech',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Turso',
        description: 'Edge SQLite database with global replication',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://turso.tech',
        platforms: ['web', 'mobile']
      },
      {
        name: 'DynamoDB',
        description: 'Amazon\'s fast NoSQL database service',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://aws.amazon.com/dynamodb',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'database-orm',
    name: 'Database ORM/Client',
    emoji: '🔗',
    color: '#F59E0B',
    description: 'Tool to interact with your database from code',
    options: [
      {
        name: 'Prisma',
        description: 'Most popular TypeScript ORM with great tooling',
        popularity: 'high',
        latestVersion: '5.7',
        url: 'https://prisma.io',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Drizzle ORM',
        description: 'Lightweight TypeScript ORM with SQL-like syntax',
        popularity: 'medium',
        latestVersion: '0.29',
        url: 'https://orm.drizzle.team',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Mongoose',
        description: 'MongoDB object modeling for Node.js',
        popularity: 'high',
        latestVersion: '8.0',
        url: 'https://mongoosejs.com',
        platforms: ['web']
      },
      {
        name: 'Sequelize',
        description: 'Popular SQL ORM for Node.js',
        popularity: 'medium',
        latestVersion: '6.35',
        url: 'https://sequelize.org',
        platforms: ['web']
      },
      {
        name: 'TypeORM',
        description: 'ORM that works with TypeScript and JavaScript',
        popularity: 'medium',
        latestVersion: '0.3',
        url: 'https://typeorm.io',
        platforms: ['web']
      },
      {
        name: 'Knex.js',
        description: 'SQL query builder for Node.js',
        popularity: 'medium',
        latestVersion: '3.1',
        url: 'https://knexjs.org',
        platforms: ['web']
      },
      {
        name: 'Supabase JS',
        description: 'JavaScript client for Supabase',
        popularity: 'high',
        latestVersion: '2.38',
        url: 'https://supabase.com/docs/reference/javascript',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Firebase SDK',
        description: 'Official Firebase JavaScript SDK',
        popularity: 'high',
        latestVersion: '10.7',
        url: 'https://firebase.google.com/docs/web/setup',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'mobile-framework',
    name: 'Mobile Framework',
    emoji: '📱',
    color: '#EF4444',
    description: 'Framework for building mobile apps',
    options: [
      {
        name: 'React Native',
        description: 'Use React to build native iOS and Android apps',
        popularity: 'high',
        latestVersion: '0.73',
        url: 'https://reactnative.dev',
        platforms: ['mobile']
      },
      {
        name: 'Expo',
        description: 'Easiest way to build React Native apps',
        popularity: 'high',
        latestVersion: '50.0',
        url: 'https://expo.dev',
        platforms: ['mobile']
      },
      {
        name: 'Flutter',
        description: 'Google\'s framework using Dart language',
        popularity: 'high',
        latestVersion: '3.16',
        url: 'https://flutter.dev',
        platforms: ['mobile', 'desktop', 'web']
      },
      {
        name: 'Ionic',
        description: 'Build mobile apps with web technologies',
        popularity: 'medium',
        latestVersion: '7.6',
        url: 'https://ionicframework.com',
        platforms: ['mobile', 'web']
      },
      {
        name: 'Capacitor',
        description: 'Turn web apps into native mobile apps',
        popularity: 'medium',
        latestVersion: '5.5',
        url: 'https://capacitorjs.com',
        platforms: ['mobile']
      },
      {
        name: 'Quasar',
        description: 'Vue.js based framework for cross-platform apps',
        popularity: 'medium',
        latestVersion: '2.14',
        url: 'https://quasar.dev',
        platforms: ['web', 'mobile', 'desktop']
      }
    ]
  },
  {
    id: 'desktop-framework',
    name: 'Desktop Framework',
    emoji: '💻',
    color: '#14B8A6',
    description: 'Framework for building desktop applications',
    options: [
      {
        name: 'Electron',
        description: 'Build desktop apps with HTML, CSS, JavaScript',
        popularity: 'high',
        latestVersion: '28.0',
        url: 'https://electronjs.org',
        platforms: ['desktop']
      },
      {
        name: 'Tauri',
        description: 'Smaller, faster desktop apps with Rust backend',
        popularity: 'medium',
        latestVersion: '1.5',
        url: 'https://tauri.app',
        platforms: ['desktop']
      },
      {
        name: '.NET MAUI',
        description: 'Microsoft\'s framework for cross-platform apps',
        popularity: 'medium',
        latestVersion: '8.0',
        url: 'https://dotnet.microsoft.com/apps/maui',
        platforms: ['desktop', 'mobile']
      },
      {
        name: 'Flutter Desktop',
        description: 'Use Flutter to build desktop applications',
        popularity: 'low',
        latestVersion: '3.16',
        url: 'https://flutter.dev/desktop',
        platforms: ['desktop']
      },
    ]
  },
  {
    id: 'hosting-deployment',
    name: 'Hosting & Deployment',
    emoji: '🌐',
    color: '#8B5CF6',
    description: 'Where and how you deploy your application',
    options: [
      {
        name: 'Vercel',
        description: 'Best for Next.js and frontend deployment',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://vercel.com',
        platforms: ['web']
      },
      {
        name: 'Netlify',
        description: 'Great for static sites and serverless functions',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://netlify.com',
        platforms: ['web']
      },
      {
        name: 'Railway',
        description: 'Simple deployment for full-stack applications',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://railway.app',
        platforms: ['web']
      },
      {
        name: 'Render',
        description: 'Alternative to Heroku for web apps and databases',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://render.com',
        platforms: ['web']
      },
      {
        name: 'AWS',
        description: 'Amazon\'s comprehensive cloud platform',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://aws.amazon.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Google Cloud',
        description: 'Google\'s cloud platform with great AI/ML tools',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://cloud.google.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Digital Ocean',
        description: 'Developer-friendly cloud infrastructure',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://digitalocean.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Heroku',
        description: 'Easy deployment platform for web applications',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://heroku.com',
        platforms: ['web']
      },
      {
        name: 'Fly.io',
        description: 'Deploy apps close to users globally',
        popularity: 'medium',
        latestVersion: 'Cloud',
        url: 'https://fly.io',
        platforms: ['web']
      },
      {
        name: 'Cloudflare Pages',
        description: 'JAMstack platform with edge computing',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://pages.cloudflare.com',
        platforms: ['web']
      },
      {
        name: 'GitHub Pages',
        description: 'Free static site hosting by GitHub',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://pages.github.com',
        platforms: ['web']
      },
      {
        name: 'Firebase Hosting',
        description: 'Fast and secure web hosting by Google',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://firebase.google.com/products/hosting',
        platforms: ['web']
      },
    ]
  },
  {
    id: 'development-tools',
    name: 'Development Tools',
    emoji: '🔧',
    color: '#14B8A6',
    description: 'Tools to help you build and maintain your code',
    options: [
      {
        name: 'TypeScript',
        description: 'Adds type safety to JavaScript - highly recommended',
        popularity: 'high',
        latestVersion: '5.3',
        url: 'https://typescriptlang.org',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Vite',
        description: 'Fast build tool and development server',
        popularity: 'high',
        latestVersion: '5.0',
        url: 'https://vitejs.dev',
        platforms: ['web']
      },
      {
        name: 'Webpack',
        description: 'Powerful module bundler for complex projects',
        popularity: 'high',
        latestVersion: '5.89',
        url: 'https://webpack.js.org',
        platforms: ['web', 'desktop']
      },
      {
        name: 'ESLint',
        description: 'Catches errors and enforces code style',
        popularity: 'high',
        latestVersion: '8.55',
        url: 'https://eslint.org',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Prettier',
        description: 'Automatically formats your code consistently',
        popularity: 'high',
        latestVersion: '3.1',
        url: 'https://prettier.io',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Turbo',
        description: 'High-performance build system for monorepos',
        popularity: 'medium',
        latestVersion: '1.11',
        url: 'https://turbo.build',
        platforms: ['web']
      },
      {
        name: 'Parcel',
        description: 'Zero configuration build tool',
        popularity: 'medium',
        latestVersion: '2.10',
        url: 'https://parceljs.org',
        platforms: ['web']
      },
      {
        name: 'Rollup',
        description: 'Module bundler for JavaScript libraries',
        popularity: 'medium',
        latestVersion: '4.9',
        url: 'https://rollupjs.org',
        platforms: ['web']
      },
      {
        name: 'esbuild',
        description: 'Extremely fast JavaScript bundler',
        popularity: 'high',
        latestVersion: '0.19',
        url: 'https://esbuild.github.io',
        platforms: ['web']
      },
      {
        name: 'SWC',
        description: 'Super-fast TypeScript/JavaScript compiler',
        popularity: 'medium',
        latestVersion: '1.3',
        url: 'https://swc.rs',
        platforms: ['web']
      },
      {
        name: 'Biome',
        description: 'Fast formatter and linter for web projects',
        popularity: 'medium',
        latestVersion: '1.4',
        url: 'https://biomejs.dev',
        platforms: ['web']
      },
      {
        name: 'Nx',
        description: 'Smart monorepos with powerful dev tools',
        popularity: 'medium',
        latestVersion: '17.2',
        url: 'https://nx.dev',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'testing',
    name: 'Testing Framework',
    emoji: '🧪',
    color: '#EC4899',
    description: 'Tools to test your code and prevent bugs',
    options: [
      {
        name: 'Jest',
        description: 'Most popular JavaScript testing framework',
        popularity: 'high',
        latestVersion: '29.7',
        url: 'https://jestjs.io',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Vitest',
        description: 'Fast testing framework that works great with Vite',
        popularity: 'high',
        latestVersion: '1.0',
        url: 'https://vitest.dev',
        platforms: ['web']
      },
      {
        name: 'Cypress',
        description: 'End-to-end testing for web applications',
        popularity: 'high',
        latestVersion: '13.6',
        url: 'https://cypress.io',
        platforms: ['web']
      },
      {
        name: 'Playwright',
        description: 'Cross-browser testing automation',
        popularity: 'high',
        latestVersion: '1.40',
        url: 'https://playwright.dev',
        platforms: ['web']
      },
      {
        name: 'React Testing Library',
        description: 'Best practices for testing React components',
        popularity: 'high',
        latestVersion: '14.1',
        url: 'https://testing-library.com/docs/react-testing-library',
        platforms: ['web']
      },
      {
        name: 'Storybook',
        description: 'Tool for building UI components in isolation',
        popularity: 'high',
        latestVersion: '7.6',
        url: 'https://storybook.js.org',
        platforms: ['web']
      },
    ]
  },
  {
    id: 'authentication',
    name: 'Authentication',
    emoji: '🔐',
    color: '#F59E0B',
    description: 'User authentication and authorization services',
    options: [
      {
        name: 'NextAuth.js',
        description: 'Complete authentication solution for Next.js',
        popularity: 'high',
        latestVersion: '4.24',
        url: 'https://next-auth.js.org',
        platforms: ['web']
      },
      {
        name: 'Auth0',
        description: 'Universal authentication & authorization platform',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://auth0.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Clerk',
        description: 'Complete user management platform',
        popularity: 'high',
        latestVersion: '4.29',
        url: 'https://clerk.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Supabase Auth',
        description: 'Built-in authentication with Supabase',
        popularity: 'high',
        latestVersion: '2.38',
        url: 'https://supabase.com/auth',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Firebase Auth',
        description: 'Google\'s authentication service',
        popularity: 'high',
        latestVersion: '10.7',
        url: 'https://firebase.google.com/products/auth',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'payments',
    name: 'Payments',
    emoji: '💳',
    color: '#10B981',
    description: 'Payment processing and billing solutions',
    options: [
      {
        name: 'Stripe',
        description: 'Complete payment infrastructure for the internet',
        popularity: 'high',
        latestVersion: '14.9',
        url: 'https://stripe.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'PayPal',
        description: 'Global payment platform with buyer protection',
        popularity: 'high',
        latestVersion: '1.0',
        url: 'https://developer.paypal.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Paddle',
        description: 'Revenue delivery platform for SaaS companies',
        popularity: 'medium',
        latestVersion: '1.2',
        url: 'https://paddle.com',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'email',
    name: 'Email Services',
    emoji: '📧',
    color: '#EF4444',
    description: 'Transactional email and communication services',
    options: [
      {
        name: 'Resend',
        description: 'Modern email API built for developers',
        popularity: 'high',
        latestVersion: '2.1',
        url: 'https://resend.com',
        platforms: ['web']
      },
      {
        name: 'SendGrid',
        description: 'Trusted email delivery service',
        popularity: 'high',
        latestVersion: '7.7',
        url: 'https://sendgrid.com',
        platforms: ['web']
      },
      {
        name: 'Mailgun',
        description: 'Powerful APIs for sending, receiving & tracking email',
        popularity: 'medium',
        latestVersion: '9.0',
        url: 'https://mailgun.com',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'file-storage',
    name: 'File Storage',
    emoji: '📁',
    color: '#8B5CF6',
    description: 'Cloud storage solutions for files and media',
    options: [
      {
        name: 'AWS S3',
        description: 'Amazon\'s object storage service',
        popularity: 'high',
        latestVersion: 'Cloud',
        url: 'https://aws.amazon.com/s3',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Cloudinary',
        description: 'Image and video management in the cloud',
        popularity: 'high',
        latestVersion: '1.41',
        url: 'https://cloudinary.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'UploadThing',
        description: 'Simple file uploads for Next.js applications',
        popularity: 'medium',
        latestVersion: '6.1',
        url: 'https://uploadthing.com',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics',
    emoji: '📊',
    color: '#06B6D4',
    description: 'Track user behavior and application performance',
    options: [
      {
        name: 'Google Analytics',
        description: 'Most popular web analytics service',
        popularity: 'high',
        latestVersion: 'GA4',
        url: 'https://analytics.google.com',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Vercel Analytics',
        description: 'Privacy-friendly analytics for web applications',
        popularity: 'high',
        latestVersion: '1.1',
        url: 'https://vercel.com/analytics',
        platforms: ['web']
      },
      {
        name: 'Mixpanel',
        description: 'Advanced analytics for understanding user behavior',
        popularity: 'medium',
        latestVersion: '2.47',
        url: 'https://mixpanel.com',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'monitoring',
    name: 'Error Tracking & Monitoring',
    emoji: '🚨',
    color: '#DC2626',
    description: 'Monitor errors and application performance',
    options: [
      {
        name: 'Sentry',
        description: 'Application monitoring and error tracking',
        popularity: 'high',
        latestVersion: '7.91',
        url: 'https://sentry.io',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'LogRocket',
        description: 'Frontend monitoring and session replay',
        popularity: 'medium',
        latestVersion: '8.6',
        url: 'https://logrocket.com',
        platforms: ['web']
      },
      {
        name: 'Bugsnag',
        description: 'Error monitoring for web and mobile apps',
        popularity: 'medium',
        latestVersion: '7.22',
        url: 'https://bugsnag.com',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'cms',
    name: 'Content Management',
    emoji: '📝',
    color: '#7C3AED',
    description: 'Headless CMS and content management solutions',
    options: [
      {
        name: 'Sanity',
        description: 'Platform for structured content',
        popularity: 'high',
        latestVersion: '3.24',
        url: 'https://sanity.io',
        platforms: ['web']
      },
      {
        name: 'Strapi',
        description: 'Leading open-source headless CMS',
        popularity: 'high',
        latestVersion: '4.15',
        url: 'https://strapi.io',
        platforms: ['web']
      },
      {
        name: 'Contentful',
        description: 'API-first content platform',
        popularity: 'high',
        latestVersion: '10.6',
        url: 'https://contentful.com',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'state-management',
    name: 'State Management',
    emoji: '🗂️',
    color: '#3B82F6',
    description: 'Manage application state across components',
    options: [
      {
        name: 'Redux Toolkit',
        description: 'Modern Redux with less boilerplate',
        popularity: 'high',
        latestVersion: '2.0',
        url: 'https://redux-toolkit.js.org',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Zustand',
        description: 'Simple and lightweight state management',
        popularity: 'high',
        latestVersion: '4.4',
        url: 'https://zustand-demo.pmnd.rs',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Jotai',
        description: 'Atomic approach to state management',
        popularity: 'medium',
        latestVersion: '2.6',
        url: 'https://jotai.org',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Valtio',
        description: 'Proxy-based state management',
        popularity: 'medium',
        latestVersion: '1.11',
        url: 'https://valtio.pmnd.rs',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'data-fetching',
    name: 'Data Fetching & APIs',
    emoji: '🔌',
    color: '#F59E0B',
    description: 'Libraries for fetching and caching API data',
    options: [
      {
        name: 'TanStack Query',
        description: 'Powerful data fetching and caching (formerly React Query)',
        popularity: 'high',
        latestVersion: '5.8',
        url: 'https://tanstack.com/query',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Axios',
        description: 'Popular HTTP client for making API requests',
        popularity: 'high',
        latestVersion: '1.6',
        url: 'https://axios-http.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'tRPC',
        description: 'End-to-end typesafe APIs made easy',
        popularity: 'high',
        latestVersion: '10.45',
        url: 'https://trpc.io',
        platforms: ['web']
      },
      {
        name: 'SWR',
        description: 'Simple data fetching with caching',
        popularity: 'medium',
        latestVersion: '2.2',
        url: 'https://swr.vercel.app',
        platforms: ['web', 'mobile']
      },
      {
        name: 'Apollo Client',
        description: 'Comprehensive GraphQL client',
        popularity: 'medium',
        latestVersion: '3.8',
        url: 'https://apollographql.com/docs/react',
        platforms: ['web', 'mobile']
      },
      {
        name: 'GraphQL',
        description: 'Query language for APIs',
        popularity: 'medium',
        latestVersion: '16.8',
        url: 'https://graphql.org',
        platforms: ['web', 'mobile']
      }
    ]
  },
  {
    id: 'forms',
    name: 'Forms & Validation',
    emoji: '📋',
    color: '#8B5CF6',
    description: 'Handle user input and form validation',
    options: [
      {
        name: 'React Hook Form',
        description: 'Performant forms with minimal re-renders',
        popularity: 'high',
        latestVersion: '7.48',
        url: 'https://react-hook-form.com',
        platforms: ['web']
      },
      {
        name: 'Zod',
        description: 'TypeScript-first schema validation',
        popularity: 'high',
        latestVersion: '3.22',
        url: 'https://zod.dev',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Yup',
        description: 'JavaScript schema builder for validation',
        popularity: 'high',
        latestVersion: '1.4',
        url: 'https://github.com/jquense/yup',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Formik',
        description: 'Popular form library for React',
        popularity: 'medium',
        latestVersion: '2.4',
        url: 'https://formik.org',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'routing',
    name: 'Routing & Navigation',
    emoji: '🗺️',
    color: '#10B981',
    description: 'Navigate between different pages/screens',
    options: [
      {
        name: 'React Router',
        description: 'Standard routing library for React apps',
        popularity: 'high',
        latestVersion: '6.20',
        url: 'https://reactrouter.com',
        platforms: ['web']
      },
      {
        name: 'Next.js Router',
        description: 'Built-in routing system for Next.js',
        popularity: 'high',
        latestVersion: '14.0',
        url: 'https://nextjs.org/docs/app/building-your-application/routing',
        platforms: ['web']
      },
      {
        name: 'React Navigation',
        description: 'Navigation library for React Native apps',
        popularity: 'high',
        latestVersion: '6.1',
        url: 'https://reactnavigation.org',
        platforms: ['mobile']
      },
      {
        name: 'Vue Router',
        description: 'Official routing library for Vue.js',
        popularity: 'high',
        latestVersion: '4.2',
        url: 'https://router.vuejs.org',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'animation',
    name: 'Animation & Motion',
    emoji: '✨',
    color: '#EC4899',
    description: 'Add motion and animations to your UI',
    options: [
      {
        name: 'Framer Motion',
        description: 'Production-ready motion library for React',
        popularity: 'high',
        latestVersion: '10.16',
        url: 'https://framer.com/motion',
        platforms: ['web']
      },
      {
        name: 'GSAP',
        description: 'Professional-grade JavaScript animation library',
        popularity: 'high',
        latestVersion: '3.12',
        url: 'https://greensock.com/gsap',
        platforms: ['web']
      },
      {
        name: 'Lottie React',
        description: 'Render After Effects animations',
        popularity: 'medium',
        latestVersion: '2.4',
        url: 'https://github.com/Gamote/lottie-react',
        platforms: ['web', 'mobile']
      },
      {
        name: 'React Spring',
        description: 'Spring-physics based animations',
        popularity: 'medium',
        latestVersion: '9.7',
        url: 'https://react-spring.dev',
        platforms: ['web']
      }
    ]
  },
  {
    id: 'utilities',
    name: 'Utility Libraries',
    emoji: '🛠️',
    color: '#14B8A6',
    description: 'Helpful utilities and helper functions',
    options: [
      {
        name: 'Lodash',
        description: 'Utility library with helpful functions',
        popularity: 'high',
        latestVersion: '4.17',
        url: 'https://lodash.com',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Date-fns',
        description: 'Modern date utility library',
        popularity: 'high',
        latestVersion: '2.30',
        url: 'https://date-fns.org',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Day.js',
        description: 'Lightweight alternative to Moment.js',
        popularity: 'high',
        latestVersion: '1.11',
        url: 'https://day.js.org',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Immer',
        description: 'Create immutable state by mutating current state',
        popularity: 'high',
        latestVersion: '10.0',
        url: 'https://immerjs.github.io/immer',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'UUID',
        description: 'Generate RFC-compliant UUIDs',
        popularity: 'high',
        latestVersion: '9.0',
        url: 'https://github.com/uuidjs/uuid',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'Nanoid',
        description: 'Tiny, secure, URL-friendly unique string ID generator',
        popularity: 'high',
        latestVersion: '5.0',
        url: 'https://github.com/ai/nanoid',
        platforms: ['web', 'mobile', 'desktop']
      },
      {
        name: 'clsx',
        description: 'Tiny utility for constructing className strings',
        popularity: 'high',
        latestVersion: '2.0',
        url: 'https://github.com/lukeed/clsx',
        platforms: ['web', 'mobile']
      }
    ]
  }
];