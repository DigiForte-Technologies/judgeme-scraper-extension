// ============================
// popup.js
// ============================

// Button 1: Scrape Full/Paginated Review Pages (.jdgm-rev)
document.getElementById('scrape-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const delay = ms => new Promise(res => setTimeout(res, ms));
        const escapeCSV = val => !val ? '' : `"${String(val).replace(/"/g, '""')}"`;
        const allReviews = new Map();
  
        async function extractReviewsFromPage() {
          const reviews = document.querySelectorAll('.jdgm-rev');
          reviews.forEach(el => {
            const id = el.getAttribute('data-review-id') || '';
            const name = el.querySelector('.jdgm-rev__author')?.innerText || '';
            const date = el.querySelector('.jdgm-rev__timestamp')?.innerText || '';
            const rating = el.querySelector('.jdgm-rev__rating')?.getAttribute('data-score') || '';
            const title = el.querySelector('.jdgm-rev__title')?.innerText || '';
            const body = el.querySelector('.jdgm-rev__body')?.innerText?.replace(/\n/g, ' ') || '';
            const product = el.getAttribute('data-product-title') || el.querySelector('.jdgm-rev__prod-link')?.innerText || '';
            const image = el.querySelector('.jdgm-rev__pic-img')?.src || '';
            if (!allReviews.has(id)) {
              allReviews.set(id, { id, name, date, rating, title, body, product, image });
            }
          });
        }
  
        async function clickNextUntilEnd() {
          let page = 1;
          while (true) {
            await extractReviewsFromPage();
            const nextBtn = document.querySelector('.jdgm-paginate__next-page');
            if (!nextBtn || nextBtn.classList.contains('jdgm-disabled') || nextBtn.getAttribute('aria-disabled') === 'true') {
              break;
            }
            nextBtn.click();
            page++;
            await delay(1500);
          }
        }
  
        async function scrollAndScrape() {
          let lastHeight = 0;
          while (true) {
            window.scrollTo(0, document.body.scrollHeight);
            await delay(1000);
            let currentHeight = document.body.scrollHeight;
            if (currentHeight === lastHeight) break;
            lastHeight = currentHeight;
          }
          await extractReviewsFromPage();
        }
  
        (async () => {
          const paginate = document.querySelector('.jdgm-paginate');
          if (paginate) {
            showStatus('Detected pagination. Scraping all review pages...');
            await clickNextUntilEnd();
          } else {
            showStatus('No pagination detected. Scrolling to load all reviews...');
            await scrollAndScrape();
          }
  
          const reviews = Array.from(allReviews.values());
          if (reviews.length === 0) {
            showStatus('❌ No reviews found. Try navigating to a valid review page.');
            return;
          }
  
          const headers = ['ID', 'Name', 'Date', 'Rating', 'Title', 'Body', 'Product', 'Image'];
          const rows = reviews.map(r =>
            [r.id, r.name, r.date, r.rating, r.title, r.body, r.product, r.image]
              .map(escapeCSV).join(',')
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
  
          showStatus(`✅ Downloaded ${reviews.length} reviews.`);
        })();
  
        function showStatus(msg) {
          const existing = document.getElementById('jdgm-status');
          if (existing) existing.remove();
          const bar = document.createElement('div');
          bar.id = 'jdgm-status';
          bar.style.position = 'fixed';
          bar.style.bottom = '20px';
          bar.style.left = '20px';
          bar.style.padding = '10px 14px';
          bar.style.background = '#111';
          bar.style.color = '#fff';
          bar.style.borderRadius = '6px';
          bar.style.fontSize = '13px';
          bar.style.zIndex = '9999';
          bar.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
          bar.textContent = msg;
          document.body.appendChild(bar);
          setTimeout(() => bar.remove(), 5000);
        }
      }
    });
  });
  
  // Button 2: Scrape Carousel Reviews (like on product pages)
  document.getElementById('scrape-carousel-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function escapeCSV(val) {
          if (!val) return '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }
  
        const reviews = Array.from(document.querySelectorAll('.jdgm-carousel-item')).map(el => {
          const id = el.getAttribute('data-review-id') || '';
          const image = el.querySelector('.jdgm-carousel-item__product-image')?.src || '';
          const rating = el.querySelectorAll('.jdgm-star.jdgm--on')?.length || '';
          const title = el.querySelector('.jdgm-carousel-item__review-title')?.innerText || '';
          const body = el.querySelector('.jdgm-carousel-item__review-body')?.innerText?.replace(/\n/g, ' ') || '';
          const name = el.querySelector('.jdgm-carousel-item__reviewer-name')?.innerText || '';
          const product = el.querySelector('.jdgm-carousel-item__product-title')?.innerText || '';
          const date = el.querySelector('.jdgm-carousel-item__timestamp')?.getAttribute('data-time') || '';
          return { id, name, date, rating, title, body, product, image };
        });
  
        if (reviews.length === 0) {
          showStatus('❌ No carousel reviews found on this page.');
          return;
        }
  
        const headers = ['ID', 'Name', 'Date', 'Rating', 'Title', 'Body', 'Product', 'Image'];
        const rows = reviews.map(r =>
          [r.id, r.name, r.date, r.rating, r.title, r.body, r.product, r.image]
            .map(escapeCSV).join(',')
        );
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'judgeme_carousel_reviews.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
  
        showStatus(`✅ Downloaded ${reviews.length} carousel reviews.`);
  
        function showStatus(msg) {
          const existing = document.getElementById('jdgm-status');
          if (existing) existing.remove();
          const bar = document.createElement('div');
          bar.id = 'jdgm-status';
          bar.style.position = 'fixed';
          bar.style.bottom = '20px';
          bar.style.left = '20px';
          bar.style.padding = '10px 14px';
          bar.style.background = '#111';
          bar.style.color = '#fff';
          bar.style.borderRadius = '6px';
          bar.style.fontSize = '13px';
          bar.style.zIndex = '9999';
          bar.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
          bar.textContent = msg;
          document.body.appendChild(bar);
          setTimeout(() => bar.remove(), 5000);
        }
      }
    });
  });
  
  // Button 3: Open “All Reviews” Page
  document.getElementById('open-reviews-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const base = `${url.origin}`;
    const guesses = [
      `${base}/pages/reviews`,
      `${base}/pages/all-reviews`,
      `${base}/apps/judgeme`
    ];
    for (let guess of guesses) {
      chrome.tabs.create({ url: guess });
    }
  });
  