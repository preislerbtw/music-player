from pytubefix import YouTube
from pytubefix.contrib.search import Search
from spotify_scraper import SpotifyClient
import os


def pegar_musicas_da_playlist(playlist_url):
    musicas = []
    with SpotifyClient() as client:
        playlist = client.get_playlist(playlist_url)
        data = playlist.to_dict()
        tracks_raw = data.get("tracks", [])

        if isinstance(tracks_raw, dict):
            items = tracks_raw.get("items", [])
        else:
            items = tracks_raw

        for item in items:
            track = item.get("track") or item.get("item") or item
            if not track or track.get("is_local"):
                continue
            nome = track.get("name", "")
            artistas = track.get("artists", [])
            artista = artistas[0].get("name", "") if artistas else ""
            if nome and artista:
                musicas.append(f"{artista} - {nome}")

    return musicas


# Ordem de tentativa: se o WEB falhar (ex: erro de throttling do YouTube),
# tenta o próximo cliente antes de desistir da música
CLIENTES = ["WEB", "WEB_CREATOR", "ANDROID"]


def baixar_do_youtube(query, destination):
    print(f"Buscando: {query}")
    busca = Search(query)

    if not busca.videos:
        print(f"  -> Nenhum resultado encontrado para '{query}'. Pulando.")
        return

    resultado = busca.videos[0]

    ultimo_erro = None
    for cliente in CLIENTES:
        try:
            yt = YouTube(resultado.watch_url, client=cliente)
            video = yt.streams.filter(only_audio=True).first()

            if video is None:
                raise Exception("Nenhum stream de áudio disponível")

            outFile = video.download(output_path=destination)
            base, ext = os.path.splitext(outFile)
            newFile = base + ".mp3"
            os.rename(outFile, newFile)

            print(f"  -> '{yt.title}' baixada com sucesso! (cliente: {cliente})")
            return
        except Exception as e:
            ultimo_erro = e
            print(f"  -> Falhou com cliente {cliente}: {e}. Tentando próximo...")

    # Se chegou aqui, todos os clientes falharam
    raise ultimo_erro


if __name__ == "__main__":
    playlist_url = str(input("Cole o link da playlist do Spotify: "))
    print("Digite o destino (deixe em branco para pasta atual)")
    destination = str(input(">> ")) or "."
    # Remove aspas que o usuário possa ter digitado/colado junto do caminho
    destination = destination.strip().strip('"').strip("'")
    # Garante que a pasta de destino existe
    os.makedirs(destination, exist_ok=True)

    musicas = pegar_musicas_da_playlist(playlist_url)
    print(f"\n{len(musicas)} músicas encontradas na playlist.\n")

    for musica in musicas:
        try:
            baixar_do_youtube(musica, destination)
        except Exception as e:
            print(f"  -> Erro ao baixar '{musica}': {e}")