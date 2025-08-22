# Operrate Mobile Vanilla - Agent Guide

## Build/Lint/Test Commands
- **Development**: `npm run dev` - Run Parcel dev server for web development
- **Build**: `npm run build` - Build production web assets
- **No tests**: `npm test` returns error - no test framework configured
- **Capacitor sync**: `npx cap sync` - Sync web assets to native platforms
- **iOS build**: `npx cap open ios` then build in Xcode
- **Android build**: `npx cap open android` then build in Android Studio
- **Check Capacitor health**: `npx cap doctor`

## Architecture & Structure
- **Hybrid app**: Capacitor + vanilla JS/HTML/CSS (no frameworks)
- **Web source**: `app-content/` (HTML/CSS/JS) builds to `dist/`
- **Native platforms**: `ios/` and `android/` folders with native wrappers
- **Firebase integration**: Push notifications, messaging service worker
- **Backend communication**: Dynamic backend URL stored in Capacitor Preferences
- **Entry points**: `index.html` (setup), `login.html` (authentication)

## Code Style & Conventions
- **ES6 modules**: Use `import/export` syntax for JS files
- **Capacitor plugins**: Import from `@capacitor/plugin-name`
- **Error handling**: Use try/catch with console.error and user messaging
- **DOM access**: Check element existence before use
- **Async/await**: Preferred over Promise chains
- **Constants**: Use SCREAMING_SNAKE_CASE for keys (e.g., `BACKEND_URL_KEY`)
