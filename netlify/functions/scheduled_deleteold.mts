import { getStore } from '@netlify/blobs';

export default async (req: Request) => {
    const store = getStore({ name: 'send', consistency: 'strong' });
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - 24 * 60 * 60; // 1 day ago

    let deletedCount = 0;
    let keptCount = 0;

    for await (const blobPage of store.list({ paginate: true })) {
        for (const blobInfo of blobPage.blobs) {
            // Get metadata for each blob
            const blob = await store.getMetadata(blobInfo.key);
            // Check if metadata and timestamp exist and are older than cutoff
            if (blob?.metadata.timestamp && Number(blob.metadata.timestamp) < cutoff) {
                await store.delete(blobInfo.key);
                deletedCount++;
            } else {
                keptCount++;
            }
        }
    }

    console.log(`Blobs deleted: ${deletedCount}, Blobs kept: ${keptCount}`);
}