## 2025-10-31

### Backend Changes
- Updated CORS to env-driven origin with credentials, methods, and headers; added global OPTIONS handler.
- Added `GET /health` endpoint in `ekameti-backend/server.js` for connectivity checks.
- Added early health check endpoint `GET /healthz` before middleware.

### Frontend Refactoring (Major)
- **Created centralized API configuration**: Added `src/config/api.js` with `getApiUrl()` helper function
- **Environment variable support**: Created `.env.example` and updated `vite.config.js` to expose `VITE_API_BASE_URL` and `VITE_FRONTEND_URL`
- **Replaced all hardcoded API URLs**: Updated 43+ instances across 14+ files to use `getApiUrl()` from environment variables
  - All pages (Login, Register, Dashboard, Profile, etc.)
  - All components (Notifications, TwoFactorVerifyModal)
  - All API calls now use centralized configuration

### Payment Processing Fix (Critical)
- **Fixed PaymentSuccess page**: Properly extracts `kametiId` from URL parameters and passes it to backend
- **Enhanced backend manual-update endpoint**: 
  - Added duplicate payment detection to prevent saving same payment twice
  - Improved error handling and logging
  - Handles case where user is creator but not yet in members array
  - Creates payment records even if Kameti update fails
  - Always saves payment to database regardless of Kameti member status
- **Better error handling**: Added comprehensive error logging in frontend PaymentSuccess page
- **Payment verification**: Checks if payment already exists before creating new records

### Documentation
- Updated `ARCHITECTURE_BLUEPRINT.md` with new endpoint and CORS origin details.
