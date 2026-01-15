# Quick Fix: Vercel GLIBC Error

## Error Message
```
/var/task/bin/words: /lib64/libc.so.6: version `GLIBC_2.38' not found
```

## Immediate Solution

### Option 1: Use GitHub Actions (Easiest)

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **"Build Vercel-Compatible Binary"**
4. Click **"Run workflow"**
5. Wait for completion (~2 minutes)
6. The compatible binary will be automatically committed
7. Push to Vercel or wait for auto-deployment

### Option 2: Manual Build (If you have Ubuntu 20.04)

```bash
# On Ubuntu 20.04 machine
sudo apt-get update
sudo apt-get install -y gnat gprbuild

cd whitakers-words
make clean
make all

cp bin/words ../bin/words

# Commit and push
git add bin/words
git commit -m "Add Vercel-compatible binary"
git push
```

### Option 3: Docker (Advanced)

```bash
# Build in Ubuntu 20.04 container
docker run -it --rm -v $(pwd):/app -w /app ubuntu:20.04 bash

# Inside container:
apt-get update
apt-get install -y gnat gprbuild make
cd whitakers-words
make clean && make
cp bin/words ../bin/words
exit

# Back on host:
git add bin/words
git commit -m "Add Vercel-compatible binary"
git push
```

## Verify Compatibility

Check GLIBC requirements before committing:

```bash
objdump -p bin/words | grep GLIBC_
```

Should show **GLIBC_2.31 or lower** (not 2.38+).

## Why This Happens

- Your local system has **GLIBC 2.38+** (newer Linux)
- Vercel uses **Amazon Linux 2** with **GLIBC 2.26**
- Binaries compiled on newer systems won't run on older systems

## Prevention

Always build production binaries on the target platform or use the GitHub Actions workflow.

---

For complete details, see [BUILD_FOR_VERCEL.md](BUILD_FOR_VERCEL.md)
