from pytubefix.contrib.search import Search
import requests
import os
import base64

CLIENT_ID = "7d9cf00fc7d04bc1b20a9f31192ad28b"
CLIENT_SECRET = "90fd775435b641888b3ead1efafeab87"


def get_token():
    credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()
    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {credentials}"},
        data={"grant_type": "client_credentials"},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def pegar_musicas_da_playlist(playlist_url, token):
    playlist_id = playlist_url.split("/")[-1].split("?")[0]
    musicas = []
    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    headers = {"Authorization": f"Bearer {token}"}

    # Paginação — pega todas as músicas mesmo em playlists grandes
    while url:
        resp = requests.get(url, headers=headers, params={"limit": 100})
        resp.raise_for_status()
        data = resp.json()

        for item in data.get("items", []):
            track = item.get("track")
            if not track or track.get("is_local"):
                continue
            nome = track.get("name", "")
            artistas = track.get("artists", [])
            artista = artistas[0].get("name", "") if artistas else ""
            musicas.append(f"{artista} - {nome}")

        url = data.get("next")  # próxima página, None se acabou

    return musicas


def baixar_do_youtube(query, destination):
    print(f"Buscando: {query}")
    busca = Search(query)

    if not busca.videos:
        print(f"  -> Nenhum resultado encontrado para '{query}'. Pulando.")
        return

    yt = busca.videos[0]
    video = yt.streams.filter(only_audio=True).first()

    outFile = video.download(output_path=destination)
    base, ext = os.path.splitext(outFile)
    newFile = base + ".mp3"
    os.rename(outFile, newFile)

    print(f"  -> '{yt.title}' baixada com sucesso!")


if __name__ == "__main__":
    playlist_url = str(input("Cole o link da playlist do Spotify: "))
    print("Digite o destino (deixe em branco para pasta atual)")
    destination = str(input(">> ")) or "."

    token = get_token()
    musicas = pegar_musicas_da_playlist(playlist_url, token)
    print(f"\n{len(musicas)} músicas encontradas na playlist.\n")

    for musica in musicas:
        try:
            baixar_do_youtube(musica, destination)
        except Exception as e:
            print(f"  -> Erro ao baixar '{musica}': {e}")