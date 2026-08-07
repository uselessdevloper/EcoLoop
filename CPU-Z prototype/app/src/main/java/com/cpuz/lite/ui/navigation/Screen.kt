package com.cpuz.lite.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object Device : Screen("device", "Device", Icons.Default.PhoneAndroid)
    object CPU : Screen("cpu", "CPU", Icons.Default.Memory)
    object Memory : Screen("memory", "Memory", Icons.Default.Storage)
    object Battery : Screen("battery", "Battery", Icons.Default.BatteryFull)
    object Storage : Screen("storage", "Storage", Icons.Default.FolderOpen)
    object Display : Screen("display", "Display", Icons.Default.Tv)
    object Camera : Screen("camera", "Camera", Icons.Default.CameraAlt)
    object Sensors : Screen("sensors", "Sensors", Icons.Default.Sensors)
    object Network : Screen("network", "Network", Icons.Default.Wifi)
    object About : Screen("about", "About", Icons.Default.Info)
}

val allScreens = listOf(
    Screen.Dashboard, Screen.Device, Screen.CPU, Screen.Memory,
    Screen.Battery, Screen.Storage, Screen.Display, Screen.Camera,
    Screen.Sensors, Screen.Network, Screen.About
)

val bottomNavScreens = listOf(
    Screen.Dashboard, Screen.CPU, Screen.Memory, Screen.Battery, Screen.Device
)
