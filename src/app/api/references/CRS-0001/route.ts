import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { authorize, failure } from '../../../../lib/garments';
export async function GET(request: Request) {
  try {
    authorize(request);
    return new Response(await readFile(path.join(process.cwd(), 'references', 'CRS-0001-approved.png')), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) { return failure(error); }
}
