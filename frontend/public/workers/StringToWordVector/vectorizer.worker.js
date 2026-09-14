self.onmessage = async (e) => {
  const { data, config } = e.data;
  console.log("Worker received data:", data.length, "rows");
  
  try {
    // Logic pemrosesan WASM akan ditambahkan di Langkah 4
    self.postMessage({ success: true, result: [] });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
