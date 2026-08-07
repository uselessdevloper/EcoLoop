package com.cpuz.lite.managers

import android.os.Build
import com.cpuz.lite.model.CoreFreq
import com.cpuz.lite.model.CpuInfo
import java.io.BufferedReader
import java.io.FileReader
import java.io.RandomAccessFile
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CpuManager @Inject constructor() {

    private var lastTotalTicks = 0L
    private var lastIdleTicks = 0L

    fun getCpuInfo(): CpuInfo {
        val coreCount = Runtime.getRuntime().availableProcessors()
        val cores = (0 until coreCount).map { i ->
            CoreFreq(
                coreId = i,
                currentKHz = readCpuFreq("/sys/devices/system/cpu/cpu$i/cpufreq/scaling_cur_freq"),
                maxKHz = readCpuFreq("/sys/devices/system/cpu/cpu$i/cpufreq/scaling_max_freq"),
                minKHz = readCpuFreq("/sys/devices/system/cpu/cpu$i/cpufreq/scaling_min_freq")
            )
        }

        return CpuInfo(
            processorName = getProcessorName(),
            cpuArchitecture = resolveArch(Build.SUPPORTED_ABIS.firstOrNull() ?: ""),
            supportedAbi = Build.SUPPORTED_ABIS.firstOrNull() ?: "Unknown",
            coreCount = coreCount,
            cores = cores,
            cpuUsagePercent = getCpuUsage()
        )
    }

    private fun readCpuFreq(path: String): Long {
        return try {
            val reader = BufferedReader(FileReader(path))
            val line = reader.readLine() ?: ""
            reader.close()
            line.trim().toLongOrNull() ?: -1L
        } catch (e: Exception) {
            -1L
        }
    }

    private fun getProcessorName(): String {
        return try {
            val reader = BufferedReader(FileReader("/proc/cpuinfo"))
            var line: String?
            var name = ""
            while (reader.readLine().also { line = it } != null) {
                if (line!!.startsWith("Hardware", ignoreCase = true) || line!!.startsWith("model name", ignoreCase = true)) {
                    name = line!!.substringAfter(":").trim()
                    break
                }
            }
            reader.close()
            name.ifEmpty { Build.HARDWARE ?: "Unknown Processor" }
        } catch (e: Exception) {
            Build.HARDWARE ?: "Unknown Processor"
        }
    }

    private fun resolveArch(abi: String): String = when {
        abi.startsWith("arm64") -> "ARM64-v8a"
        abi.startsWith("armeabi") -> "ARM32"
        abi.startsWith("x86_64") -> "x86_64"
        abi.startsWith("x86") -> "x86"
        else -> abi
    }

    private fun getCpuUsage(): Float {
        return try {
            val reader = RandomAccessFile("/proc/stat", "r")
            val load = reader.readLine() ?: ""
            reader.close()

            val tokens = load.split("\\s+".toRegex())
            if (tokens.size >= 8) {
                val user = tokens[1].toLong()
                val nice = tokens[2].toLong()
                val sys = tokens[3].toLong()
                val idle = tokens[4].toLong()
                val iowait = tokens[5].toLong()
                val irq = tokens[6].toLong()
                val softirq = tokens[7].toLong()

                val total = user + nice + sys + idle + iowait + irq + softirq
                val active = total - idle

                val dTotal = total - lastTotalTicks
                val dActive = active - (lastTotalTicks - lastIdleTicks)

                lastTotalTicks = total
                lastIdleTicks = idle

                if (dTotal > 0L) {
                    ((dActive.toFloat() / dTotal.toFloat()) * 100f).coerceIn(0f, 100f)
                } else 0f
            } else 0f
        } catch (e: Exception) {
            0f
        }
    }
}
