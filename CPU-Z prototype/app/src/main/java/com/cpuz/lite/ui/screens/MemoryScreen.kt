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
import com.cpuz.lite.viewmodel.MemoryViewModel
import kotlinx.coroutines.delay

@Composable
fun MemoryScreen(viewModel: MemoryViewModel) {
    val info by viewModel.memoryInfo.collectAsState()

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
        val totalGb = info.totalRamBytes / 1024.0 / 1024.0 / 1024.0
        val usedGb = info.usedRamBytes / 1024.0 / 1024.0 / 1024.0
        val availGb = info.availableRamBytes / 1024.0 / 1024.0 / 1024.0

        InfoCard("RAM Status") {
            UsageBar(
                usedLabel = "%.2f GB Used".format(usedGb),
                totalLabel = "%.2f GB Total".format(totalGb),
                percent = info.usagePercent
            )
        }
        InfoCard("Details") {
            InfoRow("Total RAM", "%.2f GB".format(totalGb))
            InfoRow("Used RAM", "%.2f GB".format(usedGb))
            InfoRow("Available RAM", "%.2f GB".format(availGb))
        }
    }
}
