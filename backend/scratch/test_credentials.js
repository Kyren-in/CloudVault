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

const supabaseConfig = {
  region: 'ap-southeast-1',
  endpoint: 'https://fwovsuwobzmhuwgzrngp.supabase.co/storage/v1/s3',
  forcePathStyle: true,
  credentials: {
    accessKeyId: '538cf564c13508d867001dd206135fc9',
    secretAccessKey: '7d0a2e04fe6bbad9124b32b06bf86a20fe908fd6bd3ad131a607e2c68a35e42b'
  }
};

async function testProvider(name, config, bucketName) {
  console.log(`\n======================================`);
  console.log(`Testing connection for: ${name}`);
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`======================================`);
  
  try {
    const client = new S3Client(config);
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1
    });
    
    const response = await client.send(command);
    console.log(`✅ Success! Connection verified.`);
    console.log(`Found objects:`, response.Contents ? response.Contents.length : 0);
  } catch (err) {
    console.error(`❌ Failed connecting to ${name}:`, err.message);
    console.error(`Error Code:`, err.code || err.$metadata?.httpStatusCode);
  }
}

async function run() {
  await testProvider('Backblaze B2', b2Config, 'cloudvault');
  await testProvider('Supabase Storage', supabaseConfig, 'cloudvault');
}

run();
