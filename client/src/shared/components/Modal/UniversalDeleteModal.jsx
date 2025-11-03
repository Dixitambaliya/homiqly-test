"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../Button";
import Modal from "./Modal";

export default function UniversalDeleteModal({
  open,
  onClose,
  onDelete,
  title = "Delete",
  desc = "",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  autoClose = true,
  beforeDelete,
  onError,
  confirmDisabled = false,
  confirmButtonProps = {},
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  async function handleDelete() {
    if (!onDelete) {
      // nothing to call — just close
      onClose?.();
      return;
    }

    try {
      setLoading(true);

      // run optional hook before the delete (e.g. validation/extra confirm)
      if (beforeDelete) {
        const maybe = beforeDelete();
        // support sync or promise
        const proceed =
          maybe && typeof maybe.then === "function" ? await maybe : maybe;
        if (proceed === false) {
          setLoading(false);
          return;
        }
      }

      // call the delete handler (support sync or async)
      const result = onDelete();
      if (result && typeof result.then === "function") {
        await result;
      }

      // close automatically if requested
      if (autoClose) onClose?.();
    } catch (err) {
      // bubble error to parent if provided
      onError?.(err);
      // keep modal open so user can retry
      console.error("UniversalDeleteModal - onDelete error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      closeOnOverlayClick={!loading}
      onClose={() => !loading && onClose?.()}
      title={title}
    >
      <div className="max-w-md w-full bg-white rounded-2xl p-3">
        {desc ? <div className="mb-4 text-sm text-gray-700">{desc}</div> : null}

        <div className="mt-4 flex justify-end items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant="lightError"
            onClick={handleDelete}
            disabled={loading || confirmDisabled}
            {...confirmButtonProps}
          >
            {loading ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
