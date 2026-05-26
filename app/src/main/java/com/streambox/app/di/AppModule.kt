package com.streambox.app.di

import android.content.Context
import androidx.room.Room
import com.streambox.app.data.local.StreamBoxDao
import com.streambox.app.data.local.StreamBoxDatabase
import com.streambox.app.data.remote.StreamBoxApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ApiModule {
    @Provides
    @Singleton
    fun provideStreamBoxApi(remote: com.streambox.app.data.remote.RemoteStreamBoxApi): StreamBoxApi = remote
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): StreamBoxDatabase {
        return Room.databaseBuilder(context, StreamBoxDatabase::class.java, "streambox.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideDao(database: StreamBoxDatabase): StreamBoxDao = database.dao()
}
