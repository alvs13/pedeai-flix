package com.streambox.app.data.model

enum class ContentType { CHANNEL, MOVIE, SERIES }

data class StreamSource(
    val url: String,
    val type: String,
    val quality: String,
    val licensed: Boolean = true
)

data class Channel(
    val id: String,
    val title: String,
    val category: String,
    val logoUrl: String,
    val description: String,
    val sources: List<StreamSource>
)

data class Movie(
    val id: String,
    val title: String,
    val category: String,
    val posterUrl: String,
    val backdropUrl: String,
    val description: String,
    val durationMinutes: Int,
    val sources: List<StreamSource>
)

data class Series(
    val id: String,
    val title: String,
    val category: String,
    val posterUrl: String,
    val backdropUrl: String,
    val description: String,
    val seasons: Int,
    val sources: List<StreamSource>
)

data class Banner(
    val id: String,
    val title: String,
    val subtitle: String,
    val imageUrl: String,
    val contentId: String,
    val contentType: ContentType
)

data class EpgItem(
    val id: String,
    val channelId: String,
    val title: String,
    val startsAt: String,
    val endsAt: String
)

data class FavoriteRequest(val contentId: String, val contentType: ContentType)

data class HistoryRequest(
    val contentId: String,
    val contentType: ContentType,
    val positionMs: Long
)

data class AppConfig(
    val brandTitle: String = "StreamBox",
    val tagline: String = "TV ao vivo, filmes e series licenciados",
    val backgroundImageUrl: String = "",
    val legalNotice: String = "O app nao fornece conteudo proprio sem licenca."
)

data class UserSession(val userId: String, val email: String, val token: String)
