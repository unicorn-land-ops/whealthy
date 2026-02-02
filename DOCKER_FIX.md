# Docker Authentication Fix

The error "email must be verified before using account" means your Docker Hub account needs verification.

## Quick Fix

1. **Log in to Docker Hub**:
   ```bash
   docker login
   ```
   Enter your Docker Hub username and password.

2. **Verify your email**:
   - Go to https://hub.docker.com
   - Check your email for verification link
   - Click the verification link

3. **Try again**:
   ```bash
   docker compose up --build
   ```

## Alternative: Use npm directly (No Docker needed)

If you don't want to deal with Docker authentication:

```bash
# Make sure Node.js ≥20.9.0
node -v

# If not, upgrade Node.js or use nvm:
# nvm install 20.11.0
# nvm use 20.11.0

# Then just run:
npm install
npm run dev
```

Then open http://localhost:3000

