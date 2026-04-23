import type { ReactNode } from "react";

export function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="notch" />
      <div className="status" aria-hidden="true">
        <span>9:41</span>
        <span>◐ ▮▮▮</span>
      </div>
      {children}
    </>
  );
}
