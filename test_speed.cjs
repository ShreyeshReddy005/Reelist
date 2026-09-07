const fetch = require('node-fetch'); // or use built-in fetch if Node 18+

async function run() {
  const url = 'https://www.instagram.com/reel/DWeNoeSD49J/';
  console.log(`Starting extraction for: ${url}`);
  const startTime = Date.now();
  
  try {
    const res = await fetch('http://localhost:3000/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const timeTaken = (Date.now() - startTime) / 1000;
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Failed in ${timeTaken.toFixed(2)}s: ${res.status} ${text}`);
      return;
    }
    
    const data = await res.json();
    console.log(`\n✅ EXTRACTION SUCCESSFUL!`);
    console.log(`⏱️ Total Time: ${timeTaken.toFixed(2)} seconds`);
    console.log(`🎬 Movies Found: ${data.movies?.length || 0}`);
    
    if (data.movies && data.movies.length > 0) {
      console.log('\nExtracted Movies:');
      data.movies.forEach((m, i) => {
        console.log(`  ${i+1}. ${m.title} (${m.year}) - TMDB ID: ${m.id}`);
        console.log(`     Evidence: ${m.evidence || 'N/A'}`);
      });
    }
    
    console.log('\nMetadata:');
    console.log(JSON.stringify(data.extractionMeta, null, 2));
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
  }
}

run();
