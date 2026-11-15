import { unstable_rethrow } from 'next/navigation';
import { failure, updateGarment } from '../../../../lib/garments';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json(await updateGarment(request, id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { unstable_rethrow(error); return failure(error); }
}
