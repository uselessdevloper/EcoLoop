package com.cpuz.lite.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cpuz.lite.ui.components.InfoCard
import com.cpuz.lite.ui.components.InfoRow
import com.cpuz.lite.ui.theme.DarkBg
import com.cpuz.lite.ui.theme.ElectricBlue
import com.cpuz.lite.ui.theme.TextPrimary
import com.cpuz.lite.ui.theme.TextSecondary

@Composable
fun AboutScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            text = "CPU-Z Lite",
            style = MaterialTheme.typography.headlineMedium,
            color = ElectricBlue
        )
        Text(
            text = "Version 1.0.0 (Offline & Lightweight)",
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
        Spacer(Modifier.height(24.dp))

        InfoCard("About Application") {
            InfoRow("Features", "CPU info, RAM, Battery, Storage, Display, Sensors, Network, Camera")
            InfoRow("Tech Stack", "Jetpack Compose + Hilt + Coroutines")
            InfoRow("Architecture", "MVVM (Clean & Solid Architecture)")
            InfoRow("API Usage", "Offline-first native android.os APIs")
        }
    }
}
