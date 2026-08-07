package com.cpuz.lite.model

data class MemoryInfo(
    val totalRamBytes: Long = 0L,
    val usedRamBytes: Long = 0L,
    val availableRamBytes: Long = 0L,
    val usagePercent: Float = 0f
)
