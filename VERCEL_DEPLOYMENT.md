# Vercel Deployment Guide

## Issue: GLIBC Version Mismatch

The Whitaker's Words binary (`bin/words`) must be compiled for Amazon Linux 2 (Vercel's runtime environment). If you encounter:

```
Error: /var/task/bin/words: /lib64/libc.so.6: version `GLIBC_2.38' not found
```

This means the binary was compiled on a system with a newer GLIBC version than Vercel supports.

## Solution: Build Compatible Binary

### Option 1: Docker Build (Recommended)

Use Docker to build a compatible binary:

```bash
# Run the build script in Amazon Linux 2 container
docker run --rm -v $(pwd):/workspace -w /workspace \
  public.ecr.aws/lambda/provided:al2 \
  bash -c "
    yum install -y gcc gcc-c++ make wget tar gzip && \
    cd whitakers-words && \
    make clean && make && \
    cp bin/words ../bin/words
  "
```

**Note:** This requires GNAT (Ada compiler) to be available or installed in the container. The full installation is complex.

### Option 2: EC2 Instance Build

1. Launch an Amazon Linux 2 EC2 instance
2. Install dependencies:
   ```bash
   sudo yum update -y
   sudo yum install -y gcc gcc-c++ make git
   # Install GNAT compiler for Ada (gprbuild and gnat packages)
   ```
3. Clone the repository
4. Run the build script:
   ```bash
   cd latnotate
   bash scripts/build-for-vercel.sh
   ```
5. Download the generated `bin/words` binary
6. Commit it to your repository

### Option 3: GitHub Actions (Automated)

Create `.github/workflows/build-binary.yml`:

```yaml
name: Build Whitaker's Words Binary

on:
  workflow_dispatch:
  push:
    paths:
      - 'whitakers-words/**'

jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: public.ecr.aws/lambda/provided:al2
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install build dependencies
        run: |
          yum install -y gcc gcc-c++ make wget tar gzip
          # TODO: Install GNAT compiler
      
      - name: Build binary
        run: |
          cd whitakers-words
          make clean
          make
          cp bin/words ../bin/words
      
      - name: Upload binary
        uses: actions/upload-artifact@v3
        with:
          name: words-binary
          path: bin/words
```

## Current Workaround

The simplest current solution:

1. **Build locally in a compatible environment** (Amazon Linux 2)
2. **Commit the binary** to the repository
3. Vercel will use the pre-built binary

## Vercel Configuration

Ensure your `vercel.json` or build configuration includes:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "outputDirectory": ".next"
}
```

## File Structure for Deployment

Required files for Vercel:
```
latnotate/
├── bin/
│   └── words              # Must be compiled for Amazon Linux 2
├── data/                  # Dictionary data files
│   ├── *.GEN
│   └── *.LAT
└── src/app/api/lookup/    # API route
```

## Testing Deployment Locally

To test if your binary will work on Vercel:

```bash
# In Amazon Linux 2 container
docker run --rm -v $(pwd):/app -w /app public.ecr.aws/lambda/provided:al2 \
  bash -c "echo 'puella' | /app/bin/words"
```

## Alternative: Use WebAssembly

For future consideration, compiling Whitaker's Words to WebAssembly would eliminate platform-specific binary issues entirely.

## Resources

- [Amazon Linux 2 Container](https://gallery.ecr.aws/lambda/provided)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Whitaker's Words Build Instructions](whitakers-words/HOWTO.txt)
