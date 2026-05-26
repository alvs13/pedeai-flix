package com.streambox.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streambox.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val authenticated: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {
    val state: StateFlow<AuthUiState> = repository.session
        .map { AuthUiState(authenticated = it != null) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AuthUiState())

    fun submit(email: String, password: String, register: Boolean, onError: (String) -> Unit) {
        viewModelScope.launch {
            val result = if (register) repository.register(email, password) else repository.login(email, password)
            result.exceptionOrNull()?.message?.let(onError)
        }
    }

    fun logout() = repository.logout()
}
