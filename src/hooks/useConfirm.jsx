import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from '../components/ui/Button.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';

const ConfirmContext = createContext(async () => false);

/**
 * const confirm = useConfirm();
 * if (await confirm({ title, message, confirmLabel, danger })) { ... }
 */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef();
  const cancelRef = useRef(null);

  const confirm = useCallback(
    (o) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const close = (result) => {
    resolver.current?.(result);
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={Boolean(opts)}
        onClose={() => close(false)}
        title={opts?.title ?? ''}
        size="sm"
        initialFocus={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} variant="ghost" onClick={() => close(false)}>
              {opts?.cancelLabel ?? 'Batal'}
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {opts?.confirmLabel ?? 'Ya, lanjut'}
            </Button>
          </>
        }
      >
        {opts?.message && <p className="muted">{opts.message}</p>}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
