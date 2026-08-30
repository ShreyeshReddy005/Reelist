const url = 'https://www.instagram.com/reel/DaZZFQaB7Vd/?igsh=eGlrbTdoamFlNnAz';
const API_URL = 'http://localhost:3000/api/extract';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extract(target, runId) {
  const start = Date.now();
  console.log(`[Frontend] Requesting extraction for ${runId ? `runId: ${runId}` : 'URL'}...`);
  
  const body = runId ? { runId } : { url: target };
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const time = Date.now() - start;
  
  if (res.status === 202) {
    const data = await res.json();
    console.log(`[Frontend] Received 202 Accepted (Polling) in ${time}ms. runId: ${data.runId}`);
    console.log('[Frontend] Waiting 3 seconds before next poll...');
    await delay(3000);
    return extract(target, data.runId);
  } else if (!res.ok) {
    console.log(`[Frontend] Error: ${res.status}`);
    console.log(await res.text());
  } else {
    const data = await res.json();
    console.log(`[Frontend] Success in ${time}ms! Extracted movies:`);
    console.log(JSON.stringify(data.movies, null, 2));
  }
}

extract(url);
