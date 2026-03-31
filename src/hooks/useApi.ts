import { useCallback, useEffect, useRef, useState } from "react";

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useApi<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent state updates after unmount / newer request
  const reqId = useRef(0);

  const run = useCallback(() => {
    const id = ++reqId.current;

    setLoading(true);
    setError(null);

    fn()
      .then((res) => {
        if (reqId.current !== id) return;
        setData(res);
      })
      .catch((e: unknown) => {
        if (reqId.current !== id) return;
        setError(e instanceof Error ? e.message : "Request failed");
      })
      .finally(() => {
        if (reqId.current !== id) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run };
}
