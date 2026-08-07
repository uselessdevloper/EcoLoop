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
import com.cpuz.lite.viewmodel.DeviceViewModel

@Composable
fun DeviceScreen(viewModel: DeviceViewModel) {
    val info by viewModel.deviceInfo.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.load()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(vertical = 8.dp)
    ) {
        InfoCard("Device Specifications") {
            InfoRow("Brand", info.brand)
            InfoRow("Manufacturer", info.manufacturer)
            InfoRow("Model", info.model)
            InfoRow("Device Name", info.deviceName)
            InfoRow("Product", info.product)
        }
        InfoCard("OS & Software") {
            InfoRow("Android Version", info.androidVersion)
            InfoRow("API Level", info.apiLevel.toString())
            InfoRow("Security Patch", info.securityPatch)
            InfoRow("Kernel Version", info.kernelVersion)
            InfoRow("Build Number", info.buildNumber)
        }
    }
}
