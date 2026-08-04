from pytubefix.contrib.search import Search
import requests
import re
import json
import os


def pegar_musicas_da_playlist(playlist_url):
    playlist_id = playlist_url.split("/")[-1].split("?")[0]
    embed_url = f"https://open.spotify.com/embed/playlist/{playlist_id}"

    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(embed_url, headers=headers)
    resp.raise_for_status()

    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>',
        resp.text
    )
    if not match:
        raise Exception("Não foi possível encontrar os dados da playlist. O link pode estar errado ou a playlist é privada.")

    data = json.loads(match.group(1))

    try:
        tracks = data["props"]["pageProps"]["state"]["data"]["entity"]["trackList"]
    except KeyError:
        raise Exception("Formato inesperado dos dados. O Spotify pode ter mudado a estrutura da página.")

    musicas = []
    for track in tracks:
        nome = track.get("title", "")
        artista = track.get("subtitle", "")
        musicas.append(f"{artista} - {nome}")

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
    newFile = base + '.mp3'
    os.rename(outFile, newFile)

    print(f"  -> '{yt.title}' baixada com sucesso!")


if __name__ == "__main__":
    playlist_url = str(input("Cole o link da playlist do Spotify: "))
    print("Digite o destino (deixe em branco para pasta atual)")
    destination = str(input(">> ")) or '.'

    musicas = pegar_musicas_da_playlist(playlist_url)
    print(f"\n{len(musicas)} músicas encontradas na playlist.\n")

    for musica in musicas:
        try:
            baixar_do_youtube(musica, destination)
        except Exception as e:
            print(f"  -> Erro ao baixar '{musica}': {e}")