package com.cpuz.lite.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpuz.lite.ui.components.InfoCard
import com.cpuz.lite.ui.components.InfoRow
import com.cpuz.lite.ui.theme.DarkBg
import com.cpuz.lite.viewmodel.NetworkViewModel
import kotlinx.coroutines.delay

@Composable
fun NetworkScreen(viewModel: NetworkViewModel) {
    val info by viewModel.networkInfo.collectAsState()

    LaunchedEffect(Unit) {
        while (true) {
            viewModel.load()
            delay(2000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(vertical = 8.dp)
    ) {
        InfoCard("Wi-Fi Status") {
            InfoRow("WiFi Connected", if (info.isWifiConnected) "Yes" else "No")
            if (info.isWifiConnected) {
                InfoRow("SSID", info.wifiSsid)
                InfoRow("Signal Quality", "${info.wifiRssi} dBm")
                InfoRow("IP Address", info.wifiIpAddress)
            }
        }
        InfoCard("Cellular Network") {
            InfoRow("Mobile Connected", if (info.isMobileConnected) "Yes" else "No")
            InfoRow("Network Type", info.mobileNetworkType)
            InfoRow("SIM Operator", info.simOperatorName)
        }
        InfoCard("Bluetooth") {
            InfoRow("Bluetooth Enabled", if (info.isBluetoothEnabled) "Yes" else "No")
        }
    }
}
