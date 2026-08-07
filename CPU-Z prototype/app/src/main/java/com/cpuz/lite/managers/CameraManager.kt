package com.cpuz.lite.managers

import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager as AndroidCameraManager
import com.cpuz.lite.model.CameraDetail
import com.cpuz.lite.model.CameraInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CameraManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun getCameraInfo(): CameraInfo {
        val cm = context.getSystemService(Context.CAMERA_SERVICE) as AndroidCameraManager
        val list = mutableListOf<CameraDetail>()

        try {
            for (id in cm.cameraIdList) {
                try {
                    val chars = cm.getCameraCharacteristics(id)
                    val facingInt = chars.get(CameraCharacteristics.LENS_FACING)
                    val facing = when (facingInt) {
                        CameraCharacteristics.LENS_FACING_FRONT -> "Front"
                        CameraCharacteristics.LENS_FACING_BACK -> "Rear"
                        else -> "External"
                    }

                    val streamMap = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                    val sizes = streamMap?.getOutputSizes(ImageFormat.JPEG) ?: emptyArray()
                    val maxSize = sizes.maxByOrNull { it.width.toLong() * it.height }
                    val megapixels = if (maxSize != null) {
                        (maxSize.width.toLong() * maxSize.height).toFloat() / 1_000_000f
                    } else 0f

                    val hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false

                    list.add(
                        CameraDetail(
                            id = id,
                            facing = facing,
                            megapixels = megapixels,
                            hasFlash = hasFlash
                        )
                    )
                } catch (e: Exception) {}
            }
        } catch (e: Exception) {}

        return CameraInfo(
            cameraCount = list.size,
            cameras = list
        )
    }
}
