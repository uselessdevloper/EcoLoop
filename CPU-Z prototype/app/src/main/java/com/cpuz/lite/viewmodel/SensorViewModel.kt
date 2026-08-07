package com.cpuz.lite.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpuz.lite.model.SensorInfo
import com.cpuz.lite.repository.DeviceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SensorViewModel @Inject constructor(
    private val repo: DeviceRepository
) : ViewModel() {

    private val _sensorInfo = MutableStateFlow(SensorInfo())
    val sensorInfo: StateFlow<SensorInfo> = _sensorInfo.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _sensorInfo.value = repo.getSensorInfo()
        }
    }
}
