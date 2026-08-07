package com.cpuz.lite.model

data class StorageInfo(
    val internalTotalBytes: Long = 0L,
    val internalUsedBytes: Long = 0L,
    val internalFreeBytes: Long = 0L,
    val internalUsagePercent: Float = 0f,
    val externalTotalBytes: Long = 0L,
    val externalFreeBytes: Long = 0L,
    val isExternalAvailable: Boolean = false
)
