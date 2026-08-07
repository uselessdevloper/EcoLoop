package com.cpuz.lite.managers

import android.os.Environment
import android.os.StatFs
import com.cpuz.lite.model.StorageInfo
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StorageManager @Inject constructor() {

    fun getStorageInfo(): StorageInfo {
        val internalStat = StatFs(Environment.getDataDirectory().path)
        val totalInternal = internalStat.totalBytes
        val freeInternal = internalStat.availableBytes
        val usedInternal = totalInternal - freeInternal
        val internalUsage = if (totalInternal > 0L) (usedInternal.toFloat() / totalInternal.toFloat() * 100f) else 0f

        val isExtAvailable = Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED
        var totalExternal = 0L
        var freeExternal = 0L

        if (isExtAvailable) {
            try {
                val extStat = StatFs(Environment.getExternalStorageDirectory().path)
                totalExternal = extStat.totalBytes
                freeExternal = extStat.availableBytes
            } catch (e: Exception) {}
        }

        return StorageInfo(
            internalTotalBytes = totalInternal,
            internalUsedBytes = usedInternal,
            internalFreeBytes = freeInternal,
            internalUsagePercent = internalUsage,
            externalTotalBytes = totalExternal,
            externalFreeBytes = freeExternal,
            isExternalAvailable = isExtAvailable
        )
    }
}
