package com.cpuz.lite.model

data class CameraDetail(
    val id: String,
    val facing: String,
    val megapixels: Float,
    val hasFlash: Boolean
)

data class CameraInfo(
    val cameraCount: Int = 0,
    val cameras: List<CameraDetail> = emptyList()
)
