package com.cpuz.lite.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpuz.lite.model.DisplayInfo
import com.cpuz.lite.repository.DeviceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DisplayViewModel @Inject constructor(
    private val repo: DeviceRepository
) : ViewModel() {

    private val _displayInfo = MutableStateFlow(DisplayInfo())
    val displayInfo: StateFlow<DisplayInfo> = _displayInfo.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _displayInfo.value = repo.getDisplayInfo()
        }
    }
}
