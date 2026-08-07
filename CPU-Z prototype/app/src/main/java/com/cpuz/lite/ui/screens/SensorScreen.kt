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
import com.cpuz.lite.viewmodel.SensorViewModel

@Composable
fun SensorScreen(viewModel: SensorViewModel) {
    val info by viewModel.sensorInfo.collectAsState()

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
        InfoCard("Key Sensor Hardware") {
            InfoRow("Accelerometer", if (info.hasAccelerometer) "✓ Present" else "✗ Absent")
            InfoRow("Gyroscope", if (info.hasGyroscope) "✓ Present" else "✗ Absent")
            InfoRow("Magnetometer", if (info.hasMagnetometer) "✓ Present" else "✗ Absent")
            InfoRow("Proximity", if (info.hasProximity) "✓ Present" else "✗ Absent")
            InfoRow("Light Sensor", if (info.hasLight) "✓ Present" else "✗ Absent")
            InfoRow("Pressure Sensor", if (info.hasPressure) "✓ Present" else "✗ Absent")
            InfoRow("Step Counter", if (info.hasStepCounter) "✓ Present" else "✗ Absent")
        }

        if (info.sensors.isNotEmpty()) {
            InfoCard("Sensor Details") {
                info.sensors.forEachIndexed { i, sensor ->
                    if (sensor.isPresent) {
                        InfoRow(sensor.typeName, "${sensor.name} (${sensor.vendor})")
                    }
                }
            }
        }
    }
}
