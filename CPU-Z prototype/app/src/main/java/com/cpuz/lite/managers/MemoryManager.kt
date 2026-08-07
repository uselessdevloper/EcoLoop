package com.cpuz.lite.managers

import android.app.ActivityManager
import android.content.Context
import com.cpuz.lite.model.MemoryInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.BufferedReader
import java.io.FileReader
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MemoryManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun getMemoryInfo(): MemoryInfo {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am.getMemoryInfo(memInfo)

        val total = memInfo.totalMem
        val avail = memInfo.availMem
        val used = total - avail
        val usagePercent = if (total > 0L) (used.toFloat() / total.toFloat() * 100f) else 0f

        return MemoryInfo(
            totalRamBytes = total,
            usedRamBytes = used,
            availableRamBytes = avail,
            usagePercent = usagePercent
        )
    }
}
