package com.cpuz.lite.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = ElectricBlue,
    secondary = CpuZCyan,
    background = DarkBg,
    surface = DarkSurface,
    surfaceVariant = DarkSurface2,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    outline = BorderColor
)

@Composable
fun CpuZTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = CpuZTypography,
        content = content
    )
}
