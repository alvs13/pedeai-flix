package com.streambox.app.data.remote

import com.streambox.app.data.model.Banner
import com.streambox.app.data.model.AppConfig
import com.streambox.app.data.model.Channel
import com.streambox.app.data.model.EpgItem
import com.streambox.app.data.model.FavoriteRequest
import com.streambox.app.data.model.HistoryRequest
import com.streambox.app.data.model.Movie
import com.streambox.app.data.model.Series
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface StreamBoxApi {
    @GET("config")
    suspend fun getConfig(): AppConfig

    @GET("channels")
    suspend fun getChannels(): List<Channel>

    @GET("movies")
    suspend fun getMovies(): List<Movie>

    @GET("series")
    suspend fun getSeries(): List<Series>

    @GET("banners")
    suspend fun getBanners(): List<Banner>

    @GET("epg")
    suspend fun getEpg(): List<EpgItem>

    @POST("favorites")
    suspend fun postFavorite(@Body request: FavoriteRequest)

    @POST("history")
    suspend fun postHistory(@Body request: HistoryRequest)
}
