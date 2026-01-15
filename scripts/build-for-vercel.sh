#!/bin/bash
# Build Whitaker's Words binary for Amazon Linux 2 (Vercel compatibility)
# This script should be run in an Amazon Linux 2 environment (Docker container or EC2)

set -e

echo "Building Whitaker's Words for Amazon Linux 2..."
echo "Current GLIBC version:"
ldd --version | head -1

# Navigate to whitakers-words directory
cd whitakers-words

# Clean previous builds
make clean || true

# Build all commands and data
make all

# Copy binary to project root bin directory
mkdir -p ../bin
cp bin/words ../bin/words

echo "Build complete!"
echo "Binary location: ../bin/words"
echo "Binary info:"
file ../bin/words
ldd ../bin/words || true

echo ""
echo "To test the binary:"
echo "  cd .."
echo "  echo 'puella' | bin/words"
