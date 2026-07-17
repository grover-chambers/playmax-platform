@echo off
cd /d "C:\PLAYMAX\playmax-platform-master with analytical changes\playmax-platform"
npm run build > "C:\PLAYMAX\build_output.txt" 2>&1
echo DONE > "C:\PLAYMAX\build_done.txt"
