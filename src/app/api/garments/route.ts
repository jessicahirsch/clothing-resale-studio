import { authorize, failure, listGarments, upload } from '../../../lib/garments';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try { authorize(request); return Response.json(await listGarments(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return Response.json(await upload(request), { status: 201, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
