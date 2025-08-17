const fs = require('fs');
const path = require('path');
const axios = require('axios');

const MAIN_FILE = process.env.MAIN_FILE || "Finalplay.m3u";
const SOURCES_FILE = process.env.SOURCES_FILE || "sources.txt";
const TIMEOUT = parseInt(process.env.TIMEOUT || "10", 10);
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || "50", 10);

// Fungsi untuk memeriksa status channel
const checkChannel = async (url, attempts = 3) => {
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

    if (allChannels.length === 0) {
        console.log("\n❗ Tidak ada channel yang ditemukan dari sumber. Proses dihentikan.");
        process.exit(0);
    }

    console.log(`\n🔍 Memeriksa status ${allChannels.length} channel dengan ${MAX_WORKERS} thread...`);
    
    let aliveChannels = [];
    let deadCount = 0;
    
    const checkPromises = allChannels.map(channel => checkChannel(channel.url).then(isAlive => ({ channel, isAlive })));
    const results = await Promise.all(checkPromises);

    for (const { channel, isAlive } of results) {
        if (isAlive) {
            console.log(`✅ Channel hidup: ${channel.url}`);
            aliveChannels.push(channel);
        } else {
            console.log(`❌ Channel mati: ${channel.url}`);
            deadCount++;
        }
    }

    console.log("\n==========================");
    console.log("📊 Statistik:");
    console.log(`🔢 Total channel: ${allChannels.length}`);
    console.log(`✅ Channel hidup: ${aliveChannels.length}`);
    console.log(`❌ Channel mati: ${deadCount}`);
    console.log("==========================");

    // Bagian Pengelompokan dan Penyusunan Ulang
    const liveEventChannels = [];
    const otherChannels = [];
    const liveEventRegex = /group-title="LIVE EVENT"|group-title="SEDANG LIVE"/i;

    for (const channel of aliveChannels) {
        if (liveEventRegex.test(channel.extinf)) {
            liveEventChannels.push(channel);
        } else {
            otherChannels.push(channel);
        }
    }

    for (const channel of liveEventChannels) {
        channel.extinf = channel.extinf.replace(/group-title="SEDANG LIVE"/i, 'group-title="LIVE EVENT"');
    }

    const finalPlaylist = ["#EXTM3U", ...liveEventChannels.flatMap(ch => [ch.extinf, ch.url]), ...otherChannels.flatMap(ch => [ch.extinf, ch.url])];

    try {
        fs.writeFileSync(MAIN_FILE, finalPlaylist.join('\n'), 'utf-8');
        console.log(`✅ Playlist diperbarui dan disimpan ke ${MAIN_FILE}`);
    } catch (error) {
        console.error(`⚠️ Gagal menulis file: ${error.message}`);
        process.exit(1);
    }

    console.log("\n✅ Skrip selesai. Biarkan GitHub Actions melanjutkan proses Git.");
};

main();
