package com.streambox.app.data.remote

import android.util.Log
import com.streambox.app.data.model.AppConfig
import com.streambox.app.data.model.Banner
import com.streambox.app.data.model.Channel
import com.streambox.app.data.model.EpgItem
import com.streambox.app.data.model.FavoriteRequest
import com.streambox.app.data.model.HistoryRequest
import com.streambox.app.data.model.Movie
import com.streambox.app.data.model.Series
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RemoteStreamBoxApi @Inject constructor(
    private val realApi: AdminStreamBoxApi,
    private val fallbackApi: FakeStreamBoxApi
) : StreamBoxApi {
    override suspend fun getConfig(): AppConfig = fallbackOnError({ realApi.getConfig() }) { fallbackApi.getConfig() }
    override suspend fun getChannels(): List<Channel> = fallbackOnError({ realApi.getChannels() }) { fallbackApi.getChannels() }
    override suspend fun getMovies(): List<Movie> = fallbackOnError({ realApi.getMovies() }) { fallbackApi.getMovies() }
    override suspend fun getSeries(): List<Series> = fallbackOnError({ realApi.getSeries() }) { fallbackApi.getSeries() }
    override suspend fun getBanners(): List<Banner> = fallbackOnError({ realApi.getBanners() }) { fallbackApi.getBanners() }
    override suspend fun getEpg(): List<EpgItem> = fallbackOnError({ realApi.getEpg() }) { fallbackApi.getEpg() }

    override suspend fun postFavorite(request: FavoriteRequest) {
        runCatching { realApi.postFavorite(request) }
    }

    override suspend fun postHistory(request: HistoryRequest) {
        runCatching { realApi.postHistory(request) }
    }

    private suspend fun <T> fallbackOnError(block: suspend () -> T, fallback: suspend () -> T): T {
        return runCatching { block() }.getOrElse {
            Log.w("StreamBoxApi", "Using local fallback: ${it.message}")
            fallback()
        }
    }
}
