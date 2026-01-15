# Building for Vercel Deployment

## The Problem

Vercel's serverless functions run on **Amazon Linux 2**, which has **GLIBC 2.26**. If your local binary was compiled on a newer system (GLIBC 2.38+), it won't work on Vercel.

## Quick Solutions

### Solution 1: Use Pre-Built Compatible Binary (Fastest)

Download a pre-compiled binary that works on Amazon Linux 2:

**TODO:** The project needs a compatible binary to be built and committed to the repository.

### Solution 2: Build in Compatible Environment

#### Using Docker (Recommended if you have Docker installed):

```bash
# 1. Start an Amazon Linux 2 container
docker run -it --rm -v $(pwd):/workspace \
  amazonlinux:2 bash

# 2. Inside the container, install dependencies:
yum update -y
yum install -y gcc gcc-c++ make wget tar

# 3. Install GNAT compiler (required for Ada):
# Unfortunately, GNAT is not in Amazon Linux 2 repos
# You would need to compile it from source or find a pre-built version
```

#### The Challenge:
Amazon Linux 2 doesn't have GNAT (Ada compiler) in its repositories, making this difficult.

### Solution 3: GitHub Actions (Best Long-Term)

Add a GitHub Actions workflow to automatically build the binary:

Create `.github/workflows/build-words-binary.yml`:

```yaml
name: Build Words Binary for Vercel

on:
  workflow_dispatch:  # Manual trigger

jobs:
  build:
    runs-on: ubuntu-20.04  # Has GLIBC 2.31, compatible with AL2
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install GNAT
        run: |
          sudo apt-get update
          sudo apt-get install -y gnat gprbuild
      
      - name: Build binary
        run: |
          cd whitakers-words
          make clean
          make
          cp bin/words ../bin/words-linux-glibc231
      
      - name: Check binary
        run: |
          file bin/words-linux-glibc231
          ldd bin/words-linux-glibc231
      
      - name: Commit binary
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add bin/words-linux-glibc231
          git commit -m "Add AL2-compatible binary" || echo "No changes"
          git push
```

## Current Workaround

For immediate deployment:

1. **Build on Ubuntu 20.04** (which has GLIBC 2.31, compatible with AL2):
   ```bash
   # On Ubuntu 20.04 or similar
   sudo apt-get install gnat gprbuild
   cd whitakers-words
   make clean && make
   cp bin/words ../bin/words
   ```

2. **Commit the binary** to your repo

3. **Deploy to Vercel**

## Verifying Compatibility

Test your binary's GLIBC requirements:

```bash
ldd bin/words
objdump -p bin/words | grep GLIBC
```

The highest GLIBC version required should be **2.31 or lower** for Amazon Linux 2 compatibility.

## Alternative: Statically Linked Binary

If possible, compile a statically-linked binary (no GLIBC dependency):

```bash
cd whitakers-words
# Add -static to linker flags
export LDFLAGS="-static"
make clean && make
```

Note: Static linking with GNAT may not be straightforward.

## Future Improvement: WebAssembly

Consider porting Whitaker's Words to WebAssembly to eliminate platform-specific binary issues entirely. This would run directly in the Node.js runtime.
