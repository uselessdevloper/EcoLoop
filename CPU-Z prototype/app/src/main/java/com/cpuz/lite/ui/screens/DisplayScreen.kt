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
import com.cpuz.lite.viewmodel.DisplayViewModel

@Composable
fun DisplayScreen(viewModel: DisplayViewModel) {
    val info by viewModel.displayInfo.collectAsState()

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
        InfoCard("Display Specifications") {
            InfoRow("Screen Resolution", info.resolution)
            InfoRow("Screen Density", "${info.densityDpi} DPI")
            InfoRow("Refresh Rate", "%.0f Hz".format(info.refreshRateHz))
            InfoRow("Screen Size", "%.1f Inches".format(info.sizeInches))
        }
    }
}
