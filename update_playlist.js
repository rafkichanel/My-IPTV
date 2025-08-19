const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');
const path = require('path');

const MAIN_FILE = process.env.MAIN_FILE || "Finalplay.m3u";
const SOURCES_FILE = process.env.SOURCES_FILE || "sources.txt";

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
            console.log(`🔗 Mengunduh sumber ${idx + 1}: ${url}`);
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

    console.log(`✅ Total channel unik: ${allChannels.length}`);

    fs.writeFileSync(MAIN_FILE, "#EXTM3U\n" + allChannels.join('\n') + "\n", 'utf-8');
    console.log(`✅ Playlist disimpan ke '${MAIN_FILE}'`);

    await autoCommitAndPush();
};

// Fungsi commit dan push ke GitHub
const autoCommitAndPush = async () => {
    const git = simpleGit();
    const remoteUrl = `https://${process.env.GH_USERNAME}:${process.env.GH_TOKEN}@github.com/${process.env.GH_USERNAME}/${process.env.GH_REPO}.git`;

    try {
        await git.addRemote('origin', remoteUrl).catch(() => {});
        await git.add('.');
        await git.commit('🔄 Update Finalplay.m3u (no filter)');
        await git.push('origin', 'master');
        console.log("✅ Berhasil push ke GitHub!");
    } catch (error) {
        console.error("❌ Gagal push ke GitHub:", error.message);
    }
};

main();
