# Latnotate

A Latin sentence analyzer powered by Whitaker's Words. Analyze Latin text with automatic grammatical suggestions, visual annotations, and intelligent heuristics.

## Features

- 📖 **Dictionary Lookup** - Look up Latin words with full morphological analysis
- 🔍 **Sentence Analysis** - Automatic word form identification and color-coding
- 🤖 **Smart Heuristics** - AI-like suggestions for subjects, objects, and agreements
- 🎨 **Visual Annotations** - Connect related words with arrows and brackets
- ✅ **Interactive Confirmation** - Review and approve all automatic suggestions
- ⚡ **Incremental Updates** - Suggestions adapt as you work through a sentence

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

### Basic Usage

1. **Analyze a sentence:**
   - Enter Latin text: `Puella pulchram rosam amat`
   - Click "Analyze Sentence"
   - See color-coded words with grammatical tags

2. **Review suggestions:**
   - Look for yellow "?" badges
   - Click "?" to see reasoning
   - Confirm or revoke each guess

3. **Add connections:**
   - Right-click words for context menu
   - Choose connection type
   - Click target word

📚 **For detailed instructions, see [HOW_TO_USE.md](HOW_TO_USE.md)**

## Documentation

- **[HOW_TO_USE.md](HOW_TO_USE.md)** - Complete user guide with examples
- **[TESTING.md](TESTING.md)** - Testing infrastructure and coverage
- **[CONTEXT.md](CONTEXT.md)** - Development context and design decisions

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Latin Parser**: Whitaker's Words (external binary)
- **Testing**: Vitest, Testing Library
- **Build**: Turbopack

## Project Structure

```
latnotate/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main analyzer UI
│   │   ├── api/lookup/        # Whitaker's Words API
│   │   └── layout.tsx         # Root layout
│   ├── components/ui/         # shadcn components
│   ├── lib/
│   │   ├── types.ts           # TypeScript definitions
│   │   └── utils.ts           # Utility functions
│   └── test/                  # Test files
├── bin/words                  # Whitaker's Words binary
├── data/                      # Dictionary data files (*.GEN, *.LAT)
├── whitakers-words/           # Source code and build system
└── public/                    # Static assets
```

## Development

### Available Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run test suite
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Generate coverage report
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate HTML coverage report
pnpm test:coverage
```

**Current Status:** ✅ 38 tests passing in 6 test files

## Features in Detail

### Automatic Heuristics

The system provides intelligent suggestions that adapt to your selections:

1. **Subject-Verb Agreement** - Identifies nominative subjects for 3rd person verbs
2. **Prepositional Objects** - Guesses objects in correct case after prepositions
3. **Reverse Preposition** - Suggests prepositions before accusative/ablative words
4. **Adjacent Agreement** - Connects agreeing words (case, gender, number)
5. **Nominative Phrases** - Intelligently groups adjectives with nouns

All suggestions are marked with "?" and require user confirmation.

### Visual Annotation Types

- **Modification arrows** (gray) - Adjective→noun, adverb→verb
- **Possession arrows** (indigo) - Genitive relationships
- **Brackets** (amber) - Prepositional phrase scope
- **Curved paths** - Non-adjacent connections
- **Straight lines** - Adjacent word connections

### Color-Coded Grammar

- 🔴 Nominative, 🔵 Accusative, 🟢 Dative
- 🟠 Ablative, 🟣 Genitive, 🟣 Locative
- 🔵 Infinitive, 🟡 Adverb, 🌸 Conjunction
- Plus: Prepositions, Pronouns, Numerals, Interjections

## Contributing

Contributions welcome! Please:

1. Read through existing code and documentation
2. Write tests for new features
3. Follow existing code style (ESLint configured)
4. Update documentation as needed

## Deployment

### Vercel Deployment

✅ **The binary is now statically linked** and works on any Linux system including Vercel's Amazon Linux 2.

The `bin/words` binary has no GLIBC dependencies and will deploy without issues.

#### If You Need to Rebuild the Binary

```bash
pnpm run build:binary
```

Or manually:
```bash
cd whitakers-words
LDFLAGS="-static" make clean && make words
cp bin/words ../bin/words
```

See **[QUICK_FIX_VERCEL.md](QUICK_FIX_VERCEL.md)** for details.

## Credits

- **Whitaker's Words** - Latin dictionary and morphological analyzer by William Whitaker
- **Next.js** - React framework by Vercel
- **shadcn/ui** - Component library by shadcn
- **Tailwind CSS** - Utility-first CSS framework

## License

This project uses Whitaker's Words, which is in the public domain. See `whitakers-words/` directory for original license information.

## Version History

- **v0.1.0** - Initial release with full analysis and heuristic features

---

**Need help?** Check [HOW_TO_USE.md](HOW_TO_USE.md) for detailed instructions or open an issue on GitHub.

