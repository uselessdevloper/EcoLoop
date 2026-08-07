package com.cpuz.lite.model

data class SensorDetail(
    val name: String,
    val vendor: String,
    val typeName: String,
    val isPresent: Boolean
)

data class SensorInfo(
    val sensors: List<SensorDetail> = emptyList(),
    val hasAccelerometer: Boolean = false,
    val hasGyroscope: Boolean = false,
    val hasMagnetometer: Boolean = false,
    val hasProximity: Boolean = false,
    val hasLight: Boolean = false,
    val hasPressure: Boolean = false,
    val hasStepCounter: Boolean = false
)
