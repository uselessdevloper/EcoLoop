package com.cpuz.lite

import android.content.Context
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.cpuz.lite.managers.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SpecDumperTest {

    @Test
    fun dumpDeviceSpecifications() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext

        val deviceManager = DeviceManager()
        val cpuManager = CpuManager()
        val memoryManager = MemoryManager(appContext)
        val batteryManager = BatteryManager(appContext)
        val storageManager = StorageManager()
        val displayManager = DisplayManager(appContext)
        val sensorManager = SensorManager(appContext)
        val cameraManager = CameraManager(appContext)
        val networkManager = NetworkManager(appContext)

        val device = deviceManager.getDeviceInfo()
        val cpu = cpuManager.getCpuInfo()
        val memory = memoryManager.getMemoryInfo()
        val battery = batteryManager.getBatteryInfo()
        val storage = storageManager.getStorageInfo()
        val display = displayManager.getDisplayInfo()
        val sensor = sensorManager.getSensorInfo()
        val camera = cameraManager.getCameraInfo()
        val network = networkManager.getNetworkInfo()

        val json = """
        {
          "Device": {
            "Brand": "${device.brand}",
            "Manufacturer": "${device.manufacturer}",
            "Model": "${device.model}",
            "DeviceName": "${device.deviceName}",
            "Product": "${device.product}",
            "AndroidVersion": "${device.androidVersion}",
            "ApiLevel": ${device.apiLevel},
            "SecurityPatch": "${device.securityPatch}",
            "KernelVersion": "${device.kernelVersion}",
            "BuildNumber": "${device.buildNumber}"
          },
          "CPU": {
            "Processor": "${cpu.processorName}",
            "Architecture": "${cpu.cpuArchitecture}",
            "SupportedAbi": "${cpu.supportedAbi}",
            "Cores": ${cpu.coreCount},
            "Usage": "${cpu.cpuUsagePercent}%"
          },
          "Memory": {
            "TotalRam": "${(memory.totalRamBytes / 1024.0 / 1024.0 / 1024.0)} GB",
            "UsedRam": "${(memory.usedRamBytes / 1024.0 / 1024.0 / 1024.0)} GB",
            "AvailableRam": "${(memory.availableRamBytes / 1024.0 / 1024.0 / 1024.0)} GB"
          },
          "Battery": {
            "Percentage": ${battery.percentage},
            "Status": "${battery.status}",
            "Health": "${battery.health}",
            "Temperature": "${battery.temperatureCelsius} °C",
            "Voltage": "${battery.voltageMv} mV",
            "Technology": "${battery.technology}"
          },
          "Storage": {
            "TotalInternal": "${(storage.internalTotalBytes / 1024.0 / 1024.0 / 1024.0)} GB",
            "UsedInternal": "${(storage.internalUsedBytes / 1024.0 / 1024.0 / 1024.0)} GB",
            "FreeInternal": "${(storage.internalFreeBytes / 1024.0 / 1024.0 / 1024.0)} GB"
          },
          "Display": {
            "Resolution": "${display.resolution}",
            "Density": "${display.densityDpi} DPI",
            "RefreshRate": "${display.refreshRateHz} Hz",
            "Size": "${display.sizeInches} Inches"
          },
          "Sensors": {
            "Accelerometer": ${sensor.hasAccelerometer},
            "Gyroscope": ${sensor.hasGyroscope},
            "Magnetometer": ${sensor.hasMagnetometer},
            "Proximity": ${sensor.hasProximity},
            "Light": ${sensor.hasLight},
            "Pressure": ${sensor.hasPressure},
            "StepCounter": ${sensor.hasStepCounter}
          },
          "Network": {
            "WiFiConnected": ${network.isWifiConnected},
            "WiFiSSID": "${network.wifiSsid}",
            "WiFiRSSI": ${network.wifiRssi},
            "IPAddress": "${network.wifiIpAddress}",
            "MobileConnected": ${network.isMobileConnected},
            "MobileType": "${network.mobileNetworkType}",
            "SIMOperator": "${network.simOperatorName}",
            "BluetoothEnabled": ${network.isBluetoothEnabled}
          },
          "Camera": {
            "CameraCount": ${camera.cameraCount}
          }
        }
        """.trimIndent()

        Log.i("SPEC_DUMPER_RESULT", "START_METADATA_DUMP")
        Log.i("SPEC_DUMPER_RESULT", json)
        Log.i("SPEC_DUMPER_RESULT", "END_METADATA_DUMP")
    }
}
