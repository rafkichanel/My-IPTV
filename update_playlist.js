const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');
const path = require('path');
require('dotenv').config();

const MAIN_FILE = "Playlist2"; // Output final
const SOURCES_FILE = "sources.txt";
const TIMEOUT = parseInt(process.env.TIMEOUT || "10000", 10); // default 10 detik
const MAX_ATTEMPTS = 3;

// Fungsi untuk cek URL channel (tidak dipakai kalau tanpa filter)
const checkChannel = async (url, attempts = MAX_ATTEMPTS) => {
    for (let i = 0; i < attempts; i++) {
        try {
            await axios.head(url, { timeout: TIMEOUT, maxRedirects: 10 });
            return true;
        } catch (error) {
            continue;
        }
    }
    return false;
};

// Fungsi auto commit & push ke GitHub
const autoCommitAndPush = async () => {
    const git = simpleGit();
    const remoteUrl = `https://${process.env.GH_USERNAME}:${process.env.GH_TOKEN}@github.com/${process.env.GH_USERNAME}/${process.env.GH_REPO}.git`;

    try {
        const remotes = await git.getRemotes(true);
        const hasOrigin = remotes.some(remote => remote.name === 'origin');

        if (!hasOrigin) {
            await git.addRemote('origin', remoteUrl);
        } else {
            await git.remote(['set-url', 'origin', remoteUrl]);
        }

        console.log("📂 Commit file:", MAIN_FILE);

        await git.add(MAIN_FILE);
        await git.commit('🔄 Update Playlist2', undefined, { '--allow-empty': null });
        await git.push('origin', 'master');

        const log = await git.log();
        console.log("✅ Commit terbaru:", log.latest.message);
    } catch (error) {
        console.error("❌ Gagal push ke GitHub:", error.message);
    }
};

// Fungsi utama
const main = async () => {
    let sources;
    try {
        const sourcesContent = fs.readFileSync(SOURCES_FILE, 'utf-8');
        sources = sourcesContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    } catch (error) {
        console.error(`⚠️ Error: File '${SOURCES_FILE}' tidak ditemukan.`);
        process.exit(1);
    }

    const allChannels = [];
    const seenUrls = new Set();

    console.log(`📡 Mengunduh dari ${sources.length} sumber...`);

    for (const [idx, url] of sources.entries()) {
        try {
            console.log(`🌐 Mengambil dari sumber ${idx + 1}: ${url}`);
            const response = await axios.get(url, { timeout: 15000 });
            const lines = response.data.split('\n');

            let extinfLine = null;
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("#EXTINF")) {
                    extinfLine = trimmed;
                } else if (trimmed && !trimmed.startsWith("#")) {
                    if (extinfLine) {
                        const channelUrl = trimmed;
                        if (!seenUrls.has(channelUrl)) {
                            seenUrls.add(channelUrl);
                            allChannels.push(`${extinfLine}\n${channelUrl}`);
                        }
                        extinfLine = null;
                    }
                }
            }
        } catch (error) {
            console.error(`⚠️ Gagal mengambil sumber ${idx + 1}: ${error.message}`);
        }
    }

    console.log(`📺 Total channel berhasil diproses: ${allChannels.length}`);

    try {
        fs.writeFileSync(MAIN_FILE, "#EXTM3U\n" + allChannels.join('\n') + "\n", 'utf-8');
        console.log(`✅ File '${MAIN_FILE}' berhasil ditulis.`);
    } catch (error) {
        console.error(`❌ Gagal menulis file '${MAIN_FILE}':`, error.message);
        process.exit(1);
    }

    // Push ke GitHub
    await autoCommitAndPush();
};

// Jalankan
main();
