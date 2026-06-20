import shutil, os

src = r"e:\code\plugins\zhao-course\zhao-point-src"
dst = r"e:\code\plugins\zhao-point"

# remove existing
if os.path.exists(dst):
    shutil.rmtree(dst)

# copy everything
shutil.copytree(src, dst)
print(f"OK: copied {src} -> {dst}")

# verify
count = 0
for root, dirs, files in os.walk(dst):
    for f in files:
        count += 1
print(f"Total files: {count}")
