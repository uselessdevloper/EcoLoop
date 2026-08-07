package com.cpuz.lite.repository

import com.cpuz.lite.managers.*
import com.cpuz.lite.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceRepository @Inject constructor(
    private val deviceManager: DeviceManager,
    private val cpuManager: CpuManager,
    private val memoryManager: MemoryManager,
    private val batteryManager: BatteryManager,
    private val storageManager: StorageManager,
    private val displayManager: DisplayManager,
    private val sensorManager: SensorManager,
    private val cameraManager: CameraManager,
    private val networkManager: NetworkManager
) {
    suspend fun getDeviceInfo(): DeviceInfo = withContext(Dispatchers.IO) { deviceManager.getDeviceInfo() }
    suspend fun getCpuInfo(): CpuInfo = withContext(Dispatchers.IO) { cpuManager.getCpuInfo() }
    suspend fun getMemoryInfo(): MemoryInfo = withContext(Dispatchers.IO) { memoryManager.getMemoryInfo() }
    suspend fun getBatteryInfo(): BatteryInfo = withContext(Dispatchers.IO) { batteryManager.getBatteryInfo() }
    suspend fun getStorageInfo(): StorageInfo = withContext(Dispatchers.IO) { storageManager.getStorageInfo() }
    suspend fun getDisplayInfo(): DisplayInfo = withContext(Dispatchers.IO) { displayManager.getDisplayInfo() }
    suspend fun getSensorInfo(): SensorInfo = withContext(Dispatchers.IO) { sensorManager.getSensorInfo() }
    suspend fun getCameraInfo(): CameraInfo = withContext(Dispatchers.IO) { cameraManager.getCameraInfo() }
    suspend fun getNetworkInfo(): NetworkInfo = withContext(Dispatchers.IO) { networkManager.getNetworkInfo() }
}
