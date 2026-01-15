# Testing Documentation

## Overview

Latnotate uses [Vitest](https://vitest.dev/) for testing with [@testing-library/react](https://testing-library.com/react) for component testing.

## Test Structure

Tests are located in `src/test/` directory:

- **`utils.test.ts`** - Tests for utility functions (cn, etc.)
- **`types.test.ts`** - Type validation and structure tests
- **`parser.test.ts`** - Whitaker's Words parser logic tests
- **`heuristics.test.ts`** - Heuristic guessing algorithm tests
- **`api.test.ts`** - API integration and data structure tests

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## Test Coverage

Current test coverage includes:

### 1. **Utility Functions**
- `cn()` class name merging
- Tailwind class conflict resolution
- Conditional class handling

### 2. **Type System**
- All enum types (Age, Area, Geo, Frequency, Source)
- WordEntry discriminated union
- NounEntry, VerbEntry structures
- Britain typo fix verification

### 3. **Parser Logic**
- Morphology code expansion
- Frequency scoring
- Dictionary code parsing
- Part of speech detection
- Case detection from morphology

### 4. **Heuristic Algorithms**
- Verb person/number extraction
- 3rd person singular/plural detection
- Infinitive handling
- Case/Gender/Number extraction
- Prepositional case mapping (40+ prepositions)
- Nominative chunk contiguity detection
- Agreement matching (case, gender, number)

### 5. **API Integration**
- LookupResult structure validation
- Multiple word handling
- Empty result handling
- All WordEntry types
- Scoring and sorting logic
- Form matching vs morphology matching
- Frequency-based prioritization

## Writing New Tests

### Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  describe("Specific functionality", () => {
    it("should do something specific", () => {
      // Arrange
      const input = "test";
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

### Best Practices

1. **Descriptive test names** - Use "should" statements
2. **Arrange-Act-Assert** - Separate test phases
3. **Single assertion focus** - One concept per test
4. **Edge cases** - Test boundary conditions
5. **Mock external dependencies** - Isolate unit tests

### Example: Testing Heuristics

```typescript
it("should extract 3rd person singular", () => {
  const morph = "Verb Present Active Indicative 3rd Person Singular";
  const result = getVerbPersonNumber(morph);
  expect(result).toEqual({ person: 3, number: "S" });
});
```

## Coverage Goals

Target coverage by area:
- **Utility functions**: 100%
- **Type definitions**: 100%
- **Parser logic**: 90%+
- **Heuristic algorithms**: 85%+
- **API routes**: 70%+ (integration tests)
- **UI components**: 60%+ (critical paths)

## Continuous Integration

Tests run automatically on:
- Every commit (git hooks)
- Pull request creation
- Before production deployment

## Debugging Tests

```bash
# Run specific test file
pnpm vitest src/test/heuristics.test.ts

# Run tests matching pattern
pnpm vitest --grep="nominative"

# Debug with Node inspector
node --inspect-brk ./node_modules/.bin/vitest run
```

## Test Performance

Current test suite:
- **29 tests** across 5 files
- **~7 seconds** total execution time
- **Zero failures** in current build

## Future Test Additions

Planned test coverage:
- [ ] Component rendering tests
- [ ] User interaction tests
- [ ] SVG annotation rendering tests
- [ ] Dialog confirmation flows
- [ ] Context menu behavior
- [ ] Keyboard navigation
- [ ] Accessibility (a11y) tests
- [ ] E2E tests with Playwright
