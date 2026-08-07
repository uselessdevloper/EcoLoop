# CPU-Z Lite — Project Memory

> This file is the living context for the CPU-Z Lite project. Updated as the project evolves.

---

## Project Identity

| Field | Value |
|---|---|
| **Project Name** | CPU-Z Lite |
| **Platform** | Android (Native Kotlin + Jetpack Compose) |
| **Architecture** | MVVM + Repository Pattern |
| **DI Framework** | Hilt 2.51.1 |
| **Async** | Kotlin Coroutines + StateFlow |
| **UI Framework** | Jetpack Compose + Material 3 |
| **Min SDK** | 26 (Android 8.0) |
| **Target SDK** | 34 (Android 14) |
| **Package Name** | `com.cpuz.lite` |
| **Build System** | Gradle 8.7 + AGP 8.5.0 |
| **Code Status** | ✅ ALL FILES WRITTEN & COMPILED SUCCESSFUL |

---

## Build Environment

| Tool | Location | Status |
|---|---|---|
| Android CLI | `C:\Users\cavij\AppData\AndroidCLI\android.exe` | ✅ Installed |
| Android SDK | `C:\Users\cavij\AppData\Local\Android\Sdk` | ✅ Present |
| Android Emulator | `medium_phone` (Profile: medium_phone) | ✅ Created & Configured |
| JDK | `C:\Users\cavij\AppData\Roaming\.minecraft\runtime\java-runtime-delta\windows\java-runtime-delta` (JDK 21) | ✅ Active |

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | Kotlin (Native Android) | Deep integration with android.os APIs |
| UI Toolkit | Jetpack Compose | Modern declarative UI, reactive StateFlow |
| DI | Hilt | DI standard provider injection |
| System Managers | `com.cpuz.lite.managers.*` | Separate logic for querying different Android sensors/APIs |
| Spec Dumper | Instrumentation Test (`SpecDumperTest.kt`) | Runs tests on-device to dump accurate specs to terminal |
| Dumper Script | `dump_specs.ps1` | Automation shell runner script |

---

## Complete File Inventory

### Build & Project Config
- `settings.gradle.kts`
- `build.gradle.kts`
- `local.properties`
- `gradle.properties`
- `gradle/libs.versions.toml`
- `app/build.gradle.kts`
- `app/src/main/AndroidManifest.xml`
- `app/src/main/res/values/strings.xml`
- `app/src/main/res/values/themes.xml`

### Data Models (`com.cpuz.lite.model`)
- `DeviceInfo.kt`, `CpuInfo.kt`, `MemoryInfo.kt`, `BatteryInfo.kt`, `StorageInfo.kt`, `DisplayInfo.kt`, `SensorInfo.kt`, `NetworkInfo.kt`, `CameraInfo.kt`

### Managers (`com.cpuz.lite.managers`)
- `DeviceManager.kt`, `CpuManager.kt`, `MemoryManager.kt`, `BatteryManager.kt`, `StorageManager.kt`, `DisplayManager.kt`, `SensorManager.kt`, `CameraManager.kt`, `NetworkManager.kt`

### ViewModels & UI
- `DeviceRepository.kt`
- `DashboardViewModel.kt`, `DeviceViewModel.kt`, `CpuViewModel.kt`, `MemoryViewModel.kt`, `BatteryViewModel.kt`, `StorageViewModel.kt`, `SensorViewModel.kt`, `NetworkViewModel.kt`, `DisplayViewModel.kt`, `CameraViewModel.kt`
- `ui/theme/Color.kt`, `ui/theme/Theme.kt`, `ui/theme/Type.kt`
- `ui/components/InfoCard.kt`, `ui/components/UsageBar.kt`
- `ui/screens/DashboardScreen.kt`, `ui/screens/DeviceScreen.kt`, `ui/screens/CpuScreen.kt`, `ui/screens/MemoryScreen.kt`, `ui/screens/BatteryScreen.kt`, `ui/screens/StorageScreen.kt`, `ui/screens/DisplayScreen.kt`, `ui/screens/SensorScreen.kt`, `ui/screens/NetworkScreen.kt`, `ui/screens/CameraScreen.kt`, `ui/screens/AboutScreen.kt`
- `ui/navigation/Screen.kt`
- `MainActivity.kt`
- `CpuZApplication.kt`

### Scripts & Testing
- `app/src/androidTest/java/com/cpuz/lite/SpecDumperTest.kt`
- `dump_specs.ps1`
- `APK/CPU-Z-Lite.apk` (Copied standalone installer)

---

## Progress Log

| Milestone | Status |
|---|---|
| Implementation of CPU-Z Lite architecture | Completed ✅ |
| Recreate Gradle wrapper scripts & properties | Completed ✅ |
| Resolve catalog accessor hyphen errors | Completed ✅ |
| Resolve useAndroidX properties error | Completed ✅ |
| Run dumper script (compile -> deploy -> test run -> fetch JSON) | Completed ✅ |
| Copy compiled APK to dedicated /APK folder | Completed ✅ |
