package com.streambox.app.data.remote

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
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FakeStreamBoxApi @Inject constructor() : StreamBoxApi {
    private val demoHls = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    private val demoMp4 = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    private val cinema = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1400&auto=format&fit=crop"
    private val stadium = "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1400&auto=format&fit=crop"
    private val studio = "https://images.unsplash.com/photo-1495567720989-cebdbdd97913?q=80&w=1400&auto=format&fit=crop"
    private val kids = "https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=1400&auto=format&fit=crop"
    private val doc = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop"
    private val action = "https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=1400&auto=format&fit=crop"

    override suspend fun getConfig(): AppConfig {
        delay(120)
        return AppConfig(backgroundImageUrl = cinema)
    }

    override suspend fun getChannels(): List<Channel> {
        delay(250)
        return listOf(
            Channel("ch-news", "Horizonte News", "Noticias", studio, "Canal ao vivo com boletins autorizados.", listOf(StreamSource(demoHls, "HLS", "Auto"))),
            Channel("ch-sports", "Arena Livre", "Esportes", stadium, "Eventos e programas esportivos licenciados.", listOf(StreamSource(demoHls, "HLS", "Auto"))),
            Channel("ch-culture", "Palco Cultura", "Cultura", cinema, "Shows, entrevistas e documentarios autorizados.", listOf(StreamSource(demoHls, "HLS", "Auto"))),
            Channel("ch-kids", "Kids Mundo", "Infantil", kids, "Programacao infantil licenciada.", listOf(StreamSource(demoHls, "HLS", "Auto"))),
            Channel("ch-docs", "Doc Nature", "Documentarios", doc, "Documentarios e especiais cadastrados.", listOf(StreamSource(demoHls, "HLS", "Auto")))
        )
    }

    override suspend fun getMovies(): List<Movie> {
        delay(250)
        return listOf(
            Movie("mv-aurora", "Aurora City", "Acao", action, action, "Aventura urbana autorizada em alta definicao.", 96, listOf(StreamSource(demoMp4, "MP4", "1080p"), StreamSource(demoMp4, "MP4", "720p"))),
            Movie("mv-deep", "Deep Signals", "Ficcao", cinema, cinema, "Misterio de ficcao com distribuicao autorizada.", 112, listOf(StreamSource(demoMp4, "MP4", "4K"))),
            Movie("mv-table", "Mesa Para Dois", "Drama", studio, studio, "Drama independente cadastrado pelo administrador.", 88, listOf(StreamSource(demoMp4, "MP4", "720p"))),
            Movie("mv-wild", "Planeta Azul", "Documentario", doc, doc, "Especial documental licenciado para VOD.", 74, listOf(StreamSource(demoMp4, "MP4", "1080p")))
        )
    }

    override suspend fun getSeries(): List<Series> {
        delay(250)
        return listOf(
            Series("sr-studio", "Studio 42", "Comedia", studio, studio, "Serie original cadastrada com licenca.", 2, listOf(StreamSource(demoMp4, "MP4", "1080p"))),
            Series("sr-routes", "Rotas do Mundo", "Documentario", doc, doc, "Viagens e cultura com fontes autorizadas.", 3, listOf(StreamSource(demoMp4, "MP4", "720p"))),
            Series("sr-kids", "Clube dos Sabados", "Infantil", kids, kids, "Serie infantil autorizada para toda a familia.", 4, listOf(StreamSource(demoMp4, "MP4", "1080p")))
        )
    }

    override suspend fun getBanners(): List<Banner> {
        delay(180)
        return listOf(
            Banner("bn-1", "Cinema 4K autorizado", "Filmes, series e canais licenciados em uma experiencia premium.", action, "mv-deep", ContentType.MOVIE),
            Banner("bn-2", "Ao vivo agora", "Canais cadastrados pelo administrador com EPG e favoritos.", stadium, "ch-sports", ContentType.CHANNEL),
            Banner("bn-3", "Familia e infantil", "Conteudos seguros, organizados por categoria.", kids, "sr-kids", ContentType.SERIES)
        )
    }

    override suspend fun getEpg(): List<EpgItem> {
        delay(180)
        return listOf(
            EpgItem("epg-1", "ch-news", "Jornal da Manha", "08:00", "09:30"),
            EpgItem("epg-2", "ch-news", "Analise do Dia", "09:30", "11:00"),
            EpgItem("epg-3", "ch-sports", "Pre-jogo", "10:00", "11:30"),
            EpgItem("epg-4", "ch-culture", "Entrevista Aberta", "11:00", "12:00")
        )
    }

    override suspend fun postFavorite(request: FavoriteRequest) = Unit

override suspend fun postHistory(request: HistoryRequest) = Unit
}
