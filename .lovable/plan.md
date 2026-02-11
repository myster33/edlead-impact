

## Fix AWS Amplify Deployment Failures

### Root Causes Identified

1. **Electron packages in `package.json`** -- `electron`, `electron-builder`, `electron-updater`, and `concurrently` are listed as regular dependencies. AWS Amplify tries to install them during build, but they require native compilation that fails in cloud environments.

2. **`base: './'` in `vite.config.ts`** -- This relative path setting was added for Electron but breaks SPA routing on web hosts. AWS Amplify needs `base: '/'`.

3. **Missing SPA redirect rule** -- React Router uses client-side routing, so AWS Amplify needs a rewrite rule to serve `index.html` for all routes (otherwise refreshing on `/blog` returns a 404).

---

### Changes

#### 1. Move Electron packages to `devDependencies` in `package.json`

Move these out of `dependencies` into `devDependencies` (or remove them entirely if Electron builds are done separately):
- `electron`
- `electron-builder`  
- `electron-updater`
- `concurrently`

This prevents AWS Amplify from trying to install and compile native Electron binaries.

#### 2. Fix `vite.config.ts` base path

Change:
```typescript
base: mode === 'production' ? './' : '/',
```
To:
```typescript
base: '/',
```

This ensures all assets and routes work correctly on web hosting. If you still need Electron builds with relative paths, that can be handled with a separate build script/config.

#### 3. Add AWS Amplify SPA redirect

Create a file `public/_redirects` or configure in Amplify console:
```
/*  /index.html  200
```

Alternatively, add an `amplify.yml` if you don't already have one, or configure the rewrite rule in the AWS Amplify console under **Rewrites and redirects**:
- Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>`
- Target: `/index.html`
- Type: 200 (Rewrite)

---

### Technical Notes

- The Electron desktop app functionality is unaffected -- those builds are done locally, not on Amplify
- The `lovable-tagger` is already in `devDependencies` so it should be fine as long as Amplify runs `npm install` (which installs devDeps by default unless `NODE_ENV=production`)
- If Amplify sets `NODE_ENV=production` during install, you may also need to ensure the build command is `npm install --include=dev && npm run build`

