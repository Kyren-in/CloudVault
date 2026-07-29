import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` CloudVault Server Running on http://localhost:${PORT}`);
  console.log(` Mode: ${process.env.USE_MOCK_STORAGE !== 'false' ? 'LOCAL MOCK STORAGE' : 'PRODUCTION CLOUD'}`);
  console.log(`==================================================`);
});
