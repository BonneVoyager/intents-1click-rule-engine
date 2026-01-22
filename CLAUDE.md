# Fee Configuration Schema

This project uses a custom fee configuration schema for NEAR Intents 1Click API.

The complete schema specification is in `docs/fee-config-schema.md`.

## Important: NPM Package Compatibility

This is an **NPM package** that must work with both Node.js and frontend bundlers. When building:

- Use `tsc` (TypeScript compiler) for building, NOT `bun build`
- The build outputs CommonJS for maximum compatibility (works with Node.js and all major bundlers)
- Standard TypeScript imports without file extensions

## Key Rules

- NPM package for both frontend and backend use
- Use TypeScript and transpile with `tsc` to JavaScript (CommonJS)
- Don't import any external dependencies
- Write functional code and keep files structure simple and clean
- Create extensive unit testing for all the functions with number of examples
- All fee configurations must validate against the schema
- Priority determines rule evaluation order (higher = first)
- At least one of blockchain/symbol/assetId must be specified
- Keep versioning consistent and don't add any new feature unless explicitly mentioned
- Omit any features mentioned under "Future Enhancements" section

## Development Commands

Use Bun for local development:

- `bun install` - Install dependencies
- `bun run build` - Build the package (uses tsc, outputs CommonJS to dist/)
- `bun test` - Run tests
- `bun run typecheck` - Type check without emitting

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```
