'use client';

export default function PrintButton() {
  return <button className="primary-action print-hide" type="button" onClick={() => window.print()}>In phiếu giao hàng</button>;
}