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
import com.cpuz.lite.viewmodel.CameraViewModel

@Composable
fun CameraScreen(viewModel: CameraViewModel) {
    val info by viewModel.cameraInfo.collectAsState()

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
        InfoCard("Camera Summary") {
            InfoRow("Total Cameras Found", info.cameraCount.toString())
        }
        info.cameras.forEach { camera ->
            InfoCard("${camera.facing} Camera (ID ${camera.id})") {
                InfoRow("Megapixels", "%.1f MP".format(camera.megapixels))
                InfoRow("Flash Support", if (camera.hasFlash) "Yes" else "No")
            }
        }
    }
}
