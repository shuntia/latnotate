# How to Use Latnotate

## Overview

Latnotate is a Latin sentence analyzer powered by Whitaker's Words. It helps you understand Latin sentences by automatically identifying word forms, suggesting grammatical relationships, and visualizing sentence structure.

## Getting Started

### 1. Basic Word Lookup (Dictionary Tab)

**Purpose:** Look up individual words or multiple words at once.

**How to use:**
1. Click the **"Dictionary"** tab
2. Type Latin words (one per line or space-separated)
3. Click **"Lookup Words"**
4. View definitions, morphologies, and grammatical information

**Example:**
```
puella
ambulat
forum
```

### 2. Sentence Analysis (Sentence Analyzer Tab)

**Purpose:** Analyze complete Latin sentences with automatic grammatical suggestions.

**How to use:**
1. Click the **"Sentence Analyzer"** tab (default)
2. Type or paste a Latin sentence
3. Click **"Analyze Sentence"**
4. Words appear color-coded with grammatical tags

**Example Sentence:**
```
Magna puella ad forum cum amico ambulat
```

## Understanding the Display

### Word Colors & Tags

**Color-Coded Cases:**
- 🔴 **Red (No)** = Nominative
- 🔵 **Blue (Ac)** = Accusative  
- 🟢 **Green (Da)** = Dative
- 🟠 **Orange (Ab)** = Ablative
- 🟣 **Purple (Lo)** = Locative
- 🔴 **Red (Vo)** = Vocative
- 🟣 **Indigo (Ge)** = Genitive

**Other Markers:**
- 🔵 **Cyan (Inf)** = Infinitive
- 🟡 **Yellow (Adv)** = Adverb
- 🌸 **Pink (Conj)** = Conjunction
- 🟤 **Amber (Prep)** = Preposition
- ⚫ **Gray (Int)** = Interjection
- 🟢 **Lime (Pron)** = Pronoun
- 🟢 **Emerald (Num)** = Numeral

**Special Styling:**
- **Underlined** = Verb
- **Dotted underline** = Prefix or suffix (tackon)

### Yellow Question Marks (?)

**What they mean:**
- **"?" on word badge** = Word form was heuristically guessed
- **"?" on connecting line** = Connection was automatically suggested

**How to interact:**
1. Click the **"?"** to see reasoning
2. Dialog shows:
   - What was guessed
   - Why it was guessed
   - The definition/morphology
3. Choose:
   - **"Yes, correct"** = Accept guess (removes "?")
   - **"No, revoke guess"** = Undo the guess
   - **"Cancel"** = Keep "?" and decide later

## Selecting Word Forms

### When Multiple Forms Exist

**Automatic Selection:**
- Words with only ONE possible form are selected automatically
- No "?" appears for unambiguous words

**Manual Selection:**
1. Click on a word with multiple possibilities
2. Dialog appears showing all options
3. Each option shows:
   - Dictionary forms (e.g., "puella, puellae")
   - Part of speech and declension
   - Full definition
   - Available morphologies (e.g., "Nominative Singular Feminine")
4. Click a morphology button to select it

**What happens after selection:**
- Word is colored and tagged immediately
- Automatic heuristics run for related words
- Adjacent words may gain connections
- Related words may be guessed with "?"

## Creating Annotations

### Right-Click Context Menu

**Available on any selected word:**

1. **Connect to Word**
   - Creates a general connection/modification arrow
   - Used for: adjective→noun, adverb→verb
   - Click source word, then target word

2. **Mark Owner (Genitive)** *(only for genitive words)*
   - Creates possession arrow (with arrowhead)
   - Shows what is owned by the genitive
   - Click genitive word, then possessed noun

3. **Mark Scope (Prep)** *(only for prepositions)*
   - Creates brackets showing prepositional phrase scope
   - Click preposition, then last word in phrase
   - Shows as `[preposition ... phrase]`

4. **Clear Annotations**
   - Removes all annotations from selected word

### Annotation Display

