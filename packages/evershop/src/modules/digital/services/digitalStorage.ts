import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validateDigitalFiles, type DigitalFile } from './downloadPolicy.js';

export function digitalStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error('Digital delivery storage is not configured');
    return value;
  };
  const endpoint = required('DIGITAL_S3_ENDPOINT');
  const publicEndpoint = required('DIGITAL_S3_PUBLIC_ENDPOINT');
  const url = new URL(publicEndpoint);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Digital download endpoint must be an HTTPS origin');
  }
  return {
    endpoint,
    publicEndpoint,
    bucket: required('DIGITAL_S3_BUCKET'),
    region: env.DIGITAL_S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: required('DIGITAL_S3_ACCESS_KEY_ID'),
      secretAccessKey: required('DIGITAL_S3_SECRET_ACCESS_KEY')
    }
  };
}

function client(publicEndpoint = false) {
  const config = digitalStorageConfig();
  return new S3Client({
    endpoint: publicEndpoint ? config.publicEndpoint : config.endpoint,
    region: config.region,
    credentials: config.credentials,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 2
  });
}

export async function verifyDigitalFiles(files: DigitalFile[]) {
  if (!files.length) return;
  const config = digitalStorageConfig();
  const s3 = client();
  try {
    for (const file of validateDigitalFiles(files)) {
      await s3.send(new HeadObjectCommand({ Bucket: config.bucket, Key: file.key, VersionId: file.versionId }));
    }
  } finally { s3.destroy(); }
}

export async function signDownload(file: { bucket: string; object_key: string; version_id: string; name: string }) {
  const config = digitalStorageConfig();
  if (file.bucket !== config.bucket) throw new Error('Digital bucket configuration changed');
  const s3 = client(true);
  try {
    return await getSignedUrl(s3, new GetObjectCommand({
      Bucket: file.bucket,
      Key: file.object_key,
      VersionId: file.version_id,
      ResponseContentDisposition: `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
      ResponseContentType: 'application/octet-stream',
      ResponseCacheControl: 'private, no-store'
    }), { expiresIn: 300 });
  } finally { s3.destroy(); }
}
