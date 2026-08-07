package com.cpuz.lite.model

data class CoreFreq(
    val coreId: Int,
    val currentKHz: Long,
    val maxKHz: Long,
    val minKHz: Long
)

data class CpuInfo(
    val processorName: String = "",
    val cpuArchitecture: String = "",
    val supportedAbi: String = "",
    val coreCount: Int = 0,
    val cores: List<CoreFreq> = emptyList(),
    val cpuUsagePercent: Float = 0f
)
