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
      // Kode asli menggunakan `$eval` yang hanya mengambil satu elemen; ini telah diperbaiki menjadi `$$eval` untuk mendapatkan semua elemen.
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
      // --- Logika Scraping Instagram ---
      // CATATAN: Struktur Instagram sering berubah. Pemilih ini adalah upaya terbaik dan mungkin memerlukan pembaruan.

      // Tunggu hingga konten utama dimuat. Komentar seringkali berada di dalam tag <article>.
      await page.waitForSelector('article', { timeout: 10000 });

      // Gulir ke bawah untuk memuat komentar.
      for (let i = 0; i < 7; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Instagram menggunakan nama kelas yang dikaburkan (misalnya, "x1i10hfl"), yang membuatnya tidak dapat diandalkan.
      // Pendekatan yang lebih baik adalah menggunakan pemilih struktural.
      // Pemilih ini mencari tautan (<a>), yang kemungkinan adalah nama pengguna, di dalam header komentar (H3).
      const usernameSelector = 'h3 > a';
      try {
        await page.waitForSelector(usernameSelector, { timeout: 15000 });
        const usernames = await page.$$eval(usernameSelector, elements =>
          elements.map(el => el.textContent.trim())
        );
        isFound = usernames.some(commentUsername => commentUsername === username);
      } catch (e) {
        console.error('Tidak dapat menemukan komentar di Instagram. Pemilih mungkin sudah usang atau tidak ada komentar.');
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
