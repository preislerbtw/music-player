from pytubefix import YouTube
from pytubefix.contrib.search import Search
from spotify_scraper import SpotifyClient
import os
import time


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


# Ordem de tentativa dos clientes do YouTube
CLIENTES = ["WEB", "WEB_CREATOR", "ANDROID"]


def baixar_do_youtube(query, destination):
    print(f"Buscando: {query}")

    busca = Search(query)

    if not busca.videos:
        print(f"  -> Nenhum resultado encontrado para '{query}'. Pulando.")
        return False

    resultado = busca.videos[0]
    ultimo_erro = None

    for cliente in CLIENTES:
        try:
            yt = YouTube(resultado.watch_url, client=cliente)
            video = yt.streams.filter(only_audio=True).first()

            if video is None:
                raise Exception("Nenhum stream de áudio disponível")

            out_file = video.download(output_path=destination)

            base, ext = os.path.splitext(out_file)
            new_file = base + ".mp3"

            # Evita renomear o arquivo caso já tenha a extensão MP3
            if ext.lower() != ".mp3":
                os.rename(out_file, new_file)

            print(
                f"  -> '{yt.title}' baixada com sucesso! "
                f"(cliente: {cliente})"
            )
            return True

        except Exception as e:
            ultimo_erro = e
            print(
                f"  -> Falhou com cliente {cliente}: {e}. "
                "Tentando próximo..."
            )

    if ultimo_erro:
        raise ultimo_erro

    return False


def formatar_tempo(segundos):
    segundos = max(0, int(segundos))
    horas, resto = divmod(segundos, 3600)
    minutos, segundos = divmod(resto, 60)

    if horas > 0:
        return f"{horas}h {minutos}min {segundos}s"

    return f"{minutos}min {segundos}s"


if __name__ == "__main__":
    playlist_url = input(
        "Cole o link da playlist do Spotify: "
    ).strip()

    print("Digite o destino (deixe em branco para pasta atual)")
    destination = input(">> ").strip() or "."

    # Remove aspas do caminho, se existirem
    destination = destination.strip('"').strip("'")

    # Garante que a pasta de destino existe
    os.makedirs(destination, exist_ok=True)

    print("\nObtendo músicas da playlist...")

    musicas = pegar_musicas_da_playlist(playlist_url)
    total = len(musicas)

    print(f"\n{total} músicas encontradas na playlist.\n")

    if total == 0:
        print("Nenhuma música encontrada.")
        raise SystemExit

    inicio_total = time.time()
    tempos = []
    sucessos = 0
    falhas = 0

    for i, musica in enumerate(musicas, start=1):
        inicio_musica = time.time()

        print("\n" + "=" * 50)
        print(f"[{i}/{total}] Música: {musica}")
        print("=" * 50)

        try:
            resultado = baixar_do_youtube(musica, destination)

            if resultado:
                sucessos += 1
            else:
                falhas += 1

        except Exception as e:
            falhas += 1
            print(f"  -> Erro ao baixar '{musica}': {e}")

        # Calcula o tempo gasto nesta música
        tempo_musica = time.time() - inicio_musica
        tempos.append(tempo_musica)

        # Calcula a estimativa de tempo restante
        tempo_decorrido = time.time() - inicio_total
        media = sum(tempos) / len(tempos)
        restantes = total - i
        estimativa = media * restantes

        progresso = (i / total) * 100

        print("\n--- Progresso do download ---")
        print(f"Músicas processadas: {i}/{total}")
        print(f"Progresso: {progresso:.1f}%")
        print(f"Tempo desta música: {formatar_tempo(tempo_musica)}")
        print(f"Tempo decorrido: {formatar_tempo(tempo_decorrido)}")
        print(f"Tempo restante estimado: {formatar_tempo(estimativa)}")
        print(f"Downloads com sucesso: {sucessos}")
        print(f"Falhas: {falhas}")

    # Resumo final
    tempo_total = time.time() - inicio_total

    print("\n" + "=" * 50)
    print("DOWNLOAD DA PLAYLIST FINALIZADO")
    print("=" * 50)
    print(f"Total de músicas: {total}")
    print(f"Downloads com sucesso: {sucessos}")
    print(f"Falhas: {falhas}")
    print(f"Tempo total: {formatar_tempo(tempo_total)}")
    print(f"Pasta de destino: {os.path.abspath(destination)}")
    print("=" * 50)