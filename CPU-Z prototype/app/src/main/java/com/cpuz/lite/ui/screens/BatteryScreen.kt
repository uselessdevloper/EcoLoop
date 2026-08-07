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
import com.cpuz.lite.ui.components.UsageBar
import com.cpuz.lite.ui.theme.DarkBg
import com.cpuz.lite.viewmodel.BatteryViewModel
import kotlinx.coroutines.delay

@Composable
fun BatteryScreen(viewModel: BatteryViewModel) {
    val info by viewModel.batteryInfo.collectAsState()

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
        InfoCard("Charge Level") {
            UsageBar(
                usedLabel = "${info.percentage}% Charged",
                totalLabel = "100%",
                percent = info.percentage.toFloat()
            )
        }
        InfoCard("Specifications") {
            InfoRow("Charging Status", info.status)
            InfoRow("Battery Health", info.health)
            InfoRow("Battery Temperature", "%.1f °C".format(info.temperatureCelsius))
            InfoRow("Voltage", "${info.voltageMv} mV")
            InfoRow("Battery Technology", info.technology)
        }
    }
}
