package com.streambox.app.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val StreamDarkColors: ColorScheme = darkColorScheme(
    primary = Color(0xFF31E6A0),
    secondary = Color(0xFF36B7FF),
    tertiary = Color(0xFFFFD166),
    background = Color(0xFF05070D),
    surface = Color(0xFF0C111B),
    surfaceVariant = Color(0xFF151D2B),
    onPrimary = Color(0xFF001E14),
    onSecondary = Color(0xFF021827),
    onBackground = Color(0xFFF3F5FA),
    onSurface = Color(0xFFF3F5FA),
    onSurfaceVariant = Color(0xFFB9C2D2)
)

@Composable
fun StreamBoxTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = StreamDarkColors,
        typography = MaterialTheme.typography,
        content = content
    )
}
