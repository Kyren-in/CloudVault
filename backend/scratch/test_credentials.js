import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const b2Config = {
  region: 'us-east-005',
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  forcePathStyle: true,
  credentials: {
    accessKeyId: '0056ea3f28e210d0000000001',
    secretAccessKey: 'K005bqjWa1rO0Pu9//wZf4MGSNPNaIY'
  }
};

async function run() {
  console.log(`======================================`);
  console.log(`Testing Backblaze B2 Connection`);
  console.log(`Bucket: cloudvault-b2-kyren`);
  console.log(`======================================`);
  
  const client = new S3Client(b2Config);
  try {
    const cmd = new ListObjectsV2Command({
      Bucket: 'cloudvault-b2-kyren',
      MaxKeys: 1
    });
    const response = await client.send(cmd);
    console.log(`✅ Success! Backblaze B2 connected successfully to "cloudvault-b2-kyren"!`);
    console.log(`Found objects:`, response.Contents ? response.Contents.length : 0);
  } catch (err) {
    console.error(`❌ Failed:`, err.message);
  }
}

run();
