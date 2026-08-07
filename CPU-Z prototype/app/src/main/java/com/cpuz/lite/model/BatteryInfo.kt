package com.cpuz.lite.model

data class BatteryInfo(
    val percentage: Int = 0,
    val isCharging: Boolean = false,
    val status: String = "",
    val health: String = "",
    val temperatureCelsius: Float = 0f,
    val voltageMv: Int = 0,
    val technology: String = ""
)
