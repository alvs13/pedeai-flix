package com.streambox.app.ui.state

import com.streambox.app.data.model.ContentType
import com.streambox.app.data.repository.CatalogSnapshot

data class CatalogUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val selectedTab: MainTab = MainTab.HOME,
    val query: String = "",
    val catalog: CatalogSnapshot = CatalogSnapshot(),
    val favorites: Set<String> = emptySet(),
    val history: Set<String> = emptySet()
)

enum class MainTab(val label: String) {
    HOME("Inicio"),
    LIVE("Ao Vivo"),
    MOVIES("Filmes"),
    SERIES("Series"),
    FAVORITES("Favoritos"),
    SETTINGS("Ajustes")
}

data class PlayerRoute(
    val contentId: String,
    val title: String,
    val contentType: ContentType,
    val url: String,
    val quality: String
)
