import { createContext, useContext, useState, ReactNode } from "react";

interface ModalContextValue {
  showModal: (modal: ReactNode) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);

  function showModal(modal: ReactNode) {
    setModalContent(modal);
  }

  function hideModal() {
    setModalContent(null);
  }

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}

      {/* Modal portal layer */}
      {modalContent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          {modalContent}
        </div>
      )}
    </ModalContext.Provider>
  );
}
