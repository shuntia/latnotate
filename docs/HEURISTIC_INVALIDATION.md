# Heuristic Invalidation System

## Overview

The heuristic invalidation system automatically undoes heuristic inferences when user actions invalidate them. For example, if a word was heuristically inferred to be an adjective but the user manually selects it as an adverb, all adjective-related heuristics are automatically undone.

## How It Works

### 1. Change Detection

When a user manually selects a definition for a word, the system detects what changed:

- **Part of Speech**: e.g., Adjective → Adverb
- **Case**: e.g., Nominative → Accusative
- **Gender**: e.g., Masculine → Feminine
- **Number**: e.g., Singular → Plural
- **Person**: e.g., 1st → 3rd (for verbs)

### 2. Heuristic Identification

Based on the detected changes, the system identifies which heuristics are now invalid:

| Change | Invalidated Heuristics |
|--------|----------------------|
| Part of Speech (Adjective → Other) | `adjective-agreement`, `adjective-connection` |
| Part of Speech (Participle → Other) | `participle-brace` |
| Part of Speech (Nominative → Other) | `nominative-subject`, `nominative-chunk` |
| Part of Speech (Preposition → Other) | `preposition-bracket`, `preposition-object` |
| Case (any change) | Case-specific heuristics |
| Gender/Number | `adjective-agreement`, `apposition` |
| Person | `nominative-subject` |

### 3. Undo Operations

The system undoes invalid heuristics in two ways:

**Direct Invalidation**: Removes heuristic annotations and selections from the changed word

**Dependent Invalidation**: Removes heuristics from other words that relied on the changed word

For example:
- User marks "puella" as nominative
- System infers "bona" as agreeing adjective (nominative)
- User changes "puella" to accusative
- System automatically removes the nominative marking from "bona"

### 4. User Feedback

When heuristics are invalidated, the system shows a toast notification:

```
ℹ️ Undoing 2 invalidated heuristics
   Heuristics that depended on the old selection have been removed.
```

### 5. Reapplication

After undoing invalid heuristics, the system automatically reruns heuristics for the modified word and its context to apply new valid inferences.

## Heuristic Types

The system tracks these heuristic types:

- `adjective-agreement`: Word marked as agreeing adjective
- `adjective-connection`: Connection between adjective and noun
- `nominative-subject`: Word marked as nominative subject
- `nominative-chunk`: Nominative words grouped together
- `genitive-possession`: Genitive pointing to possessed noun
- `preposition-object`: Word marked as prepositional object
- `preposition-bracket`: Preposition scope bracketing
- `adjacent-connection`: Adjacent word connection
- `participle-brace`: Participle describing noun
- `que-et`: -que → et prepending
- `apposition`: Words in apposition
- `sum-form`: Form of sum

## Implementation Details

### Core Functions

**`detectChanges(oldWord, newWord)`**
- Compares two word states
- Returns object with boolean flags for each type of change

**`getInvalidatedHeuristics(word, wordIndex, changes)`**
- Takes detected changes
- Returns array of heuristic types to invalidate
- Uses word's `heuristic` string to identify applied heuristics

**`undoHeuristicsForWord(words, wordIndex, heuristicsToUndo)`**
- Removes heuristic selections and annotations
- Preserves manual annotations (those without `heuristic` field)
- Returns updated word array

**`undoDependentHeuristics(words, changedWordIndex)`**
- Uses `dependentWords` Set to find affected words
- Removes heuristic selections from dependent words
- Removes annotations pointing to changed word
- Returns updated word array

### Data Tracking

Each `SentenceWord` tracks:

```typescript
interface SentenceWord {
  // Heuristic tracking
  guessed?: boolean;           // Word selection was heuristic
  heuristic?: string;          // Explanation of the heuristic
  
  // Dependency tracking
  dependentWords?: Set<number>; // Words depending on this
  rejectedHeuristics?: Set<string>; // Rejected heuristics
}
```

Each `Annotation` tracks:

```typescript
interface Annotation {
  heuristic?: string;          // If present, annotation is heuristic
}
```

## Examples

### Example 1: Adjective → Adverb

**Initial State:**
- "bene" inferred as adjective (nominative) by agreement with "puella"
- Connected to "puella" with modify arrow

**User Action:**
- Selects "bene" as adverb (indeclinable)

**System Response:**
1. Detects: Part of speech changed, case changed
2. Invalidates: `adjective-agreement`, `adjective-connection`
3. Removes: Agreement selection, modify arrow
4. Shows toast: "Undoing 2 invalidated heuristics"
5. Reruns: Adverb-specific heuristics

### Example 2: Nominative → Accusative

**Initial State:**
- "puella" inferred as nominative subject of "amat"
- "bona" inferred as nominative adjective agreeing with "puella"

**User Action:**
- Selects "puella" as accusative

**System Response:**
1. Detects: Case changed
2. Invalidates: `nominative-subject`, `nominative-chunk`
3. Removes: Nominative marking from "puella"
4. Dependent undo: Removes nominative marking from "bona" (depends on "puella")
5. Shows toast: "Undoing invalidated heuristics"
6. Reruns: Accusative-related heuristics (preposition objects, etc.)

### Example 3: Clear Selection

**Initial State:**
- "agricola" selected as ablative with preposition bracket from "cum"
- Multiple dependent heuristics applied

**User Action:**
- Clicks "Clear" button

**System Response:**
1. Counts heuristic annotations
2. Shows toast if any heuristics present
3. Undoes all dependent heuristics
4. Removes all heuristic annotations (keeps manual ones)
5. Clears selection

## Benefits

1. **Consistency**: Ensures heuristic inferences remain logically consistent
2. **User Control**: Users can correct mistakes without cascading errors
3. **Transparency**: Toast notifications show when heuristics are undone
4. **Efficiency**: Automatic reapplication of valid heuristics
5. **Intelligence**: System understands grammatical dependencies

## Testing

The system includes comprehensive tests covering:

- Change detection for all morphological features
- Heuristic invalidation logic
- Undo operations for each heuristic type
- Dependent word tracking
- Annotation filtering (keep manual, remove heuristic)

Run tests with:
```bash
pnpm test heuristic-invalidation
```

All 10 tests pass, covering various scenarios of heuristic invalidation.
