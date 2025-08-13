import requests

# Daftar URL playlist backup (ganti dengan link playlist kamu sendiri)
backup_playlist_urls = [
    "https://example.com/playlist1.m3u",
    "https://example.com/playlist2.m3u",
]

output_file = "RFK2.m3u"

def download_playlist(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        print(f"Download sukses dari {url}")
        return response.text
    except Exception as e:
        print(f"Gagal download dari {url}: {e}")
        return None

def main():
    playlists = []
    for url in backup_playlist_urls:
        content = download_playlist(url)
        if content:
            playlists.append(content)
    
    if playlists:
        # Contoh gabung semua playlist (bisa sesuaikan logika kamu)
        combined = "\n".join(playlists)
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(combined)
        
        print(f"Playlist berhasil disimpan ke {output_file}")
    else:
        print("Tidak ada playlist berhasil didownload.")

if __name__ == "__main__":
    main()
