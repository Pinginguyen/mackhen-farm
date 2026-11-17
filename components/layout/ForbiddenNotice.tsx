'use client';

import { useEffect, useState } from 'react';
import LocalizedText from '@/components/LocalizedText';

export default function ForbiddenNotice() {
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    setForbidden(new URLSearchParams(window.location.search).get('error') === 'forbidden');
  }, []);

  return forbidden ? <p className="role-notice" role="alert"><LocalizedText text="Bạn không có quyền truy cập khu vực quản trị." /></p> : null;
}