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
import com.cpuz.lite.viewmodel.StorageViewModel

@Composable
fun StorageScreen(viewModel: StorageViewModel) {
    val info by viewModel.storageInfo.collectAsState()

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
        val totalGb = info.internalTotalBytes / 1024.0 / 1024.0 / 1024.0
        val usedGb = info.internalUsedBytes / 1024.0 / 1024.0 / 1024.0
        val freeGb = info.internalFreeBytes / 1024.0 / 1024.0 / 1024.0

        InfoCard("Internal Storage") {
            UsageBar(
                usedLabel = "%.2f GB Used".format(usedGb),
                totalLabel = "%.2f GB Total".format(totalGb),
                percent = info.internalUsagePercent
            )
            Spacer(Modifier.height(8.dp))
            InfoRow("Total Storage", "%.2f GB".format(totalGb))
            InfoRow("Used Storage", "%.2f GB".format(usedGb))
            InfoRow("Free Storage", "%.2f GB".format(freeGb))
        }

        if (info.isExternalAvailable) {
            val extTotalGb = info.externalTotalBytes / 1024.0 / 1024.0 / 1024.0
            val extFreeGb = info.externalFreeBytes / 1024.0 / 1024.0 / 1024.0
            InfoCard("External Storage") {
                InfoRow("Total External", "%.2f GB".format(extTotalGb))
                InfoRow("Free External", "%.2f GB".format(extFreeGb))
            }
        }
    }
}
