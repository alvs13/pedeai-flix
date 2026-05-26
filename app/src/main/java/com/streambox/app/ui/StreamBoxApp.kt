package com.streambox.app.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LiveTv
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Tv
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.streambox.app.data.model.Banner
import com.streambox.app.data.model.Channel
import com.streambox.app.data.model.ContentType
import com.streambox.app.data.model.Movie
import com.streambox.app.data.model.Series
import com.streambox.app.data.model.StreamSource
import com.streambox.app.ui.state.CatalogUiState
import com.streambox.app.ui.state.MainTab
import com.streambox.app.ui.state.PlayerRoute
import com.streambox.app.ui.viewmodel.AuthViewModel
import com.streambox.app.ui.viewmodel.CatalogViewModel
import kotlinx.coroutines.launch

@Composable
fun StreamBoxApp(
    authViewModel: AuthViewModel = hiltViewModel(),
    catalogViewModel: CatalogViewModel = hiltViewModel()
) {
    val auth by authViewModel.state.collectAsState()
    val catalog by catalogViewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var playerRoute by remember { mutableStateOf<PlayerRoute?>(null) }
    var details by remember { mutableStateOf<DetailItem?>(null) }

    if (!auth.authenticated) {
        LoginScreen(authViewModel, snackbarHostState)
        return
    }

    playerRoute?.let { route ->
        PlayerScreen(
            route = route,
            onBack = { playerRoute = null },
            onProgress = { catalogViewModel.saveHistory(route.contentId, route.contentType, it) }
        )
        return
    }

    MainShell(
        state = catalog,
        snackbarHostState = snackbarHostState,
        onTab = catalogViewModel::selectTab,
        onSearch = catalogViewModel::search,
        onOpenDetails = { details = it },
        onPlay = { item, source ->
            catalogViewModel.validateSource(source) { allowed ->
                if (allowed) {
                    playerRoute = PlayerRoute(item.id, item.title, item.type, source.url, source.quality)
                } else {
                    scope.launch { snackbarHostState.showSnackbar("Fonte bloqueada: use apenas URLs licenciadas cadastradas.") }
                }
            }
        },
        onFavorite = { id, type -> catalogViewModel.toggleFavorite(id, type) },
        onLogout = authViewModel::logout
    )

    details?.let {
        DetailSheet(
            item = it,
            favorite = it.id in catalog.favorites,
            onDismiss = { details = null },
            onFavorite = { catalogViewModel.toggleFavorite(it.id, it.type) },
            onPlay = { source ->
                catalogViewModel.validateSource(source) { allowed ->
                    if (allowed) {
                        playerRoute = PlayerRoute(it.id, it.title, it.type, source.url, source.quality)
                    } else {
                        scope.launch { snackbarHostState.showSnackbar("Fonte bloqueada: use apenas URLs licenciadas cadastradas.") }
                    }
                }
            }
        )
    }
}

