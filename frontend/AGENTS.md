<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Never regenerate package-lock.json on Windows

`package.json` pins `@emnapi/*` through `overrides`. Running `npm install` on
Windows rewrites the lockfile without `@emnapi/core` and `@emnapi/runtime`,
because nothing on win32 pulls them in. `npm ci` then still passes locally and
fails on Linux — which is what CI runs:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json ... are in sync.
npm error Missing: @emnapi/runtime@1.10.0 from lock file
npm error Missing: @emnapi/core@1.10.0 from lock file
```

So after touching dependencies, regenerate the lockfile in Linux and verify it
there before committing:

```bash
docker run --rm -v "$PWD":/app -w /app node:24 \
  sh -c 'npm install --package-lock-only && npm ci'
```

A green `npm ci` on Windows proves nothing about CI. To check the whole
frontend job the way CI does, copy the tree without `node_modules`/`.next` and
run `npm ci && npx tsc --noEmit && npm run lint && npm test && npm run build`
inside `node:24`.
