package com.streambox.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.streambox.app.data.model.ContentType

@Database(
    entities = [FavoriteEntity::class, HistoryEntity::class, LicensedSourceEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(StreamBoxConverters::class)
abstract class StreamBoxDatabase : RoomDatabase() {
    abstract fun dao(): StreamBoxDao
}

class StreamBoxConverters {
    @TypeConverter
    fun fromContentType(type: ContentType): String = type.name

    @TypeConverter
    fun toContentType(value: String): ContentType = ContentType.valueOf(value)
}
