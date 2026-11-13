import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { authorize, failure, imageType, root, UploadError, validId } from '../../../../../../lib/garments';
export async function GET(request: Request, context: { params: Promise<{ id: string; filename: string }> }) {
  try {
    authorize(request);
    const { id, filename } = await context.params;
    if (!validId(id) || !/^[\da-f-]+\.(jpg|png|webp|heic)$/.test(filename)) throw new UploadError('Photo not found.', 404);
    let bytes;
    try { bytes = await readFile(path.join(root(), id, 'originals', filename)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new UploadError('Photo not found.', 404); throw error; }
    return new Response(bytes, { headers: { 'Content-Type': imageType(bytes)?.type ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' } });
  } catch (error) { return failure(error); }
}
