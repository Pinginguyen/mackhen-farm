import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const orderCodes = ['MKF-930739', 'MKF-213005', 'MKF-728531'];
const completedStatuses = ['DELIVERED', 'COMPLETED'];

try {
  const orders = await prisma.order.findMany({
    where: { orderCode: { in: orderCodes } },
    select: { orderCode: true, orderStatus: true, paymentStatus: true },
  });
  const eligibleOrders = orders.filter((order) => completedStatuses.includes(order.orderStatus));
  const result = eligibleOrders.length
    ? await prisma.order.updateMany({
      where: {
        orderCode: { in: eligibleOrders.map((order) => order.orderCode) },
        orderStatus: { in: completedStatuses },
        paymentStatus: { not: 'PAID' },
      },
      data: { paymentStatus: 'PAID' },
    })
    : { count: 0 };

  console.log(`Updated ${result.count} completed orders to PAID.`);
  for (const orderCode of orderCodes) {
    const order = orders.find((candidate) => candidate.orderCode === orderCode);
    if (!order) console.log(`${orderCode}: not found`);
    else if (!completedStatuses.includes(order.orderStatus)) console.log(`${orderCode}: skipped (${order.orderStatus})`);
    else if (order.paymentStatus === 'PAID') console.log(`${orderCode}: already PAID`);
  }
} finally {
  await prisma.$disconnect();
}