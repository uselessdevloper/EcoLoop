package com.cpuz.lite.managers

import android.content.Context
import android.hardware.Sensor
import com.cpuz.lite.model.SensorDetail
import com.cpuz.lite.model.SensorInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SensorManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager

    fun getSensorInfo(): SensorInfo {
        val hasAccel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
        val hasGyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null
        val hasMag = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null
        val hasProx = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY) != null
        val hasLight = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT) != null
        val hasPress = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE) != null
        val hasStep = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null

        val list = mutableListOf<SensorDetail>()
        addSensor(list, Sensor.TYPE_ACCELEROMETER, "Accelerometer")
        addSensor(list, Sensor.TYPE_GYROSCOPE, "Gyroscope")
        addSensor(list, Sensor.TYPE_MAGNETIC_FIELD, "Magnetometer")
        addSensor(list, Sensor.TYPE_PROXIMITY, "Proximity")
        addSensor(list, Sensor.TYPE_LIGHT, "Light Sensor")
        addSensor(list, Sensor.TYPE_PRESSURE, "Pressure Sensor")
        addSensor(list, Sensor.TYPE_STEP_COUNTER, "Step Counter")

        return SensorInfo(
            sensors = list,
            hasAccelerometer = hasAccel,
            hasGyroscope = hasGyro,
            hasMagnetometer = hasMag,
            hasProximity = hasProx,
            hasLight = hasLight,
            hasPressure = hasPress,
            hasStepCounter = hasStep
        )
    }

    private fun addSensor(list: MutableList<SensorDetail>, type: Int, typeName: String) {
        val sensor = sensorManager.getDefaultSensor(type)
        list.add(
            SensorDetail(
                name = sensor?.name ?: "N/A",
                vendor = sensor?.vendor ?: "N/A",
                typeName = typeName,
                isPresent = sensor != null
            )
        )
    }
}
