import fs from "fs";
import axios from "axios";
import readline from "readline";

// --- Fungsi baca daftar sumber dari sources.txt ---
async function loadSources(file) {
  const urls = [];
  const fileStream = fs.createReadStream(file);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.trim()) urls.push(line.trim());
  }
  return urls;
}

// --- Cek apakah channel masih aktif (HTTP status 200) ---
async function checkChannel(url) {
  try {
    const res = await axios.head(url, { timeout: 5000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

// --- Ambil semua playlist dan filter channel aktif ---
async function fetchPlaylists() {
  const sources = await loadSources("sources.txt");
  let finalPlaylist = "#EXTM3U\n";
  let deadChannels = [];

  for (const source of sources) {
    console.log(`🔗 Mengambil dari: ${source}`);
    try {
      const { data } = await axios.get(source, { timeout: 15000 });
      const lines = data.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#EXTINF")) {
          const url = lines[i + 1]?.trim();
          if (url && (await checkChannel(url))) {
            finalPlaylist += `${lines[i]}\n${url}\n`;
          } else {
            deadChannels.push(url);
            console.log(`⚠️ Channel mati: ${url}`);
          }
        }
      }
    } catch (err) {
      console.log(`❌ Gagal ambil dari ${source}`);
    }
  }

  fs.writeFileSync("Finalplay.m3u", finalPlaylist, "utf8");
  fs.writeFileSync("dead_channels.txt", deadChannels.join("\n"), "utf8");

  console.log("✅ Playlist aktif disimpan ke Finalplay.m3u");
  console.log("📝 Daftar channel mati disimpan ke dead_channels.txt");
}

// --- Eksekusi utama ---
fetchPlaylists();
