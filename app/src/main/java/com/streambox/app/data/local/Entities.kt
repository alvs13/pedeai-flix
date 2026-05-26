package com.streambox.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.streambox.app.data.model.ContentType

@Entity(tableName = "favorites")
data class FavoriteEntity(
    @PrimaryKey val contentId: String,
    val contentType: ContentType,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "history")
data class HistoryEntity(
    @PrimaryKey val contentId: String,
    val contentType: ContentType,
    val positionMs: Long,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "licensed_sources")
data class LicensedSourceEntity(
    @PrimaryKey val url: String,
    val contentId: String,
    val contentType: ContentType,
    val quality: String,
    val createdAt: Long = System.currentTimeMillis()
)
