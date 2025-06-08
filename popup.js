// ============================
// popup.js
// ============================
document.getElementById('scrape-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeAndDownload
    });
  });
  
  function scrapeAndDownload() {
    const delay = ms => new Promise(res => setTimeout(res, ms));
  
    async function autoScrollToLoadAll() {
      let lastHeight = 0;
      while (true) {
        window.scrollTo(0, document.body.scrollHeight);
        await delay(1000);
        let currentHeight = document.body.scrollHeight;
        if (currentHeight === lastHeight) break;
        lastHeight = currentHeight;
      }
    }
  
    function escapeCSV(val) {
      if (!val) return '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }
  
    function extractReviews() {
      const reviews = Array.from(document.querySelectorAll('.jdgm-rev'));
      return reviews.map(el => {
        const id = el.getAttribute('data-review-id') || '';
        const name = el.querySelector('.jdgm-rev__author')?.innerText || '';
        const date = el.querySelector('.jdgm-rev__timestamp')?.innerText || '';
        const rating = el.querySelector('.jdgm-rev__rating')?.getAttribute('data-score') || '';
        const title = el.querySelector('.jdgm-rev__title')?.innerText || '';
        const body = el.querySelector('.jdgm-rev__body')?.innerText?.replace(/\n/g, ' ') || '';
        const product = el.querySelector('.jdgm-rev__prod-link')?.innerText || '';
        const image = el.querySelector('.jdgm-rev__pic-img')?.src || '';
        return { id, name, date, rating, title, body, product, image };
      });
    }
  
    function downloadCSV(data) {
      const headers = ['ID', 'Name', 'Date', 'Rating', 'Title', 'Body', 'Product', 'Image'];
      const rows = data.map(r =>
        [r.id, r.name, r.date, r.rating, r.title, r.body, r.product, r.image]
          .map(escapeCSV)
          .join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'judgeme_reviews.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  
    (async () => {
      alert('Starting scrape... Scrolling to load all reviews');
      await autoScrollToLoadAll();
      const reviews = extractReviews();
      alert(`Scraped ${reviews.length} reviews. Downloading CSV...`);
      downloadCSV(reviews);
    })();
  }