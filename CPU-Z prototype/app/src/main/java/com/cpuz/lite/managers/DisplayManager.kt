package com.cpuz.lite.managers

import android.content.Context
import android.util.DisplayMetrics
import android.view.Display
import android.view.WindowManager
import com.cpuz.lite.model.DisplayInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.sqrt

@Singleton
class DisplayManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun getDisplayInfo(): DisplayInfo {
        val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        wm.defaultDisplay.getRealMetrics(metrics)

        val width = metrics.widthPixels
        val height = metrics.heightPixels
        val resolution = "${width}x${height}"
        val density = metrics.densityDpi

        @Suppress("DEPRECATION")
        val refreshRate = wm.defaultDisplay.refreshRate

        val xInches = width.toDouble() / metrics.xdpi
        val yInches = height.toDouble() / metrics.ydpi
        val size = sqrt(xInches * xInches + yInches * yInches).toFloat()

        return DisplayInfo(
            resolution = resolution,
            densityDpi = density,
            refreshRateHz = refreshRate,
            sizeInches = size
        )
    }
}
