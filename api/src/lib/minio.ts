import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Internal client for uploads/deletes (Docker network)
const internalClient = new S3Client({
  endpoint: `http://${process.env.MINIO_ENDPOINT ?? 'minio'}:${process.env.MINIO_PORT ?? '9000'}`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? '',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
});

// Public client for presigned URLs (accessible from browser)
const publicEndpoint = process.env.MINIO_PUBLIC_URL ?? 'https://media.buford.dev';
const publicClient = new S3Client({
  endpoint: publicEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? '',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? '',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.MINIO_BUCKET ?? 'sama-sheets';

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await internalClient.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(publicClient, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  await internalClient.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}
