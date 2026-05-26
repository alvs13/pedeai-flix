package com.streambox.app.data.remote

import com.streambox.app.data.model.AppConfig
import com.streambox.app.data.model.Banner
import com.streambox.app.data.model.Channel
import com.streambox.app.data.model.ContentType
import com.streambox.app.data.model.EpgItem
import com.streambox.app.data.model.FavoriteRequest
import com.streambox.app.data.model.HistoryRequest
import com.streambox.app.data.model.Movie
import com.streambox.app.data.model.Series
import com.streambox.app.data.model.StreamSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminStreamBoxApi @Inject constructor() : StreamBoxApi {
    private val baseUrl = "http://10.0.2.2:5050"

    override suspend fun getConfig(): AppConfig {
        val json = JSONObject(get("config"))
        return AppConfig(
            brandTitle = json.optString("brandTitle", "StreamBox"),
            tagline = json.optString("tagline", "TV ao vivo, filmes e series licenciados"),
            backgroundImageUrl = json.optString("backgroundImageUrl", ""),
            legalNotice = json.optString("legalNotice", "O app nao fornece conteudo proprio sem licenca.")
        )
    }

    override suspend fun getChannels(): List<Channel> = array("channels").map { item ->
        Channel(
            id = item.optString("id"),
            title = item.optString("title"),
            category = item.optString("category", "Brasil"),
            logoUrl = item.optString("logoUrl"),
            description = item.optString("description"),
            sources = item.sources()
        )
    }

    override suspend fun getMovies(): List<Movie> = array("movies").map { item ->
        Movie(
            id = item.optString("id"),
            title = item.optString("title"),
            category = item.optString("category", "Filmes"),
            posterUrl = item.optString("posterUrl"),
            backdropUrl = item.optString("backdropUrl", item.optString("posterUrl")),
            description = item.optString("description"),
            durationMinutes = item.optInt("durationMinutes", 0),
            sources = item.sources()
        )
    }

    override suspend fun getSeries(): List<Series> = array("series").map { item ->
        Series(
            id = item.optString("id"),
            title = item.optString("title"),
            category = item.optString("category", "Series"),
            posterUrl = item.optString("posterUrl"),
            backdropUrl = item.optString("backdropUrl", item.optString("posterUrl")),
            description = item.optString("description"),
            seasons = item.optInt("seasons", 1),
            sources = item.sources()
        )
    }

    override suspend fun getBanners(): List<Banner> = array("banners").mapNotNull { item ->
        val type = runCatching { ContentType.valueOf(item.optString("contentType", "MOVIE")) }.getOrNull()
        type?.let {
            Banner(
                id = item.optString("id"),
                title = item.optString("title"),
                subtitle = item.optString("subtitle"),
                imageUrl = item.optString("imageUrl"),
                contentId = item.optString("contentId"),
                contentType = it
            )
        }
    }

    override suspend fun getEpg(): List<EpgItem> = array("epg").map { item ->
        EpgItem(
            id = item.optString("id"),
            channelId = item.optString("channelId"),
            title = item.optString("title"),
            startsAt = item.optString("startsAt"),
            endsAt = item.optString("endsAt")
        )
    }

    override suspend fun postFavorite(request: FavoriteRequest) = Unit

    override suspend fun postHistory(request: HistoryRequest) = Unit

    private suspend fun array(path: String): List<JSONObject> {
        val json = JSONArray(get(path))
        return List(json.length()) { index -> json.getJSONObject(index) }
    }

    private fun JSONObject.sources(): List<StreamSource> {
        val sources = optJSONArray("sources") ?: JSONArray()
        return List(sources.length()) { index ->
            val source = sources.getJSONObject(index)
            StreamSource(
                url = source.optString("url"),
                type = source.optString("type", "HLS"),
                quality = source.optString("quality", "Auto"),
                licensed = source.optBoolean("licensed", true)
            )
        }.filter { it.url.isNotBlank() }
    }

    private suspend fun get(path: String): String = withContext(Dispatchers.IO) {
        val connection = URL("$baseUrl/$path").openConnection() as HttpURLConnection
        connection.connectTimeout = 4_000
        connection.readTimeout = 8_000
        connection.requestMethod = "GET"
        connection.inputStream.bufferedReader().use { it.readText() }
    }
}
