import { useCallback, useEffect, useState } from 'react';

const read = () => window.location.hash.replace(/^#\/?/, '');

/**
 * Router mini berbasis hash: "#/riwayat" -> "riwayat".
 * Tombol back di HP tetap berfungsi tanpa library tambahan.
 */
export function useHashRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path ? `/${path}` : '/';
  }, []);

  return [route, navigate];
}
