package com.streambox.app.data.repository

import com.streambox.app.data.local.FavoriteEntity
import com.streambox.app.data.local.HistoryEntity
import com.streambox.app.data.local.LicensedSourceEntity
import com.streambox.app.data.local.StreamBoxDao
import com.streambox.app.data.model.Banner
import com.streambox.app.data.model.AppConfig
import com.streambox.app.data.model.Channel
import com.streambox.app.data.model.ContentType
import com.streambox.app.data.model.EpgItem
import com.streambox.app.data.model.FavoriteRequest
import com.streambox.app.data.model.HistoryRequest
import com.streambox.app.data.model.Movie
import com.streambox.app.data.model.Series
import com.streambox.app.data.model.StreamSource
import com.streambox.app.data.remote.StreamBoxApi
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

data class CatalogSnapshot(
    val config: AppConfig = AppConfig(),
    val banners: List<Banner> = emptyList(),
    val channels: List<Channel> = emptyList(),
    val movies: List<Movie> = emptyList(),
    val series: List<Series> = emptyList(),
    val epg: List<EpgItem> = emptyList()
)

@Singleton
class StreamBoxRepository @Inject constructor(
    private val api: StreamBoxApi,
    private val dao: StreamBoxDao
) {
    val favorites: Flow<List<FavoriteEntity>> = dao.observeFavorites()
    val history: Flow<List<HistoryEntity>> = dao.observeHistory()

    suspend fun loadCatalog(): CatalogSnapshot {
        val channels = api.getChannels().filterLicensedChannels()
        val movies = api.getMovies().filterLicensedMovies()
        val series = api.getSeries().filterLicensedSeries()
        cacheLicensedSources(channels, movies, series)
        return CatalogSnapshot(
            config = runCatching { api.getConfig() }.getOrDefault(AppConfig()),
            banners = api.getBanners(),
            channels = channels,
            movies = movies,
            series = series,
            epg = api.getEpg()
        )
    }

    suspend fun toggleFavorite(contentId: String, type: ContentType) {
        val favorite = FavoriteEntity(contentId, type)
        if (dao.isFavorite(contentId)) {
            dao.deleteFavorite(favorite)
        } else {
            dao.upsertFavorite(favorite)
            api.postFavorite(FavoriteRequest(contentId, type))
        }
    }

    suspend fun saveHistory(contentId: String, type: ContentType, positionMs: Long) {
        dao.upsertHistory(HistoryEntity(contentId, type, positionMs))
        api.postHistory(HistoryRequest(contentId, type, positionMs))
    }

    suspend fun validateSource(source: StreamSource): Boolean {
        return source.licensed && dao.isLicensedSource(source.url)
    }

    private suspend fun cacheLicensedSources(
        channels: List<Channel>,
        movies: List<Movie>,
        series: List<Series>
    ) {
        val sources = buildList {
            channels.forEach { channel ->
                channel.sources.filter { it.licensed }.forEach {
                    add(LicensedSourceEntity(it.url, channel.id, ContentType.CHANNEL, it.quality))
                }
            }
            movies.forEach { movie ->
                movie.sources.filter { it.licensed }.forEach {
                    add(LicensedSourceEntity(it.url, movie.id, ContentType.MOVIE, it.quality))
                }
            }
            series.forEach { item ->
                item.sources.filter { it.licensed }.forEach {
                    add(LicensedSourceEntity(it.url, item.id, ContentType.SERIES, it.quality))
                }
            }
        }
        dao.upsertLicensedSources(sources)
    }

    private fun List<Channel>.filterLicensedChannels(): List<Channel> =
        mapNotNull { it.copy(sources = it.sources.filter(StreamSource::licensed)).takeIf { item -> item.sources.isNotEmpty() } }

    private fun List<Movie>.filterLicensedMovies(): List<Movie> =
        mapNotNull { it.copy(sources = it.sources.filter(StreamSource::licensed)).takeIf { item -> item.sources.isNotEmpty() } }

    private fun List<Series>.filterLicensedSeries(): List<Series> =
        mapNotNull { it.copy(sources = it.sources.filter(StreamSource::licensed)).takeIf { item -> item.sources.isNotEmpty() } }
}
