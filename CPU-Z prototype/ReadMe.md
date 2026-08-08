# CPU-Z Lite

CPU-Z Lite is a native Android application designed to query, format, and display detailed hardware and system specifications of an Android device. Built with modern Android development practices, it provides a clean, user-friendly dashboard using Jetpack Compose and displays deep system level telemetry.

---

## 🛠️ Tech Stack & Architecture

- **Language:** Kotlin (Native Android)
- **UI Toolkit:** Jetpack Compose + Material 3 Design
- **Architecture:** MVVM (Model-View-ViewModel) + Repository Pattern
- **Dependency Injection:** Hilt (2.51.1)
- **Asynchronous/Reactive Flow:** Kotlin Coroutines + StateFlow
- **Minimum SDK:** 26 (Android 8.0)
- **Target SDK:** 34 (Android 14)
- **Build System:** Gradle 8.7 + Android Gradle Plugin (AGP) 8.5.0

---

## 📱 Features & Telemetry Modules

CPU-Z Lite queries and displays information across 9 system categories:

1. **Device Info:** Manufacturer, model, brand, Android OS version, API level, kernel version, and build info.
2. **CPU Specs:** Processor model name, architecture type, core count, active core usage metrics, and supported ABIs.
3. **Memory (RAM):** Real-time RAM statistics including total capacity, used RAM, and available RAM.
4. **Battery Health:** Level/percentage, status (charging/discharging), health status, temperature, voltage, and battery technology (e.g., Li-ion).
5. **Storage:** Internal storage breakdown including total size, space consumed, and free space available.
6. **Display:** Resolution, pixel density (DPI), screen refresh rate (Hz), and calculated physical size in inches.
7. **Sensors:** Live detection and status check of critical sensors (Accelerometer, Gyroscope, Magnetometer, Proximity, Light, Pressure, Step Counter).
8. **Network:** Connectivity state (Wi-Fi/Mobile), Wi-Fi SSID, RSSI (signal strength), IP address, cellular operator name, and Bluetooth state.
9. **Camera:** Total available cameras count.

---

## 📁 Repository Structure

```text
a:/CPU-Z prototype/
├── .gradle/                    # Gradle cache files
├── APK/                        # Compiled distribution APK
│   └── CPU-Z-Lite.apk          # Installable release/debug package
├── app/
│   ├── build.gradle.kts        # App-level Gradle dependencies and configuration
│   ├── src/
│   │   ├── androidTest/        # Instrumentation tests (e.g., SpecDumperTest.kt)
│   │   └── main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/cpuz/lite/
│   │           ├── CpuZApplication.kt
│   │           ├── MainActivity.kt
│   │           ├── managers/   # System service managers (queries Android hardware APIs)
│   │           ├── model/      # Strongly-typed data models for hardware metrics
│   │           ├── repository/ # Data fetch layers
│   │           ├── ui/         # Composed screens, navigations, and styles
│   │           └── viewmodel/  # ViewModels supplying reactive StateFlow data to the UI
├── docs/
│   └── README.md               # Project documentation (this file)
├── dump_specs.ps1              # Automation script to compile, run on-device, and extract JSON specs
├── build.gradle.kts            # Project-level Gradle build configuration
├── settings.gradle.kts         # Gradle project inclusions
└── local.properties            # Local Android SDK pathways
```

---

## 🚀 Getting Started

### Prerequisites
1. **Java Development Kit (JDK):** JDK 21 is recommended.
2. **Android SDK:** Installed and configured (path specified in `local.properties`).
3. **Android Virtual Device (AVD) / Physical Device:** USB debugging must be enabled if using a physical device.

### 1. Build and Run the App
Open the project root directory in a terminal or in Android Studio, then build/run using standard Gradle commands or through the IDE UI.

### 2. Extract Device Hardware Report to Terminal
A pre-configured automation script `dump_specs.ps1` runs the app's instrumentation tests on-device, extracts raw specifications, and prints them as a formatted JSON report.

#### For Command Prompt (CMD):
```cmd
powershell -ExecutionPolicy Bypass -File .\dump_specs.ps1
```

#### For PowerShell:
```powershell
.\dump_specs.ps1
```

#### Example Report Output:
```json
{
  "Device": {
    "Brand": "google",
    "Manufacturer": "Google",
    "Model": "sdk_gphone64_x86_64",
    "DeviceName": "emu64xa",
    "Product": "sdk_gphone64_x86_64",
    "AndroidVersion": "16",
    "ApiLevel": 36,
    "SecurityPatch": "2025-07-05",
    "KernelVersion": "6.6.66-android15-8-gb66429556fb8-ab13070261",
    "BuildNumber": "BE2A.250530.026.D1"
  },
  "CPU": {
    "Processor": "13th Gen Intel(R) Core(TM) i5-13420H",
    "Architecture": "x86_64",
    "SupportedAbi": "x86_64",
    "Cores": 4,
    "Usage": "0.0%"
  },
  ...
}
```
