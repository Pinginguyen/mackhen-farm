import { NextResponse } from 'next/server';
import { PATCH as updateProduct } from '@/app/api/products/route';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu sản phẩm không hợp lệ.' } }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: { message: 'Dữ liệu sản phẩm không hợp lệ.' } }, { status: 400 });
  }

  const delegatedRequest = new Request(request.url, {
    method: 'PATCH',
    headers: request.headers,
    body: JSON.stringify({ ...body, id: params.id }),
  });
  return updateProduct(delegatedRequest);
}