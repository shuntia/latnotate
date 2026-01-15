#!/bin/bash
# Build Whitaker's Words binary statically (no GLIBC dependency)
# This binary will work on any Linux system including Vercel

set -e

echo "Building Whitaker's Words with static linking..."

# Navigate to whitakers-words directory
cd whitakers-words

# Clean previous builds
make clean || true

# Build with static linking
export LDFLAGS="-static"
make words

# Copy binary to project root bin directory
mkdir -p ../bin
cp bin/words ../bin/words

echo ""
echo "✅ Build complete!"
echo "Binary location: ../bin/words"
echo ""
echo "Binary info:"
file ../bin/words
echo ""
echo "Checking if statically linked:"
ldd ../bin/words || echo "✅ Statically linked (no dynamic dependencies)"
echo ""
echo "Binary size:"
ls -lh ../bin/words | awk '{print $5}'

echo ""
echo "To test the binary:"
echo "  cd ../data"
echo "  echo 'puella' | ../bin/words"
