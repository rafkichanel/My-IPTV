const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');

const MAIN_FILE = "Playlist2";
const SOURCES_FILE = "sources.txt";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_USERNAME = process.env.GH_USERNAME;
const GH_REPO = process.env.GH_REPO;

const TIMEOUT = 15000;

const autoCommitAndPush = async () => {
  const git = simpleGit();
  const remoteUrl = `https://${GH_USERNAME}:${GH_TOKEN}@github.com/${GH_USERNAME}/${GH_REPO}.git`;

  try {
    const remotes = await git.getRemotes(true);
    const hasOrigin = remotes.some(remote => remote.name === 'origin');

    if (!hasOrigin) {
      await git.addRemote('origin', remoteUrl);
    } else {
      await git.remote(['set-url', 'origin', remoteUrl]);
    }

    await git.add(MAIN_FILE);
    await git.commit('🔄 Update Playlist2', undefined, { '--allow-empty': null });
    await git.push('origin', 'master');

    const log = await git.log();
    console.log("✅ Commit terbaru:", log.latest.message);
  } catch (error) {
    console.error("❌ Gagal push ke GitHub:", error.message);
  }
};

const main = async () => {
  let sources;
  try {
    const sourcesContent = fs.readFileSync(SOURCES_FILE, 'utf-8');
    sources = sourcesContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    console.error(`⚠️ File '${SOURCES_FILE}' tidak ditemukan.`);
    process.exit(1);
  }

  const allChannels = [];
  const seenUrls = new Set();

  console.log(`📡 Mengunduh dari ${sources.length} sumber...`);

  for (const [idx, url] of sources.entries()) {
    try {
      console.log(`🌐 Mengambil dari sumber ${idx + 1}: ${url}`);
      const response = await axios.get(url, { timeout: TIMEOUT });
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
      console.error(`⚠️ Gagal mengambil dari sumber ${idx + 1}: ${error.message}`);
    }
  }

  console.log(`📺 Total channel diproses: ${allChannels.length}`);

  if (allChannels.length === 0) {
    console.log("❌ Tidak ada channel yang ditemukan.");
    return;
  }

  try {
    fs.writeFileSync(MAIN_FILE, "#EXTM3U\n" + allChannels.join('\n') + "\n", 'utf-8');
    console.log(`✅ File '${MAIN_FILE}' berhasil ditulis.`);
  } catch (error) {
    console.error(`❌ Gagal menulis file '${MAIN_FILE}': ${error.message}`);
    process.exit(1);
  }

  await autoCommitAndPush();
};

main();
