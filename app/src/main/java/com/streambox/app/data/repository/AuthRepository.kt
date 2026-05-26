package com.streambox.app.data.repository

import com.streambox.app.data.model.UserSession
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor() {
    private val _session = MutableStateFlow<UserSession?>(null)
    val session: StateFlow<UserSession?> = _session

    suspend fun login(email: String, password: String): Result<UserSession> {
        delay(350)
        return validate(email, password).onSuccess { _session.value = it }
    }

    suspend fun register(email: String, password: String): Result<UserSession> {
        delay(450)
        return validate(email, password).onSuccess { _session.value = it }
    }

    fun logout() {
        _session.value = null
    }

    private fun validate(email: String, password: String): Result<UserSession> {
        if (!email.contains("@") || password.length < 6) {
            return Result.failure(IllegalArgumentException("Informe um e-mail valido e senha com 6+ caracteres."))
        }
        return Result.success(UserSession("demo-user", email, "mock-token"))
    }
}
