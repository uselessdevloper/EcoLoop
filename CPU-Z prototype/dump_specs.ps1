# dump_specs.ps1
# Script to build, deploy, run the instrumentation spec-dumper test, and output raw specifications to terminal.

$ErrorActionPreference = "Stop"

$sdkPath = "C:\Users\cavij\AppData\Local\Android\Sdk"
$adb = "$sdkPath\platform-tools\adb.exe"
$emulator = "$sdkPath\emulator\emulator.exe"
$minecraftJava = "C:\Users\cavij\AppData\Roaming\.minecraft\runtime\java-runtime-delta\windows\java-runtime-delta"

Write-Host "--- CPU-Z Lite Spec Dumper ---" -ForegroundColor Cyan

# 1. Check if emulator is running, if not start it
Write-Host "Checking for connected Android devices..." -ForegroundColor Yellow
$devices = & $adb devices
$deviceCount = ($devices | Measure-Object -Line).Lines - 3 # Exclude header, daemon logs, empty line

if ($deviceCount -le 0) {
    Write-Host "No active devices detected. Launching emulator 'medium_phone'..." -ForegroundColor Cyan
    & "C:\Users\cavij\AppData\AndroidCLI\android.exe" emulator start medium_phone
}

Write-Host "Device is online!" -ForegroundColor Green

# 2. Compile APKs
Write-Host "Compiling Android application and test suites..." -ForegroundColor Yellow
$env:JAVA_HOME = $minecraftJava
& .\gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Gradle compilation failed." -ForegroundColor Red
    exit 1
}
Write-Host "Compilation successful!" -ForegroundColor Green

# 3. Install APKs
Write-Host "Installing application and test suite to device..." -ForegroundColor Yellow
& $adb install -r "app/build/outputs/apk/debug/app-debug.apk"
& $adb install -r "app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk"

# 4. Request Permissions
Write-Host "Granting required permissions..." -ForegroundColor Yellow
& $adb shell pm grant com.cpuz.lite android.permission.ACCESS_FINE_LOCATION 2>$null
& $adb shell pm grant com.cpuz.lite android.permission.READ_PHONE_STATE 2>$null
& $adb shell pm grant com.cpuz.lite android.permission.CAMERA 2>$null
if ($PSVersionTable.PSVersion.Major -ge 5) {
    & $adb shell pm grant com.cpuz.lite android.permission.BLUETOOTH_CONNECT 2>$null
}

# 5. Run instrumentation test and capture logcat output
Write-Host "Executing on-device spec dumper..." -ForegroundColor Yellow
# Clear logcat first
& $adb logcat -c

# Start the instrumentation test in background
Start-Process -FilePath $adb -ArgumentList "shell am instrument -w -e class com.cpuz.lite.SpecDumperTest com.cpuz.lite.test/androidx.test.runner.AndroidJUnitRunner" -NoNewWindow -Wait

# Extract the spec logs
Write-Host "Retrieving specifications..." -ForegroundColor Green
$logLines = & $adb logcat -d -s SPEC_DUMPER_RESULT:I

# Parse and print only the JSON output
$printing = $false
$jsonOutput = @()
foreach ($line in $logLines) {
    if ($line -match "START_METADATA_DUMP") {
        $printing = $true
        continue
    }
    if ($line -match "END_METADATA_DUMP") {
        $printing = $false
        break
    }
    if ($printing) {
        # Clean logcat header
        $cleanLine = $line -replace "^.*SPEC_DUMPER_RESULT:\s*", ""
        $jsonOutput += $cleanLine
    }
}

if ($jsonOutput.Count -gt 0) {
    Write-Host "`n=================== DEVICE HARDWARE REPORT ===================" -ForegroundColor Magenta
    $jsonOutput -join "`n"
    Write-Host "==============================================================`n" -ForegroundColor Magenta
} else {
    Write-Host "Error: No metadata dump found in logcat." -ForegroundColor Red
}