**Connection Lines:**
- **Gray line** = Modification/connection
- **Indigo line with arrow** = Possession (genitive)
- **Curved lines** = Non-adjacent words (goes down then across)
- **Straight lines** = Adjacent words (direct connection)
- **Yellow "?" circle** = Guessed connection (clickable)

**Brackets:**
- **`[` `]`** in amber/orange = Prepositional phrase scope

## Automatic Heuristics

The system automatically suggests grammatical relationships. All suggestions show "?".

### Subject-Verb Agreement

**When it triggers:**
- You select a 3rd person verb (e.g., "ambulat")

**What happens:**
- Searches backward for nominative noun
- Matches singular/plural with verb
- Suggests subject with "?"

**Example:**
- Select "ambulat" (3rd person singular)
- → "puella" suggested as nominative singular subject

### Prepositional Objects

**When it triggers:**
- You select a preposition (e.g., "ad", "cum")

**What happens:**
- Searches next 3 words for matching case
- "ad" requires accusative
- "cum" requires ablative
- Suggests object with "?"

**Example:**
- Select "ad"
- → "forum" suggested as accusative object

### Context-Based Preposition Inference

**When it triggers:**
- During automatic analysis or after word selection

**What happens:**
- Detects potential prepositions (like "in", "ab", "cum")
- Checks if following word can match preposition's required case
- Automatically selects correct preposition form
- For ambiguous prepositions ("in" = ABL or ACC):
  - Checks next word's possible cases
  - Selects ACC if next word can be accusative (motion)
  - Selects ABL if next word can be ablative (location)
- Shows "?" on preposition if inferred

**Examples:**
- "in urbem" → "urbem" is accusative → selects "in" as ACC preposition (into)
- "in urbe" → "urbe" can be ablative → selects "in" as ABL preposition (in)
- "ab agricola" → "agricola" can be ablative → selects "ab" as ABL preposition (from)

### Adjacent Agreement

**When it triggers:**
- You select any noun or adjective

**What happens:**
- Checks immediate neighbors (left & right)
- If case/gender/number match, creates connection
- Shows "?" on connecting line

**Example:**
- Select "puella" (nominative singular feminine)
- → Connection to adjacent "magna" (also nom. sg. fem.)

### Participles Treated as Adjectives

**Automatic handling:**
- Participles (verbal adjectives) are treated like adjectives throughout
- They connect to nouns they describe
- They're included in agreement checking
- They can be suggested as substantives (adjectives used as nouns)

**Examples:**
- "miles currens" → "currens" (participle) connects to "miles" (noun)
- "ambulans videt" → "ambulans" can be nominative subject (substantive use)

### Split Color Boxes for Ambiguous Cases

**When displayed:**
- Hover over word with multiple possible cases (before selection)

**What it shows:**
- Box splits into colored sections for each possible case
- Example: Word that could be ABL or DAT shows orange/green split
- Helps visualize grammatical ambiguity at a glance

### Rerun Heuristics

**Available options:**

1. **"Rerun All Heuristics"** button (top of page)
   - Preserves your confirmed selections
   - Only clears rejected heuristics
   - Re-applies all automatic guessing based on current state
   - Useful after manually selecting several words

2. **"Select Range to Rerun Heuristics"** (right-click menu)
   - Click first word, then last word
   - Only reruns heuristics for words in that range
   - Surgical fix for problematic sections
   - Blue overlay shows selected range

### Nominative Phrases

**When it triggers:**
- Initial sentence analysis (before first verb)

**What happens:**
- Finds contiguous nominatives
- One noun + adjectives = suggests entire phrase
- Multiple nouns = suggests first noun + preceding adjectives
- Non-contiguous = suggests only first noun

## Tips & Tricks

### Working Efficiently

1. **Start with the verb** - Selecting the verb often triggers subject guessing
2. **Accept obvious guesses** - Click "?" and confirm to cascade more guesses
3. **Work left to right** - Heuristics work better as context builds
4. **Use right-click for annotations** - Faster than menu navigation

### Understanding Connections

- **Adjacent words connected** = Likely modifier relationship
- **Genitive with arrow** = Shows possession clearly
- **Lines going down-across-up** = Separates crossing connections
- **Brackets** = Visual grouping of prepositional phrases

