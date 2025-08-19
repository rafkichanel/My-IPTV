require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');

const MAIN_FILE = process.env.MAIN_FILE || "Finalplay.m3u";
const SOURCES_FILE = process.env.SOURCES_FILE || "sources.txt";
const TIMEOUT = parseInt(process.env.TIMEOUT || "10", 10) * 1000;
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || "50", 10);

// Cek status channel
const checkChannel = async (url, attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
        try {
            await axios.head(url, { timeout: TIMEOUT, maxRedirects: 10 });
            return true;
        } catch (_) {}
    }
    return false;
};

// Fungsi utama
const main = async () => {
    let sources;
    try {
        const sourcesContent = fs.readFileSync(SOURCES_FILE, 'utf-8');
        sources = sourcesContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (error) {
        console.error(`⚠️ Error: File '${SOURCES_FILE}' tidak ditemukan.`);
        process.exit(1);
    }

    const allChannels = [];
    const seenUrls = new Set();

    console.log(`📡 Mengunduh dari ${sources.length} sumber...`);

    for (const [idx, url] of sources.entries()) {
        try {
            console.log(`Mengunduh dari sumber ${idx + 1}: ${url}`);
            const response = await axios.get(url, { timeout: 15000 });
            const lines = response.data.split('\n');

            let extinfLine = null;
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith("#EXTINF")) {
                    extinfLine = trimmedLine;
                } else if (trimmedLine && !trimmedLine.startsWith("#")) {
                    if (extinfLine) {
                        const channelUrl = trimmedLine;
                        if (!seenUrls.has(channelUrl)) {
                            seenUrls.add(channelUrl);
                            allChannels.push({
                                extinf: extinfLine,
                                url: channelUrl
                            });
                        }
                        extinfLine = null;
                    }
                }
            }
        } catch (error) {
            console.error(`⚠️ Gagal mengambil sumber ${idx + 1}: ${error.message}`);
        }
    }

    console.log(`✅ Total channel unik: ${allChannels.length}`);
    console.log(`⏳ Memeriksa channel aktif...`);

    const results = [];
    let activeCount = 0;

    const worker = async (channel) => {
        const isActive = await checkChannel(channel.url);
        if (isActive) {
            results.push(`${channel.extinf}\n${channel.url}`);
            activeCount++;
        }
    };

    const queue = [...allChannels];
    const workers = Array.from({ length: MAX_WORKERS }, async () => {
        while (queue.length > 0) {
            const item = queue.pop();
            if (item) await worker(item);
        }
    });

    await Promise.all(workers);

    fs.writeFileSync(MAIN_FILE, "#EXTM3U\n" + results.join('\n') + "\n", 'utf-8');
    console.log(`✅ Selesai! ${activeCount} channel aktif disimpan ke '${MAIN_FILE}'`);

    await autoCommitAndPush();
};

// Commit & push otomatis ke GitHub
const autoCommitAndPush = async () => {
    const git = simpleGit();

    const remoteUrl = `https://${process.env.GH_USERNAME}:${process.env.GH_TOKEN}@github.com/${process.env.GH_USERNAME}/${process.env.GH_REPO}.git`;

    try {
        await git.addRemote('origin', remoteUrl).catch(() => {}); // Jika remote sudah ada, abaikan
        await git.add('.');
        await git.commit('🔄 Update Finalplay.m3u (auto)');
        await git.push('origin', 'main'); // Ubah 'main' jika kamu pakai 'master'
        console.log("✅ Berhasil push ke GitHub!");
    } catch (error) {
        console.error("❌ Gagal push ke GitHub:", error.message);
    }
};

main();
