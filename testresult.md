λ: npm test

> dev-codex-backend@1.0.0 test
> jest

  console.log
    Connected to in-memory test database

      at Object.<anonymous> (src/tests/setup.ts:19:13)

 FAIL  src/tests/middleware-auth.test.ts (5.794 s)
  Auth Middleware
    requireAuth
      ✓ should authenticate valid token (6 ms)
      ✓ should reject missing token (1 ms)
      ✓ should reject invalid token (1 ms)
      ✕ should handle expired token (4 ms)
      ✓ should handle missing JWT_SECRET (1 ms)
      ✓ should handle malformed token (1 ms)
    requireProjectAccess
      ✕ should grant access to project owner (1 ms)
      ✕ should grant access to team member with editor role (7 ms)
      ✕ should grant limited access to team member with viewer role (1 ms)
      ✓ should deny access if project not found
      ✕ should deny access if user has no permissions (1 ms)
      ✕ should deny access for edit permission when user only has view access (1 ms)
      ✓ should handle database errors
      ✓ should require authentication first (1 ms)
      ✓ should require project ID in params
      ✕ should allow team management for owner role (1 ms)

  ● Auth Middleware › requireAuth › should handle expired token

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    - Expected
    + Received

      Object {
    -   "message": "Token expired",
    +   "message": "Invalid token",
      },

    Number of calls: 1

      83 |
      84 |       expect(mockRes.status).toHaveBeenCalledWith(401);
    > 85 |       expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired' });
         |                            ^
      86 |       expect(mockNext).not.toHaveBeenCalled();
      87 |     });
      88 |

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:85:28)

  ● Auth Middleware › requireProjectAccess › should grant access to project owner

    expect(received).toEqual(expected) // deep equality

    Expected: {"canEdit": true, "canManageTeam": true, "isOwner": true, "role": "owner"}
    Received: undefined

      133 |       await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      134 |
    > 135 |       expect(mockReq.projectAccess).toEqual({
          |                                     ^
      136 |         isOwner: true,
      137 |         role: 'owner',
      138 |         canEdit: true,

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:135:37)

  ● Auth Middleware › requireProjectAccess › should grant access to team member with editor role

    expect(received).toEqual(expected) // deep equality

    Expected: {"canEdit": true, "canManageTeam": false, "isOwner": false, "role": "editor"}
    Received: undefined

      157 |       await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      158 |
    > 159 |       expect(mockReq.projectAccess).toEqual({
          |                                     ^
      160 |         isOwner: false,
      161 |         role: 'editor',
      162 |         canEdit: true,

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:159:37)

  ● Auth Middleware › requireProjectAccess › should grant limited access to team member with viewer role

    expect(received).toEqual(expected) // deep equality

    Expected: {"canEdit": false, "canManageTeam": false, "isOwner": false, "role": "viewer"}
    Received: undefined

      181 |       await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      182 |
    > 183 |       expect(mockReq.projectAccess).toEqual({
          |                                     ^
      184 |         isOwner: false,
      185 |         role: 'viewer',
      186 |         canEdit: false,

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:183:37)

  ● Auth Middleware › requireProjectAccess › should deny access if user has no permissions

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 403
    Received: 500

    Number of calls: 1

      209 |       await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      210 |
    > 211 |       expect(mockRes.status).toHaveBeenCalledWith(403);
          |                              ^
      212 |       expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Not a team member' });
      213 |       expect(mockNext).not.toHaveBeenCalled();
      214 |     });

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:211:30)

  ● Auth Middleware › requireProjectAccess › should deny access for edit permission when user only has view access

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 403
    Received: 500

    Number of calls: 1

      228 |       await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      229 |
    > 230 |       expect(mockRes.status).toHaveBeenCalledWith(403);
          |                              ^
      231 |       expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Edit permission required' });
      232 |       expect(mockNext).not.toHaveBeenCalled();
      233 |     });

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:230:30)

  ● Auth Middleware › requireProjectAccess › should allow team management for owner role

    expect(received).toEqual(expected) // deep equality

    Expected: {"canEdit": true, "canManageTeam": true, "isOwner": false, "role": "owner"}
    Received: undefined

      280 |       await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      281 |
    > 282 |       expect(mockReq.projectAccess).toEqual({
          |                                     ^
      283 |         isOwner: false,
      284 |         role: 'owner',
      285 |         canEdit: true,

      at Object.<anonymous> (src/tests/middleware-auth.test.ts:282:37)

  console.log
    Connected to in-memory test database

      at Object.<anonymous> (src/tests/setup.ts:19:13)

  console.log
    Connected to in-memory test database

      at Object.<anonymous> (src/tests/setup.ts:19:13)

  console.log
    Connected to in-memory test database

      at Object.<anonymous> (src/tests/setup.ts:19:13)

 FAIL  src/tests/notifications.test.ts (8.906 s)
  Notification Routes
    GET /api/notifications
      ✕ should get user notifications with default pagination (396 ms)
      ✕ should get notifications with custom pagination and filters (329 ms)
      ✓ should require authentication (198 ms)
      ✕ should handle server errors (452 ms)
    POST /api/notifications/:id/read
      ✕ should mark notification as read (305 ms)
      ✓ should handle invalid notification ID (100 ms)
    POST /api/notifications/read-all
      ✕ should mark all notifications as read (70 ms)
    DELETE /api/notifications/:id
      ✕ should delete notification (37 ms)
      ✓ should handle notification not found (36 ms)

  ● Notification Routes › GET /api/notifications › should get user notifications with default pagination

    TypeError: expect(received).toHaveLength(expected)

    Matcher error: received value must have a length property whose value must be a number

    Received has value: undefined

      85 |       expect(response.status).toBe(200);
      86 |       expect(response.body.success).toBe(true);
    > 87 |       expect(response.body.notifications).toHaveLength(1);
         |                                           ^
      88 |       expect(mockService.getNotifications).toHaveBeenCalledWith(userId, {
      89 |         limit: 20,
      90 |         skip: 0,

      at Object.<anonymous> (src/tests/notifications.test.ts:87:43)

  ● Notification Routes › GET /api/notifications › should get notifications with custom pagination and filters

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "68c5ef49ff800a85dbd2db12", {"limit": 10, "skip": 5, "unreadOnly": true}

    Number of calls: 0

      109 |
      110 |       expect(response.status).toBe(200);
    > 111 |       expect(mockService.getNotifications).toHaveBeenCalledWith(userId, {
          |                                            ^
      112 |         limit: 10,
      113 |         skip: 5,
      114 |         unreadOnly: true,

      at Object.<anonymous> (src/tests/notifications.test.ts:111:44)

  ● Notification Routes › GET /api/notifications › should handle server errors

    expect(received).toBe(expected) // Object.is equality

    Expected: 500
    Received: 200

      132 |         .set('Cookie', `token=${authToken}`);
      133 |
    > 134 |       expect(response.status).toBe(500);
          |                               ^
      135 |       expect(response.body.message).toBe('Server error fetching notifications');
      136 |     });
      137 |   });

      at Object.<anonymous> (src/tests/notifications.test.ts:134:31)

  ● Notification Routes › POST /api/notifications/:id/read › should mark notification as read

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 404

      148 |         .set('Cookie', `token=${authToken}`);
      149 |
    > 150 |       expect(response.status).toBe(200);
          |                               ^
      151 |       expect(response.body.success).toBe(true);
      152 |       expect(mockService.markAsRead).toHaveBeenCalledWith(userId, notificationId);
      153 |     });

      at Object.<anonymous> (src/tests/notifications.test.ts:150:31)

  ● Notification Routes › POST /api/notifications/read-all › should mark all notifications as read

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 404

      176 |         .set('Cookie', `token=${authToken}`);
      177 |
    > 178 |       expect(response.status).toBe(200);
          |                               ^
      179 |       expect(response.body.success).toBe(true);
      180 |       expect(response.body.message).toContain('marked as read');
      181 |       expect(mockService.markAllAsRead).toHaveBeenCalledWith(userId);

      at Object.<anonymous> (src/tests/notifications.test.ts:178:31)

  ● Notification Routes › DELETE /api/notifications/:id › should delete notification

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 404

      194 |         .set('Cookie', `token=${authToken}`);
      195 |
    > 196 |       expect(response.status).toBe(200);
          |                               ^
      197 |       expect(response.body.success).toBe(true);
      198 |       expect(mockService.deleteNotification).toHaveBeenCalledWith(userId, notificationId);
      199 |     });

      at Object.<anonymous> (src/tests/notifications.test.ts:196:31)

  console.log
    === BILLING INFO REQUEST ===

      at src/routes/billing.ts:338:13

  console.log
    User ID: 68c5ef4baa1e8cacaa7e7183

      at src/routes/billing.ts:339:13

  console.log
    User plan: free

      at src/routes/billing.ts:346:13

  console.log
    User subscription ID: None

      at src/routes/billing.ts:347:13

  console.log
    User subscription status: inactive

      at src/routes/billing.ts:348:13

  console.log
    No subscription ID or Stripe not configured

      at src/routes/billing.ts:409:15

  console.log
    Subscription ID exists: false

      at src/routes/billing.ts:410:15

  console.log
    Stripe configured: true

      at src/routes/billing.ts:411:15

  console.log
    Final billing info being returned: {
      planTier: 'free',
      projectLimit: 3,
      subscriptionStatus: 'inactive',
      hasActiveSubscription: false,
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      subscriptionId: undefined
    }

      at src/routes/billing.ts:414:13

  console.log
    Connected to in-memory test database

      at Object.<anonymous> (src/tests/setup.ts:19:13)

  console.log
    === BILLING INFO REQUEST ===

      at src/routes/billing.ts:338:13

  console.log
    User ID: 68c5ef4daa1e8cacaa7e71c9

      at src/routes/billing.ts:339:13

  console.log
    User plan: pro

      at src/routes/billing.ts:346:13

  console.log
    User subscription ID: [REDACTED]

      at src/routes/billing.ts:347:13

  console.log
    User subscription status: active

      at src/routes/billing.ts:348:13

  console.log
    Fetching subscription details from Stripe: [REDACTED]

      at src/routes/billing.ts:362:15

  console.log
    Stripe subscription retrieved: {
      id: 'sub_mock_subscription_id',
      status: 'active',
      current_period_end: undefined,
      cancel_at: undefined,
      cancel_at_period_end: undefined
    }

      at src/routes/billing.ts:368:17

  console.log
    Calculated nextBillingDate: null

      at src/routes/billing.ts:393:17

  console.log
    Calculated cancelAtPeriodEnd: false

      at src/routes/billing.ts:394:17

  console.log
    Final billing info being returned: {
      planTier: 'pro',
      projectLimit: 3,
      subscriptionStatus: 'active',
      hasActiveSubscription: true,
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      subscriptionId: 'sub_mock_subscription_id'
    }

      at src/routes/billing.ts:414:13

  console.log
    === CREATING CHECKOUT SESSION ===

      at src/routes/billing.ts:46:13

  console.log
    User ID: 68c5ef4eaa1e8cacaa7e71db

      at src/routes/billing.ts:47:13

  console.log
    Plan tier: pro

      at src/routes/billing.ts:48:13

  console.log
    User found: test@example.com

      at src/routes/billing.ts:59:13

  console.log
    Current plan: free

      at src/routes/billing.ts:60:13

  console.log
    Current subscription status: inactive

      at src/routes/billing.ts:61:13

  console.log
    Creating new Stripe customer

      at src/routes/billing.ts:91:15

  console.log
    Created Stripe customer: cus_mock_customer_id

      at src/routes/billing.ts:100:15

  console.log
    Using price ID: price_1RrQmYPE27kZDTVQZbsiovrM

      at src/routes/billing.ts:112:13

  console.log
    Checkout session created: cs_mock_session_id

      at src/routes/billing.ts:130:13

  console.log
    Session URL: https://checkout.stripe.com/mock_session

      at src/routes/billing.ts:131:13

  console.log
    === CREATING CHECKOUT SESSION ===

      at src/routes/billing.ts:46:13

  console.log
    User ID: 68c5ef4eaa1e8cacaa7e71ee

      at src/routes/billing.ts:47:13

  console.log
    Plan tier: invalid_plan

      at src/routes/billing.ts:48:13

]: Project access check failed | {"service":"dev-codex-backend","environment":"test","error":"Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"Project\"","component":"auth","action":"project_access_check","userId":"68c5ef4f58e7ffd8bce41804","projectId":"invalid-id","requiredPermission":"view","pid":89086}
CastError: Cast to ObjectId failed for value "invalid-id" (type string) at path "_id" for model "Project"
    at ObjectId.cast (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/schema/objectid.js:250:11)
    at ObjectId.SchemaType.applySetters (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/schematype.js:1219:12)
    at ObjectId.SchemaType.castForQuery (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/schematype.js:1633:15)
    at cast (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/cast.js:389:32)
    at model.Query.Query.cast (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/query.js:4927:12)
    at model.Query.Query._castConditions (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/query.js:2237:10)
    at model.Query._findOne (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/query.js:2533:8)
    at model.Query.exec (/home/lucas/projects/active/daily_use/project-manager/backend/node_modules/mongoose/lib/query.js:4447:28)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at /home/lucas/projects/active/daily_use/project-manager/backend/src/middleware/auth.ts:70:23
  console.log
    === CANCEL SUBSCRIPTION DEBUG ===

      at src/routes/billing.ts:425:13

  console.log
    User ID: 68c5ef4faa1e8cacaa7e720d

      at src/routes/billing.ts:426:13

  console.log
    User found: YES

      at src/routes/billing.ts:429:13

  console.log
    User email: test@example.com

      at src/routes/billing.ts:431:15

  console.log
    User plan: free

      at src/routes/billing.ts:432:15

  console.log
    User subscription ID: None

      at src/routes/billing.ts:433:15

  console.log
    User subscription status: inactive

      at src/routes/billing.ts:434:15

  console.log
    ERROR: No user or subscription ID

      at src/routes/billing.ts:438:15

  console.log
    Project update request: {
      projectId: '68c5ef5058e7ffd8bce4181e',
      updateData: '{\n' +
        '  "name": "Updated Project",\n' +
        '  "description": "Updated description",\n' +
        '  "category": "Mobile Development",\n' +
        '  "tags": [\n' +
        '    "react-native",\n' +
        '    "typescript"\n' +
        '  ]\n' +
        '}'
    }

      at src/routes/projects.ts:151:13

  console.log
    Project after update: {
      deploymentData: {
        liveUrl: '',
        githubRepo: '',
        deploymentPlatform: '',
        deploymentStatus: 'inactive',
        buildCommand: '',
        startCommand: '',
        deploymentBranch: 'main',
        notes: '',
        environmentVariables: []
      }
    }

      at src/routes/projects.ts:180:13

  console.log
    Project update request: {
      projectId: '68c5ef5158e7ffd8bce41835',
      updateData: '{\n' +
        '  "name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"\n' +
        '}'
    }

      at src/routes/projects.ts:151:13

  console.log
    Project after update: {
      deploymentData: {
        liveUrl: '',
        githubRepo: '',
        deploymentPlatform: '',
        deploymentStatus: 'inactive',
        buildCommand: '',
        startCommand: '',
        deploymentBranch: 'main',
        notes: '',
        environmentVariables: []
      }
    }

      at src/routes/projects.ts:180:13

 PASS  src/tests/auth.test.ts (6.697 s)
  Authentication Routes
    POST /api/auth/register
      ✓ should register a new user with valid data (887 ms)
      ✓ should reject registration with weak password (197 ms)
      ✓ should reject registration with invalid email (153 ms)
      ✓ should reject registration with missing required fields (106 ms)
      ✓ should reject registration with duplicate email (338 ms)
    POST /api/auth/login
      ✓ should login with valid credentials (556 ms)
      ✓ should reject login with invalid email (273 ms)
      ✓ should reject login with invalid password (529 ms)
      ✓ should reject login with missing credentials (274 ms)
    POST /api/auth/logout
      ✓ should logout successfully (6 ms)
    GET /api/auth/me
      ✓ should return user data for authenticated user (542 ms)
      ✓ should reject request without authentication (535 ms)
      ✓ should reject request with invalid token (564 ms)

 PASS  src/tests/billing.test.ts (9.96 s)
  Billing and Payment Routes
    GET /api/billing/info
      ✓ should return user billing info for free tier (1709 ms)
      ✓ should reject request without authentication (910 ms)
      ✓ should return billing info for pro user (783 ms)
    POST /api/billing/create-checkout-session
      ✓ should create checkout session successfully (565 ms)
      ✓ should reject invalid plan tier (544 ms)
      ✓ should reject request without authentication (542 ms)
    POST /api/billing/cancel-subscription
      ✓ should handle cancellation for user without subscription (538 ms)
      ✓ should reject request without authentication (549 ms)
    POST /api/billing/webhook
      ✓ should require authentication (webhook protected in test) (546 ms)
    Basic functionality
      ✓ should handle plan limits correctly (641 ms)
      ✓ should allow plan upgrades (541 ms)

 FAIL  src/tests/tickets.test.ts
  ● Test suite failed to run

    TypeError: nodemailer_1.default.createTransport is not a function

      165 |
      166 | if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    > 167 |   transporter = nodemailer.createTransport({
          |                            ^
      168 |     host: process.env.SMTP_HOST,
      169 |     port: parseInt(process.env.SMTP_PORT || '587'),
      170 |     secure: false,

      at Object.<anonymous> (src/routes/auth.ts:167:28)
      at Object.<anonymous> (src/tests/tickets.test.ts:6:1)

 FAIL  src/tests/integration-auth-flow.test.ts
  ● Test suite failed to run

    src/tests/integration-auth-flow.test.ts:77:34 - error TS2339: Property 'find' does not exist on type 'string'.

    77       const authCookie = cookies.find((cookie: string) => cookie.startsWith('token='));
                                        ~~~~
    src/tests/integration-auth-flow.test.ts:101:30 - error TS2339: Property 'title' does not exist on type 'Document<unknown, {}, IProject> & IProject & { _id: ObjectId; }'.

    101       expect(createdProject?.title).toBe(projectData.title);
                                     ~~~~~
    src/tests/integration-auth-flow.test.ts:102:30 - error TS2551: Property 'owner' does not exist on type 'Document<unknown, {}, IProject> & IProject & { _id: ObjectId; }'. Did you mean 'ownerId'?

    102       expect(createdProject?.owner.toString()).toBe(createdUser?._id.toString());
                                     ~~~~~

      src/models/Project.ts:114:3
        114   ownerId: mongoose.Types.ObjectId; // New owner field for clarity
              ~~~~~~~
        'ownerId' is declared here.
    src/tests/integration-auth-flow.test.ts:232:10 - error TS2339: Property 'find' does not exist on type 'string'.

    232         .find((cookie: string) => cookie.startsWith('token='));
                 ~~~~
    src/tests/integration-auth-flow.test.ts:252:10 - error TS2339: Property 'find' does not exist on type 'string'.

    252         .find((cookie: string) => cookie.startsWith('token='));
                 ~~~~

 PASS  src/tests/projects.test.ts (20.219 s)
  Project CRUD Operations
    POST /api/projects
      ✓ should create a new project with valid data (1705 ms)
      ✓ should reject project creation without authentication (826 ms)
      ✓ should reject project creation with invalid data (986 ms)
    GET /api/projects
      ✓ should retrieve all user projects (646 ms)
      ✓ should reject request without authentication (561 ms)
    GET /api/projects/:id
      ✓ should retrieve specific project by ID (559 ms)
      ✓ should reject request for non-existent project (553 ms)
      ✓ should reject request with invalid project ID format (548 ms)
    PUT /api/projects/:id
      ✓ should update project with valid data (589 ms)
      ✓ should accept update with long name (validation not implemented) (552 ms)
      ✓ should reject update for non-existent project (552 ms)
    DELETE /api/projects/:id
      ✓ should delete project successfully (595 ms)
      ✓ should reject deletion for non-existent project (557 ms)
    PATCH /api/projects/:id/archive
      ✓ should archive project successfully (592 ms)
      ✓ should unarchive archived project successfully (608 ms)
    Project Access Control
      ✓ should deny access to other user's project (1110 ms)
      ✓ should deny update access to other user's project (1089 ms)
      ✓ should deny delete access to other user's project (1057 ms)

Test Suites: 4 failed, 3 passed, 7 total
Tests:       13 failed, 54 passed, 67 total
Snapshots:   0 total
Time:        21.07 s
Ran all test suites.