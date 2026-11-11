import { useEffect, useState } from 'react';
// Brief skeleton on first paint. Replace with real loading state once pages call the API.
export const useReady = (ms = 450) => { const [r, setR] = useState(false); useEffect(() => { const t = setTimeout(() => setR(true), ms); return () => clearTimeout(t); }, [ms]); return r; };
