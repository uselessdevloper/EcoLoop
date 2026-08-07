package com.cpuz.lite

import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.cpuz.lite.ui.navigation.*
import com.cpuz.lite.ui.screens.*
import com.cpuz.lite.ui.theme.*
import com.cpuz.lite.viewmodel.*
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val dashboardViewModel: DashboardViewModel by viewModels()
    private val deviceViewModel: DeviceViewModel by viewModels()
    private val cpuViewModel: CpuViewModel by viewModels()
    private val memoryViewModel: MemoryViewModel by viewModels()
    private val batteryViewModel: BatteryViewModel by viewModels()
    private val storageViewModel: StorageViewModel by viewModels()
    private val displayViewModel: DisplayViewModel by viewModels()
    private val cameraViewModel: CameraViewModel by viewModels()
    private val sensorViewModel: SensorViewModel by viewModels()
    private val networkViewModel: NetworkViewModel by viewModels()

    private val permissions = arrayOf(
        android.Manifest.permission.ACCESS_FINE_LOCATION,
        android.Manifest.permission.READ_PHONE_STATE,
        android.Manifest.permission.CAMERA,
        android.Manifest.permission.BLUETOOTH_CONNECT
    )

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        // Trigger loads when permission status updates
        deviceViewModel.load()
        cpuViewModel.load()
        memoryViewModel.load()
        batteryViewModel.load()
        storageViewModel.load()
        displayViewModel.load()
        cameraViewModel.load()
        sensorViewModel.load()
        networkViewModel.load()
        dashboardViewModel.refresh()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestMissingPermissions()

        setContent {
            CpuZTheme {
                CpuZApp()
            }
        }
    }

    private fun requestMissingPermissions() {
        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing)
        }
    }

    @Composable
    private fun CpuZApp() {
        val navController = rememberNavController()
        val navBackStack by navController.currentBackStackEntryAsState()
        val currentRoute = navBackStack?.destination?.route

        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = DarkSurface,
                    modifier = Modifier.height(72.dp)
                ) {
                    bottomNavScreens.forEach { screen ->
                        NavigationBarItem(
                            selected = currentRoute == screen.route,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(screen.icon, contentDescription = screen.label) },
                            label = { Text(screen.label, style = MaterialTheme.typography.bodySmall) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = ElectricBlue,
                                selectedTextColor = ElectricBlue,
                                unselectedIconColor = TextSecondary,
                                unselectedTextColor = TextSecondary,
                                indicatorColor = DarkBg
                            )
                        )
                    }
                }
            }
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Dashboard.route,
                modifier = Modifier
                    .fillMaxSize()
                    .background(DarkBg)
                    .padding(padding)
            ) {
                composable(Screen.Dashboard.route) { DashboardScreen(dashboardViewModel) }
                composable(Screen.Device.route) { DeviceScreen(deviceViewModel) }
                composable(Screen.CPU.route) { CpuScreen(cpuViewModel) }
                composable(Screen.Memory.route) { MemoryScreen(memoryViewModel) }
                composable(Screen.Battery.route) { BatteryScreen(batteryViewModel) }
                composable(Screen.Storage.route) { StorageScreen(storageViewModel) }
                composable(Screen.Display.route) { DisplayScreen(displayViewModel) }
                composable(Screen.Camera.route) { CameraScreen(cameraViewModel) }
                composable(Screen.Sensors.route) { SensorScreen(sensorViewModel) }
                composable(Screen.Network.route) { NetworkScreen(networkViewModel) }
                composable(Screen.About.route) { AboutScreen() }
            }
        }
    }
}
