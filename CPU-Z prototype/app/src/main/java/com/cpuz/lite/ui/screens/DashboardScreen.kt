package com.cpuz.lite.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.cpuz.lite.ui.components.InfoCard
import com.cpuz.lite.ui.components.UsageBar
import com.cpuz.lite.ui.theme.DarkBg
import com.cpuz.lite.ui.theme.ElectricBlue
import com.cpuz.lite.ui.theme.TextPrimary
import com.cpuz.lite.ui.theme.TextSecondary
import com.cpuz.lite.viewmodel.DashboardViewModel
import kotlinx.coroutines.delay

@Composable
fun DashboardScreen(viewModel: DashboardViewModel) {
    val cpuUsage by viewModel.cpuUsage.collectAsState()
    val ramUsage by viewModel.ramUsage.collectAsState()
    val batteryPct by viewModel.batteryPct.collectAsState()
    val storageUsage by viewModel.storageUsage.collectAsState()
    val networkType by viewModel.networkType.collectAsState()

    LaunchedEffect(Unit) {
        while (true) {
            viewModel.refresh()
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
        InfoCard("Live Dashboard") {
            DashboardItem(Icons.Default.Memory, "CPU Usage", "%.1f%%".format(cpuUsage), cpuUsage)
            DashboardItem(Icons.Default.Storage, "RAM Usage", "%.1f%%".format(ramUsage), ramUsage)
            DashboardItem(Icons.Default.BatteryFull, "Battery", "$batteryPct%", batteryPct.toFloat())
            DashboardItem(Icons.Default.FolderOpen, "Storage Usage", "%.1f%%".format(storageUsage), storageUsage)
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Wifi, contentDescription = null, tint = ElectricBlue, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Text("Active Network: ", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Text(networkType, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
            }
        }
    }
}

@Composable
private fun DashboardItem(
    icon: ImageVector,
    title: String,
    value: String,
    percent: Float
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = ElectricBlue, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Text(value, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
            }
            Spacer(Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = { percent.coerceIn(0f, 100f) / 100f },
                modifier = Modifier.fillMaxWidth().height(4.dp),
                color = ElectricBlue,
                trackColor = MaterialTheme.colorScheme.outline
            )
        }
    }
}
