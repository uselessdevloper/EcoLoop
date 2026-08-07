package com.cpuz.lite.managers

import android.bluetooth.BluetoothManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.telephony.TelephonyManager
import com.cpuz.lite.model.NetworkInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun getNetworkInfo(): NetworkInfo {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager

        val activeNetwork = cm.activeNetwork
        val caps = cm.getNetworkCapabilities(activeNetwork)

        val isWifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        val isMobile = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true

        val wifiInfo = wm.connectionInfo
        val ssid = if (isWifi) wifiInfo?.ssid?.removeSurrounding("\"") ?: "" else ""
        val rssi = if (isWifi) wifiInfo?.rssi ?: 0 else 0

        val ipInt = wifiInfo?.ipAddress ?: 0
        val ipAddr = if (isWifi && ipInt != 0) {
            "%d.%d.%d.%d".format(
                ipInt and 0xFF, (ipInt shr 8) and 0xFF,
                (ipInt shr 16) and 0xFF, (ipInt shr 24) and 0xFF
            )
        } else ""

        val simOperator = try { tm.simOperatorName } catch (e: Exception) { "" }
        val mobileType = if (isMobile) getMobileNetworkType(tm) else ""

        val btAdapter = bm.adapter
        val isBtEnabled = btAdapter?.isEnabled == true

        val activeType = when {
            isWifi -> "Wi-Fi"
            isMobile -> "Mobile"
            else -> "None"
        }

        return NetworkInfo(
            isWifiConnected = isWifi,
            wifiSsid = ssid,
            wifiRssi = rssi,
            wifiIpAddress = ipAddr,
            isMobileConnected = isMobile,
            mobileNetworkType = mobileType,
            simOperatorName = simOperator,
            isBluetoothEnabled = isBtEnabled,
            activeNetworkType = activeType
        )
    }

    private fun getMobileNetworkType(tm: TelephonyManager): String {
        return try {
            @Suppress("DEPRECATION")
            when (tm.networkType) {
                TelephonyManager.NETWORK_TYPE_GPRS,
                TelephonyManager.NETWORK_TYPE_EDGE -> "2G"
                TelephonyManager.NETWORK_TYPE_UMTS,
                TelephonyManager.NETWORK_TYPE_HSDPA,
                TelephonyManager.NETWORK_TYPE_HSPA -> "3G"
                TelephonyManager.NETWORK_TYPE_LTE -> "4G"
                TelephonyManager.NETWORK_TYPE_NR -> "5G"
                else -> "Cellular"
            }
        } catch (e: SecurityException) {
            "Cellular"
        }
    }
}
