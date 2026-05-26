package com.streambox.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streambox.app.data.model.ContentType
import com.streambox.app.data.model.StreamSource
import com.streambox.app.data.repository.StreamBoxRepository
import com.streambox.app.ui.state.CatalogUiState
import com.streambox.app.ui.state.MainTab
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val repository: StreamBoxRepository
) : ViewModel() {
    private val baseState = MutableStateFlow(CatalogUiState())

    val state: StateFlow<CatalogUiState> = combine(
        baseState,
        repository.favorites,
        repository.history
    ) { state, favorites, history ->
        state.copy(
            favorites = favorites.map { it.contentId }.toSet(),
            history = history.map { it.contentId }.toSet()
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CatalogUiState())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            baseState.update { it.copy(loading = true, error = null) }
            runCatching { repository.loadCatalog() }
                .onSuccess { catalog -> baseState.update { it.copy(loading = false, catalog = catalog) } }
                .onFailure { error -> baseState.update { it.copy(loading = false, error = error.message ?: "Falha ao carregar catalogo.") } }
        }
    }

    fun selectTab(tab: MainTab) {
        baseState.update { it.copy(selectedTab = tab) }
    }

    fun search(query: String) {
        baseState.update { it.copy(query = query) }
    }

    fun toggleFavorite(contentId: String, type: ContentType) {
        viewModelScope.launch {
            repository.toggleFavorite(contentId, type)
        }
    }

    fun saveHistory(contentId: String, type: ContentType, positionMs: Long) {
        viewModelScope.launch {
            repository.saveHistory(contentId, type, positionMs)
        }
    }

    fun validateSource(source: StreamSource, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            onResult(repository.validateSource(source))
        }
    }
}
