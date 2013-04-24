mkdir MSVS\shell
mkdir build\Release\obj\global_intermediate
mkdir build\x64\Release\obj\global_intermediate
cd "third_party\v8\tools"
python "js2c.py" "..\..\..\build\Release\obj\global_intermediate\libraries.cc" "CORE" "off" "../src/runtime.js" "../src/v8natives.js" "../src/array.js" "../src/string.js" "../src/uri.js" "../src/math.js" "../src/messages.js" "../src/apinatives.js" "../src/debug-debugger.js" "../src/mirror-debugger.js" "../src/liveedit-debugger.js" "../src/date.js" "../src/json.js" "../src/regexp.js" "../src/macros.py"
python "js2c.py" "..\..\..\build\Release\obj\global_intermediate\experimental-libraries.cc" "EXPERIMENTAL" "off" "../src/runtime.js" "../src/v8natives.js" "../src/array.js" "../src/string.js" "../src/uri.js" "../src/math.js" "../src/messages.js" "../src/apinatives.js" "../src/debug-debugger.js" "../src/mirror-debugger.js" "../src/liveedit-debugger.js" "../src/date.js" "../src/json.js" "../src/regexp.js" "../src/macros.py"
python "js2c.py" "..\..\..\build\x64\Release\obj\global_intermediate\libraries.cc" "CORE" "off" "../src/runtime.js" "../src/v8natives.js" "../src/array.js" "../src/string.js" "../src/uri.js" "../src/math.js" "../src/messages.js" "../src/apinatives.js" "../src/debug-debugger.js" "../src/mirror-debugger.js" "../src/liveedit-debugger.js" "../src/date.js" "../src/json.js" "../src/regexp.js" "../src/macros.py"
python "js2c.py" "..\..\..\build\x64\Release\obj\global_intermediate\experimental-libraries.cc" "EXPERIMENTAL" "off" "../src/runtime.js" "../src/v8natives.js" "../src/array.js" "../src/string.js" "../src/uri.js" "../src/math.js" "../src/messages.js" "../src/apinatives.js" "../src/debug-debugger.js" "../src/mirror-debugger.js" "../src/liveedit-debugger.js" "../src/date.js" "../src/json.js" "../src/regexp.js" "../src/macros.py"
cd ..\..\..
msbuild MSVS\libadblockplus.sln /m /property:Configuration=Release
build\Release\mksnapshot.exe --log-snapshot-positions --logfile "build\Release\obj\v8_snapshot\snapshot.log" "build\Release\obj\v8_snapshot\snapshot.cc"
build\x64\Release\mksnapshot.exe --log-snapshot-positions --logfile "build\x64\Release\obj\v8_snapshot\snapshot.log" "build\x64\Release\obj\v8_snapshot\snapshot.cc"
msbuild MSVS\libadblockplus.sln /m /property:Configuration=Release