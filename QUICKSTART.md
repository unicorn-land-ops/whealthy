# Quick Start Guide

## Run the App (Simplest Method - Recommended)

**Prerequisites**: Node.js ≥20.9.0 (check with `node -v`)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   - Go to: **http://localhost:3000**
   - The app should load and be fully interactive

**Note**: If your Node.js version is too old, upgrade it or use Docker (see below).

## What You Should See

- **Inputs tab**: Configure wealth, spending, taxes, allocations
- **Inflows & One-offs tab**: Add/remove cash flow events
- **Results tab**: View charts and key statistics
- **Notes tab**: Model documentation

## Test Interactivity

1. **Tabs**: Click between "Inputs", "Inflows & One-offs", "Results", "Notes" - they should switch
2. **Toggles**: 
   - "Real mode" switch should toggle
   - "Enable commitments engine" should toggle
   - "Enable Monte Carlo" should toggle
3. **Preset buttons**: Click "$10m / $300k / 1% philanthropy", "High inflation", etc. - values should update
4. **Input fields**: Change any number - charts should update after a brief delay
5. **Results tab**: Should show wealth projection chart and key stats

## If Something Doesn't Work

1. **Check browser console** (F12) for errors
2. **Clear localStorage**: Open browser DevTools → Application → Local Storage → Clear "whealthy-params"
3. **Restart the dev server**: Stop (Ctrl+C) and run `npm run dev` again

## Alternative: Use Docker (No Node Version Issues)

**Note**: Docker requires Docker Hub authentication. If you get an "email must be verified" error, see `DOCKER_FIX.md`.

If you have Docker installed and authenticated:

```bash
docker compose up --build
```

Then open http://localhost:3000

## Troubleshooting

- **"Node version too old"**: Upgrade Node.js to ≥20.9.0 or use Docker
- **Tabs don't switch**: Check browser console for JavaScript errors
- **Toggles don't work**: Ensure JavaScript is enabled in your browser
- **Charts don't show**: Wait a moment for simulation to complete (check "Loading simulation..." message)

