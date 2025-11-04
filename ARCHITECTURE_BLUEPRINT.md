# Architecture Blueprint (Registry)

- Component: Backend API
  - File: `ekameti-backend/server.js`
  - Port: 5000
  - CORS Origin: `${CORS_ORIGIN || FRONTEND_URL || http://localhost:5173}`
  - New Endpoint:
    - Method: GET
    - Path: `/health`
    - Purpose: Basic health check for connectivity and preflight diagnostics

- Component: Users API
  - Mount Path: `/api/users`
  - Source: `ekameti-backend/routes/userRoutes.js`
  - Notable Endpoints:
    - POST `/register` (registration OTP initiation)
    - POST `/verify-otp` (finalize registration)
    - POST `/login`
    - GET `/notifications/:email`
    - PUT `/notifications/:email/:notificationId/read`

- Frontend
  - Dev Server: `http://localhost:5173`
  - API Calls: direct axios calls to `http://localhost:5000`

Naming Collisions/Duplicates: None introduced in this change.
