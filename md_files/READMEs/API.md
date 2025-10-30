## Complete API (100+ endpoints)

### Auth (`/api/auth`)
`POST /register` `POST /login` `GET /google` `GET /google/callback` `POST /logout` `POST /forgot-password` `POST /reset-password` `GET /me`

### Projects (`/api/projects`)
**Base:** `POST /` `GET /` `GET /:id` `PUT /:id` `PATCH /:id/archive` `DELETE /:id`

**Notes:** `POST /:id/notes` `PUT /:id/notes/:noteId` `DELETE /:id/notes/:noteId` `POST /:id/notes/:noteId/lock` `DELETE /:id/notes/:noteId/lock` `PUT /:id/notes/:noteId/lock/heartbeat` `GET /:id/notes/:noteId/lock`

**Todos:** `POST /:id/todos` `PUT /:id/todos/:todoId` `DELETE /:id/todos/:todoId`

**Dev Log:** `POST /:id/devlog` `PUT /:id/devlog/:entryId` `DELETE /:id/devlog/:entryId`

**Stack:** `POST /:id/technologies` `PUT /:id/technologies/:category/:name` `DELETE /:id/technologies/:category/:name` `POST /:id/packages` `PUT /:id/packages/:category/:name` `DELETE /:id/packages/:category/:name`

**Components:** `POST /:id/components` `PUT /:id/components/:componentId` `DELETE /:id/components/:componentId` `POST /:id/components/:componentId/relationships` `DELETE /:id/components/:componentId/relationships/:relationshipId`

**Team:** `GET /:id/members` `POST /:id/invite` `DELETE /:id/members/:userId` `PATCH /:id/members/:userId`

**Import/Export:** `GET /:id/export` `POST /import`

### Invitations (`/api/invitations`)
`GET /` `POST /:token/accept` `POST /:id/resend` `DELETE /:id`

### Notifications (`/api/notifications`)
`GET /` `PATCH /:id/read` `PATCH /read-all` `DELETE /:id` `DELETE /clear-all`

### Analytics (`/api/analytics`)
`POST /session/start` `POST /session/end` `POST /heartbeat` `POST /project/switch` `GET /me` `GET /projects/time` `GET /project/:id/team-time`

### Activity Logs (`/api/activity-logs`)
`GET /project/:projectId` `GET /project/:projectId/recent` `GET /project/:projectId/active-users` `GET /user/:userId` `POST /smart-join` `POST /log` `DELETE /project/:projectId/clear`

### Public (`/api/public`)
`GET /project/:slug` `GET /user/:username` `GET /projects`

### Ideas (`/api/ideas`)
`GET /` `POST /` `PUT /:id` `DELETE /:id`

### Tickets (`/api/tickets`)
`GET /` `POST /` `GET /:id` `PUT /:id` `DELETE /:id`

### Admin (`/api/admin`)
**Users:** `GET /users` `GET /users/:id` `PUT /users/:id/plan` `DELETE /users/:id` `POST /users/:id/password-reset`

**Projects:** `GET /projects` `GET /stats`

**Tickets:** `GET /tickets` `GET /tickets/:id` `PUT /tickets/:id` `DELETE /tickets/:id`

**Analytics:** `GET /analytics/combined` `GET /analytics/leaderboard` `DELETE /analytics/reset`

**Cleanup:** `GET /cleanup/stats` `GET /cleanup/recommendations` `POST /cleanup/run` `POST /cleanup/optimize` `POST /cleanup/emergency`

### News (`/api/news`)
`GET /` `GET /admin` `GET /:id` `POST /` `PUT /:id` `DELETE /:id`

### Billing (`/api/billing`)
`POST /create-checkout-session` `POST /webhook` `GET /info` `POST /cancel-subscription` `POST /resume-subscription`

### Terminal (`/api/terminal`)
`POST /execute` `GET /commands` `GET /projects` `POST /validate` `GET /suggestions`

### Health (`/api/`)
`GET /health` `GET /ready` `GET /live` `GET /csrf-token`