@Composable
private fun LoginScreen(viewModel: AuthViewModel, snackbarHostState: SnackbarHostState) {
    var email by remember { mutableStateOf("demo@streambox.app") }
    var password by remember { mutableStateOf("streambox") }
    var register by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Brush.verticalGradient(listOf(Color(0xFF10131C), Color(0xFF080A0F)))),
            contentAlignment = Alignment.Center
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("StreamBox", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                Text("Streaming autorizado para canais, filmes e series licenciados.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(email, { email = it }, label = { Text("E-mail") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    password,
                    { password = it },
                    label = { Text("Senha") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
                Button(
                    onClick = {
                        viewModel.submit(email, password, register) { message ->
                            scope.launch { snackbarHostState.showSnackbar(message) }
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (register) "Criar conta" else "Entrar")
                }
                TextButton(onClick = { register = !register }) {
                    Text(if (register) "Ja tenho conta" else "Cadastrar novo usuario")
                }
                Text(
                    "Termos: o StreamBox nao fornece conteudo proprio sem licenca. O administrador deve cadastrar somente fontes autorizadas ou licenciadas.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun MainShell(
    state: CatalogUiState,
    snackbarHostState: SnackbarHostState,
    onTab: (MainTab) -> Unit,
    onSearch: (String) -> Unit,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit,
    onFavorite: (String, ContentType) -> Unit,
    onLogout: () -> Unit
) {
    val isTvLike = LocalContext.current.resources.configuration.smallestScreenWidthDp >= 720
    Scaffold(
        contentWindowInsets = WindowInsets(0),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (!isTvLike) BottomNavigation(state.selectedTab, onTab)
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Row(Modifier.fillMaxSize().padding(padding)) {
            if (isTvLike) SideNavigation(state.selectedTab, onTab)
            CatalogContent(
                state = state,
                onTab = onTab,
                onSearch = onSearch,
                onOpenDetails = onOpenDetails,
                onPlay = onPlay,
                onFavorite = onFavorite,
                onLogout = onLogout,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun CatalogContent(
    state: CatalogUiState,
    onTab: (MainTab) -> Unit,
    onSearch: (String) -> Unit,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit,
    onFavorite: (String, ContentType) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier.fillMaxSize()) {
        if (state.catalog.config.backgroundImageUrl.isNotBlank()) {
            AsyncImage(
                model = state.catalog.config.backgroundImageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.78f))
            )
        }
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding(),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item {
                TopSearch(state = state, onSearch = onSearch)
            }
            if (state.loading) {
                item { LoadingBlock() }
            } else {
                state.error?.let { error ->
                    item { ErrorBlock(error) }
                }
                when (state.selectedTab) {
                    MainTab.HOME -> homeItems(state, onTab, onOpenDetails, onPlay, onFavorite)
                    MainTab.LIVE -> liveItems(state, onOpenDetails, onPlay)
                    MainTab.MOVIES -> movieItems(state, onOpenDetails)
                    MainTab.SERIES -> seriesItems(state, onOpenDetails)
                    MainTab.FAVORITES -> favoriteItems(state, onOpenDetails)
                    MainTab.SETTINGS -> settingsItems(onLogout)
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.homeItems(
    state: CatalogUiState,
    onTab: (MainTab) -> Unit,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit,
    onFavorite: (String, ContentType) -> Unit
) {
    item { QuickAccessRow(onTab) }
    item { MetricsStrip(state) }
    item { BannerRow(state.catalog.banners, state, onOpenDetails) }
    item { SectionHeader("Continuar assistindo", "Retome de onde parou") }
    item { ContinueRow(state, onOpenDetails) }
    item { SectionHeader("TV ao vivo", "${state.catalog.channels.size} canais autorizados") }
    item { ChannelGridPreview(state.catalog.channels.take(12), onOpenDetails, onPlay) }
    item { SectionHeader("Filmes em destaque", "VOD licenciado em HD e 4K") }
    item { MovieRow(state.catalog.movies, onOpenDetails, onFavorite, state.favorites) }
    item { SectionHeader("Series para maratonar", "Temporadas cadastradas pelo admin") }
    item { SeriesRow(state.catalog.series, onOpenDetails, onFavorite, state.favorites) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.liveItems(
    state: CatalogUiState,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit
) {
    item { SectionHeader("Canais ao vivo", "${state.filteredChannels().size} canais encontrados") }
    item { ChannelGrid(state.filteredChannels(), onOpenDetails, onPlay) }
    item { SectionTitle("Grade EPG") }
    items(state.catalog.epg) { epg ->
        EpgCard(epg.channelId, epg.title, "${epg.startsAt} - ${epg.endsAt}")
    }
}

@Composable
private fun ChannelGridPreview(
    channels: List<Channel>,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        channels.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { channel ->
                    ChannelCompactCard(channel, onOpenDetails, onPlay, Modifier.weight(1f))
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun ChannelGrid(
    channels: List<Channel>,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit
) {
    val rows = channels.chunked(3)
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { channel ->
                    ChannelCompactCard(channel, onOpenDetails, onPlay, Modifier.weight(1f))
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun ChannelCompactCard(
    channel: Channel,
    onOpenDetails: (DetailItem) -> Unit,
    onPlay: (DetailItem, StreamSource) -> Unit,
    modifier: Modifier = Modifier
) {
    val detail = channel.toDetail()
    Card(
        onClick = { channel.sources.firstOrNull()?.let { onPlay(detail, it) } ?: onOpenDetails(detail) },
        modifier = modifier.height(148.dp),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.fillMaxWidth().height(58.dp)) {
                AsyncImage(
                    model = channel.logoUrl,
                    contentDescription = channel.title,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(6.dp)),
                    contentScale = ContentScale.Crop
                )
                Surface(
                    modifier = Modifier.align(Alignment.TopStart).padding(5.dp),
                    color = Color(0xFFE51D36),
                    shape = RoundedCornerShape(5.dp)
                ) {
                    Text("LIVE", Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black)
                }
            }
            Text(channel.title, maxLines = 2, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
            Text(channel.category, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.movieItems(
    state: CatalogUiState,
    onOpenDetails: (DetailItem) -> Unit
) {
    item { SectionTitle("Filmes") }
    items(state.filteredMovies()) { movie ->
        WideContentCard(movie.toDetail(), onOpenDetails)
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.seriesItems(
    state: CatalogUiState,
    onOpenDetails: (DetailItem) -> Unit
) {
    item { SectionTitle("Series") }
    items(state.filteredSeries()) { item ->
        WideContentCard(item.toDetail(), onOpenDetails)
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.favoriteItems(
    state: CatalogUiState,
    onOpenDetails: (DetailItem) -> Unit
) {
    val items = state.allDetails().filter { it.id in state.favorites }
    item { SectionTitle("Favoritos") }
    if (items.isEmpty()) item { EmptyBlock("Nada salvo ainda.") }
    items(items) { item -> WideContentCard(item, onOpenDetails) }
}

private fun androidx.compose.foundation.lazy.LazyListScope.settingsItems(onLogout: () -> Unit) {
    item { SectionTitle("Configuracoes") }
    item { SettingsPanel(onLogout) }
    item { SectionTitle("Administrativo") }
    item { AdminPanel() }
}

@Composable
private fun TopSearch(state: CatalogUiState, onSearch: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(state.catalog.config.brandTitle, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                Text(state.catalog.config.tagline, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.16f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.55f))
            ) {
                Text("4K", Modifier.padding(horizontal = 12.dp, vertical = 8.dp), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
        }
        OutlinedTextField(
            value = state.query,
            onValueChange = onSearch,
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            label = { Text("Buscar canal, filme, serie ou categoria") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp)
        )
    }
}

@Composable
private fun QuickAccessRow(onTab: (MainTab) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        item { QuickAccessChip("Ao vivo", Icons.Outlined.LiveTv) { onTab(MainTab.LIVE) } }
        item { QuickAccessChip("Filmes", Icons.Outlined.Movie) { onTab(MainTab.MOVIES) } }
        item { QuickAccessChip("Series", Icons.Outlined.Tv) { onTab(MainTab.SERIES) } }
        item { QuickAccessChip("Favoritos", Icons.Outlined.Favorite) { onTab(MainTab.FAVORITES) } }
        item { QuickAccessChip("Admin", Icons.Outlined.AdminPanelSettings) { onTab(MainTab.SETTINGS) } }
    }
}

@Composable
private fun QuickAccessChip(label: String, icon: ImageVector, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f))
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
            Text(label, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MetricsStrip(state: CatalogUiState) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        MetricCard("${state.catalog.channels.size * 120}+", "horas ao vivo", Modifier.weight(1f))
        MetricCard("${state.catalog.movies.size + state.catalog.series.size}+", "titulos VOD", Modifier.weight(1f))
        MetricCard("EPG", "guia integrado", Modifier.weight(1f))
    }
}

@Composable
private fun MetricCard(value: String, label: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.07f))
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(value, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall, maxLines = 1)
        }
    }
}

@Composable
private fun BannerRow(banners: List<Banner>, state: CatalogUiState, onOpenDetails: (DetailItem) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        items(banners) { banner ->
            val detail = state.allDetails().firstOrNull { it.id == banner.contentId }
            Card(
                onClick = { detail?.let(onOpenDetails) },
                modifier = Modifier
                    .width(620.dp)
                    .aspectRatio(16f / 8f),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Box(Modifier.fillMaxSize()) {
                    AsyncImage(
                        model = banner.imageUrl,
                        contentDescription = banner.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color.Black.copy(alpha = 0.86f), Color.Black.copy(alpha = 0.28f), Color.Transparent)
                                )
                            )
                    )
                    Column(
                        Modifier
                            .align(Alignment.BottomStart)
                            .padding(20.dp)
                            .fillMaxWidth(0.72f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            AssistChip(onClick = {}, label = { Text("Premium") })
                            AssistChip(onClick = {}, label = { Text(detail?.type?.name ?: "CATALOGO") })
                        }
                        Text(banner.title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                        Text(banner.subtitle, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Button(onClick = { detail?.let(onOpenDetails) }) {
                            Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text("Ver detalhes")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelRow(channels: List<Channel>, onOpenDetails: (DetailItem) -> Unit, onPlay: (DetailItem, StreamSource) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(channels) { channel ->
            val detail = channel.toDetail()
            Card(
                onClick = { onOpenDetails(detail) },
                modifier = Modifier.width(240.dp),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box {
                        AsyncImage(channel.logoUrl, channel.title, Modifier.fillMaxWidth().height(126.dp).clip(RoundedCornerShape(6.dp)), contentScale = ContentScale.Crop)
                        Surface(
                            modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                            color = Color(0xFFE51D36),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text("AO VIVO", Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black)
                        }
                    }
                    Text(channel.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(channel.category, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                    Button(onClick = { channel.sources.firstOrNull()?.let { onPlay(detail, it) } }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Assistir")
                    }
                }
            }
        }
    }
}

@Composable
private fun MovieRow(movies: List<Movie>, onOpenDetails: (DetailItem) -> Unit, onFavorite: (String, ContentType) -> Unit, favorites: Set<String>) {
    PosterRow(movies.map { it.toDetail() }, onOpenDetails, onFavorite, favorites)
}

@Composable
private fun SeriesRow(series: List<Series>, onOpenDetails: (DetailItem) -> Unit, onFavorite: (String, ContentType) -> Unit, favorites: Set<String>) {
    PosterRow(series.map { it.toDetail() }, onOpenDetails, onFavorite, favorites)
}

@Composable
private fun PosterRow(items: List<DetailItem>, onOpenDetails: (DetailItem) -> Unit, onFavorite: (String, ContentType) -> Unit, favorites: Set<String>) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(items) { item ->
            Card(
                onClick = { onOpenDetails(item) },
                modifier = Modifier.width(188.dp),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column {
                    Box {
                        AsyncImage(item.imageUrl, item.title, Modifier.fillMaxWidth().height(252.dp), contentScale = ContentScale.Crop)
                        Surface(
                            modifier = Modifier.align(Alignment.BottomStart).padding(8.dp),
                            color = Color.Black.copy(alpha = 0.72f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(item.sources.firstOrNull()?.quality ?: "HD", Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        }
                        IconButton(onClick = { onFavorite(item.id, item.type) }, modifier = Modifier.align(Alignment.TopEnd)) {
                            Icon(Icons.Outlined.Favorite, contentDescription = "Favorito", tint = if (item.id in favorites) MaterialTheme.colorScheme.primary else Color.White)
                        }
                    }
                    Text(item.title, Modifier.padding(10.dp), fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun WideContentCard(item: DetailItem, onOpenDetails: (DetailItem) -> Unit) {
    Card(
        onClick = { onOpenDetails(item) },
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AsyncImage(item.imageUrl, item.title, Modifier.size(110.dp, 74.dp).clip(RoundedCornerShape(6.dp)), contentScale = ContentScale.Crop)
            Column(Modifier.weight(1f)) {
                Text(item.title, fontWeight = FontWeight.Bold)
                Text(item.category, color = MaterialTheme.colorScheme.primary)
                Text(item.description, maxLines = 2, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailSheet(
    item: DetailItem,
    favorite: Boolean,
    onDismiss: () -> Unit,
    onFavorite: () -> Unit,
    onPlay: (StreamSource) -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            AsyncImage(item.backdropUrl, item.title, Modifier.fillMaxWidth().height(210.dp).clip(RoundedCornerShape(8.dp)), contentScale = ContentScale.Crop)
            Text(item.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(item.description, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text(item.category) })
                AssistChip(onClick = {}, label = { Text(item.type.name) })
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { item.sources.firstOrNull()?.let(onPlay) }) {
                    Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Reproduzir")
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(item.sources) { source ->
                        FilterChip(
                            selected = false,
                            onClick = { onPlay(source) },
                            label = { Text("${source.quality} ${source.type}") }
                        )
                    }
                }
                TextButton(onClick = onFavorite) {
                    Text(if (favorite) "Remover favorito" else "Favoritar")
                }
            }
            Text(
                "Somente URLs autorizadas cadastradas pelo administrador sao liberadas para reproducao.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
private fun PlayerScreen(route: PlayerRoute, onBack: () -> Unit, onProgress: (Long) -> Unit) {
    val context = LocalContext.current
    val activity = context as? Activity
    val player = remember(route.url) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(route.url))
            prepare()
            playWhenReady = true
        }
    }
    var fullScreen by remember { mutableStateOf(false) }
    var playbackError by remember { mutableStateOf<String?>(null) }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                playbackError = "Link offline ou indisponivel. Verifique a URL autorizada no painel administrativo."
            }
        }
        player.addListener(listener)
        onDispose {
            player.removeListener(listener)
            onProgress(player.currentPosition)
            player.release()
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    LaunchedEffect(fullScreen) {
        activity?.requestedOrientation = if (fullScreen) {
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        } else {
            ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    Column(Modifier.fillMaxSize().background(Color.Black)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onBack) { Text("Voltar") }
            Text(route.title, Modifier.weight(1f), color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
            FilterChip(selected = fullScreen, onClick = { fullScreen = !fullScreen }, label = { Text("Tela cheia") })
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            AndroidView(
                factory = {
                    PlayerView(it).apply {
                        this.player = player
                        useController = true
                        setShowSubtitleButton(true)
                        setShowFastForwardButton(true)
                        setShowRewindButton(true)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
            playbackError?.let {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.94f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp)
                ) {
                    Text(it, Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AssistChip(onClick = {}, label = { Text(route.quality) })
            AssistChip(onClick = {}, label = { Text("Legendas/Audio no controle do player") })
        }
    }
}

@Composable
private fun BottomNavigation(selected: MainTab, onTab: (MainTab) -> Unit) {
    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
        listOf(MainTab.HOME, MainTab.LIVE, MainTab.MOVIES, MainTab.SERIES, MainTab.FAVORITES, MainTab.SETTINGS).forEach { tab ->
            NavigationBarItem(
                selected = selected == tab,
                onClick = { onTab(tab) },
                icon = { Icon(tab.icon(), contentDescription = tab.label) },
                label = { Text(tab.label, maxLines = 1) }
            )
        }
    }
}

@Composable
private fun SideNavigation(selected: MainTab, onTab: (MainTab) -> Unit) {
    NavigationRail(containerColor = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxHeight()) {
        Spacer(Modifier.height(16.dp))
        MainTab.entries.forEach { tab ->
            NavigationRailItem(
                selected = selected == tab,
                onClick = { onTab(tab) },
                icon = { Icon(tab.icon(), contentDescription = tab.label) },
                label = { Text(tab.label) }
            )
        }
    }
}

@Composable
private fun SettingsPanel(onLogout: () -> Unit) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Modo escuro ativo", fontWeight = FontWeight.Bold)
            Text("Layout adaptativo para celular, tablet e Android TV.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Termos: o app nao fornece conteudo proprio sem licenca e aceita apenas fontes cadastradas pelo administrador.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(onClick = onLogout) { Text("Sair") }
        }
    }
}

@Composable
private fun AdminPanel() {
    var channel by remember { mutableStateOf("") }
    var movie by remember { mutableStateOf("") }
    var series by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var banner by remember { mutableStateOf("") }
    var source by remember { mutableStateOf("") }
    val fields = listOf(
        "Canais" to channel,
        "Filmes" to movie,
        "Series" to series,
        "Categorias" to category,
        "Banners" to banner,
        "URLs autorizadas" to source
    )
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Outlined.AdminPanelSettings, contentDescription = null)
                Text("Cadastro rapido", fontWeight = FontWeight.Bold)
            }
            fields.forEach { (label, value) ->
                OutlinedTextField(
                    value = value,
                    onValueChange = {
                        when (label) {
                            "Canais" -> channel = it
                            "Filmes" -> movie = it
                            "Series" -> series = it
                            "Categorias" -> category = it
                            "Banners" -> banner = it
                            else -> source = it
                        }
                    },
                    label = { Text(label) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
            Button(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Salvar mock administrativo") }
        }
    }
}

@Composable
private fun ContinueRow(state: CatalogUiState, onOpenDetails: (DetailItem) -> Unit) {
    val items = state.allDetails().filter { it.id in state.history }
    if (items.isEmpty()) {
        EmptyBlock("Seu historico aparece aqui quando voce assistir algo.")
    } else {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(items) { WideMiniCard(it, onOpenDetails) }
        }
    }
}

@Composable
private fun WideMiniCard(item: DetailItem, onOpenDetails: (DetailItem) -> Unit) {
    Card(onClick = { onOpenDetails(item) }, modifier = Modifier.width(260.dp), shape = RoundedCornerShape(8.dp)) {
        Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(item.imageUrl, item.title, Modifier.size(72.dp, 48.dp).clip(RoundedCornerShape(6.dp)), contentScale = ContentScale.Crop)
            Text(item.title, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun EpgCard(channelId: String, title: String, time: String) {
    Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(title, fontWeight = FontWeight.Bold)
                Text(channelId, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(time, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
}

@Composable
private fun SectionHeader(title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun LoadingBlock() {
    Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ErrorBlock(message: String) {
    Surface(color = MaterialTheme.colorScheme.errorContainer, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
        Text(message, Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
    }
}

@Composable
private fun EmptyBlock(message: String) {
    Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
        Text(message, Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private data class DetailItem(
    val id: String,
    val title: String,
    val category: String,
    val imageUrl: String,
    val backdropUrl: String,
    val description: String,
    val type: ContentType,
    val sources: List<StreamSource>
)

private fun Channel.toDetail() = DetailItem(id, title, category, logoUrl, logoUrl, description, ContentType.CHANNEL, sources)
private fun Movie.toDetail() = DetailItem(id, title, category, posterUrl, backdropUrl, description, ContentType.MOVIE, sources)
private fun Series.toDetail() = DetailItem(id, title, category, posterUrl, backdropUrl, description, ContentType.SERIES, sources)

private fun CatalogUiState.allDetails(): List<DetailItem> =
    catalog.channels.map { it.toDetail() } + catalog.movies.map { it.toDetail() } + catalog.series.map { it.toDetail() }

private fun CatalogUiState.filteredChannels(): List<Channel> =
    catalog.channels.filter { query.isBlank() || it.title.contains(query, true) || it.category.contains(query, true) }

private fun CatalogUiState.filteredMovies(): List<Movie> =
    catalog.movies.filter { query.isBlank() || it.title.contains(query, true) || it.category.contains(query, true) }

private fun CatalogUiState.filteredSeries(): List<Series> =
    catalog.series.filter { query.isBlank() || it.title.contains(query, true) || it.category.contains(query, true) }

private fun MainTab.icon(): ImageVector = when (this) {
    MainTab.HOME -> Icons.Outlined.Home
    MainTab.LIVE -> Icons.Outlined.LiveTv
    MainTab.MOVIES -> Icons.Outlined.Movie
    MainTab.SERIES -> Icons.Outlined.Tv
    MainTab.FAVORITES -> Icons.Outlined.Favorite
    MainTab.SETTINGS -> Icons.Outlined.Settings
}
