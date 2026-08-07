package com.cpuz.lite.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.cpuz.lite.ui.theme.TextSecondary
import com.cpuz.lite.viewmodel.CpuViewModel
import kotlinx.coroutines.delay

@Composable
fun CpuScreen(viewModel: CpuViewModel) {
    val info by viewModel.cpuInfo.collectAsState()

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
        InfoCard("Processor Info") {
            InfoRow("Processor Name", info.processorName)
            InfoRow("CPU Architecture", info.cpuArchitecture)
            InfoRow("Supported ABI", info.supportedAbi)
            InfoRow("Total CPU Cores", info.coreCount.toString())
        }
        InfoCard("CPU Usage") {
            UsageBar("Used", "100%", info.cpuUsagePercent)
        }
        InfoCard("Core Frequencies") {
            info.cores.forEach { core ->
                val freqStr = if (core.currentKHz > 0) "${(core.currentKHz / 1000.0).toInt()} MHz" else "Offline"
                InfoRow("Core ${core.coreId}", freqStr)
            }
        }
    }
}
