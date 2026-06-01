const puppeteer = require('puppeteer');

async function checkComment(postUrl, username) {
  let browser;
  try {
    // Meluncurkan browser. Argumen ditambahkan untuk kompatibilitas dengan lingkungan container.
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    let isFound = false;
    if (postUrl.includes('tiktok.com')) {
      // --- Logika Scraping TikTok ---

      // Tunggu hingga body konten termuat
      await page.waitForSelector('body', { timeout: 10000 });

      // Gulir ke bawah untuk memuat komentar. TikTok memuat komentar saat menggulir.
      // Kami menggulir beberapa kali untuk memastikan sejumlah besar komentar dimuat.
      for (let i = 0; i < 7; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await new Promise(resolve => setTimeout(resolve, 1500)); // Beri waktu agar komentar dimuat
      }

      // Atribut 'data-e2e' digunakan oleh TikTok untuk pengujian internal, membuatnya lebih stabil daripada nama kelas.
      const usernameSelector = '[data-e2e="comment-username-link"]';
      try {
        await page.waitForSelector(usernameSelector, { timeout: 15000 });
        const usernames = await page.$$eval(usernameSelector, elements =>
          elements.map(el => el.textContent.trim())
        );
        isFound = usernames.some(commentUsername => commentUsername === username);
      } catch (e) {
        console.error('Tidak dapat menemukan komentar di TikTok. Pemilih mungkin sudah usang atau tidak ada komentar.');
        isFound = false;
      }

    } else if (postUrl.includes('instagram.com')) {
      // --- Logika Scraping Instagram (Strategi Baru) ---
      // CATATAN: Struktur Instagram sangat tidak stabil. Strategi ini mencoba untuk lebih andal
      // dengan tidak bergantung pada nama kelas yang berubah-ubah.

      // Tunggu hingga tag <article> utama dimuat, yang berisi postingan.
      await page.waitForSelector('article', { timeout: 15000 });

      // Gulir beberapa kali untuk memastikan komentar mulai dimuat.
      for (let i = 0; i < 7; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Strategi baru: Cari semua item daftar (li) di dalam daftar (ul) di dalam artikel.
      // Untuk setiap item, ambil teks dari tautan pertama (a), karena ini biasanya adalah nama pengguna.
      const commentListItemSelector = 'article ul li';
      try {
        await page.waitForSelector(commentListItemSelector, { timeout: 15000 });

        const usernames = await page.evaluate(() => {
            const listItems = document.querySelectorAll('article ul li');
            const names = [];
            listItems.forEach(item => {
                const link = item.querySelector('a');
                if (link && link.textContent) {
                    names.push(link.textContent.trim());
                }
            });
            return names;
        });

        isFound = usernames.some(commentUsername => commentUsername === username);
      } catch (e) {
        console.error('Gagal menemukan komentar di Instagram dengan strategi baru. Strukturnya mungkin telah berubah lagi.');
        isFound = false;
      }

    } else {
      throw new Error('URL tidak didukung. Harap berikan tautan TikTok atau Instagram.');
    }

    return { postUrl, username, found: isFound };
  } catch (error) {
    console.error('Error selama scraping:', error.message);
    if (error.name === 'TimeoutError') {
      throw new Error('Waktu scraping habis. Halaman mungkin gagal dimuat, atau struktur telah berubah sehingga elemen tidak terdeteksi.');
    }
    throw new Error(`Gagal melakukan scrape pada bagian komentar. Struktur halaman mungkin telah berubah atau postingan bersifat pribadi.`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { checkComment };
