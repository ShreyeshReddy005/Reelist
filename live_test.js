async function pollRunId(baseUrl, runId) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Polling attempt ${i+1}/${maxAttempts} for ${runId}...`);
    try {
      const res = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
      
      if (!res.ok && res.status !== 202) {
        console.error(`Check failed with status: ${res.status} body: ${await res.text()}`);
        return null;
      }
      
      const data = await res.json();
      if (res.status === 202 && data.status === 'polling') {
        // Still running
      } else if (data.movies) {
        // We got the final result!
        return data;
      } else if (data.error) {
        console.error(`Run failed:`, data.error);
        return null;
      }
    } catch (e) {
      console.error(`Polling error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error(`Polling timed out for ${runId}`);
  return null;
}

async function testExtraction(baseUrl, url, label) {
  console.log(`\n==================================================`);
  console.log(`Testing [${label}] URL: ${url}`);
  console.log(`==================================================`);
  
  const startTime = Date.now();
  try {
    const startRes = await fetch(`${baseUrl}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!startRes.ok && startRes.status !== 202) {
      console.error(`Extract start failed: ${startRes.status} ${await startRes.text()}`);
      return;
    }
    
    const startData = await startRes.json();
    if (!startData.runId) {
      // Maybe it extracted immediately?
      if (startData.movies) {
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ INSTANT EXTRACTION SUCCESSFUL IN ${timeTaken}s`);
        console.log(JSON.stringify(startData.movies, null, 2));
        return;
      }
      console.error(`No runId returned:`, startData);
      return;
    }
    
    console.log(`Successfully started extraction. Run ID: ${startData.runId}`);
    
    const result = await pollRunId(baseUrl, startData.runId);
    if (result) {
      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ EXTRACTION SUCCESSFUL IN ${timeTaken}s`);
      console.log(JSON.stringify(result.movies, null, 2));
    }
  } catch (e) {
    console.error(`Test failed:`, e);
  }
}

async function runAllTests() {
  const baseUrl = 'https://reelist-elite.vercel.app';
  const newUrl = 'https://www.instagram.com/reel/DWeNoeSD49J/'; 
  await testExtraction(baseUrl, newUrl, 'NEW POST');
}

runAllTests();
