package com.cpuz.lite.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.cpuz.lite.ui.theme.*

@Composable
fun UsageBar(
    usedLabel: String,
    totalLabel: String,
    percent: Float,
    modifier: Modifier = Modifier
) {
    val animatedPercent by animateFloatAsState(
        targetValue = percent.coerceIn(0f, 100f) / 100f,
        animationSpec = tween(500),
        label = "progress"
    )

    Column(modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(usedLabel, style = MaterialTheme.typography.bodySmall)
            Text("%.1f%%".format(percent), style = MaterialTheme.typography.bodySmall, color = ElectricBlue)
            Text(totalLabel, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        }
        Spacer(Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(BorderColor)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(animatedPercent)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(3.dp))
                    .background(ElectricBlue)
            )
        }
    }
}
