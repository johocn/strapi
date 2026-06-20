@echo off
cd /d E:\code\plugins\zhao-channel
echo === Current dir ===
echo %CD%
echo === Check dist folder ===
if exist dist (
    echo dist folder EXISTS
    dir /s /b dist
) else (
    echo dist folder NOT FOUND
)
echo === Check admin folder ===
if exist admin\src (
    echo admin\src EXISTS
) else (
    echo admin\src NOT FOUND
)
echo === Done ===