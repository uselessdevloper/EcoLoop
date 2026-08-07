package com.cpuz.lite.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpuz.lite.model.*
import com.cpuz.lite.repository.DeviceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repo: DeviceRepository
) : ViewModel() {

    private val _cpuUsage = MutableStateFlow(0f)
    val cpuUsage: StateFlow<Float> = _cpuUsage.asStateFlow()

    private val _ramUsage = MutableStateFlow(0f)
    val ramUsage: StateFlow<Float> = _ramUsage.asStateFlow()

    private val _batteryPct = MutableStateFlow(0)
    val batteryPct: StateFlow<Int> = _batteryPct.asStateFlow()

    private val _storageUsage = MutableStateFlow(0f)
    val storageUsage: StateFlow<Float> = _storageUsage.asStateFlow()

    private val _networkType = MutableStateFlow("None")
    val networkType: StateFlow<String> = _networkType.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            _cpuUsage.value = repo.getCpuInfo().cpuUsagePercent
            val mem = repo.getMemoryInfo()
            _ramUsage.value = mem.usagePercent
            _batteryPct.value = repo.getBatteryInfo().percentage
            _storageUsage.value = repo.getStorageInfo().internalUsagePercent
            _networkType.value = repo.getNetworkInfo().activeNetworkType
        }
    }
}
