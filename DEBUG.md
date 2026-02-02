# Debugging Guide - Interactive Elements Not Working

If toggles, tabs, and buttons aren't working, follow these steps:

## Step 1: Check Browser Console

1. **Open Developer Tools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Or right-click → "Inspect" → "Console" tab

2. **Look for errors**:
   - Red error messages indicate JavaScript failures
   - Common issues:
     - `Cannot read property 'X' of undefined`
     - `useParamsStore is not a function`
     - `React is not defined`
     - `localStorage is not available`

3. **Take a screenshot** of any errors and share them

## Step 2: Clear Browser Cache & localStorage

1. **Clear localStorage**:
   - In DevTools, go to "Application" tab (Chrome) or "Storage" tab (Firefox)
   - Find "Local Storage" → `http://localhost:3000`
   - Delete the `whealthy-params` key
   - Refresh the page

2. **Hard refresh**:
   - `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - This clears cached JavaScript

## Step 3: Check Network Tab

1. In DevTools, go to "Network" tab
2. Refresh the page
3. Look for failed requests (red entries)
4. Check if `_next/static/chunks/` files are loading

## Step 4: Verify React is Working

Open the browser console and type:
```javascript
window.React
```

If it returns `undefined`, React isn't loading properly.

## Step 5: Test Basic Interactivity

In the browser console, try:
```javascript
// Test if event listeners work
document.addEventListener('click', () => console.log('Click detected'));
// Then click anywhere on the page - you should see "Click detected"
```

## Common Issues & Fixes

### Issue: "Cannot read property of undefined"
**Fix**: The Zustand store might not be initialized. Clear localStorage and refresh.

### Issue: Tabs render but don't switch
**Fix**: Radix UI might not be loading. Check if `@radix-ui/react-tabs` is in node_modules.

### Issue: Everything is grayed out / unclickable
**Fix**: Check for CSS `pointer-events: none` or z-index issues. In DevTools, inspect an element and check computed styles.

### Issue: "Hydration mismatch" errors
**Fix**: This is a Next.js SSR issue. The app should still work, but try clearing cache.

## Quick Test

Run this in the browser console to test if the store is working:
```javascript
// This should return the current params
localStorage.getItem('whealthy-params')
```

If it returns `null`, the store hasn't initialized yet. Wait a moment and try again.

## Still Not Working?

1. **Check the terminal** where `npm run dev` is running
   - Look for compilation errors
   - Look for runtime errors

2. **Try a different browser**:
   - Chrome/Edge
   - Firefox
   - Safari

3. **Check Node.js version**:
   ```bash
   node -v
   ```
   Should be ≥20.9.0

4. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