### When to Override Guesses

**Revoke if:**
- Definition doesn't make sense in context
- Grammar doesn't match (e.g., case agreement wrong)
- You know the less common meaning applies

**Confirm if:**
- Definition fits the sentence
- Grammar is correct
- You want to trigger more automatic guesses

### Keyboard Navigation

- **Tab** = Switch between analyzer and dictionary
- **Click word** = Open selection dialog
- **Right-click word** = Annotation menu
- **Esc** = Close dialogs

## Common Scenarios

### Analyzing "Puella pulchram rosam amat"

1. Type sentence → Click "Analyze Sentence"
2. "amat" selected automatically (one form) → Shows as verb
3. "rosam" guessed as accusative object → Shows "?" 
4. Click "?" on "rosam" → Confirm → "?" removed
5. "pulchram" auto-connected to "rosam" (agreement) → Shows "?"
6. "puella" guessed as nominative subject → Shows "?"
7. Right-click "pulchram" → "Connect to Word" → Click "rosam"

Result: Complete sentence structure visualized!

### Looking Up "Julius Caesar"

**Dictionary Tab:**
1. Type:
   ```
   Julius
   Caesar
   ```
2. Click "Lookup Words"
3. See both entries with:
   - Proper noun declensions
   - Historical context
   - All case forms

### Complex Sentence with Prepositions

**"Ad forum cum amico ambulat"**

1. Select "ambulat" → Subject "?" appears on nearby nominative
2. Select "ad" → "forum" guessed as accusative with "?"
3. Select "cum" → "amico" guessed as ablative with "?"
4. Right-click "ad" → "Mark Scope (Prep)" → Click "forum"
5. Brackets appear: `[ad forum]`

## Troubleshooting

### "No definitions found"

**Possible reasons:**
- Misspelling (Latin is case-sensitive for macrons)
- Word not in Whitaker's dictionary
- Non-classical Latin form

**Try:**
- Check spelling
- Try different capitalization
- Try base form (nominative singular / 1st person present)

### Word has wrong color

**Solution:**
- Click the word to open selection dialog
- Choose the correct morphology
- System will update color and tag

### Too many "?" marks

**This is normal!** The system is being helpful but cautious.

**Options:**
- Confirm correct guesses quickly
- Ignore "?" marks you don't need to verify
- They don't affect functionality

### Annotation lines crossing confusingly

**Solutions:**
- Use brackets for prepositional phrases (cleaner)
- Non-adjacent words use curved paths to reduce crossing
- Adjacent connections use straight lines
- Focus on one relationship at a time

## Advanced Features

### Modifications (Prefixes/Suffixes)

**Detected automatically:**
- Prefix: "con-" in "convenit"
- Tackon: "-que" in "populusque"

**Display:**
- Dotted underline under the prefix/suffix
- Note in word details showing the modification

### Multiple Morphologies

**When a word form is ambiguous:**
- Selection dialog shows ALL possibilities
- Each with full morphological analysis
- Click the one that fits your sentence context

### Frequency Information

**Shown in selection dialog:**
- Very Frequent, Frequent, Common, Lesser, Uncommon, Rare
- Helps identify most likely meaning
- Higher frequency forms listed first

## Getting Help

### Understanding Grammatical Terms

- **Nominative** = Subject case
- **Accusative** = Direct object case
- **Genitive** = Possession case ("of")
- **Dative** = Indirect object case ("to/for")
- **Ablative** = Means/instrument case ("by/with/from")
- **Vocative** = Direct address case ("O ___!")

### Resources

- Hover over word badges for quick info
- Click "?" marks for detailed reasoning
- Check TESTING.md for technical details
- See README.md for installation and development

## Privacy & Data

- All processing happens in your browser or on the server
- No Latin text is stored or transmitted to third parties
- Whitaker's Words runs locally
- No account or login required

---

**Need more help?** Check the GitHub repository for issues and discussions, or refer to the original Whitaker's Words documentation for dictionary-specific questions.
