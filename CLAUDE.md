# Fee Configuration Schema

This project uses a custom fee configuration schema for NEAR Intents 1Click API.

The complete schema specification is in `docs/fee-config-schema.md`.

Key rules:
- It's frontend/backend package used as NPM package
- Use TypeScript and transpile to JavaScript with commonly used setup
- Don't import any external dependencies
- Write functional code and keep files structure simple and clean
- Create extensive unit testing for all the functions with number of examples
- All fee configurations must validate against the schema
- Priority determines rule evaluation order (higher = first)
- At least one of blockchain/symbol/assetId must be specified
- Keep versioning consistent and don't add any new feature unless explicitly mentioned
- Again, omit any features mentioned under "Future Enhancements" section

description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```
