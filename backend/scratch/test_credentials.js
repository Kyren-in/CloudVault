import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const b2Config = {
  region: process.env.BACKBLAZE_REGION || 'us-east-005',
  endpoint: process.env.BACKBLAZE_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.BACKBLAZE_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKBLAZE_SECRET_ACCESS_KEY
  }
};

async function run() {
  console.log(`======================================`);
  console.log(`Testing Backblaze B2 Connection`);
  console.log(`Bucket: ${process.env.BACKBLAZE_BUCKET_NAME || 'cloudvault-b2-kyren'}`);
  console.log(`======================================`);
  
  if (!b2Config.credentials.accessKeyId || !b2Config.credentials.secretAccessKey) {
    console.error("❌ Error: Missing Backblaze credentials in environment variables.");
    process.exit(1);
  }

  const client = new S3Client(b2Config);
  try {
    const cmd = new ListObjectsV2Command({
      Bucket: process.env.BACKBLAZE_BUCKET_NAME || 'cloudvault-b2-kyren',
      MaxKeys: 1
    });
    const response = await client.send(cmd);
    console.log(`✅ Success! Backblaze B2 connected successfully!`);
    console.log(`Found objects:`, response.Contents ? response.Contents.length : 0);
  } catch (err) {
    console.error(`❌ Failed:`, err.message);
  }
}

run();
