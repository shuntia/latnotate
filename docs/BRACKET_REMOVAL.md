# Bracket Annotation Removal

## Issue

Previously, when removing bracket annotations (preposition scope), only one side of the bracket would be removed, leaving orphaned `[` or `]` characters.

## Solution

Implemented bidirectional bracket removal that ensures both brackets are removed when either is cleared.

### Changes Made

#### 1. Clickable Brackets

Both opening `[` and closing `]` brackets are now clickable:

```tsx
// Opening bracket
<span 
  className="text-amber-600 font-bold text-2xl mr-1 select-none cursor-pointer hover:text-amber-800"
  title="Click to remove bracket"
  onClick={(e) => {
    e.stopPropagation();
    // Remove the entire annotation
    newWords[prepIndex].annotations.splice(annIndex, 1);
    setAnalyzerWords(newWords);
    toast.info("Removed preposition bracket");
  }}
>
  [
</span>

// Closing bracket - similar implementation
```

**Features:**
- Hover effect (text darkens)
- Tooltip explaining functionality
- Toast notification on removal
- Event propagation stopped to prevent word selection

#### 2. Enhanced Clear Connections

**Clear Outgoing Connections:**
- Detects `preposition-scope` annotations
- Shows toast notification when removing brackets
- Clears all outgoing annotations from the word

**Clear Incoming Connections:**
- Checks if word is within bracket range (`targetIndex` to `endIndex`)
- Removes bracket if word is start, end, or anywhere in between
- More comprehensive range checking:

```typescript
if (ann.type === "preposition-scope") {
  if (ann.targetIndex !== undefined && ann.endIndex !== undefined) {
    const inRange = targetIdx >= ann.targetIndex && targetIdx <= ann.endIndex;
    if (inRange) {
      // Remove the entire bracket
      return false;
    }
  }
}
```

#### 3. Heuristic Invalidation

Updated `undoHeuristicsForWord` to properly handle bracket removal:

```typescript
case "preposition-bracket":
  newWords.forEach((w) => {
    w.annotations = w.annotations.filter(ann => {
      if (ann.type === "preposition-scope") {
        if (ann.targetIndex !== undefined && ann.endIndex !== undefined) {
          const inRange = wordIndex >= ann.targetIndex && wordIndex <= ann.endIndex;
          if (inRange || ann.targetIndex === wordIndex || ann.endIndex === wordIndex) {
            return false; // Remove entire bracket
          }
        }
      }
      return true;
    });
  });
  break;
```

### Preposition Scope Structure

A `preposition-scope` annotation is stored on the **preposition word** and has:

```typescript
interface Annotation {
  type: "preposition-scope";
  targetIndex: number;  // Start of scope (word after preposition)
  endIndex: number;     // End of scope (last word in bracket)
  heuristic?: string;   // If heuristically guessed
}
```

Example: "cum agricola bono"
- Preposition "cum" at index 0
- Annotation: `{ type: "preposition-scope", targetIndex: 1, endIndex: 2 }`
- Renders: `cum [ agricola bono ]`

### User Experience

**Before:**
- Right-clicking and clearing connections might leave orphaned brackets
- No direct way to remove brackets
- Unclear which word owns the bracket

**After:**
- Click either `[` or `]` to remove entire bracket
- Right-click any word in bracket range → "Clear Incoming" removes bracket
- Toast notification confirms removal
- Hover effect shows brackets are interactive
- Consistent with other annotation removal patterns (et-prefix, arrows)

### Testing

All existing tests pass (112 tests), including:
- Heuristic invalidation tests
- Preposition bracket tests
- Dependency tracking tests

No new tests added as the change is UI-focused, but the underlying logic is covered by existing invalidation tests.

## Example Workflow

1. **Sentence**: "cum agricola bono"
2. **Heuristic**: Creates bracket `cum [ agricola bono ]`
3. **User action**: Clicks on `]`
4. **Result**: 
   - Entire annotation removed
   - Both brackets disappear
   - Toast: "Removed preposition bracket"
   - Clean sentence display: "cum agricola bono"

## Related Files

- `src/app/page.tsx`: Bracket rendering and click handlers (lines ~1521-1590)
- `src/lib/heuristics/invalidation.ts`: Bracket invalidation logic (lines 198-213)
- `src/lib/types/sentence.ts`: Annotation type definition
