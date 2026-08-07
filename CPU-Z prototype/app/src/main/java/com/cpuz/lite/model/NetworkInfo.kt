package com.cpuz.lite.model

data class NetworkInfo(
    val isWifiConnected: Boolean = false,
    val wifiSsid: String = "",
    val wifiRssi: Int = 0,
    val wifiIpAddress: String = "",
    val isMobileConnected: Boolean = false,
    val mobileNetworkType: String = "",
    val simOperatorName: String = "",
    val isBluetoothEnabled: Boolean = false,
    val activeNetworkType: String = "None"
)
