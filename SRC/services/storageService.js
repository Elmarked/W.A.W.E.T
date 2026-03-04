const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
  `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential
);
const containerClient = blobServiceClient.getContainerClient(process.env.CONTAINER_NAME);

async function uploadToBlob(buffer) {
  const blockBlobClient = containerClient.getBlockBlobClient("wallpaper.png");
  await blockBlobClient.uploadData(buffer, { overwrite: true });
}

module.exports = { uploadToBlob };
