package com.cpuz.lite.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpuz.lite.model.MemoryInfo
import com.cpuz.lite.repository.DeviceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MemoryViewModel @Inject constructor(
    private val repo: DeviceRepository
) : ViewModel() {

    private val _memoryInfo = MutableStateFlow(MemoryInfo())
    val memoryInfo: StateFlow<MemoryInfo> = _memoryInfo.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _memoryInfo.value = repo.getMemoryInfo()
        }
    }
}
