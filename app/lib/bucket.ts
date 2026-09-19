import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '170.30.20.225',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'adminminio',
  secretKey: process.env.MINIO_SECRET_KEY || 'passwordminio123',
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'maintenance';

export const bucket = {
  // 1. UPLOAD FILE
  async upload(buffer: Buffer, fileName: string, mimeType: string) {
    const objectName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    
    await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      buffer,
      buffer.length, // Size wajib angka
      { 'Content-Type': mimeType }
    );

    const fileUrl = `http://${process.env.MINIO_ENDPOINT || '170.30.20.225'}:9000/${BUCKET_NAME}/${objectName}`;
    return { objectName, fileUrl };
  },

  // 2. GET FILE / PRESIGNED URL
  async getUrl(objectName: string, expiryInSeconds = 24 * 60 * 60) {
    // Mendapatkan URL publik atau presigned URL sementara
    return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expiryInSeconds);
  },

  // 3. DELETE FILE
  async delete(objectName: string) {
    await minioClient.removeObject(BUCKET_NAME, objectName);
    return true;
  },

  // 4. UPDATE FILE (Hapus file lama + Upload file baru)
  async update(oldObjectName: string, buffer: Buffer, newFileName: string, mimeType: string) {
    if (oldObjectName) {
      try {
        await minioClient.removeObject(BUCKET_NAME, oldObjectName);
      } catch (err) {
        console.warn(`File lama ${oldObjectName} tidak ditemukan, melanjutkan upload.`);
      }
    }
    return await this.upload(buffer, newFileName, mimeType);
  }
};