package com.cpuz.lite.model

data class DeviceInfo(
    val brand: String = "",
    val manufacturer: String = "",
    val model: String = "",
    val deviceName: String = "",
    val product: String = "",
    val androidVersion: String = "",
    val apiLevel: Int = 0,
    val securityPatch: String = "",
    val kernelVersion: String = "",
    val buildNumber: String = ""
)
