package com.cpuz.lite.managers

import android.os.Build
import com.cpuz.lite.model.DeviceInfo
import java.io.BufferedReader
import java.io.FileReader
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceManager @Inject constructor() {

    fun getDeviceInfo(): DeviceInfo {
        return DeviceInfo(
            brand = Build.BRAND,
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL,
            deviceName = Build.DEVICE,
            product = Build.PRODUCT,
            androidVersion = Build.VERSION.RELEASE,
            apiLevel = Build.VERSION.SDK_INT,
            securityPatch = Build.VERSION.SECURITY_PATCH,
            kernelVersion = getKernelVersion(),
            buildNumber = Build.DISPLAY
        )
    }

    private fun getKernelVersion(): String {
        return try {
            val reader = BufferedReader(FileReader("/proc/version"))
            val line = reader.readLine() ?: ""
            reader.close()
            val match = Regex("Linux version ([^ ]+)").find(line)
            match?.groupValues?.getOrNull(1)?.let { "Linux $it" } ?: line.take(80)
        } catch (e: Exception) {
            System.getProperty("os.version") ?: "Unknown"
        }
    }
}
